"use server";

import { revalidatePath } from "next/cache";
import { requirePlayer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProfileActionState = { message: string } | null;

export async function setSubmissionVisibility(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const player = await requirePlayer();
  const submissionId = formData.get("submissionId");
  const imageHiddenValue = formData.get("imageHidden");
  const galleryTab = formData.get("galleryTab") ?? "cranes";

  if (typeof submissionId !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)
    || (imageHiddenValue !== "true" && imageHiddenValue !== "false")
    || (galleryTab !== "cranes" && galleryTab !== "not-cranes")) {
    return { message: "That photo could not be updated. Refresh the page and try again." };
  }

  const { data, error } = await createAdminClient()
    .from(galleryTab === "not-cranes" ? "crane_submission_attempts" : "crane_submissions")
    .update({ image_hidden: imageHiddenValue === "true" })
    .eq("id", submissionId)
    .eq("user_id", player.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to update submission photo visibility:", error);
    return { message: "We couldn't update that photo. Please try again." };
  }
  if (!data) return { message: "That photo could not be found on your profile." };

  if (player.username) revalidatePath(`/players/${player.username}`);
  return null;
}