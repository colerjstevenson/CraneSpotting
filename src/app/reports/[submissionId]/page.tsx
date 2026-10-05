import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CraneReportView } from "@/components/crane-report";
import { requirePlayer } from "@/lib/auth";
import { getCraneReport } from "@/lib/crane-reports";

export const metadata: Metadata = { title: "Crane report" };
export const dynamic = "force-dynamic";

type CraneReportPageProps = {
  params: Promise<{ submissionId: string }>;
};

export default async function CraneReportPage({ params }: CraneReportPageProps) {
  const { submissionId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)) notFound();

  const player = await requirePlayer(`/reports/${submissionId}`);
  const report = await getCraneReport(submissionId, player.id);
  if (!report) notFound();

  return <CraneReportView report={report} />;
}