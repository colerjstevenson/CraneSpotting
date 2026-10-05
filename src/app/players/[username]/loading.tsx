export default function PlayerProfileLoading() {
  return (
    <>
      <section className="page-intro" aria-hidden="true">
        <p className="page-kicker">SPOTTER PROFILE</p>
        <h1 className="page-title player-profile__title">Loading profile</h1>
      </section>
      <section className="player-profile__summary profile-loading" aria-label="Loading player statistics" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => <div className="profile-loading__stat" key={index} />)}
      </section>
      <section className="player-gallery" aria-label="Loading spotting gallery" aria-busy="true">
        <div className="player-gallery__heading"><h2>Spotting gallery</h2></div>
        <div className="player-gallery__grid">{Array.from({ length: 3 }, (_, index) => <div className="profile-loading__photo" key={index} />)}</div>
      </section>
    </>
  );
}