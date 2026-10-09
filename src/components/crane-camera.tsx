"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, FolderOpen, RotateCcw, Upload } from "lucide-react";
import { submitCrane, type SubmissionDiagnostic } from "@/app/actions/submissions";

const dailyLimit = 3;
const maxImageBytes = 5 * 1024 * 1024;
const maxAnalysisImageBytes = 256 * 1024;

async function preparePhoto(canvas: HTMLCanvasElement, filename: string) {
  const photoCanvas = document.createElement("canvas");
  let photoBlob: Blob | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const scale = 0.82 ** attempt;
    photoCanvas.width = Math.max(1, Math.round(canvas.width * scale));
    photoCanvas.height = Math.max(1, Math.round(canvas.height * scale));
    const context = photoCanvas.getContext("2d");
    if (!context) throw new Error("We couldn't prepare that photo. Try again.");
    context.drawImage(canvas, 0, 0, photoCanvas.width, photoCanvas.height);
    photoBlob = await new Promise((resolve) => photoCanvas.toBlob(resolve, "image/jpeg", 0.84 - attempt * 0.1));
    if (photoBlob && photoBlob.size <= maxImageBytes) break;
  }

  if (!photoBlob || photoBlob.type !== "image/jpeg" || photoBlob.size > maxImageBytes) {
    throw new Error("This photo is too large to submit. Try a closer, simpler shot.");
  }

  const analysisCanvas = document.createElement("canvas");
  const analysisScale = Math.min(1, 512 / Math.max(photoCanvas.width, photoCanvas.height));
  analysisCanvas.width = Math.max(1, Math.round(photoCanvas.width * analysisScale));
  analysisCanvas.height = Math.max(1, Math.round(photoCanvas.height * analysisScale));
  const analysisContext = analysisCanvas.getContext("2d");
  if (!analysisContext) throw new Error("We couldn't prepare this photo for crane analysis. Try again.");
  analysisContext.drawImage(photoCanvas, 0, 0, analysisCanvas.width, analysisCanvas.height);
  const analysisBlob = await new Promise<Blob | null>((resolve) => analysisCanvas.toBlob(resolve, "image/jpeg", 0.58));
  if (!analysisBlob || analysisBlob.size > maxAnalysisImageBytes) {
    throw new Error("We couldn't prepare this photo for crane analysis. Try again.");
  }

  return {
    photo: new File([photoBlob], filename, { type: "image/jpeg" }),
    analysisPhoto: new File([analysisBlob], "crane-analysis.jpg", { type: "image/jpeg" }),
  };
}

type CraneCameraProps = {
  initialAttemptsToday: number | null;
};

type SubmissionSuccess = {
  accepted: false;
  message: string;
  attemptsToday: number;
  remainingSubmissions: number;
};

type SubmissionDiagnosticReport = {
  requestId: string;
  capturedAt: string;
  elapsedMilliseconds: number;
  source: "camera" | "file";
  photo: { type: string; sizeBytes: number } | null;
  analysisPhoto: { type: string; sizeBytes: number } | null;
  outcome: "server_error" | "action_exception";
  serverDiagnostic?: SubmissionDiagnostic;
  clientError?: { name: string; message: string };
  serverActionResponse?: {
    status: number;
    statusText: string;
    contentType: string | null;
    redirected: boolean;
    responseType: ResponseType;
    path: string | null;
  };
};

function redactDiagnosticMessage(message: string) {
  return message
    .replace(/data:[^,\s]+,[^\s]+/gi, "[image data omitted]")
    .replace(/https?:\/\/[^\s"'`]+/gi, "[URL omitted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email omitted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[token omitted]")
    .slice(0, 300);
}

function describeClientError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name.slice(0, 80), message: redactDiagnosticMessage(error.message) || "(empty message)" };
  }
  return { name: typeof error, message: "A non-Error value was thrown." };
}

