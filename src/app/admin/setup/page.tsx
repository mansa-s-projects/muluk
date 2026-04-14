export default function AdminSetupPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020203",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "8px",
          padding: "48px 40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(200,169,110,0.5)",
            marginBottom: "20px",
          }}
        >
          Admin / Setup
        </div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "32px",
            fontWeight: 300,
            color: "#c8a96e",
            marginBottom: "16px",
          }}
        >
          Platform Setup
        </h1>
        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "14px",
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.7,
            marginBottom: "32px",
          }}
        >
          Setup tools are managed directly via the Supabase dashboard and migration files.
          Use the database editor to configure platform settings, allowlists, and seed data.
        </p>
        <div
          style={{
            display: "grid",
            gap: "12px",
            textAlign: "left",
          }}
        >
          {[
            { label: "Admin allowlist", hint: "INSERT INTO admin_allowlist (email, role) VALUES (…)" },
            { label: "Promote role",    hint: "UPDATE users SET role = 'admin' WHERE email = …"       },
            { label: "Approve creator", hint: "UPDATE users SET is_approved = true WHERE id = …"      },
          ].map(({ label, hint }) => (
            <div
              key={label}
              style={{
                padding: "14px 16px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "5px",
              }}
            >
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "rgba(200,169,110,0.7)", marginBottom: "6px" }}>{label}</div>
              <code style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,0.35)", wordBreak: "break-all" }}>{hint}</code>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
