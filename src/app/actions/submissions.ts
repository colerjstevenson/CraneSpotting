"use server";

import { revalidatePath } from "next/cache";
import { requirePlayer } from "@/lib/auth";
import { analyzeCrane, CraneAnalysisUnavailableError } from "@/lib/crane-analysis";
import { calculateCraneScore, type CraneType } from "@/lib/crane-scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bucket = "crane-submissions";
const maxImageBytes = 5 * 1024 * 1024;
const maxAnalysisImageBytes = 256 * 1024;

export type SubmissionDiagnostic = {
  requestId: string;
  stage: "input_validation" | "setup" | "daily_limit" | "analysis" | "storage" | "finalization" | "confirmation" | "revalidation";
  code: string;
};

type SubmissionActionError = {
  status: "error";
  message: string;
  diagnostic: SubmissionDiagnostic;
};

export type SubmissionActionResult =
  | {
      status: "success";
      accepted: true;
      submissionId: string;
      craneType: Exclude<CraneType, "none">;
      score: number;
      scoreBreakdown: Record<string, number>;
      attemptsToday: number;
      remainingSubmissions: number;
    }
  | {
      status: "rejected";
      reason: "not_crane" | "low_confidence" | "master_reproduction" | "artwork_not_physical";
      message: string;
      attemptsToday: number;
      remainingSubmissions: number;
    }
  | { status: "limit"; message: string }
  | SubmissionActionError;

function submissionError(
  requestId: string,
  stage: SubmissionDiagnostic["stage"],
  code: string,
  message: string,
): SubmissionActionError {
  return { status: "error", message, diagnostic: { requestId, stage, code } };
}

function logSubmissionStage(requestId: string, stage: SubmissionDiagnostic["stage"]) {
  console.info("Crane submission diagnostic:", { requestId, stage });
}

async function removeUploadedImage(supabase: Awaited<ReturnType<typeof createClient>>, objectPath: string) {
  try {
    const { error } = await supabase.storage.from(bucket).remove([objectPath]);
    if (error) console.error("Failed to remove an unsubmitted crane photo:", error);
  } catch (error) {
    console.error("Failed to remove an unsubmitted crane photo:", error);
  }
}

async function hasJpegSignature(image: File) {
  const signature = new Uint8Array(await image.slice(0, 3).arrayBuffer());
  return signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
}