export function CraneCamera({ initialAttemptsToday }: CraneCameraProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [analysisPhoto, setAnalysisPhoto] = useState<File | null>(null);
  const [photoSource, setPhotoSource] = useState<"camera" | "file">("camera");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [isOpening, setIsOpening] = useState(false);
  const [message, setMessage] = useState("");
  const [attemptsToday, setAttemptsToday] = useState(initialAttemptsToday);
  const [success, setSuccess] = useState<SubmissionSuccess | null>(null);
  const [diagnosticReport, setDiagnosticReport] = useState<SubmissionDiagnosticReport | null>(null);
  const [diagnosticCopyMessage, setDiagnosticCopyMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const now = new Date();
    const nextUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const timeout = window.setTimeout(() => {
      setAttemptsToday(0);
      router.refresh();
    }, nextUtcMidnight - now.getTime() + 250);
    return () => window.clearTimeout(timeout);
  }, [router]);

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    videoRef.current.srcObject = stream;
    void videoRef.current.play().catch(() => setCameraError("The camera preview couldn't start. Try again."));

    return () => stream.getTracks().forEach((track) => track.stop());
  }, [stream]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function openCamera() {
    setCameraError("");
    setMessage("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access isn't available in this browser. Open this page on a phone with camera access.");
      return;
    }
    if (!window.isSecureContext) {
      setCameraError("Camera access requires a secure HTTPS connection.");
      return;
    }

    setIsOpening(true);
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, height: { ideal: 1440 }, width: { ideal: 1920 } },
      });
      setStream(cameraStream);
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : "";
      setCameraError(errorName === "NotAllowedError"
        ? "Camera permission was denied. Allow camera access in your browser settings and try again."
        : errorName === "NotFoundError"
          ? "No camera was found on this device. Try submitting from a phone with a camera."
          : errorName === "NotReadableError"
            ? "The camera is already in use. Close other camera apps and try again."
            : errorName === "OverconstrainedError"
              ? "This camera couldn't use the requested settings. Try again or use another camera."
              : "We couldn't open the camera. Check your browser permissions and try again.");
    } finally {
      setIsOpening(false);
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight || !video.clientWidth || !video.clientHeight) {
      setCameraError("The camera is still getting ready. Try again in a moment.");
      return;
    }

    const previewScale = Math.max(video.clientWidth / video.videoWidth, video.clientHeight / video.videoHeight);
    const cropWidth = video.clientWidth / previewScale;
    const cropHeight = video.clientHeight / previewScale;
    const cropLeft = (video.videoWidth - cropWidth) / 2;
    const cropTop = (video.videoHeight - cropHeight) / 2;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1920 / Math.max(cropWidth, cropHeight));
    canvas.width = Math.round(cropWidth * scale);
    canvas.height = Math.round(cropHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("We couldn't prepare that photo. Try again.");
      return;
    }
    context.drawImage(video, cropLeft, cropTop, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

    try {
      const prepared = await preparePhoto(canvas, "crane.jpg");
      setPhoto(prepared.photo);
      setAnalysisPhoto(prepared.analysisPhoto);
      setPhotoSource("camera");
      setPreviewUrl(URL.createObjectURL(prepared.photo));
      setStream(null);
      setCameraError("");
      setMessage("");
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "We couldn't prepare that photo. Try again.");
    }
  }

  async function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setCameraError("");
    setMessage("");
    setIsOpening(true);

    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("We couldn't prepare that photo. Try another image.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const prepared = await preparePhoto(canvas, "crane.jpg");
      setPhoto(prepared.photo);
      setAnalysisPhoto(prepared.analysisPhoto);
      setPhotoSource("file");
      setPreviewUrl(URL.createObjectURL(prepared.photo));
      setCameraError("");
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "We couldn't open that image. Choose a different file.");
    } finally {
      bitmap?.close();
      setIsOpening(false);
    }
  }

  function retakePhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(null);
    setAnalysisPhoto(null);
    setPhotoSource("camera");
    setPreviewUrl(null);
    setSuccess(null);
    setMessage("");
    void openCamera();
  }

  function submitPhoto() {
    if (!photo || !analysisPhoto) return;
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    const formData = new FormData();
    formData.set("image", photo);
    formData.set("analysisImage", analysisPhoto);
    formData.set("source", photoSource);
    formData.set("diagnosticId", requestId);
    setMessage("");
    setDiagnosticReport(null);
    setDiagnosticCopyMessage("");
    let serverActionResponse: SubmissionDiagnosticReport["serverActionResponse"];
    const originalFetch = window.fetch;
    const diagnosticFetch: typeof window.fetch = async (input, init) => {
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
      const isServerAction = headers.has("next-action");
      const response = await originalFetch.call(window, input, init);
      if (isServerAction) {
        let path: string | null = null;
        try {
          path = new URL(response.url).pathname;
        } catch {
          path = null;
        }
        serverActionResponse = {
          status: response.status,
          statusText: response.statusText.slice(0, 120),
          contentType: response.headers.get("content-type")?.slice(0, 120) ?? null,
          redirected: response.redirected,
          responseType: response.type,
          path,
        };
      }
      return response;
    };

    function createDiagnosticReport(
      outcome: SubmissionDiagnosticReport["outcome"],
      serverDiagnostic?: SubmissionDiagnostic,
      clientError?: SubmissionDiagnosticReport["clientError"],
    ): SubmissionDiagnosticReport {
      return {
        requestId,
        capturedAt: new Date().toISOString(),
        elapsedMilliseconds: Date.now() - startedAt,
        source: photoSource,
        photo: photo ? { type: photo.type, sizeBytes: photo.size } : null,
        analysisPhoto: analysisPhoto ? { type: analysisPhoto.type, sizeBytes: analysisPhoto.size } : null,
        outcome,
        ...(serverDiagnostic ? { serverDiagnostic } : {}),
        ...(clientError ? { clientError } : {}),
        ...(serverActionResponse ? { serverActionResponse } : {}),
      };
    }

    window.fetch = diagnosticFetch;
    startTransition(async () => {
      try {
        const result = await submitCrane(formData);
        if (result.status !== "success" && result.status !== "rejected") {
          setMessage(result.message);
          if (result.status === "error") {
            setDiagnosticReport(createDiagnosticReport("server_error", result.diagnostic));
          }
          if (result.status === "limit") setAttemptsToday(dailyLimit);
          return;
        }
        if (result.status === "success") {
          router.push(`/reports/${encodeURIComponent(result.submissionId)}`);
          return;
        }
        setAttemptsToday(result.attemptsToday);
        setSuccess({ accepted: false, message: result.message, attemptsToday: result.attemptsToday, remainingSubmissions: result.remainingSubmissions });
      } catch (error) {
        console.error("Crane submission action failed in the browser:", error);
        setDiagnosticReport(createDiagnosticReport("action_exception", undefined, describeClientError(error)));
        setMessage("Submission is unavailable right now. Please try again shortly.");
      } finally {
        if (window.fetch === diagnosticFetch) window.fetch = originalFetch;
      }
    });
  }

  async function copyDiagnosticReport() {
    if (!diagnosticReport) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnosticReport, null, 2));
      setDiagnosticCopyMessage("Diagnostic report copied.");
    } catch {
      setDiagnosticCopyMessage("Copy is unavailable here. Select and copy the report below.");
    }
  }

  function resetForAnotherPhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(null);
    setAnalysisPhoto(null);
    setPhotoSource("camera");
    setPreviewUrl(null);
    setSuccess(null);
    setMessage("");
    setCameraError("");
    setDiagnosticReport(null);
    setDiagnosticCopyMessage("");
  }

  const remaining = attemptsToday === null ? null : Math.max(0, dailyLimit - attemptsToday);

  return (
    <section className="camera-submission" aria-label="Crane photo submission">
      <div className="camera-quota" aria-live="polite">
        <div className="camera-quota__count">
          <span className="camera-quota__number">{attemptsToday === null ? "--" : `${attemptsToday}/${dailyLimit}`}</span>
          <span className="camera-quota__label">SHOTS USED TODAY</span>
        </div>
        <div className="camera-quota__marks" aria-hidden="true">
          {[0, 1, 2].map((shot) => <span key={shot} className={attemptsToday !== null && shot < attemptsToday ? "is-used" : ""} />)}
        </div>
        <span className="camera-quota__reset">RESETS AT 00:00 UTC</span>
      </div>

      <div className="camera-workbench">
        <div className="camera-viewfinder" aria-label={stream ? "Live camera preview" : previewUrl ? "Captured photo review" : "Camera viewfinder"}>
          {stream ? (
            <video ref={videoRef} autoPlay playsInline muted />
          ) : previewUrl ? (
            <div className="camera-photo-preview" role="img" aria-label="Photo ready to submit" style={{ backgroundImage: `url("${previewUrl}")` }} />
          ) : (
            <div className="camera-viewfinder__empty">
              <Camera size={42} strokeWidth={1.5} aria-hidden="true" />
              <span>LOOK FOR THE CRANE</span>
            </div>
          )}
          <span className="viewfinder-mark viewfinder-mark--top-left" aria-hidden="true" />
          <span className="viewfinder-mark viewfinder-mark--top-right" aria-hidden="true" />
          <span className="viewfinder-mark viewfinder-mark--bottom-left" aria-hidden="true" />
          <span className="viewfinder-mark viewfinder-mark--bottom-right" aria-hidden="true" />
          {stream && <span className="camera-live-tag"><i /> LIVE</span>}
        </div>

        <div className="camera-controls">
          {success ? (
            <div className="camera-result" role="status">
              <div className="camera-result__heading"><Check size={19} aria-hidden="true" /><span>SHOT SPENT</span></div>
              <p>{success.message}</p>
              <p>{success.remainingSubmissions} {success.remainingSubmissions === 1 ? "shot" : "shots"} remaining today</p>
              {success.remainingSubmissions > 0 && <button className="camera-button camera-button--secondary" type="button" onClick={resetForAnotherPhoto}><Camera size={17} aria-hidden="true" /> Take another</button>}
            </div>
          ) : stream ? (
            <button className="camera-button camera-button--primary" type="button" onClick={capturePhoto}><Camera size={18} aria-hidden="true" /> Take photo</button>
          ) : previewUrl ? (
            <>
              <p className="camera-review-label">PHOTO READY / {((photo?.size ?? 0) / 1024 / 1024).toFixed(1)} MB</p>
              <div className="camera-button-row">
                <button className="camera-button camera-button--secondary" type="button" onClick={retakePhoto} disabled={isPending}><RotateCcw size={17} aria-hidden="true" /> Retake</button>
                <button className="camera-button camera-button--primary" type="button" onClick={submitPhoto} disabled={isPending || remaining === 0}>
                  <Upload size={17} aria-hidden="true" /> {isPending ? "Submitting..." : "Submit photo"}
                </button>
              </div>
            </>
          ) : (
            <>
              <button className="camera-button camera-button--primary" type="button" onClick={openCamera} disabled={remaining === 0 || isOpening}>
                <Camera size={18} aria-hidden="true" /> {remaining === 0 ? "No shots left today" : isOpening ? "Preparing image..." : "Open camera"}
              </button>
              <button className="camera-button camera-button--secondary" type="button" onClick={() => fileInputRef.current?.click()} disabled={remaining === 0 || isOpening}>
                <FolderOpen size={17} aria-hidden="true" /> Choose from files
              </button>
              <input ref={fileInputRef} className="camera-file-input" type="file" accept="image/*" aria-label="Choose a crane photo from your files" onChange={choosePhoto} />
            </>
          )}
          {previewUrl && photoSource === "file" && <p className="camera-feedback">File upload score multiplier: ×0.75 maximum.</p>}
          {cameraError && <p className="camera-feedback camera-feedback--error" role="alert">{cameraError}</p>}
          {message && <p className="camera-feedback camera-feedback--error" role="alert">{message}</p>}
          {diagnosticReport && (
            <details className="submission-diagnostics" open>
              <summary>Temporary upload diagnostics</summary>
              <p>This report contains request details and file sizes only; it does not contain the photo or credentials.</p>
              <button className="camera-button camera-button--secondary" type="button" onClick={() => void copyDiagnosticReport()}>
                Copy diagnostic report
              </button>
              {diagnosticCopyMessage && <p role="status">{diagnosticCopyMessage}</p>}
              <pre>{JSON.stringify(diagnosticReport, null, 2)}</pre>
            </details>
          )}
          {remaining === null && <p className="camera-feedback" role="status">Daily count is unavailable; the server still checks the limit on submission.</p>}
        </div>
      </div>
    </section>
  );
}