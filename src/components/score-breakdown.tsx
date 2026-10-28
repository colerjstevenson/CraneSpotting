import type { CraneType } from "@/lib/crane-analysis-contract";
import { formatBreakdownTitle, getScoreCalculation } from "@/lib/score-breakdown";

type ScoreBreakdownProps = {
  breakdown: Record<string, number>;
  craneType: CraneType;
  score: number;
  detailed?: boolean;
  label?: string;
};

export function ScoreBreakdown({ breakdown, craneType, score, detailed = false, label }: ScoreBreakdownProps) {
  const calculation = getScoreCalculation(breakdown);
  const entries = calculation?.entries.filter(([key, value]) => (detailed || value !== 0) && (key !== "master_crane_bonus" || value !== 0)) ?? [];
  const multiplier = calculation?.multiplier;

  return (
    <section className="crane-report__breakdown" aria-label="Score breakdown">
      <div className="crane-report__section-heading">
        <h2>SCORE BREAKDOWN</h2>
        {label && <span>{label}</span>}
      </div>
      {entries.length > 0 ? (
        <ul>
          {entries.map(([key, value]) => (
            <li key={key}>
              <span>{formatBreakdownTitle(key, craneType)}</span>
              <strong>{value >= 0 ? "+" : ""}{value.toLocaleString("en-US")}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="crane-report__no-breakdown">The score breakdown is unavailable for this sighting.</p>
      )}
      {detailed && calculation && (
        <p className="crane-report__multiplier">
          Point subtotal: {calculation.subtotal.toLocaleString("en-US")}.
          {typeof multiplier === "number"
            ? <> Authenticity factor: &times;{multiplier.toLocaleString("en-US", { maximumFractionDigits: 4 })}.
              {" "}{calculation.subtotal.toLocaleString("en-US")} &times; {multiplier.toLocaleString("en-US", { maximumFractionDigits: 4 })}
              {" "}= {calculation.adjusted?.toLocaleString("en-US", { maximumFractionDigits: 4 })};
              {" "}rounded to the nearest whole point.</>
            : " No authenticity factor was recorded."}
          {" "}Recorded award: {score.toLocaleString("en-US")} points.
        </p>
      )}
      {!detailed && typeof multiplier === "number" && multiplier !== 1 && (
        <p className="crane-report__multiplier">
          Point subtotal adjusted by an authenticity factor of &times;{multiplier.toLocaleString("en-US", { maximumFractionDigits: 2 })}.
        </p>
      )}
    </section>
  );
}
