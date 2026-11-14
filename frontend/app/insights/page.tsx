import PageHeader from "@/components/PageHeader";

// Insights page. Built in C5: subscription cards and monthly total.
// Uses GET /subscriptions.
export default function InsightsPage() {
  return (
    <>
      <PageHeader title="Insights" subtitle="Recurring charges and patterns" />
      <p className="text-sm text-neutral-500">Coming in C5.</p>
    </>
  );
}
