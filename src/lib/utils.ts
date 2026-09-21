import clsx, { type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

/** paise (integer) → "₹1,234" / "₹1,234.50" (Indian digit grouping) */
export function formatINR(paise: number, opts: { compact?: boolean } = {}) {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    ...(opts.compact ? { notation: "compact" as const } : {}),
  }).format(rupees);
}

export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
