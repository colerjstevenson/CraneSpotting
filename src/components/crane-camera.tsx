"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, RotateCcw, Upload } from "lucide-react";
import { submitCrane } from "@/app/actions/submissions";

const dailyLimit = 3;
const maxImageBytes = 5 * 1024 * 1024;
const maxAnalysisImageBytes = 256 * 1024;

type CraneCameraProps = {
  initialAttemptsToday: number | null;
};

type SubmissionSuccess = {
  accepted: false;
  message: string;
  attemptsToday: number;
  remainingSubmissions: number;
};

export function CraneCamera({ initialAttemptsToday }: CraneCameraProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [analysisPhoto, setAnalysisPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [message, setMessage] = useState("");
  const [attemptsToday, setAttemptsToday] = useState(initialAttemptsToday);
  const [success, setSuccess] = useState<SubmissionSuccess | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const now = new Date();
    const nextUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const timeout = window.setTimeout(() => router.refresh(), nextUtcMidnight - now.getTime() + 250);
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

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, height: { ideal: 1440 }, width: { ideal: 1920 } },
      });
      setStream(cameraStream);
    } catch (error) {
      setCameraError(error instanceof DOMException && error.name === "NotAllowedError"
        ? "Camera permission was denied. Allow camera access in your browser settings and try again."
        : "We couldn't open the camera. Check that no other app is using it, then try again.");
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("The camera is still getting ready. Try again in a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("We couldn't prepare that photo. Try again.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      let photoBlob: Blob | null = null;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        photoBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84 - attempt * 0.1));
        if (photoBlob && photoBlob.size <= maxImageBytes) break;
        canvas.width = Math.round(canvas.width * 0.82);
        canvas.height = Math.round(canvas.height * 0.82);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      if (!photoBlob || photoBlob.type !== "image/jpeg" || photoBlob.size > maxImageBytes) {
        setCameraError("This photo is too large to submit. Try a closer, simpler shot.");
        return;
      }

      const nextPhoto = new File([photoBlob], "crane.jpg", { type: "image/jpeg" });
      const analysisCanvas = document.createElement("canvas");
      const analysisScale = Math.min(1, 512 / Math.max(canvas.width, canvas.height));
      analysisCanvas.width = Math.max(1, Math.round(canvas.width * analysisScale));
      analysisCanvas.height = Math.max(1, Math.round(canvas.height * analysisScale));
      const analysisContext = analysisCanvas.getContext("2d");
      if (!analysisContext) {
        setCameraError("We couldn't prepare this photo for crane analysis. Try again.");
        return;
      }
      analysisContext.drawImage(canvas, 0, 0, analysisCanvas.width, analysisCanvas.height);
      const analysisBlob = await new Promise<Blob | null>((resolve) => analysisCanvas.toBlob(resolve, "image/jpeg", 0.58));
      if (!analysisBlob || analysisBlob.size > maxAnalysisImageBytes) {
        setCameraError("We couldn't prepare this photo for crane analysis. Try again.");
        return;
      }

      setPhoto(nextPhoto);
      setAnalysisPhoto(new File([analysisBlob], "crane-analysis.jpg", { type: "image/jpeg" }));
      setPreviewUrl(URL.createObjectURL(nextPhoto));
      setStream(null);
      setCameraError("");
      setMessage("");
    } catch {
      setCameraError("We couldn't prepare that photo. Try again.");
    }
  }

  function retakePhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(null);
    setAnalysisPhoto(null);
    setPreviewUrl(null);
    setSuccess(null);
    setMessage("");
    void openCamera();
  }

  function submitPhoto() {
    if (!photo || !analysisPhoto) return;
    const formData = new FormData();
    formData.set("image", photo);
    formData.set("analysisImage", analysisPhoto);
    setMessage("");

    startTransition(async () => {
      try {
        const result = await submitCrane(formData);
        if (result.status !== "success" && result.status !== "rejected") {
          setMessage(result.message);
          if (result.status === "limit") setAttemptsToday(dailyLimit);
          return;
        }
        if (result.status === "success") {
          router.push(`/reports/${encodeURIComponent(result.submissionId)}`);
          return;
        }
        setAttemptsToday(result.attemptsToday);
        setSuccess({ accepted: false, message: result.message, attemptsToday: result.attemptsToday, remainingSubmissions: result.remainingSubmissions });
      } catch {
        setMessage("Submission is unavailable right now. Please try again shortly.");
      }
    });
  }

  function resetForAnotherPhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(null);
    setAnalysisPhoto(null);
    setPreviewUrl(null);
    setSuccess(null);
    setMessage("");
    setCameraError("");
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
            <button className="camera-button camera-button--primary" type="button" onClick={openCamera} disabled={remaining === 0}>
              <Camera size={18} aria-hidden="true" /> {remaining === 0 ? "No shots left today" : "Open camera"}
            </button>
          )}
          {cameraError && <p className="camera-feedback camera-feedback--error" role="alert">{cameraError}</p>}
          {message && <p className="camera-feedback camera-feedback--error" role="alert">{message}</p>}
          {remaining === null && <p className="camera-feedback" role="status">Daily count is unavailable; the server still checks the limit on submission.</p>}
        </div>
      </div>
    </section>
  );
}