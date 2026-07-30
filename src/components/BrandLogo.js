import Link from "next/link";

export default function BrandLogo({
  href = "/",
  subtitle = "Easy Website",
  compact = false,
  className = "",
}) {
  const content = (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg"
        alt="Technonaire"
        className={compact ? "h-8 w-auto" : "h-9 w-auto md:h-10"}
      />
      <span className="leading-tight">
        <span className="block bg-gradient-to-r from-cyan-200 to-blue-300 bg-clip-text text-sm font-bold tracking-[0.16em] text-transparent uppercase md:text-base">
          Technonaire
        </span>
        {subtitle ? (
          <span
            className={`block font-[family-name:var(--font-display)] font-semibold text-white ${
              compact ? "text-sm" : "text-base md:text-lg"
            }`}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="transition hover:opacity-90">
      {content}
    </Link>
  );
}
