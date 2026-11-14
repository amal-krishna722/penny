// "Get the iPhone Shortcut" card with a QR code. Scanning it on an iPhone
// opens the Shortcut install page (the image lives in public/shortcut-qr.png).
import Image from "next/image";

export default function ShortcutQR() {
  return (
    <section className="card flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center">
      {/* White padding around the code: scanners need a light "quiet zone" */}
      <div className="shrink-0 rounded-[10px] border border-border bg-white p-2">
        <Image src="/shortcut-qr.png" alt="QR code to install the Penny iPhone Shortcut" width={140} height={140} />
      </div>
      <div className="text-center sm:text-left">
        <h2 className="text-lg text-text">Get the iPhone Shortcut</h2>
        <p className="mt-1 text-sm text-text-muted">
          Scan with your iPhone camera to install it. Then double-tap the back of your phone to snap a receipt.
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Set it up in Settings → Accessibility → Touch → Back Tap → Double Tap.
        </p>
      </div>
    </section>
  );
}
