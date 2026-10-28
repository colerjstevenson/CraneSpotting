"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ScoreBreakdown } from "@/components/score-breakdown";
import type { CraneType } from "@/lib/crane-analysis-contract";

type SubmissionDetailProps = {
  imageUrl: string | null;
  title: string;
  craneType: CraneType;
  score: number;
  scoreBreakdown: Record<string, number>;
  createdAt: string;
  rejectionReason?: string | null;
};

function DetailDialog({ imageUrl, title, craneType, score, scoreBreakdown, createdAt, rejectionReason, onClose }: SubmissionDetailProps & { imageUrl: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialog}
      className="submission-detail"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
    >
      <header className="submission-detail__header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close image details" autoFocus><X size={24} aria-hidden="true" /></button>
      </header>
      <div className="submission-detail__body">
        <div className="submission-detail__photo">
          {imageFailed ? (
            <p role="alert">This photo could not load. Close this view and refresh the page to try again.</p>
          ) : (
            <Image src={imageUrl} alt={`${title} submission`} fill sizes="(max-width: 760px) 100vw, 65vw" style={{ objectFit: "contain" }} unoptimized onError={() => setImageFailed(true)} />
          )}
        </div>
        <div className="submission-detail__details">
          <time dateTime={createdAt}>{new Date(createdAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>
          <p className="submission-detail__score">{rejectionReason ? 0 : score.toLocaleString("en-US")} <span>POINTS</span></p>
          {rejectionReason ? (
            <section aria-label="Why no points were awarded">
              <h3>NO POINTS AWARDED</h3>
              <p>{rejectionReason}. This submission was rejected and did not add points to the leaderboard.</p>
            </section>
          ) : <ScoreBreakdown breakdown={scoreBreakdown} craneType={craneType} score={score} detailed />}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

export function SubmissionDetail(props: SubmissionDetailProps) {
  const [open, setOpen] = useState(false);
  if (!props.imageUrl) return null;

  return (
    <>
      <button
        type="button"
        className="submission-detail-trigger"
        aria-label={`View image and score details: ${props.title}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      />
      {open && <DetailDialog {...props} imageUrl={props.imageUrl} onClose={() => setOpen(false)} />}
    </>
  );
}
