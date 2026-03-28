import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

type TransactionItem = {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  status: string;
  createdAt: string;
};

type DashboardStats = {
  totalEarnings: number;
  fanCodeCount: number;
  referralIncome: number;
  recentTransactions: TransactionItem[];
};

type QueryFilter = {
  column: string;
  value: string;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const integer = new Intl.NumberFormat("en-US");

function isMissingTable(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("could not find the table") ||
    lower.includes("schema cache") ||
    lower.includes("relation")
  );
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(normalized) ? normalized : 0;
  }
  return 0;
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "No timestamp";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function pickText(record: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  filters: QueryFilter[],
  limit = 6
) {
  let query = supabase.from(table).select("*").limit(limit);

  for (const filter of filters) {
    query = query.eq(filter.column, filter.value);
  }

  const result = await query;
  if (result.error) {
    if (isMissingTable(result.error.message)) {
      return [] as Record<string, unknown>[];
    }

    throw result.error;
  }

  return (result.data ?? []) as Record<string, unknown>[];
}

async function fetchCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  filters: QueryFilter[]
) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });

  for (const filter of filters) {
    query = query.eq(filter.column, filter.value);
  }

  const result = await query;
  if (result.error) {
    if (isMissingTable(result.error.message)) {
      return 0;
    }

    throw result.error;
  }

  return result.count ?? 0;
}

