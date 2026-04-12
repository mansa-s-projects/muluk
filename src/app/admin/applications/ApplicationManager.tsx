"use client";

import { useState, useEffect } from "react";

const mono = { fontFamily: "var(--font-mono)" };
const disp = { fontFamily: "var(--font-display)" };

export type CreatorApplication = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  handle: string;
  bio: string;
  category: string;
  country: string;
  payout: string;
  content: string[];
  audience: string;
  status: "pending" | "approved" | "rejected";
  tier: "cipher" | "legend" | "apex";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
};

export function ApplicationManager() {
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selectedApp, setSelectedApp] = useState<CreatorApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedTier, setSelectedTier] = useState<"cipher" | "legend" | "apex">("cipher");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/applications?status=${filter}`);
      const data = await res.json();
      if (res.ok) {
        setApplications(data.applications);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "approved" | "rejected") => {
    if (!selectedApp) return;
    
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/applications/${selectedApp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action,
          adminNotes,
          tier: action === "approved" ? selectedTier : undefined,
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage(`Application ${action} successfully!`);
        setSelectedApp(null);
        setAdminNotes("");
        fetchApplications();
      } else {
        setMessage(data.error || "Failed to update application");
      }
    } catch (err) {
      setMessage("Error processing application");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "#4cc88c";
      case "rejected": return "#ff6a6a";
      case "pending": return "#ff8f6a";
      default: return "#888";
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "apex": return "#ff8f8f";
      case "legend": return "#c8a96e";
      case "cipher": return "#8dcfff";
      default: return "#888";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <div style={{ ...mono, fontSize: "10px", color: "#c8a96e99", letterSpacing: "0.15em" }}>
          ADMIN PANEL
        </div>
        <div style={{ ...disp, fontSize: "32px", color: "#c8a96e", marginTop: "4px" }}>
          Creator Applications
        </div>
      </div>

      {message && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "8px",
          fontSize: "13px",
          background: message.includes("success") ? "rgba(76,200,140,0.1)" : "rgba(200,100,100,0.1)",
          color: message.includes("success") ? "#4cc88c" : "#ff8f8f",
        }}>
          {message}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px" }}>
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: filter === f ? "rgba(200,169,110,0.2)" : "#111120",
              color: filter === f ? "#c8a96e" : "#888",
              ...mono,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {applications.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
              No applications found
            </div>
          )}
          
          {applications.map(app => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              style={{
                background: "#111120",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "12px",
                padding: "16px 20px",
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "60px 2fr 1fr 1fr 100px",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#1a1a2e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}>
                {app.name.charAt(0).toUpperCase()}
              </div>
              
              <div>
                <div style={{ ...disp, fontSize: "18px", color: "#fff" }}>{app.name}</div>
                <div style={{ ...mono, fontSize: "12px", color: "#888" }}>@{app.handle}</div>
              </div>
              
              <div>
                <div style={{ fontSize: "13px", color: "#aaa" }}>{app.category}</div>
                <div style={{ ...mono, fontSize: "11px", color: "#666" }}>{app.country}</div>
              </div>
              
              <div>
                <span style={{
                  padding: "4px 12px",
                  borderRadius: "4px",
                  background: getStatusColor(app.status) + "20",
                  color: getStatusColor(app.status),
                  ...mono,
                  fontSize: "11px",
                }}>
                  {app.status}
                </span>
                {app.status === "approved" && (
                  <span style={{
                    marginLeft: "8px",
                    padding: "4px 12px",
                    borderRadius: "4px",
                    background: getTierColor(app.tier) + "20",
                    color: getTierColor(app.tier),
                    ...mono,
                    fontSize: "11px",
                  }}>
                    {app.tier}
                  </span>
                )}
              </div>
              
              <div style={{ ...mono, fontSize: "11px", color: "#666" }}>
                {new Date(app.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setSelectedApp(null); }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9200,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div style={{
            width: "100%",
            maxWidth: "700px",
            maxHeight: "90vh",
            overflowY: "auto",
            background: "#0d0d18",
            border: "1px solid rgba(200,169,110,0.25)",
            borderRadius: "16px",
            padding: "32px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <div style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "#1a1a2e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                }}>
                  {selectedApp.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ ...disp, fontSize: "24px", color: "#c8a96e" }}>{selectedApp.name}</div>
                  <div style={{ ...mono, fontSize: "14px", color: "#888" }}>@{selectedApp.handle}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#888",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              <div>
                <div style={{ ...mono, fontSize: "10px", color: "#c8a96e99", marginBottom: "4px" }}>EMAIL</div>
                <div style={{ fontSize: "14px" }}>{selectedApp.email}</div>
              </div>
              <div>
                <div style={{ ...mono, fontSize: "10px", color: "#c8a96e99", marginBottom: "4px" }}>CATEGORY</div>
                <div style={{ fontSize: "14px" }}>{selectedApp.category}</div>
              </div>
              <div>
                <div style={{ ...mono, fontSize: "10px", color: "#c8a96e99", marginBottom: "4px" }}>COUNTRY</div>
                <div style={{ fontSize: "14px" }}>{selectedApp.country}</div>
              </div>
              <div>
                <div style={{ ...mono, fontSize: "10px", color: "#c8a96e99", marginBottom: "4px" }}>PAYOUT METHOD</div>
                <div style={{ fontSize: "14px" }}>{selectedApp.payout}</div>
              </div>
              <div>
                <div style={{ ...mono, fontSize: "10px", color: "#c8a96e99", marginBottom: "4px" }}>AUDIENCE</div>
                <div style={{ fontSize: "14px" }}>{selectedApp.audience}</div>
              </div>
              <div>
                <div style={{ ...mono, fontSize: "10px", color: "#c8a96e99", marginBottom: "4px" }}>APPLIED</div>
                <div style={{ fontSize: "14px" }}>{new Date(selectedApp.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <div style={{ ...mono, fontSize: "10px", color: "#c8a96e99", marginBottom: "4px" }}>BIO</div>
              <div style={{ 
                padding: "12px", 
                background: "#111120", 
                borderRadius: "8px",
                fontSize: "14px",
                lineHeight: 1.6,
              }}>
                {selectedApp.bio || "No bio provided"}
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <div style={{ ...mono, fontSize: "10px", color: "#c8a96e99", marginBottom: "4px" }}>CONTENT TYPES</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {selectedApp.content?.map((c, i) => (
                  <span key={i} style={{ padding: "4px 12px", background: "#111120", borderRadius: "4px", fontSize: "13px" }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {selectedApp.status === "pending" && (
              <>
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ ...mono, fontSize: "10px", color: "#c8a96e99", marginBottom: "8px" }}>ASSIGN TIER</div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {((["cipher", "legend", "apex"] as const)).map(tier => {
                      const tierLabel: Record<string, string> = { cipher: "Prince", legend: "King", apex: "Emperor" };
                      return (
                      <button
                        key={tier}
                        onClick={() => setSelectedTier(tier)}
                        style={{
                          flex: 1,
                          padding: "12px",
                          borderRadius: "8px",
                          border: `1px solid ${selectedTier === tier ? "#c8a96e" : "rgba(255,255,255,0.1)"}`,
                          background: selectedTier === tier ? "rgba(200,169,110,0.15)" : "transparent",
                          color: selectedTier === tier ? "#c8a96e" : "#888",
                          ...mono,
                          fontSize: "12px",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        {tierLabel[tier]}
                      </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <div style={{ ...mono, fontSize: "10px", color: "#c8a96e99", marginBottom: "8px" }}>ADMIN NOTES</div>
                  <textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder="Internal notes about this application..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#111120",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "14px",
                      resize: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => handleAction("rejected")}
                    disabled={processing}
                    style={{
                      flex: 1,
                      padding: "14px",
                      background: "transparent",
                      border: "1px solid rgba(255,100,100,0.5)",
                      borderRadius: "8px",
                      color: "#ff8f8f",
                      ...mono,
                      fontSize: "12px",
                      cursor: processing ? "not-allowed" : "pointer",
                      opacity: processing ? 0.6 : 1,
                    }}
                  >
                    {processing ? "PROCESSING..." : "REJECT"}
                  </button>
                  <button
                    onClick={() => handleAction("approved")}
                    disabled={processing}
                    style={{
                      flex: 2,
                      padding: "14px",
                      background: "#c8a96e",
                      border: "none",
                      borderRadius: "8px",
                      color: "#120c00",
                      ...mono,
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: processing ? "not-allowed" : "pointer",
                      opacity: processing ? 0.6 : 1,
                    }}
                  >
                    {processing ? "PROCESSING..." : "APPROVE"}
                  </button>
                </div>
              </>
            )}

            {selectedApp.status !== "pending" && (
              <div style={{ padding: "16px", background: "#111120", borderRadius: "8px" }}>
                <div style={{ ...mono, fontSize: "10px", color: "#c8a96e99", marginBottom: "4px" }}>
                  REVIEWED {selectedApp.status.toUpperCase()}
                </div>
                <div style={{ fontSize: "13px", color: "#888" }}>
                  {new Date(selectedApp.reviewed_at || "").toLocaleString()}
                </div>
                {selectedApp.admin_notes && (
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ ...mono, fontSize: "10px", color: "#c8a96e99", marginBottom: "4px" }}>NOTES</div>
                    <div style={{ fontSize: "13px" }}>{selectedApp.admin_notes}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
