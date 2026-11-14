import PageHeader from "@/components/PageHeader";

// Overview page. Built in C4: stat cards, daily line chart, category donut,
// top merchants. Uses GET /summary and GET /bank/account.
export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" subtitle="Your last 30 days at a glance" />
      <p className="text-sm text-neutral-500">Coming in C4.</p>
    </>
  );
}
