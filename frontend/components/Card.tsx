// The box used across pages. The look itself (border, radius, shadow) is the
// `card` class in app/globals.css.
export default function Card({
  title,
  action,
  className = "",
  children,
}: {
  title?: string;
  action?: React.ReactNode; // optional small thing on the right of the title, like a link
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg text-text">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
