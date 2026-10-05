"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState } from "react";
import { setSubmissionVisibility } from "@/app/actions/profiles";
import type { PlayerGalleryTab } from "@/lib/player-profiles";

type SubmissionVisibilityControlProps = {
  submissionId: string;
  hidden: boolean;
  galleryTab?: PlayerGalleryTab;
};

export function SubmissionVisibilityControl({ submissionId, hidden, galleryTab = "cranes" }: SubmissionVisibilityControlProps) {
  const [state, action, pending] = useActionState(setSubmissionVisibility, null);

  return (
    <form action={action} className="profile-photo-control">
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="galleryTab" value={galleryTab} />
      <input type="hidden" name="imageHidden" value={String(!hidden)} />
      <button type="submit" disabled={pending} aria-label={hidden ? "Show photo" : "Hide photo"}>
        {hidden ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
        <span>{pending ? "Updating..." : hidden ? "Show photo" : "Hide photo"}</span>
      </button>
      {state && <p role="status">{state.message}</p>}
    </form>
  );
}