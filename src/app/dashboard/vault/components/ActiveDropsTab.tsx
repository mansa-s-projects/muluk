export function ActiveDropsTab({ userId: _userId }: { userId: string }) {
  return (
    <div style={{ padding: "48px 32px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--dim)", letterSpacing: "0.08em" }}>
      No active drops. Launch a timed drop from the Assets tab.
    </div>
  );
}
