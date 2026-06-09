export const STATUSES = [
  "new",
  "contacted",
  "in_progress",
  "closed_won",
  "closed_lost",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  in_progress: "In progress",
  closed_won: "Closed · won",
  closed_lost: "Closed · lost",
};

export const STATUS_CLASS: Record<string, string> = {
  new: "bg-amber/15 text-amber border-amber/30",
  contacted: "bg-sage text-pine-dark border-pine/20",
  in_progress: "bg-sage text-pine-dark border-pine/20",
  closed_won: "bg-pine text-paper border-pine",
  closed_lost: "bg-ink/5 text-ink/50 border-line",
};

// Default strategic-alliance categories for 1-on-1s. Edit this list freely.
export const STRATEGIC_ALLIANCES = [
  "Real Estate Agents",
  "Mortgage / Loan Officers",
  "Financial Advisors",
  "Insurance Agents",
  "Attorneys",
  "Accountants / CPAs",
  "Title & Escrow",
  "Home Inspectors",
  "Contractors / Builders",
  "Interior Designers",
  "Property Managers",
  "Marketing & Advertising",
  "Web & IT Services",
  "Health & Wellness",
  "Auto Services",
  "Other",
] as const;

export function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function firstName(name: string) {
  return (name || "").trim().split(/\s+/)[0] || "this member";
}

export function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
