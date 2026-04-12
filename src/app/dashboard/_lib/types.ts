// ─── Shared domain types ───────────────────────────────────────────────────────

export type BehaviorStatus = "hot" | "warm" | "cold" | "at_risk";

export type ChurnLabel = "healthy" | "cooling" | "silent" | "churning";

export interface TodayAction {
  action_type: string;
  label: string;
  reason: string;
  priority_score: number;
  cta_target: string;
  metadata: Record<string, unknown>;
}

export interface RevenueTrigger {
  id: string;
  trigger_type: string;
  message: string;
  metadata: Record<string, unknown>;
  priority: number;
  expires_at: string | null;
  created_at: string;
}

export interface Member {
  fan_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_spent: number;
  purchase_count: number;
  last_active_at: string | null;
  last_event_at?: string | null;
  last_purchase_at?: string | null;
  joined_at?: string;
  score: number;
  status: BehaviorStatus;
  churn_label?: ChurnLabel | null;
  tier?: string;
}

export interface Drop {
  id: string;
  title: string;
  description: string | null;
  price: number;
  max_slots: number;
  slots_taken: number;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface FeedEvent {
  id: string;
  type: string;
  user_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  todayRevenue: number;
  totalMembers: number;
  onlineNow: number;
  bestDayRevenue: number;
}

export interface Conversation {
  fan_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_spent: number;
  status: BehaviorStatus;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface Message {
  id: string;
  sender_id: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export type RadarTab =
  | "top_spenders"
  | "most_active"
  | "at_risk"
  | "likely_convert";

export type FilterTab = "all" | "hot" | "warm" | "at_risk" | "cold";
