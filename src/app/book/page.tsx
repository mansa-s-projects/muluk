"use client";

import { FormEvent, useState } from "react";

type Slot = {
  id: string;
  slot_date: string;
  start_time: string;
  duration_minutes: number;
  price_cents: number;
};

export default function BookStrategySessionPage() {
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadSlots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingSlots(true);
    setError(null);
    setSlots([]);
    setSlotId("");

    try {
      const response = await fetch(`/api/bookings/slots/${encodeURIComponent(handle.trim())}`);
      const data = (await response.json()) as { error?: string; slots?: Slot[] };

      if (!response.ok) {
        setError(data.error || "Unable to load available slots.");
        setLoadingSlots(false);
        return;
      }

      const nextSlots = data.slots || [];
      setSlots(nextSlots);
      if (nextSlots[0]) setSlotId(nextSlots[0].id);
      if (!nextSlots.length) setError("No available slots found for this handle.");
    } catch {
      setError("Network error while loading slots.");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slotId) {
      setError("Please select a slot first.");
      return;
    }

    setBooking(true);
    setError(null);

    try {
      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          supporterName: name,
          supporterEmail: email,
          handle,
        }),
      });

      const data = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !data.url) {
        setError(data.error || "Failed to create booking.");
        setBooking(false);
        return;
      }

      window.location.assign(data.url);
    } catch {
      setError("Network error while creating booking.");
      setBooking(false);
    }
  }

  return (
    <main className="simple-page" style={{ maxWidth: 760 }}>
      <h1>Book Strategy Session</h1>
      <p>Find available slots and reserve a paid strategy session.</p>

      <form onSubmit={loadSlots} style={{ display: "grid", gap: 10, marginTop: 18 }}>
        <label htmlFor="handle">Creator handle</label>
        <input
          id="handle"
          value={handle}
          onChange={e => setHandle(e.target.value)}
          required
          placeholder="e.g. gcsovereign"
          style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }}
        />
        <button type="submit" disabled={loadingSlots} style={{ padding: "10px 14px" }}>
          {loadingSlots ? "Loading slots..." : "Load available slots"}
        </button>
      </form>

      {slots.length ? (
        <form onSubmit={createBooking} style={{ display: "grid", gap: 10, marginTop: 18 }}>
          <label htmlFor="slot">Select slot</label>
          <select
            id="slot"
            value={slotId}
            onChange={e => setSlotId(e.target.value)}
            style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }}
          >
            {slots.map(slot => (
              <option key={slot.id} value={slot.id}>
                {slot.slot_date} {slot.start_time.slice(0, 5)} • {slot.duration_minutes}m • ${(slot.price_cents / 100).toFixed(2)}
              </option>
            ))}
          </select>

          <label htmlFor="name">Your name</label>
          <input
            id="name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }}
          />

          <label htmlFor="email">Your email</label>
          <input
            id="email"
            required
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ padding: "10px 12px", border: "1px solid #d9d9d9", borderRadius: 6 }}
          />

          <button type="submit" disabled={booking} style={{ padding: "10px 14px" }}>
            {booking ? "Creating booking..." : "Continue to checkout"}
          </button>
        </form>
      ) : null}

      {error ? <p style={{ color: "#a62424", marginTop: 10 }}>{error}</p> : null}
    </main>
  );
}
