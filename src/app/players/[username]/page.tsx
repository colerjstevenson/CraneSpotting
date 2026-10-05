import type { Metadata } from "next";
import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SubmissionVisibilityControl } from "@/components/submission-visibility-control";
import { getCurrentPlayer } from "@/lib/auth";
import type { CraneType } from "@/lib/crane-analysis-contract";
import { getPlayerProfile, type PlayerGalleryTab, type PlayerProfile } from "@/lib/player-profiles";

export const metadata: Metadata = { title: "Player profile" };
export const dynamic = "force-dynamic";

const craneTitles: Record<CraneType, string> = {
  none: "Not a crane",
  bird: "Bird crane",
  construction: "Construction crane",
  artwork: "Crane artwork",
  master_crane: "Master Crane",
};

const rejectionTitles: Record<string, string> = {
  not_crane: "No crane spotted",
  low_confidence: "Could not verify a crane",
  master_reproduction: "Master Crane reproduction",
  artwork_not_physical: "Artwork not photographed in person",
};

function galleryHref(username: string, tab: PlayerGalleryTab, page = 1) {
  const query = new URLSearchParams();
  if (tab === "not-cranes") query.set("tab", tab);
  if (page > 1) query.set("page", String(page));
  return `/players/${username}${query.size ? `?${query}` : ""}`;
}

type PlayerProfilePageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string | string[]; tab?: string | string[] }>;
};

function parsePage(value: string | string[] | undefined) {
  if (value === undefined) return 1;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;

  const page = Number(value);
  return Number.isSafeInteger(page) && page <= 1_000_000 ? page : null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}

function ProfileGallery({ profile, owner }: { profile: PlayerProfile; owner: boolean }) {
  const notCranes = profile.galleryTab === "not-cranes";

  return (
    <section className="player-gallery" aria-labelledby="player-gallery-title">
      <div className="player-gallery__heading">
        <div>
          <h2 id="player-gallery-title">Spotting gallery</h2>
        </div>
        <span>{profile.galleryCount} {notCranes ? "REJECTED" : profile.galleryCount === 1 ? "CRANE" : "CRANES"}</span>
      </div>

      <nav className="player-gallery__tabs" aria-label="Gallery category">
        <Link href={galleryHref(profile.username, "cranes")} aria-current={!notCranes ? "page" : undefined}>Cranes</Link>
        <Link href={galleryHref(profile.username, "not-cranes")} aria-current={notCranes ? "page" : undefined}>Not Cranes</Link>
      </nav>

      {profile.submissions.length > 0 ? (
        <div className="player-gallery__grid">
          {profile.submissions.map((submission) => {
            const isBird = submission.craneType === "bird";
            const imageSource = submission.imageUrl
              ?? (isBird ? "/bird_crane.svg" : "/tower_crane.svg");
            const imageDescription = submission.imageHidden
              ? "Photo hidden"
              : submission.imageUrl
                ? `${craneTitles[submission.craneType]} submission`
                : "Photo unavailable";

            return (
              <article className="player-gallery__item" key={submission.id}>
                <div className={`player-gallery__image${submission.imageUrl ? "" : " player-gallery__image--placeholder"}`}>
                  {submission.craneType === "none" && !submission.imageUrl ? (
                    <ImageOff size={48} aria-hidden="true" />
                  ) : <Image
                    src={imageSource}
                    alt={submission.imageUrl ? imageDescription : ""}
                    fill
                    sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                    unoptimized={Boolean(submission.imageUrl)}
                  />}
                  {!submission.imageUrl && (
                    <span className="player-gallery__image-status">{imageDescription}</span>
                  )}
                </div>
                <div className="player-gallery__details">
                  <div className="player-gallery__scoreline">
                    <span>{submission.rejectionReason
                      ? rejectionTitles[submission.rejectionReason] ?? "Rejected"
                      : craneTitles[submission.craneType]}</span>
                    {!notCranes && <strong>{submission.score.toLocaleString("en-US")} PTS</strong>}
                  </div>
                  <time dateTime={submission.createdAt}>{formatDate(submission.createdAt)}</time>
                  {owner && (
                    <SubmissionVisibilityControl submissionId={submission.id} hidden={submission.imageHidden} galleryTab={profile.galleryTab} />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="player-gallery__empty">{notCranes ? "No rejected photos yet." : "No cranes in this field collection yet."}</p>
      )}

      {profile.pageCount > 1 && (
        <nav className="player-gallery__pagination" aria-label="Gallery pages">
          {profile.page > 1 ? (
            <Link href={galleryHref(profile.username, profile.galleryTab, profile.page - 1)}>
              Newer photos
            </Link>
          ) : <span />}
          <span>PAGE {profile.page} / {profile.pageCount}</span>
          {profile.page < profile.pageCount ? (
            <Link href={galleryHref(profile.username, profile.galleryTab, profile.page + 1)}>Older photos</Link>
          ) : <span />}
        </nav>
      )}
    </section>
  );
}

export default async function PlayerProfilePage({ params, searchParams }: PlayerProfilePageProps) {
  const [{ username }, { page: pageParam, tab: tabParam }, currentPlayer] = await Promise.all([
    params,
    searchParams,
    getCurrentPlayer(),
  ]);
  if (!/^[a-z0-9_]{3,20}$/.test(username)) notFound();

  const galleryTab: PlayerGalleryTab = tabParam === "not-cranes" ? "not-cranes" : "cranes";
  const page = parsePage(pageParam);
  if (page === null) redirect(galleryHref(username, galleryTab));

  const result = await getPlayerProfile(username, page, galleryTab);
  if (result.status === "not-found") notFound();

  if (result.status !== "ready") {
    return (
      <>
        <section className="page-intro" aria-labelledby="profile-title">
          <p className="page-kicker">SPOTTER PROFILE</p>
          <h1 className="page-title player-profile__title" id="profile-title">Player profile</h1>
        </section>
        <p className="player-profile__message" role="status">
          {result.status === "not-configured"
            ? "Player profiles are unavailable until the database is connected."
            : "This profile couldn't load. Try again soon."}
        </p>
      </>
    );
  }

  const { profile } = result;
  if (page > profile.pageCount) {
    redirect(galleryHref(username, galleryTab, profile.pageCount));
  }

  const owner = currentPlayer?.id === profile.id;

  return (
    <>
      <section className="page-intro" aria-labelledby="profile-title">
        <p className="page-kicker">SPOTTER PROFILE / @{profile.username}</p>
        <h1 className="page-title player-profile__title" id="profile-title">{profile.displayName}</h1>
      </section>

      <section className="player-profile__summary" aria-label={`${profile.displayName}'s Crane Spotting stats`}>
        <div className="player-profile__stat">
          <span>LEADERBOARD RANK</span>
          <strong>#{profile.rank}</strong>
        </div>
        <div className="player-profile__stat">
          <span>TOTAL POINTS</span>
          <strong>{profile.points.toLocaleString("en-US")}</strong>
        </div>
        <div className="player-profile__stat">
          <span>CRANES SPOTTED</span>
          <strong>{profile.cranes.toLocaleString("en-US")}</strong>
        </div>
        <div className="player-profile__stat player-profile__stat--best">
          <span>BEST CRANE</span>
          {profile.bestCrane ? (
            <strong>{craneTitles[profile.bestCrane.craneType]} / {profile.bestCrane.score.toLocaleString("en-US")} PTS</strong>
          ) : <strong>Not yet spotted</strong>}
        </div>
      </section>

      <ProfileGallery profile={profile} owner={owner} />
      <p className="player-profile__back"><Link href="/leaderboard">Back to the leaderboard</Link></p>
    </>
  );
}