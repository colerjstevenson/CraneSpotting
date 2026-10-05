export default function TopCranesLoading() {
  return (
    <>
      <section className="page-intro" aria-hidden="true">
        <h1 className="page-title">HALL OF<br />CRANES</h1>
        <p className="page-description">The five highest-scoring crane sightings of all time.</p>
      </section>
      <section className="top-cranes" aria-label="Loading all-time crane records" aria-busy="true">
        <div className="top-cranes__banner"><span>LOADING RECORDS</span></div>
        <div className="top-cranes__grid">
          {Array.from({ length: 5 }, (_, index) => (
            <div className={`top-crane-skeleton${index === 0 ? " top-crane-skeleton--champion" : ""}`} key={index} />
          ))}
        </div>
      </section>
    </>
  );
}