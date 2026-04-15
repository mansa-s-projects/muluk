/**
 * Brand Deal — type definitions + helpers
 */

export interface BrandDeal {
  id: string;
  creator_id: string;
  brand_name: string;
  contact_name: string | null;
  contact_email: string | null;
  amount_cents: number;
  currency: string;
  deadline: string | null;
  deliverables: string | null;
  notes: string | null;
  tags: string[] | null;
  status: "pending" | "active" | "delivered" | "paid" | "cancelled";
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export const DEAL_STATUS_LABELS: Record<BrandDeal["status"], string> = {
  pending:   "Pending",
  active:    "Active",
  delivered: "Delivered",
  paid:      "Paid",
  cancelled: "Cancelled",
};

export const DEAL_STATUS_COLORS: Record<BrandDeal["status"], string> = {
  pending:   "amber",
  active:    "blue",
  delivered: "purple",
  paid:      "green",
  cancelled: "dim",
};

export function formatDealAmount(cents: number, currency = "USD", locale = "en-US"): string {
  const fractionDigits = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits ?? 2;
  const divisor = 10 ** fractionDigits;
  const amount = cents / divisor;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}