export async function submitCrane(formData: FormData): Promise<SubmissionActionResult> {
  const formRequestId = formData.get("diagnosticId");
  const requestId = typeof formRequestId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formRequestId)
    ? formRequestId
    : crypto.randomUUID();
  const player = await requirePlayer();
  const image = formData.get("image");
  const analysisImage = formData.get("analysisImage");
  const maximumAuthenticityMultiplier = formData.get("source") === "file" ? 0.75 : 1;

  logSubmissionStage(requestId, "input_validation");
  console.info("Crane submission image metadata:", {
    requestId,
    source: formData.get("source") === "file" ? "file" : "camera",
    image: image instanceof File ? { type: image.type, sizeBytes: image.size } : null,
    analysisImage: analysisImage instanceof File ? { type: analysisImage.type, sizeBytes: analysisImage.size } : null,
  });

  if (!(image instanceof File) || image.size === 0) {
    return submissionError(requestId, "input_validation", "missing_photo", "Take a photo before submitting.");
  }
  if (image.type !== "image/jpeg" || image.size > maxImageBytes) {
    return submissionError(requestId, "input_validation", "invalid_photo_type_or_size", "Use a JPEG photo that is 5 MB or less.");
  }
  if (!(analysisImage instanceof File) || analysisImage.type !== "image/jpeg"
    || analysisImage.size === 0 || analysisImage.size > maxAnalysisImageBytes) {
    return submissionError(requestId, "input_validation", "invalid_analysis_image", "We couldn't prepare that photo for crane analysis. Retake it and try again.");
  }
  try {
    if (!await hasJpegSignature(image) || !await hasJpegSignature(analysisImage)) {
      return submissionError(requestId, "input_validation", "invalid_jpeg_signature", "That photo does not look like a valid JPEG.");
    }
  } catch (error) {
    console.error("Crane submission input validation failed:", { requestId, error });
    return submissionError(requestId, "input_validation", "jpeg_signature_check_failed", "We couldn't check that photo. Please choose it again.");
  }

  const objectPath = `${player.id}/${crypto.randomUUID()}.jpg`;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let uploaded = false;
  let stage: SubmissionDiagnostic["stage"] = "setup";

  try {
    logSubmissionStage(requestId, stage);
    supabase = await createClient();

    stage = "daily_limit";
    logSubmissionStage(requestId, stage);
    const { data: currentCount, error: countError } = await supabase.rpc("get_daily_submission_count");
    if (countError) {
      console.error("Crane submission daily limit check failed:", { requestId, error: countError });
      return submissionError(requestId, stage, "count_query_failed", "We couldn't check today's submission limit. Please try again.");
    }
    if (Number(currentCount) >= 3) {
      return { status: "limit", message: "You've used all 3 crane submissions for today. Come back tomorrow." };
    }

    stage = "analysis";
    logSubmissionStage(requestId, stage);
    const analysis = await analyzeCrane(new Uint8Array(await analysisImage.arrayBuffer()));
    const score = calculateCraneScore(analysis, maximumAuthenticityMultiplier);

    stage = "storage";
    logSubmissionStage(requestId, stage);
    const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, image, {
      cacheControl: "31536000",
      contentType: "image/jpeg",
      upsert: false,
    });

    if (uploadError) {
      console.error("Crane submission storage upload failed:", { requestId, error: uploadError });
      return submissionError(requestId, stage, "storage_upload_failed", "We couldn't store that photo. Please try again.");
    }
    uploaded = true;

    stage = "finalization";
    logSubmissionStage(requestId, stage);
    const { data, error } = await createAdminClient().rpc("finalize_crane_submission", {
      p_user_id: player.id,
      p_accepted: score.accepted,
      p_rejection_reason: score.accepted ? null : score.reason,
      p_image_path: objectPath,
      p_crane_type: score.accepted ? analysis.craneType : null,
      p_ai_confidence: score.accepted ? analysis.confidence : null,
      p_score: score.accepted ? score.score : null,
      p_score_breakdown: score.accepted ? score.breakdown : null,
    });

    if (error) {
      if (uploaded) await removeUploadedImage(supabase, objectPath);
      uploaded = false;
      if (error.message.includes("daily_limit_reached")) {
        return { status: "limit", message: "You've used all 3 crane submissions for today. Come back tomorrow." };
      }
      console.error("Failed to finalize crane submission:", { requestId, error });
      return submissionError(requestId, stage, "finalization_failed", "We couldn't submit that crane. Please try again.");
    }

    uploaded = false;
    stage = "confirmation";
    const result = Array.isArray(data) ? data[0] : data;
    if (!result || typeof result.submissions_today !== "number" || typeof result.remaining_submissions !== "number"
      || (score.accepted && typeof result.submission_id !== "string")) {
      return submissionError(requestId, stage, "invalid_finalization_result", "We couldn't confirm your submission. Please try again.");
    }

    stage = "revalidation";
    logSubmissionStage(requestId, stage);
    revalidatePath("/submit");
    if (player.username) revalidatePath(`/players/${player.username}`);
    if (score.accepted) {
      revalidatePath("/");
      revalidatePath("/leaderboard");
      return {
        status: "success",
        accepted: true,
        submissionId: result.submission_id,
        craneType: analysis.craneType as Exclude<CraneType, "none">,
        score: score.score,
        scoreBreakdown: score.breakdown,
        attemptsToday: result.submissions_today,
        remainingSubmissions: result.remaining_submissions,
      };
    }

    const rejectionMessages = {
      not_crane: "No crane spotted. Who are you trying to fool! Stop playing games!",
      low_confidence: "We couldn't confidently verify a crane in that photo. That shot still counts.",
      master_reproduction: "Master Crane needs to be spotted in the real world, not on a screen or as a reused image.",
      artwork_not_physical: "Crane artwork only counts when the physical artwork is photographed in the real world.",
    };
    return {
      status: "rejected",
      reason: score.reason,
      message: rejectionMessages[score.reason],
      attemptsToday: result.submissions_today,
      remainingSubmissions: result.remaining_submissions,
    };
  } catch (error) {
    if (uploaded && supabase) await removeUploadedImage(supabase, objectPath);
    if (error instanceof CraneAnalysisUnavailableError) {
      return submissionError(requestId, stage, "analysis_unavailable", "Crane analysis is unavailable right now. Please try again shortly.");
    }
    console.error("Crane submission failed:", { requestId, stage, error });
    return submissionError(requestId, stage, "unexpected_server_error", "Submission is unavailable right now. Please try again shortly.");
  }
}