async function resolveDashboardStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null }
): Promise<DashboardStats> {
  const filters: QueryFilter[] = [{ column: "user_id", value: user.id }];
  if (user.email) {
    filters.push({ column: "email", value: user.email });
  }

  const fanCodeCount = await (async () => {
    for (const table of ["fan_codes", "creator_fan_codes", "fans"]) {
      for (const filter of filters) {
        const count = await fetchCount(supabase, table, [filter]);
        if (count > 0) return count;
      }
    }
    return 0;
  })();

  const referralRows = await (async () => {
    for (const table of ["referral_payouts", "referrals", "transactions"]) {
      for (const filter of filters) {
        const rows = await fetchRows(supabase, table, [filter], 50);
        if (rows.length > 0) return rows;
      }
    }
    return [] as Record<string, unknown>[];
  })();

  const transactionRows = await (async () => {
    for (const table of ["transactions", "payments", "creator_transactions"]) {
      for (const filter of filters) {
        const rows = await fetchRows(supabase, table, [filter], 8);
        if (rows.length > 0) return rows;
      }
    }
    return [] as Record<string, unknown>[];
  })();

  const totalEarnings = transactionRows.reduce((sum, row) => {
    const status = pickText(row, ["status", "state"], "completed").toLowerCase();
    if (status === "failed" || status === "reversed") return sum;
    return sum + parseNumber(row.amount ?? row.net_amount ?? row.total ?? row.value);
  }, 0);

  const referralIncome = referralRows.reduce((sum, row) => {
    const type = pickText(row, ["type", "kind", "source"], "").toLowerCase();
    const amount = parseNumber(row.amount ?? row.commission ?? row.referral_amount ?? row.value);
    if (!type || type.includes("referral") || row.commission || row.referral_amount) {
      return sum + amount;
    }
    return sum;
  }, 0);

  const recentTransactions = transactionRows.map((row, index) => ({
    id: String(row.id ?? `tx-${index}`),
    title: pickText(row, ["title", "description", "type", "kind"], "Creator payout"),
    subtitle: pickText(row, ["fan_code", "reference", "note", "source"], "CIPHER settlement"),
    amount: parseNumber(row.amount ?? row.net_amount ?? row.total ?? row.value),
    status: pickText(row, ["status", "state"], "completed"),
    createdAt: formatDate(row.created_at ?? row.createdAt ?? row.date),
  }));

  return {
    totalEarnings,
    fanCodeCount,
    referralIncome,
    recentTransactions,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const stats = await resolveDashboardStats(supabase, user);

  const statCards = [
    {
      label: "Total earnings",
      value: money.format(stats.totalEarnings),
      note: "Net creator income processed through CIPHER",
    },
    {
      label: "Fan code count",
      value: integer.format(stats.fanCodeCount),
      note: "Anonymous fan identities currently attached to you",
    },
    {
      label: "Referral income",
      value: money.format(stats.referralIncome),
      note: "Lifetime referral commissions earned to date",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        background:
          "radial-gradient(circle at top left, rgba(200,169,110,0.12), transparent 26%), linear-gradient(180deg, rgba(200,169,110,0.08), transparent 18%), var(--void)",
      }}
    >
      <div
        style={{
          maxWidth: "1380px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          gap: "24px",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
            borderRadius: "10px",
            padding: "28px 24px",
            position: "sticky",
            top: "24px",
            height: "fit-content",
          }}
        >
          <div style={{ marginBottom: "38px" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "var(--gold-dim)",
                marginBottom: "14px",
              }}
            >
              CIPHER
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "34px", fontWeight: 300, fontStyle: "italic", color: "var(--gold)", marginBottom: "10px" }}>
              Creator Console
            </div>
            <div style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: "14px" }}>
              Earnings, fan identity flow, and referral performance in one private cockpit.
            </div>
          </div>

          <div style={{ display: "grid", gap: "10px", marginBottom: "32px" }}>
            {[
              { label: "Overview", active: true },
              { label: "Transactions", active: false },
              { label: "Fan Codes", active: false },
              { label: "Referrals", active: false },
            ].map(({ label, active }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 14px",
                  borderRadius: "6px",
                  border: active ? "1px solid rgba(200,169,110,0.32)" : "1px solid rgba(255,255,255,0.06)",
                  background: active ? "rgba(200,169,110,0.08)" : "rgba(255,255,255,0.02)",
                  color: active ? "var(--gold)" : "var(--white)",
                  fontSize: "14px",
                }}
              >
                <span>{label}</span>
                <span style={{ color: active ? "var(--gold)" : "var(--dim)" }}>01</span>
              </div>
            ))}
          </div>

          <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", marginBottom: "18px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "10px" }}>
              Active identity
            </div>
            <div style={{ color: "var(--white)", fontSize: "14px", marginBottom: "6px" }}>{user.email}</div>
            <div style={{ color: "var(--muted)", fontSize: "12px" }}>Authenticated via Supabase SSR</div>
          </div>

          <SignOutButton />
        </div>

        <div style={{ display: "grid", gap: "24px" }}>
          <section style={{ border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", borderRadius: "10px", padding: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", marginBottom: "28px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "12px" }}>
                  Dashboard
                </div>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontStyle: "italic", fontSize: "48px", color: "var(--gold)", marginBottom: "12px", lineHeight: 1.05 }}>
                  Quiet money. Loud signal.
                </h1>
                <p style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: "15px", maxWidth: "720px" }}>
                  Your private control surface for earnings, fan code adoption, referral yield, and the latest money movement across the platform.
                </p>
              </div>

              <div style={{ minWidth: "220px", padding: "18px 20px", borderRadius: "8px", background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.18)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "10px" }}>
                  Live from Supabase
                </div>
                <div style={{ color: "var(--white)", fontSize: "14px", lineHeight: 1.6 }}>
                  {stats.recentTransactions.length > 0
                    ? `${stats.recentTransactions.length} recent records loaded for this creator.`
                    : "No matching rows yet. The dashboard is ready for your production tables."}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "18px" }}>
              {statCards.map((card) => (
                <div key={card.label} style={{ padding: "22px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "16px" }}>
                    {card.label}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontStyle: "italic", fontSize: "40px", color: "var(--gold)", marginBottom: "10px", lineHeight: 1 }}>
                    {card.value}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: "13px", lineHeight: 1.7 }}>
                    {card.note}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: "24px" }}>
            <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", borderRadius: "10px", padding: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "10px" }}>
                    Recent transactions
                  </div>
                  <div style={{ color: "var(--white)", fontSize: "18px" }}>Latest payout activity</div>
                </div>
                <div style={{ color: "var(--dim)", fontSize: "12px" }}>Synced on request</div>
              </div>

              {stats.recentTransactions.length > 0 ? (
                <div style={{ display: "grid", gap: "12px" }}>
                  {stats.recentTransactions.map((item) => (
                    <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "18px", alignItems: "center", padding: "16px 18px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                      <div>
                        <div style={{ color: "var(--white)", fontSize: "15px", marginBottom: "6px" }}>{item.title}</div>
                        <div style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "8px" }}>{item.subtitle}</div>
                        <div style={{ color: "var(--dim)", fontSize: "12px" }}>{item.createdAt}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 300, fontStyle: "italic", color: "var(--gold)", marginBottom: "6px" }}>
                          {money.format(item.amount)}
                        </div>
                        <div style={{ display: "inline-flex", padding: "6px 10px", borderRadius: "999px", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.14)", color: "var(--gold)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                          {item.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "32px 20px", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.12)", color: "var(--muted)", lineHeight: 1.8 }}>
                  No transactions were found for this authenticated user in the common transaction tables. Once your payout rows exist in Supabase, this panel will populate automatically.
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: "24px" }}>
              <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", borderRadius: "10px", padding: "24px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "12px" }}>
                  Snapshot
                </div>
                <div style={{ color: "var(--white)", fontSize: "18px", marginBottom: "10px" }}>Performance pulse</div>
                <div style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: "14px" }}>
                  {stats.totalEarnings > 0
                    ? `You have ${money.format(stats.totalEarnings)} in tracked earnings and ${money.format(stats.referralIncome)} from referral flow.`
                    : "This account is authenticated and ready, but no earnings rows have been detected yet."}
                </div>
              </div>

              <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", borderRadius: "10px", padding: "24px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "12px" }}>
                  Data sources
                </div>
                <div style={{ display: "grid", gap: "10px", color: "var(--muted)", fontSize: "13px" }}>
                  <div>Transactions: `transactions`, `payments`, `creator_transactions`</div>
                  <div>Fan codes: `fan_codes`, `creator_fan_codes`, `fans`</div>
                  <div>Referrals: `referral_payouts`, `referrals`, `transactions`</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}