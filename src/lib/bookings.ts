// Shared types and utilities for the 1:1 booking system

export interface AvailabilitySlot {
  id:               string;
  creator_id:       string;
  slot_date:        string; // YYYY-MM-DD
  start_time:       string; // HH:MM:SS
  duration_minutes: number;
  price_cents:      number;
  meeting_link:     string | null;
  is_booked:        boolean;
  is_active:        boolean;
  created_at:       string;
  updated_at:       string;
}

export interface Booking {
  id:                       string;
  availability_id:          string;
  creator_id:               string;
  fan_name:                 string;
  fan_email:                string;
  whop_checkout_id:         string | null;
  whop_payment_id:          string | null;
  status:                   "pending" | "paid" | "confirmed" | "cancelled" | "completed";
  amount_cents:             number;
  meeting_link:             string | null;
  notes:                    string | null;
  created_at:               string;
  updated_at:               string;
  availability?:            AvailabilitySlot;
}

export interface CreatorProfile {
  id:           string;
  handle:       string | null;
  display_name: string | null;
  avatar_url:   string | null;
  bio:          string | null;
}

// ── Formatters ──────────────────────────────────────────────────────────

export function fmtTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function fmtDate(dateStr: string): string {
  // Parse as local date to avoid UTC offset shifting the day
  const [y, mo, d] = dateStr.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[mo - 1]} ${d}, ${y}`;
}

export function fmtDayOfWeek(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return days[new Date(y, mo - 1, d).getDay()];
}

export function fmtUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style:                 "currency",
    currency:              "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export const STATUS_COLORS: Record<string, string> = {
  pending:   "#7a6030",
  paid:      "#6e7a30",
  confirmed: "#50d48a",
  cancelled: "#e05555",
  completed: "#5b8de8",
};

export const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending Payment",
  paid:      "Paid",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};
