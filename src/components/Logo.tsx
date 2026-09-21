import Link from "next/link";
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Digital Heroes home">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="#0E9F8E" />
        <path d="M16 24.5s-8-4.9-8-10.6A4.6 4.6 0 0 1 16 11a4.6 4.6 0 0 1 8 2.9c0 5.7-8 10.6-8 10.6z" fill="#fff" />
        <circle cx="24.5" cy="7.5" r="3.2" fill="#FFB547" />
      </svg>
      <span className={`font-display text-lg font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>digital heroes</span>
    </Link>
  );
}
