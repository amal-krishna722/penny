import PageHeader from "@/components/PageHeader";

// Ask AI page. Built in C6: chat box, suggested questions, tool chips.
// Uses POST /ask.
export default function AskPage() {
  return (
    <>
      <PageHeader title="Ask AI" subtitle="Questions about your spending, answered from your data" />
      <p className="text-sm text-neutral-500">Coming in C6.</p>
    </>
  );
}
