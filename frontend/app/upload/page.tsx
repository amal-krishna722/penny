import PageHeader from "@/components/PageHeader";

// Upload page. Built in C3: drag-and-drop receipt upload, the backup if the
// iPhone Shortcut fails on stage. Uses POST /receipt?source=web_upload.
export default function UploadPage() {
  return (
    <>
      <PageHeader title="Upload" subtitle="Drop a receipt photo to itemize it" />
      <p className="text-sm text-neutral-500">Coming in C3.</p>
    </>
  );
}
