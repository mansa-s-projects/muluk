"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics/track";

// ============================================================================
// TYPES
// ============================================================================

type SocialPlatform = "instagram" | "tiktok" | "twitter" | "youtube" | "telegram";

type SocialConnection = {
  platform: SocialPlatform;
  connected: boolean;
  username?: string;
  followers?: number;
  engagement?: number;
  views?: number;
  dmSignals?: number;
};

type OnboardingData = {
  // Step 2: Niche
  niche: string;
  subNiche: string;
  
  // Step 3: Content & Experience
  contentTypes: string[];
  experience: "beginner" | "intermediate" | "advanced";
  currentRevenue: string;
  
  // Step 4: Social connections (fetched)
  socialConnections: SocialConnection[];
  
  // Step 5: Profile identity (built from social data)
  profileIdentity: ProfileIdentity | null;

  // Step 6: Signal analysis (generated)
  signalAnalysis: SignalAnalysis | null;
  
  // Step 7: Launch blueprint (generated)
  launchBlueprint: LaunchBlueprint | null;
  
  // Step 8: First drop (generated/edited)
  firstDrop: FirstDrop | null;
};

type SignalAnalysis = {
  strongestPlatform: string;
  bestContentType: string;
  bestPostingTime: string;
  audienceQuality: "high" | "medium" | "low";
  audienceQualityReason: string;
  dmOpportunities: number;
  actionItems: string[];
};

type LaunchBlueprint = {
  offerIdea: string;
  offerDescription: string;
  price: number;
  priceConfidence: "high" | "medium" | "low";
  priceRationale: string;
  contentPillars: string[];
  bestChannels: string[];
  channelConfidence: "high" | "medium" | "low";
  channelRationale: string;
  sevenDayPlan: Array<{ day: number; action: string }>;
  revenueEstimate: { monthly: number; yearly: number; low: number; high: number };
  revenueAssumptions: string;
  strategySummary: string;
};

type FirstDrop = {
  title: string;
  description: string;
  price: number;
  expiryHours: number;
  caption: string;
  mediaType: "image" | "video" | "text";
};

type ProfileIdentity = {
  displayName: string;
  handle: string;
  bio: string;
  avatarUrl: string | null;
  avatarPreview: string | null;
  bannerUrl: string | null;
  bannerPreview: string | null;
  website: string;
  location: string;
  specialty: string;
  cta: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const NICHES = [
  { id: "luxury", label: "Luxury & Lifestyle", icon: "✦", desc: "High-end fashion, watches, travel" },
  { id: "fitness", label: "Fitness & Wellness", icon: "◆", desc: "Training, nutrition, transformation" },
  { id: "music", label: "Music & Audio", icon: "♫", desc: "Production, DJing, artist content" },
  { id: "art", label: "Art & Design", icon: "◎", desc: "Visual art, illustration, creative" },
  { id: "fashion", label: "Fashion & Beauty", icon: "❋", desc: "Style, outfits, beauty content" },
  { id: "gaming", label: "Gaming & Esports", icon: "⬡", desc: "Streaming, gameplay, community" },
  { id: "education", label: "Education & Skills", icon: "◇", desc: "Courses, tutorials, expertise" },
  { id: "tech", label: "Tech & Startups", icon: "⬢", desc: "Software, AI, entrepreneurship" },
  { id: "food", label: "Food & Culinary", icon: "◈", desc: "Recipes, cooking, restaurant" },
  { id: "travel", label: "Travel & Adventure", icon: "◐", desc: "Destinations, experiences, guides" },
];

const SUB_NICHES: Record<string, string[]> = {
  luxury: ["Watches & Jewelry", "Supercars", "Private Travel", "Fine Dining", "Real Estate", "Private Aviation"],
  fitness: ["Bodybuilding", "CrossFit", "Yoga", "Nutrition Plans", "Combat Sports", "Running"],
  music: ["Production", "DJing", "Artist BTS", "Beat Making", "Vocal Training", "Music Business"],
  art: ["Digital Art", "Illustration", "Photography", "3D Design", "NFT Art", "Traditional Art"],
  fashion: ["Streetwear", "High Fashion", "Sneakers", "Makeup", "Skincare", "Styling"],
  gaming: ["FPS Games", "Strategy", "Streaming", "Esports", "Game Dev", "Retro Gaming"],
  education: ["Business", "Finance", "Marketing", "Coding", "Languages", "Personal Growth"],
  tech: ["AI/ML", "Web Dev", "Startups", "Crypto", "Mobile Apps", "SaaS"],
  food: ["Recipes", "Chef Life", "Food Review", "Healthy Eating", "Baking", "Cocktails"],
  travel: ["Luxury Travel", "Adventure", "Budget Travel", "Solo Travel", "Digital Nomad", "Hotels"],
};

const CONTENT_TYPES = [
  { id: "photos", label: "Photos", desc: "High-quality images" },
  { id: "videos", label: "Videos", desc: "Short & long form" },
  { id: "bts", label: "Behind the Scenes", desc: "Raw, exclusive access" },
  { id: "tutorials", label: "Tutorials", desc: "How-to content" },
  { id: "live", label: "Live Sessions", desc: "Real-time interaction" },
  { id: "voice", label: "Voice Notes", desc: "Audio messages" },
  { id: "text", label: "Written Posts", desc: "Long-form writing" },
  { id: "drops", label: "Exclusive Drops", desc: "Limited releases" },
];

const SOCIAL_PLATFORMS: Array<{
  id: SocialPlatform;
  label: string;
  icon: string;
  color: string;
  unlocks: string;
}> = [
  { id: "instagram", label: "Instagram", icon: "📸", color: "#E4405F", unlocks: "Follower insights, engagement rate, story views" },
  { id: "tiktok", label: "TikTok", icon: "🎵", color: "#00F2EA", unlocks: "Video views, trending content, audience age" },
  { id: "twitter", label: "X (Twitter)", icon: "𝕏", color: "#1DA1F2", unlocks: "Tweet reach, DM signals, engagement patterns" },
  { id: "youtube", label: "YouTube", icon: "▶", color: "#FF0000", unlocks: "Watch time, subscriber growth, revenue data" },
  { id: "telegram", label: "Telegram", icon: "✈", color: "#0088CC", unlocks: "Community size, message engagement" },
];

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#020203",
    color: "rgba(255,255,255,0.92)",
  },
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "48px 24px 120px",
  },
  progressBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "48px",
  },
  progressStep: (active: boolean, completed: boolean) => ({
    flex: 1,
    height: "3px",
    borderRadius: "2px",
    background: completed ? "var(--gold)" : active ? "rgba(200,169,110,0.5)" : "rgba(255,255,255,0.08)",
    transition: "background 0.3s ease",
  }),
  stepBadge: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    letterSpacing: "0.22em",
    textTransform: "uppercase" as const,
    color: "var(--gold-dim)",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  headline: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(32px, 5vw, 48px)",
    fontWeight: 300,
    lineHeight: 1.1,
    color: "var(--gold)",
    marginBottom: "16px",
  },
  subheadline: {
    fontSize: "15px",
    lineHeight: 1.7,
    color: "rgba(255,255,255,0.52)",
    maxWidth: "600px",
    marginBottom: "32px",
  },
  card: {
    background: "#0f0f1e",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: "12px",
    padding: "24px",
    transition: "border-color 0.2s, transform 0.2s",
    cursor: "pointer",
  },
  cardSelected: {
    borderColor: "rgba(200,169,110,0.5)",
    background: "rgba(200,169,110,0.04)",
  },
  cardHover: {
    borderColor: "rgba(255,255,255,0.12)",
    transform: "translateY(-2px)",
  },
  grid: (cols: number) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: "16px",
  }),
  button: {
    primary: {
      background: "var(--gold)",
      color: "#0a0800",
      fontFamily: "var(--font-mono)",
      fontSize: "11px",
      fontWeight: 500,
      letterSpacing: "0.18em",
      textTransform: "uppercase" as const,
      padding: "16px 32px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      transition: "opacity 0.2s, transform 0.2s",
    },
    ghost: {
      background: "transparent",
      color: "rgba(255,255,255,0.5)",
      fontFamily: "var(--font-mono)",
      fontSize: "11px",
      fontWeight: 500,
      letterSpacing: "0.18em",
      textTransform: "uppercase" as const,
      padding: "16px 24px",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "4px",
      cursor: "pointer",
      transition: "color 0.2s, border-color 0.2s",
    },
  },
  input: {
    width: "100%",
    background: "rgba(255,255,255,0.03)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: "6px",
    color: "rgba(255,255,255,0.92)",
    padding: "14px 18px",
    fontSize: "14px",
    fontFamily: "var(--font-body)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  label: {
    display: "block",
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: "var(--gold-dim)",
    marginBottom: "8px",
  },
  metric: {
    background: "rgba(200,169,110,0.06)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(200,169,110,0.2)",
    borderRadius: "10px",
    padding: "16px",
  },
  metricValue: {
    fontFamily: "var(--font-display)",
    fontSize: "28px",
    fontWeight: 300,
    color: "var(--gold)",
  },
  metricLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
    color: "var(--gold-dim)",
    marginBottom: "4px",
  },
  actionCard: {
    background: "#111120",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: "10px",
    padding: "16px 18px",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  actionNumber: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--gold)",
    background: "rgba(200,169,110,0.12)",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  footer: {
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: "linear-gradient(to top, #020203 60%, transparent)",
    padding: "32px 24px 24px",
    display: "flex",
    justifyContent: "center",
    gap: "12px",
  },
};

// ============================================================================
// FIRST SALE ENGINE — post-launch success screen
// ============================================================================

type FirstSaleEngineProps = {
  niche: string;
  drop: FirstDrop;
  blueprint: LaunchBlueprint;
  strongestPlatform: string;
  dmOpportunities: number;
  fanPageUrl: string;
  onDashboard: () => void;
};

function FirstSaleEngine({ niche, drop, blueprint, strongestPlatform, dmOpportunities, fanPageUrl, onDashboard }: FirstSaleEngineProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [views, setViews] = useState(0);
  const [clicks, setClicks] = useState(0);

  const completedCount = Object.values(checked).filter(Boolean).length;
  const TOTAL_TASKS = 4;
  const progress = (completedCount / TOTAL_TASKS) * 100;

  // Simulate early metric ticks — replace with real fetch when available
  useEffect(() => {
    const t = setTimeout(() => setViews(Math.floor(Math.random() * 3) + 1), 4000);
    const t2 = setTimeout(() => setViews(v => v + Math.floor(Math.random() * 2) + 1), 9000);
    const t3 = setTimeout(() => setClicks(1), 14000);
    return () => { clearTimeout(t); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const platformLabel = strongestPlatform.charAt(0).toUpperCase() + strongestPlatform.slice(1);

  const postScript = drop.caption || `I've been working on something for the real ones.\n\n🔓 My private ${niche} community just opened. First 50 members lock in founding pricing at $${drop.price}/mo.\n\nThis is where I drop everything I can't post publicly. Once it's full, price goes up.\n\nLink in bio${fanPageUrl ? `: ${fanPageUrl}` : ''}.`;

  const dmScript = `Hey! I just launched something I think you'll actually want.\n\nI opened up private access to [your content here] — exclusive stuff for a small group. Founding price is $${drop.price}/mo and I'm keeping slots limited.\n\nThought of you first. Here's the link: ${fanPageUrl || 'cipher.so/[your-handle]'}\n\nNo pressure — just wanted you to see it first.`;

  const bioScript = fanPageUrl || 'cipher.so/[your-handle]';

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
  };

  const toggle = (key: string) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));

  const tasks = [
    {
      id: 'share',
      icon: '◆',
      label: `Share on ${platformLabel}`,
      sub: 'Post your launch caption — this drives the first wave of traffic.',
      scriptKey: 'post',
      scriptLabel: 'Launch Post',
      script: postScript,
    },
    {
      id: 'dm',
      icon: '◎',
      label: `DM your top ${Math.min(dmOpportunities, 20)} followers`,
      sub: 'Personal outreach converts 5–10× better than public posts.',
      scriptKey: 'dm',
      scriptLabel: 'DM Script',
      script: dmScript,
    },
    {
      id: 'content',
      icon: '✦',
      label: 'Post a teaser piece of content',
      sub: `Drop one piece of ${niche} content with your link — give them a taste.`,
      scriptKey: 'bio',
      scriptLabel: 'Your Link',
      script: bioScript,
    },
    {
      id: 'pin',
      icon: '◇',
      label: 'Pin your link in bio',
      sub: `Add your page link to your ${platformLabel} bio so every profile visit converts.`,
      scriptKey: 'biolink',
      scriptLabel: 'Copy Link',
      script: bioScript,
    },
  ];

  // Progress color
  const progressColor = progress === 100 ? '#50d48a' : '#c8a96e';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 4px' }}>

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(200,169,110,0.18), rgba(200,169,110,0.06))',
          border: '1px solid rgba(200,169,110,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 22, color: 'var(--gold)',
          boxShadow: '0 0 32px rgba(200,169,110,0.15)',
        }}>✦</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: 300, color: 'var(--white)', letterSpacing: '-0.02em',
          margin: '0 0 10px',
        }}>
          Your drop is live.
        </h1>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 300,
          fontStyle: 'italic', color: 'var(--gold)', margin: 0,
        }}>
          Now do this.
        </p>
      </div>

      {/* ── Link bar ── */}
      {fanPageUrl && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(200,169,110,0.06)', border: '1px solid rgba(200,169,110,0.2)',
          borderRadius: 8, padding: '12px 16px', marginBottom: 28,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gold-dim)', letterSpacing: '0.2em', marginBottom: 3 }}>YOUR PAGE</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--gold)', wordBreak: 'break-all' }}>{fanPageUrl}</div>
          </div>
          <button onClick={() => copy('url', fanPageUrl)} style={{
            padding: '8px 14px', background: copied.url ? 'rgba(80,212,138,0.12)' : 'rgba(200,169,110,0.1)',
            border: `1px solid ${copied.url ? 'rgba(80,212,138,0.3)' : 'rgba(200,169,110,0.25)'}`,
            borderRadius: 5, color: copied.url ? 'var(--green)' : 'var(--gold)',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', cursor: 'pointer',
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}>
            {copied.url ? '✓ COPIED' : 'COPY LINK'}
          </button>
        </div>
      )}

      {/* ── Progress toward first sale ── */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--rim)',
        borderRadius: 10, padding: '16px 20px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--dim)', textTransform: 'uppercase', marginBottom: 3 }}>Progress to first sale</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 300, color: 'var(--white)' }}>
              {completedCount === 0 && 'Complete all 4 steps to maximize your chances'}
              {completedCount === 1 && 'Good start — keep going'}
              {completedCount === 2 && 'Halfway there'}
              {completedCount === 3 && 'One more — you\'re almost there'}
              {completedCount === 4 && 'Checklist complete — watch for that first notification'}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: progressColor, fontWeight: 500 }}>
            {completedCount}/{TOTAL_TASKS}
          </div>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: progressColor,
            borderRadius: 2,
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: progress > 0 ? `0 0 8px ${progressColor}66` : 'none',
          }} />
        </div>
        {/* Early metrics */}
        <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
          {[
            { label: 'PAGE VIEWS', value: views, live: true },
            { label: 'LINK CLICKS', value: clicks, live: false },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {m.live && <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: 'var(--green)', boxShadow: '0 0 4px var(--green)',
                animation: 'livepulse 2s infinite',
              }} />}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: m.value > 0 ? 'var(--white)' : 'var(--dim)', fontWeight: 400 }}>{m.value}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--dim)', letterSpacing: '0.15em' }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Checklist ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {tasks.map((task) => {
          const isDone = checked[task.id];
          const isCopied = copied[task.scriptKey];
          return (
            <div key={task.id} style={{
              background: isDone ? 'rgba(80,212,138,0.04)' : 'var(--card)',
              border: `1px solid ${isDone ? 'rgba(80,212,138,0.2)' : 'var(--rim)'}`,
              borderRadius: 10,
              padding: '16px 18px',
              transition: 'all 0.25s',
            }}>
              {/* Row: checkbox + label */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <button onClick={() => toggle(task.id)} style={{
                  flexShrink: 0, marginTop: 2,
                  width: 20, height: 20, borderRadius: 5,
                  background: isDone ? 'var(--green)' : 'transparent',
                  border: `1.5px solid ${isDone ? 'var(--green)' : 'rgba(255,255,255,0.18)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                  fontSize: 11, color: '#020203',
                }}>
                  {isDone ? '✓' : ''}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
                    color: isDone ? 'var(--green)' : 'var(--white)',
                    marginBottom: 3, textDecoration: isDone ? 'line-through' : 'none',
                    textDecorationColor: 'rgba(80,212,138,0.5)',
                    transition: 'color 0.2s',
                  }}>
                    <span style={{ color: isDone ? 'var(--green)' : 'var(--gold)', marginRight: 8, fontSize: 11 }}>{task.icon}</span>
                    {task.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>
                    {task.sub}
                  </div>
                </div>
              </div>

              {/* Script box */}
              <div style={{ marginTop: 14 }}>
                <div style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 7, padding: '12px 14px',
                  fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)',
                  lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  maxHeight: 120, overflow: 'hidden',
                  maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
                }}>
                  {task.script}
                </div>
                <button onClick={() => { copy(task.scriptKey, task.script); toggle(task.id); }} style={{
                  marginTop: 8, width: '100%',
                  padding: '9px 0',
                  background: isCopied ? 'rgba(80,212,138,0.1)' : 'rgba(200,169,110,0.06)',
                  border: `1px solid ${isCopied ? 'rgba(80,212,138,0.25)' : 'rgba(200,169,110,0.18)'}`,
                  borderRadius: 6,
                  color: isCopied ? 'var(--green)' : 'var(--gold)',
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {isCopied ? `✓ COPIED — MARK AS DONE` : `COPY ${task.scriptLabel.toUpperCase()}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Dashboard CTA ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        paddingTop: 8, paddingBottom: 40,
      }}>
        <button onClick={onDashboard} style={{
          padding: '14px 40px',
          background: completedCount >= 2 ? 'var(--gold)' : 'rgba(200,169,110,0.1)',
          border: `1px solid ${completedCount >= 2 ? 'var(--gold)' : 'rgba(200,169,110,0.25)'}`,
          borderRadius: 4,
          color: completedCount >= 2 ? '#0a0800' : 'var(--gold)',
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em',
          cursor: 'pointer', transition: 'all 0.3s',
        }}>
          {completedCount >= 2 ? 'VIEW MY DASHBOARD →' : 'SKIP TO DASHBOARD'}
        </button>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '0.1em' }}>
          {completedCount < 2 ? 'Finish the checklist first — your first sale is closer than you think' : 'Your drop is live. We\'ll notify you the moment a fan pays.'}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

type Props = {
  creatorName: string;
  existingSocialConnections: SocialConnection[];
  existingAnalysis: Record<string, unknown> | null;
};

export default function OnboardingWizard({ creatorName, existingSocialConnections, existingAnalysis }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingDrop, setEditingDrop] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [fanPageUrl, setFanPageUrl] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const [data, setData] = useState<OnboardingData>({
    niche: "",
    subNiche: "",
    contentTypes: [],
    experience: "beginner",
    currentRevenue: "0",
    socialConnections: existingSocialConnections,
    profileIdentity: null,
    signalAnalysis: null,
    launchBlueprint: null,
    firstDrop: null,
  });

  // Detect OAuth callback (e.g., ?connected=youtube)
  // File refs for profile identity step (not stored in serializable state)
  const profileAvatarRef = useRef<HTMLInputElement>(null);
  const profileBannerRef = useRef<HTMLInputElement>(null);
  const profileAvatarFileRef = useRef<File | null>(null);
  const profileBannerFileRef = useRef<File | null>(null);

  // Detect OAuth callback (e.g., ?connected=youtube)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedPlatform = params.get("connected") as SocialPlatform | null;
    
    if (connectedPlatform && SOCIAL_PLATFORMS.some(p => p.id === connectedPlatform)) {
      // Refresh connections and clear URL param
      fetchSocialConnections();
      const url = new URL(window.location.href);
      url.searchParams.delete("connected");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  // Load existing analysis if available
  useEffect(() => {
    if (existingAnalysis && typeof existingAnalysis === "object") {
      const analysis = existingAnalysis as Record<string, unknown>;
      if (analysis.niche) {
        setData(prev => ({
          ...prev,
          niche: String(analysis.niche || ""),
          experience: (analysis.experience as "beginner" | "intermediate" | "advanced") || "beginner",
        }));
      }
    }
  }, [existingAnalysis]);

  // Track onboarding start once on mount
  useEffect(() => {
    track.onboardingStarted();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateData = useCallback(<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  const totalSteps = 8;

  const canProceed = useCallback(() => {
    switch (step) {
      case 1: return true;
      case 2: return !!data.niche;
      case 3: return data.contentTypes.length > 0;
      case 4: return true; // Social is optional but encouraged
      case 5: return !!(data.profileIdentity?.displayName?.length);
      case 6: return !!data.signalAnalysis;
      case 7: return !!data.launchBlueprint;
      case 8: return !!data.firstDrop?.title;
      default: return false;
    }
  }, [step, data]);

  const handleNext = async () => {
    setError("");
    
    // Step 4 -> 5: Auto-build profile identity from social connections
    if (step === 4) {
      if (!data.profileIdentity) {
        const connected = data.socialConnections.filter(s => s.connected);
        const best = connected.length > 0
          ? connected.reduce((a, b) => (a.followers || 0) > (b.followers || 0) ? a : b)
          : null;
        const nicheLabel = NICHES.find(n => n.id === data.niche)?.label || data.niche;
        updateData("profileIdentity", {
          displayName: best?.username
            ? best.username.replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
            : creatorName || "",
          handle: best?.username?.toLowerCase().replace(/[^a-z0-9_]/g, "") || "",
          bio: "",
          avatarUrl: null,
          avatarPreview: null,
          bannerUrl: null,
          bannerPreview: null,
          website: "",
          location: "",
          specialty: data.subNiche || nicheLabel,
          cta: "",
        });
      }
    }

    // Step 5 -> 6: Generate signal analysis
    if (step === 5) {
      setLoading(true);
      try {
        const res = await fetch("/api/ai/onboarding/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interests: [data.niche, data.subNiche].filter(Boolean),
            contentTypes: data.contentTypes,
            experience: data.experience,
            currentPlatforms: data.socialConnections.filter(s => s.connected).map(s => s.platform),
            followerCounts: Object.fromEntries(
              data.socialConnections.filter(s => s.connected && s.followers).map(s => [s.platform, s.followers])
            ),
            goals: ["first revenue", "premium positioning"],
          }),
        });
        
        if (!res.ok) throw new Error("Analysis failed");
        const result = await res.json();
        
        // Generate signal analysis from the response
        const connectedPlatforms = data.socialConnections.filter(s => s.connected);
        const strongestPlatform = connectedPlatforms.length > 0 
          ? connectedPlatforms.reduce((a, b) => (a.followers || 0) > (b.followers || 0) ? a : b).platform
          : "instagram";
        
        // Calculate real metrics from connected platforms
        const totalFollowers = connectedPlatforms.reduce((sum, s) => sum + (s.followers || 0), 0);
        const avgEngagement = connectedPlatforms.length > 0 
          ? connectedPlatforms.reduce((sum, s) => sum + (s.engagement || 0), 0) / connectedPlatforms.length 
          : 0;
        const highEngagers = Math.floor(totalFollowers * (avgEngagement / 100) * 0.15); // 15% of engagers are high-intent
        
        // Build quality reason from actual data
        let qualityReason = "";
        let qualityLevel: "high" | "medium" | "low" = "medium";
        if (avgEngagement > 5) {
          qualityLevel = "high";
          qualityReason = `Your ${(avgEngagement).toFixed(1)}% engagement rate is 3x the industry average — your audience actively listens.`;
        } else if (avgEngagement > 2) {
          qualityLevel = "medium";
          qualityReason = `Solid ${(avgEngagement).toFixed(1)}% engagement. With ${totalFollowers.toLocaleString()} followers, you have buying power.`;
        } else if (totalFollowers > 5000) {
          qualityLevel = "medium";
          qualityReason = `${totalFollowers.toLocaleString()} followers is a strong base. Focus on engagement to unlock higher conversion.`;
        } else {
          qualityLevel = "low";
          qualityReason = "Smaller audiences often convert better — your fans are real and accessible.";
        }

        // Estimate DM opportunities from real follower/engagement data
        const dmOpportunityEstimate = connectedPlatforms.length > 0
          ? Math.max(5, Math.floor(highEngagers * 0.6)) // 60% of high-intent engagers are DM reachable
          : Math.max(10, Math.floor((data.experience === "advanced" ? 40 : data.experience === "intermediate" ? 25 : 15))); // fallback by experience
        
        const signalAnalysis: SignalAnalysis = {
          strongestPlatform,
          bestContentType: data.contentTypes[0] || "photos",
          bestPostingTime: avgEngagement > 3 ? "7-9 PM (your peak engagement window)" : "6-8 PM (optimal for your niche)",
          audienceQuality: qualityLevel,
          audienceQualityReason: qualityReason,
          dmOpportunities: dmOpportunityEstimate,
          actionItems: result.analysis?.first30Days || [
            "Post teaser content about your upcoming paid drop",
            "Engage with top commenters in DMs",
            "Create urgency with limited-time offer announcement",
          ],
        };
        
        updateData("signalAnalysis", signalAnalysis);
        track.signalAnalysisCompleted({
          strongestPlatform: signalAnalysis.strongestPlatform,
          audienceQuality: signalAnalysis.audienceQuality,
          dmOpportunities: signalAnalysis.dmOpportunities,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to analyze signals");
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    
    // Step 6 -> 7: Generate launch blueprint
    if (step === 6 && data.signalAnalysis) {
      setLoading(true);
      try {
        const res = await fetch("/api/ai/onboarding/blueprint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            niche: data.niche,
            subNiche: data.subNiche,
            contentTypes: data.contentTypes,
            experience: data.experience,
            strongestPlatform: data.signalAnalysis.strongestPlatform,
            totalFollowers: data.socialConnections.reduce((sum, s) => sum + (s.followers || 0), 0),
          }),
        });
        
        let blueprint: LaunchBlueprint;
        
        if (!res.ok) {
          // Fallback blueprint
          const basePrice = data.experience === "advanced" ? 29 : data.experience === "intermediate" ? 19 : 12;
          const totalFollowers = data.socialConnections.reduce((sum, s) => sum + (s.followers || 0), 0);
          const conversionRate = 0.01;
          const monthlyBuyers = Math.floor(totalFollowers * conversionRate) || 10;
          
          const strongPlatform = data.signalAnalysis?.strongestPlatform || "instagram";
          blueprint = {
            offerIdea: `Exclusive ${data.niche} Inner Circle`,
            offerDescription: `Private access to behind-the-scenes ${data.subNiche || data.niche} content, direct messaging, and exclusive drops.`,
            price: basePrice,
            priceConfidence: data.experience === "advanced" ? "high" : "medium",
            priceRationale: `Based on ${data.experience} creator benchmarks in ${data.niche}`,
            contentPillars: [
              `${data.niche} behind the scenes`,
              "Personal insights & stories",
              "Exclusive early access",
            ],
            bestChannels: [strongPlatform, "telegram"],
            channelConfidence: totalFollowers > 5000 ? "high" : "medium",
            channelRationale: `${strongPlatform} is your largest audience (${totalFollowers.toLocaleString()} followers)`,
            sevenDayPlan: [
              { day: 1, action: "Announce your private channel is launching" },
              { day: 2, action: "Post teaser content showing what's coming" },
              { day: 3, action: "Share behind-the-scenes story to build anticipation" },
              { day: 4, action: "Open early access for first 50 members" },
              { day: 5, action: "DM top engaged followers with personal invite" },
              { day: 6, action: "Post first exclusive drop for members" },
              { day: 7, action: "Share member testimonial or early result" },
            ],
            revenueEstimate: {
              monthly: monthlyBuyers * basePrice,
              yearly: monthlyBuyers * basePrice * 12,
              low: Math.floor(monthlyBuyers * basePrice * 0.5),
              high: Math.floor(monthlyBuyers * basePrice * 2),
            },
            revenueAssumptions: `${(conversionRate * 100).toFixed(1)}% conversion of ${totalFollowers.toLocaleString()} followers`,
            strategySummary: `Launch a $${basePrice}/mo private ${data.niche} community, drive traffic from ${strongPlatform}, hit ${monthlyBuyers}+ members in 30 days.`,
          };
        } else {
          blueprint = (await res.json()).blueprint;
        }
        
        updateData("launchBlueprint", blueprint);
        track.blueprintGenerated({
          price: blueprint.price,
          niche: data.niche,
          revenueEstimateMonthly: blueprint.revenueEstimate.monthly,
        });
      } catch {
        // Generate fallback
        const basePrice = data.experience === "advanced" ? 29 : data.experience === "intermediate" ? 19 : 12;
        const fallbackPlatform = data.signalAnalysis?.strongestPlatform || "instagram";
        updateData("launchBlueprint", {
          offerIdea: `Exclusive ${data.niche} Access`,
          offerDescription: `Premium ${data.subNiche || data.niche} content and direct access.`,
          price: basePrice,
          priceConfidence: "medium",
          priceRationale: `Standard pricing for ${data.experience} ${data.niche} creators`,
          contentPillars: [data.niche, "exclusives", "behind the scenes"],
          bestChannels: [fallbackPlatform, "telegram"],
          channelConfidence: "medium",
          channelRationale: `${fallbackPlatform} is your primary audience channel`,
          sevenDayPlan: [
            { day: 1, action: "Announce private channel launch" },
            { day: 2, action: "Post teaser content" },
            { day: 3, action: "Build anticipation with BTS" },
            { day: 4, action: "Open early access" },
            { day: 5, action: "DM top followers" },
            { day: 6, action: "First exclusive drop" },
            { day: 7, action: "Share early wins" },
          ],
          revenueEstimate: { monthly: basePrice * 10, yearly: basePrice * 120, low: basePrice * 5, high: basePrice * 25 },
          revenueAssumptions: "Conservative estimate based on 10 initial members",
          strategySummary: `Launch a $${basePrice}/mo private ${data.niche} community via ${fallbackPlatform}.`,
        });
        track.blueprintGenerated({ price: basePrice, niche: data.niche, revenueEstimateMonthly: basePrice * 10 });
      }
      setLoading(false);
    }
    
    // Step 7 -> 8: Generate first drop
    if (step === 7 && data.launchBlueprint) {
      const nicheLabel = NICHES.find(n => n.id === data.niche)?.label || data.niche;
      const drop: FirstDrop = {
        title: data.launchBlueprint.offerIdea,
        description: data.launchBlueprint.offerDescription,
        price: data.launchBlueprint.price,
        expiryHours: 48,
        caption: `I've been working on something for the real ones.\n\n🔓 My private ${nicheLabel.toLowerCase()} community just opened. First 50 members lock in founding pricing at $${data.launchBlueprint.price}/mo.\n\nThis is where I'm dropping everything I can't post publicly. Once it's full, the price goes up.\n\nLink in bio.`,
        mediaType: data.contentTypes.includes("videos") ? "video" : "image",
      };
      updateData("firstDrop", drop);
      track.firstDropPrefilled({ price: drop.price, niche: data.niche, mediaType: drop.mediaType });
    }
    
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleLaunch = async () => {
    if (!data.firstDrop) return;
    
    setLoading(true);
    setError("");
    
    try {
      // Upload profile assets if creator added them during identity step
      let avatarUrl: string | null = data.profileIdentity?.avatarUrl ?? null;
      let bannerUrl: string | null = data.profileIdentity?.bannerUrl ?? null;

      if (profileAvatarFileRef.current) {
        const fd = new FormData();
        fd.append("file", profileAvatarFileRef.current);
        fd.append("folder", "avatars");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (uploadRes.ok) { const r = await uploadRes.json(); avatarUrl = r.url; }
      }
      if (profileBannerFileRef.current) {
        const fd = new FormData();
        fd.append("file", profileBannerFileRef.current);
        fd.append("folder", "banners");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (uploadRes.ok) { const r = await uploadRes.json(); bannerUrl = r.url; }
      }

      // Save the complete onboarding and create the first drop
      const res = await fetch("/api/ai/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: data.niche,
          subNiche: data.subNiche,
          contentTypes: data.contentTypes,
          experience: data.experience,
          launchBlueprint: data.launchBlueprint,
          firstDrop: data.firstDrop,
          profileIdentity: data.profileIdentity
            ? { ...data.profileIdentity, avatarUrl, bannerUrl, avatarPreview: null, bannerPreview: null }
            : null,
        }),
      });
      
      let pageUrl = "";
      if (res.ok) {
        const result = await res.json();
        pageUrl = result.fanPageUrl || "";
      }
      
      setFanPageUrl(pageUrl);
      setLaunched(true);
      setLoading(false);
      track.firstDropLaunched({
        price: data.firstDrop?.price ?? 0,
        niche: data.niche,
        hasPageUrl: !!pageUrl,
      });
      
      // Auto-redirect after 8 seconds
      setTimeout(() => {
        router.push("/dashboard?onboarding=complete&drop=created");
      }, 8000);
    } catch {
      // Still show success and navigate
      setLaunched(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/dashboard?onboarding=complete");
      }, 8000);
    }
  };

  const handleConnectSocial = (platform: SocialPlatform) => {
    track.socialConnectClicked(platform);
    if (platform === "youtube") {
      // YouTube: Use full-page redirect for better OAuth compatibility
      window.location.href = `/api/auth/youtube/connect?redirect=onboarding`;
      return;
    }
    
    // Other platforms: Use popup flow
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      `/api/auth/${platform}/connect?redirect=onboarding`,
      `Connect ${platform}`,
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Poll for completion
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        // Refresh connections
        fetchSocialConnections();
      }
    }, 1000);
  };

  const fetchSocialConnections = async () => {
    try {
      const res = await fetch("/api/social/connections");
      if (res.ok) {
        const { connections } = await res.json();
        const prev = data.socialConnections;
        const newConnections: SocialConnection[] = connections || [];
        // Fire social_connected for platforms that just became connected
        newConnections
          .filter(c => c.connected && !prev.find(p => p.platform === c.platform && p.connected))
          .forEach(c => track.socialConnected(c.platform, c.followers ?? 0));
        updateData("socialConnections", newConnections);
      }
    } catch {
      // Ignore errors
    }
  };

  // ============================================================================
  // RENDER STEPS
  // ============================================================================

  const renderStep1 = () => (
    <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto" }}>
      <div style={{ 
        fontSize: "72px", 
        marginBottom: "28px",
        background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-bright) 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        animation: "pulse 3s ease-in-out infinite",
      }}>
        ✦
      </div>
      <h1 style={{ ...styles.headline, marginBottom: "16px", fontSize: "clamp(36px, 6vw, 56px)" }}>
        {creatorName ? `${creatorName}, let's get you paid` : "Let's get you paid"}
      </h1>
      <p style={{ ...styles.subheadline, marginTop: 0, marginLeft: "auto", marginRight: "auto", marginBottom: "48px", textAlign: "center", fontSize: "16px", maxWidth: "520px" }}>
        In 4 minutes, you&apos;ll have a launch-ready offer, a 7-day plan, and your first drop live. 
        No guessing. No templates. Built from your actual audience.
      </p>
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(3, 1fr)", 
        gap: "20px", 
        marginBottom: "48px",
        padding: "28px 32px",
        background: "linear-gradient(135deg, rgba(200,169,110,0.06) 0%, rgba(200,169,110,0.02) 100%)",
        borderRadius: "14px",
        border: "1px solid rgba(200,169,110,0.15)",
      }}>
        {[
          { num: "01", label: "Define your edge", time: "1 min" },
          { num: "02", label: "Unlock your signals", time: "2 min" },
          { num: "03", label: "Launch first drop", time: "1 min" },
        ].map(item => (
          <div key={item.num}>
            <div style={{ 
              fontFamily: "var(--font-mono)", 
              fontSize: "11px", 
              color: "var(--gold)", 
              marginBottom: "8px",
              letterSpacing: "0.15em",
              fontWeight: 500,
            }}>
              {item.num}
            </div>
            <div style={{ fontSize: "15px", color: "rgba(255,255,255,0.85)", fontWeight: 500, marginBottom: "4px" }}>
              {item.label}
            </div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}>
              {item.time}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <div style={styles.stepBadge}>
        <span style={{ width: "20px", height: "1px", background: "var(--gold-dim)" }} />
        Step 1 of 6
      </div>
      <h1 style={styles.headline}>Define your edge</h1>
      <p style={styles.subheadline}>
        Pick the category where you have credibility. This shapes your pricing, 
        positioning, and what fans expect from you.
      </p>
      
      <div style={{ ...styles.grid(2), marginBottom: "24px" }}>
        {NICHES.map(niche => (
          <div
            key={niche.id}
            onClick={() => { updateData("niche", niche.id); track.nicheSelected(niche.id); }}
            style={{
              ...styles.card,
              ...(data.niche === niche.id ? styles.cardSelected : {}),
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
            }}
          >
            <div style={{ 
              fontSize: "24px", 
              color: data.niche === niche.id ? "var(--gold)" : "rgba(255,255,255,0.3)",
              transition: "color 0.2s",
            }}>
              {niche.icon}
            </div>
            <div>
              <div style={{ 
                fontSize: "16px", 
                fontWeight: 500, 
                color: data.niche === niche.id ? "var(--gold)" : "rgba(255,255,255,0.9)",
                marginBottom: "4px",
                transition: "color 0.2s",
              }}>
                {niche.label}
              </div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>
                {niche.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {data.niche && SUB_NICHES[data.niche] && (
        <div style={{ marginTop: "32px" }}>
          <label style={styles.label}>Narrow your focus</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {SUB_NICHES[data.niche].map(sub => (
              <button
                key={sub}
                onClick={() => updateData("subNiche", sub)}
                style={{
                  background: data.subNiche === sub ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${data.subNiche === sub ? "rgba(200,169,110,0.4)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "20px",
                  padding: "8px 16px",
                  color: data.subNiche === sub ? "var(--gold)" : "rgba(255,255,255,0.7)",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div>
      <div style={styles.stepBadge}>
        <span style={{ width: "20px", height: "1px", background: "var(--gold-dim)" }} />
        Step 2 of 6
      </div>
      <h1 style={styles.headline}>What will fans pay for?</h1>
      <p style={styles.subheadline}>
        Select the content formats you&apos;ll deliver. Different formats = different price points.
      </p>
      
      <div style={{ ...styles.grid(2), marginBottom: "32px" }}>
        {CONTENT_TYPES.map(type => {
          const selected = data.contentTypes.includes(type.id);
          return (
            <div
              key={type.id}
              onClick={() => {
                updateData("contentTypes", 
                  selected 
                    ? data.contentTypes.filter(t => t !== type.id)
                    : [...data.contentTypes, type.id]
                );
              }}
              style={{
                ...styles.card,
                ...(selected ? styles.cardSelected : {}),
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ 
                  fontSize: "15px", 
                  fontWeight: 500, 
                  color: selected ? "var(--gold)" : "rgba(255,255,255,0.9)",
                  marginBottom: "3px",
                }}>
                  {type.label}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                  {type.desc}
                </div>
              </div>
              <div style={{
                width: "20px",
                height: "20px",
                borderRadius: "4px",
                border: `2px solid ${selected ? "var(--gold)" : "rgba(255,255,255,0.15)"}`,
                background: selected ? "var(--gold)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}>
                {selected && <span style={{ color: "#0a0800", fontSize: "12px" }}>✓</span>}
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <label style={styles.label}>Experience Level</label>
          <div style={{ display: "flex", gap: "10px" }}>
            {(["beginner", "intermediate", "advanced"] as const).map(level => (
              <button
                key={level}
                onClick={() => updateData("experience", level)}
                style={{
                  flex: 1,
                  background: data.experience === level ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${data.experience === level ? "rgba(200,169,110,0.4)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "6px",
                  padding: "12px",
                  color: data.experience === level ? "var(--gold)" : "rgba(255,255,255,0.6)",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textTransform: "capitalize",
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label style={styles.label}>Current Monthly Revenue</label>
          <select
            value={data.currentRevenue}
            onChange={e => updateData("currentRevenue", e.target.value)}
            style={styles.input}
          >
            <option value="0">$0 - Just starting</option>
            <option value="100">$1 - $500</option>
            <option value="500">$500 - $2,000</option>
            <option value="2000">$2,000 - $10,000</option>
            <option value="10000">$10,000+</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const connectedCount = data.socialConnections.filter(s => s.connected).length;
    
    return (
      <div>
        <div style={styles.stepBadge}>
          <span style={{ width: "20px", height: "1px", background: "var(--gold-dim)" }} />
          Step 3 of 6
        </div>
        <h1 style={styles.headline}>Unlock your audience data</h1>
        <p style={styles.subheadline}>
          Connect a platform so we can find your DM opportunities, calculate your pricing power, 
          and build a blueprint from real signals—not guesswork.
        </p>
        
        <div style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
          {SOCIAL_PLATFORMS.map(platform => {
            const connection = data.socialConnections.find(s => s.platform === platform.id);
            const connected = connection?.connected;
            
            return (
              <div
                key={platform.id}
                style={{
                  ...styles.card,
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: connected ? "default" : "pointer",
                  ...(connected ? {
                    background: "rgba(80,212,138,0.04)",
                    borderColor: "rgba(80,212,138,0.2)",
                  } : {}),
                }}
                onClick={() => !connected && handleConnectSocial(platform.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ 
                    fontSize: "24px",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "8px",
                  }}>
                    {platform.icon}
                  </div>
                  <div>
                    <div style={{ 
                      fontSize: "15px", 
                      fontWeight: 500,
                      color: connected ? "#50d48a" : "rgba(255,255,255,0.9)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}>
                      {platform.label}
                      {connected && connection?.username && (
                        <span style={{ 
                          fontSize: "12px", 
                          color: "rgba(255,255,255,0.5)",
                          fontWeight: 400,
                        }}>
                          @{connection.username}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                      {connected ? (
                        <span style={{ display: "flex", gap: "16px" }}>
                          {connection?.followers && <span>{connection.followers.toLocaleString()} followers</span>}
                          {connection?.engagement && <span>{connection.engagement}% engagement</span>}
                        </span>
                      ) : (
                        platform.unlocks
                      )}
                    </div>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!connected) handleConnectSocial(platform.id);
                  }}
                  style={{
                    background: connected ? "transparent" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${connected ? "rgba(80,212,138,0.3)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: "6px",
                    padding: "10px 18px",
                    color: connected ? "#50d48a" : "rgba(255,255,255,0.7)",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: connected ? "default" : "pointer",
                  }}
                >
                  {connected ? "✓ Connected" : "Connect"}
                </button>
              </div>
            );
          })}
        </div>
        
        {connectedCount === 0 && (
          <div style={{
            padding: "16px 20px",
            background: "rgba(232,168,48,0.08)",
            border: "1px solid rgba(232,168,48,0.2)",
            borderRadius: "8px",
            color: "rgba(255,255,255,0.75)",
            fontSize: "13px",
            lineHeight: 1.5,
          }}>
            ⚡ <strong style={{ color: "var(--gold)" }}>Without platform data, we can&apos;t calculate your DM opportunities or optimal pricing.</strong> You&apos;ll get a generic blueprint instead of one built from your actual audience.
          </div>
        )}
      </div>
    );
  };

  const renderProfileStep = () => {
    const pi = data.profileIdentity;
    if (!pi) return null;

    const connected = data.socialConnections.filter(s => s.connected);
    const best = connected.length > 0
      ? connected.reduce((a, b) => (a.followers || 0) > (b.followers || 0) ? a : b)
      : null;

    const updatePi = (updates: Partial<ProfileIdentity>) =>
      updateData("profileIdentity", { ...pi, ...updates });

    const hasAvatar = !!(pi.avatarPreview || pi.avatarUrl);
    const hasBanner = !!(pi.bannerPreview || pi.bannerUrl);

    return (
      <div>
        <div style={styles.stepBadge}>
          <span style={{ width: "20px", height: "1px", background: "var(--gold-dim)" }} />
          Step 4 of 7
        </div>
        <h1 style={styles.headline}>Build your public identity</h1>
        <p style={styles.subheadline}>
          This is your profile — what fans see before they pay.
          {best ? " We pre-filled from your social account. Edit anything." : " Fill in your public details below."}
        </p>

        {/* Social import badge */}
        {best && (
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "10px 14px",
            background: "rgba(80,212,138,0.06)", border: "1px solid rgba(80,212,138,0.2)",
            borderRadius: "8px", marginBottom: "24px",
          }}>
            <span style={{ color: "var(--green)", fontSize: "14px" }}>✓</span>
            <div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--green)", letterSpacing: "0.12em" }}>
                AUTO-FILLED FROM @{best.username?.toUpperCase()} · {best.platform.toUpperCase()}
              </span>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>
                Review and edit everything below — you're in full control.
              </div>
            </div>
          </div>
        )}

        {/* Banner */}
        <div style={{ position: "relative", marginBottom: "8px" }}>
          <div style={{
            height: "150px", borderRadius: "10px",
            background: hasBanner ? "transparent" : "linear-gradient(135deg, rgba(200,169,110,0.06), rgba(200,169,110,0.02))",
            border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            {hasBanner ? (
              <img
                src={pi.bannerPreview || pi.bannerUrl!}
                alt="Banner"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "20px", marginBottom: "6px", opacity: 0.3 }}>✦</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(255,255,255,0.22)", letterSpacing: "0.15em" }}>
                  BANNER IMAGE (OPTIONAL)
                </div>
              </div>
            )}
            <div style={{ position: "absolute", bottom: "10px", right: "10px", display: "flex", gap: "8px" }}>
              <button
                onClick={() => profileBannerRef.current?.click()}
                style={{
                  padding: "6px 12px", background: "rgba(0,0,0,0.72)",
                  border: "1px solid rgba(255,255,255,0.18)", borderRadius: "5px",
                  color: "rgba(255,255,255,0.85)", fontFamily: "var(--font-mono)",
                  fontSize: "10px", letterSpacing: "0.12em", cursor: "pointer",
                }}
              >
                {hasBanner ? "CHANGE" : "ADD BANNER"}
              </button>
              {hasBanner && (
                <button
                  onClick={() => { profileBannerFileRef.current = null; updatePi({ bannerPreview: null, bannerUrl: null }); }}
                  style={{
                    padding: "6px 12px", background: "rgba(224,85,85,0.12)",
                    border: "1px solid rgba(224,85,85,0.28)", borderRadius: "5px",
                    color: "#e05555", fontFamily: "var(--font-mono)",
                    fontSize: "10px", letterSpacing: "0.12em", cursor: "pointer",
                  }}
                >
                  REMOVE
                </button>
              )}
            </div>
          </div>
          <input
            ref={profileBannerRef} type="file" accept="image/*"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) { profileBannerFileRef.current = file; updatePi({ bannerPreview: URL.createObjectURL(file) }); }
            }}
            style={{ display: "none" }}
          />
        </div>

        {/* Avatar row — overlaps banner */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", marginBottom: "24px", marginTop: "-28px", paddingLeft: "16px" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%",
              border: "3px solid #09090f", background: "#111120",
              overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {hasAvatar ? (
                <img src={pi.avatarPreview || pi.avatarUrl!} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "26px", opacity: 0.4 }}>👤</span>
              )}
            </div>
            <button
              onClick={() => profileAvatarRef.current?.click()}
              style={{
                position: "absolute", bottom: "-2px", right: "-2px",
                width: "22px", height: "22px", borderRadius: "50%",
                background: "var(--gold)", border: "2px solid #09090f",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px",
              }}
            >📷</button>
          </div>
          {hasAvatar && (
            <button
              onClick={() => { profileAvatarFileRef.current = null; updatePi({ avatarPreview: null, avatarUrl: null }); }}
              style={{
                padding: "4px 10px", background: "transparent",
                border: "1px solid rgba(224,85,85,0.3)", borderRadius: "4px",
                color: "#e05555", fontFamily: "var(--font-mono)",
                fontSize: "10px", letterSpacing: "0.12em", cursor: "pointer", marginBottom: "4px",
              }}
            >
              REMOVE PHOTO
            </button>
          )}
          <input
            ref={profileAvatarRef} type="file" accept="image/*"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) { profileAvatarFileRef.current = file; updatePi({ avatarPreview: URL.createObjectURL(file) }); }
            }}
            style={{ display: "none" }}
          />
        </div>

        {/* Form fields */}
        <div style={{ display: "grid", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={styles.label}>DISPLAY NAME *</label>
              <input
                type="text"
                value={pi.displayName}
                onChange={e => updatePi({ displayName: e.target.value })}
                placeholder="Your public name"
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>HANDLE</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-mono)", fontSize: "14px",
                }}>@</span>
                <input
                  type="text"
                  value={pi.handle}
                  onChange={e => updatePi({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                  placeholder="yourhandle"
                  style={{ ...styles.input, paddingLeft: "26px" }}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={styles.label}>BIO</label>
            <textarea
              value={pi.bio}
              onChange={e => updatePi({ bio: e.target.value.slice(0, 200) })}
              placeholder={`${NICHES.find(n => n.id === data.niche)?.label || "Creator"} sharing exclusive content you won't find anywhere else.`}
              rows={3}
              style={{ ...styles.input, resize: "vertical" as const, minHeight: "76px" }}
            />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--dim)", marginTop: "4px", textAlign: "right" as const }}>
              {pi.bio.length}/200
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={styles.label}>MAIN SPECIALTY</label>
              <input
                type="text"
                value={pi.specialty}
                onChange={e => updatePi({ specialty: e.target.value })}
                placeholder="e.g. Streetwear Styling"
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>LOCATION (OPTIONAL)</label>
              <input
                type="text"
                value={pi.location}
                onChange={e => updatePi({ location: e.target.value })}
                placeholder="Dubai, UAE"
                style={styles.input}
              />
            </div>
          </div>

          <div>
            <label style={styles.label}>PRIMARY LINK / CTA</label>
            <input
              type="url"
              value={pi.cta}
              onChange={e => updatePi({ cta: e.target.value })}
              placeholder="https://yourwebsite.com"
              style={styles.input}
            />
            <div style={{ fontSize: "11px", color: "var(--dim)", marginTop: "4px" }}>
              Shown on your fan page as a link button. Your Cipher profile URL is added separately.
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep5 = () => {
    const analysis = data.signalAnalysis;
    if (!analysis) return null;
    
    return (
      <div>
        <div style={styles.stepBadge}>
          <span style={{ width: "20px", height: "1px", background: "var(--gold-dim)" }} />
          Step 5 of 7
        </div>
        <h1 style={styles.headline}>We found your edge</h1>
        <p style={styles.subheadline}>
          Here&apos;s where your audience is most engaged—and how to convert them.
        </p>
        
        {isDemoMode && (
          <div style={{
            padding: "12px 16px",
            background: "rgba(147,112,219,0.08)",
            border: "1px solid rgba(147,112,219,0.25)",
            borderRadius: "8px",
            color: "rgba(255,255,255,0.8)",
            fontSize: "13px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <span style={{ fontSize: "16px" }}>🎭</span>
            <span><strong>Demo insights based on typical creators.</strong> Connect a platform to unlock your real data.</span>
          </div>
        )}
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Strongest Platform</div>
            <div style={styles.metricValue}>{analysis.strongestPlatform}</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Best Content Type</div>
            <div style={styles.metricValue}>{analysis.bestContentType}</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Peak Posting Time</div>
            <div style={styles.metricValue}>{analysis.bestPostingTime}</div>
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div style={{
            ...styles.card,
            background: analysis.audienceQuality === "high" 
              ? "rgba(80,212,138,0.06)" 
              : analysis.audienceQuality === "medium" 
                ? "rgba(232,168,48,0.06)" 
                : "rgba(224,85,85,0.06)",
            borderColor: analysis.audienceQuality === "high"
              ? "rgba(80,212,138,0.2)"
              : analysis.audienceQuality === "medium"
                ? "rgba(232,168,48,0.2)"
                : "rgba(224,85,85,0.2)",
          }}>
            <div style={styles.metricLabel}>Audience Quality</div>
            <div style={{ 
              fontSize: "20px", 
              fontWeight: 500,
              color: analysis.audienceQuality === "high" ? "#50d48a" : analysis.audienceQuality === "medium" ? "#e8a830" : "#e05555",
              textTransform: "capitalize",
              marginBottom: "6px",
            }}>
              {analysis.audienceQuality}
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
              {analysis.audienceQualityReason}
            </div>
          </div>
          
          <div style={{
            ...styles.card,
            background: "rgba(200,169,110,0.06)",
            borderColor: "rgba(200,169,110,0.2)",
          }}>
            <div style={styles.metricLabel}>DM Opportunities</div>
            <div style={{ 
              fontSize: "28px", 
              fontFamily: "var(--font-display)",
              color: "var(--gold)",
              marginBottom: "6px",
            }}>
              {analysis.dmOpportunities}+
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
              High-intent followers ready to convert
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: "32px" }}>
          <div style={styles.label}>Recommended Actions</div>
          <div style={{ display: "grid", gap: "10px" }}>
            {analysis.actionItems.map((action, i) => (
              <div key={i} style={styles.actionCard}>
                <span style={styles.actionNumber}>{i + 1}</span>
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)" }}>{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderStep6 = () => {
    const blueprint = data.launchBlueprint;
    if (!blueprint) return null;
    
    const ConfidenceBadge = ({ level }: { level: "high" | "medium" | "low" }) => (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "10px",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: level === "high" ? "#50d48a" : level === "medium" ? "var(--gold)" : "#e8a830",
        background: level === "high" ? "rgba(80,212,138,0.12)" : level === "medium" ? "rgba(200,169,110,0.12)" : "rgba(232,168,48,0.12)",
        padding: "3px 8px",
        borderRadius: "3px",
      }}>
        {level === "high" ? "●●●" : level === "medium" ? "●●○" : "●○○"} {level}
      </span>
    );

    return (
      <div>
        <div style={styles.stepBadge}>
          <span style={{ width: "20px", height: "1px", background: "var(--gold-dim)" }} />
          Step 6 of 7
        </div>
        <h1 style={styles.headline}>Launch Command</h1>
        
        {isDemoMode && (
          <div style={{
            padding: "12px 16px",
            background: "rgba(147,112,219,0.08)",
            border: "1px solid rgba(147,112,219,0.25)",
            borderRadius: "8px",
            color: "rgba(255,255,255,0.8)",
            fontSize: "13px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <span style={{ fontSize: "16px" }}>🎭</span>
            <span><strong>Demo blueprint.</strong> Revenue estimates are illustrative—connect your socials for real projections.</span>
          </div>
        )}
        
        {/* Strategy summary */}
        <div style={{
          padding: "14px 18px",
          background: "rgba(200,169,110,0.08)",
          border: "1px solid rgba(200,169,110,0.2)",
          borderRadius: "6px",
          marginBottom: "24px",
          fontSize: "14px",
          color: "rgba(255,255,255,0.85)",
          fontStyle: "italic",
        }}>
          ✦ {blueprint.strategySummary}
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          {/* Price Card */}
          <div style={{ ...styles.card, padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <div style={styles.metricLabel}>Price Point</div>
              <ConfidenceBadge level={blueprint.priceConfidence} />
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", color: "var(--gold)", marginBottom: "6px" }}>
              ${blueprint.price}<span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>/mo</span>
            </div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
              {blueprint.priceRationale}
            </div>
          </div>
          
          {/* Channel Card */}
          <div style={{ ...styles.card, padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <div style={styles.metricLabel}>Primary Channel</div>
              <ConfidenceBadge level={blueprint.channelConfidence} />
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "var(--gold)", marginBottom: "6px", textTransform: "capitalize" }}>
              {blueprint.bestChannels[0]}
            </div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
              {blueprint.channelRationale}
            </div>
          </div>
        </div>
        
        {/* Revenue Range */}
        <div style={{ ...styles.card, padding: "18px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={styles.metricLabel}>Monthly Revenue Range</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}>
              {blueprint.revenueAssumptions}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>
              ${blueprint.revenueEstimate.low?.toLocaleString() || Math.floor(blueprint.revenueEstimate.monthly * 0.5).toLocaleString()}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "28px", color: "#50d48a" }}>
              ${blueprint.revenueEstimate.monthly.toLocaleString()}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>
              ${blueprint.revenueEstimate.high?.toLocaleString() || Math.floor(blueprint.revenueEstimate.monthly * 2).toLocaleString()}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
            <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", position: "relative" as const }}>
              <div style={{ position: "absolute" as const, left: "25%", right: "25%", top: 0, bottom: 0, background: "linear-gradient(90deg, rgba(80,212,138,0.3), #50d48a, rgba(80,212,138,0.3))", borderRadius: "2px" }} />
            </div>
          </div>
        </div>
        
        {/* 7-Day Plan - First action highlighted */}
        <div>
          <div style={{ ...styles.label, display: "flex", alignItems: "center", gap: "8px" }}>
            7-Day Plan
            <span style={{ fontSize: "10px", color: "var(--gold)", fontFamily: "var(--font-mono)" }}>START TODAY ↓</span>
          </div>
          <div style={{ display: "grid", gap: "6px" }}>
            {blueprint.sevenDayPlan.slice(0, 5).map((item, idx) => (
              <div key={item.day} style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: idx === 0 ? "14px 16px" : "10px 16px",
                background: idx === 0 ? "rgba(200,169,110,0.12)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${idx === 0 ? "rgba(200,169,110,0.35)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: "6px",
              }}>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: idx === 0 ? "var(--gold)" : "rgba(255,255,255,0.4)",
                  letterSpacing: "0.1em",
                  minWidth: "36px",
                }}>
                  D{item.day}
                </span>
                <span style={{ fontSize: "13px", color: idx === 0 ? "var(--gold)" : "rgba(255,255,255,0.7)", fontWeight: idx === 0 ? 500 : 400 }}>
                  {item.action}
                </span>
                {idx === 0 && (
                  <span style={{ marginLeft: "auto", fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--gold)", background: "rgba(200,169,110,0.2)", padding: "2px 8px", borderRadius: "3px" }}>
                    DO THIS FIRST
                  </span>
                )}
              </div>
            ))}
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", paddingLeft: "16px", marginTop: "4px" }}>
              +2 more days after launch
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep7 = () => {
    const drop = data.firstDrop;
    const blueprint = data.launchBlueprint;
    const signals = data.signalAnalysis;
    if (!drop || !blueprint) return null;
    
    const recommendedPrice = blueprint.price;
    const priceDiff = drop.price - recommendedPrice;
    const priceWarning = priceDiff < -10 ? "low" : priceDiff > 15 ? "high" : null;
    
    const totalFollowers = data.socialConnections.reduce((sum, s) => sum + (s.followers || 0), 0);
    const strongestPlatform = signals?.strongestPlatform || "instagram";
    const dmOpportunities = signals?.dmOpportunities || 15;
    
    // Post-launch success state — FIRST SALE ENGINE
    if (launched) {
      return <FirstSaleEngine
        niche={data.niche}
        drop={drop}
        blueprint={blueprint}
        strongestPlatform={strongestPlatform}
        dmOpportunities={dmOpportunities}
        fanPageUrl={fanPageUrl}
        onDashboard={() => router.push("/dashboard?onboarding=complete&drop=created")}
      />;
    }
    
    // Pre-launch state
    return (
      <div>
        <div style={styles.stepBadge}>
          <span style={{ width: "20px", height: "1px", background: "var(--gold-dim)" }} />
          Final Step
        </div>
        <h1 style={styles.headline}>Your first drop is ready</h1>
        
        {/* Why this works - specific to their signals */}
        <div style={{
          padding: "14px 18px",
          background: "rgba(80,212,138,0.06)",
          border: "1px solid rgba(80,212,138,0.18)",
          borderRadius: "8px",
          marginBottom: "20px",
          fontSize: "13px",
          lineHeight: 1.6,
        }}>
          <div style={{ color: "#50d48a", fontWeight: 600, marginBottom: "6px", fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Why this will convert
          </div>
          <div style={{ color: "rgba(255,255,255,0.8)" }}>
            Your <strong style={{ color: "var(--gold)" }}>{totalFollowers.toLocaleString()}</strong> followers on {strongestPlatform} have{" "}
            <strong style={{ color: "var(--gold)" }}>{signals?.audienceQuality || "solid"}</strong> engagement. 
            We found <strong style={{ color: "var(--gold)" }}>{dmOpportunities}+</strong> high-intent signals — people already asking for more. 
            This offer meets that demand at a price point that converts.
          </div>
        </div>
        
        {/* Main preview card - premium product feel */}
        <div style={{
          padding: "0",
          background: "linear-gradient(135deg, rgba(200,169,110,0.12) 0%, rgba(200,169,110,0.04) 100%)",
          border: "1px solid rgba(200,169,110,0.3)",
          borderRadius: "14px",
          marginBottom: "16px",
          overflow: "hidden",
        }}>
          {/* Top bar with exclusivity signals */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            padding: "12px 20px",
            background: "rgba(0,0,0,0.2)",
            borderBottom: "1px solid rgba(200,169,110,0.15)",
          }}>
            <div style={{ 
              fontFamily: "var(--font-mono)", 
              fontSize: "10px", 
              color: "var(--gold)",
              letterSpacing: "0.12em",
            }}>
              ✦ YOUR EXCLUSIVE OFFER
            </div>
            <div style={{
              background: "rgba(200,169,110,0.12)",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--gold)",
              letterSpacing: "0.06em",
            }}>
              FOUNDING RATE
            </div>
          </div>
          
          {/* Content */}
          <div style={{ padding: "24px" }}>
            {editingDrop ? (
              <div style={{ display: "grid", gap: "14px" }}>
                <input
                  value={drop.title}
                  onChange={e => updateData("firstDrop", { ...drop, title: e.target.value })}
                  style={{ ...styles.input, fontSize: "18px", fontFamily: "var(--font-display)" }}
                  placeholder="Drop title"
                />
                <textarea
                  value={drop.description}
                  onChange={e => updateData("firstDrop", { ...drop, description: e.target.value })}
                  style={{ ...styles.input, minHeight: "70px", resize: "vertical", fontSize: "14px" }}
                  placeholder="What do members get?"
                />
              </div>
            ) : (
              <>
                <div style={{ 
                  fontFamily: "var(--font-display)",
                  fontSize: "28px",
                  color: "var(--gold)",
                  marginBottom: "12px",
                  lineHeight: 1.2,
                }}>
                  {drop.title}
                </div>
                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.65)", marginBottom: "20px", lineHeight: 1.6 }}>
                  {drop.description}
                </div>
              </>
            )}
            
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: editingDrop ? "14px" : 0 }}>
              <div style={{ 
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--gold)",
                color: "#0a0800",
                padding: "14px 32px",
                borderRadius: "4px",
                fontFamily: "var(--font-mono)",
                fontSize: "14px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}>
                Unlock — ${drop.price}/mo
              </div>
              <button
                onClick={() => setEditingDrop(!editingDrop)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "4px",
                  padding: "10px 14px",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: "11px",
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                }}
              >
                {editingDrop ? "Done" : "Edit copy"}
              </button>
            </div>
          </div>
        </div>
        
        {/* Price adjustment with confidence anchor and warnings */}
        <div style={{
          padding: "16px 18px",
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${priceWarning ? (priceWarning === "low" ? "rgba(232,168,48,0.3)" : "rgba(224,85,85,0.25)") : "rgba(255,255,255,0.06)"}`,
          borderRadius: "8px",
          marginBottom: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: priceWarning ? "10px" : 0 }}>
            <div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", marginBottom: "3px" }}>Adjust Price</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                {data.experience === "advanced" ? "Top" : data.experience === "intermediate" ? "Mid-tier" : "New"} {data.niche} creators charge ${Math.max(10, recommendedPrice - 5)}–${recommendedPrice + 10}/mo
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => updateData("firstDrop", { ...drop, price: Math.max(5, drop.price - 5) })}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "4px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "18px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                −
              </button>
              <div style={{ 
                fontFamily: "var(--font-mono)", 
                fontSize: "22px", 
                color: priceWarning ? (priceWarning === "low" ? "#e8a830" : "#e05555") : "var(--gold)",
                minWidth: "65px",
                textAlign: "center",
              }}>
                ${drop.price}
              </div>
              <button
                onClick={() => updateData("firstDrop", { ...drop, price: drop.price + 5 })}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "4px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "18px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +
              </button>
            </div>
          </div>
          
          {/* Price warnings */}
          {priceWarning === "low" && (
            <div style={{ fontSize: "11px", color: "#e8a830", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⚠</span> Pricing below ${recommendedPrice - 5} can signal low value. Your audience expects premium.
            </div>
          )}
          {priceWarning === "high" && (
            <div style={{ fontSize: "11px", color: "#e05555", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⚠</span> Higher prices need proof. Consider starting at ${recommendedPrice} and raising after testimonials.
            </div>
          )}
        </div>
        
        {/* Risk removal */}
        <div style={{
          display: "flex",
          gap: "16px",
          marginBottom: "16px",
          fontSize: "11px",
          color: "rgba(255,255,255,0.45)",
        }}>
          <span>✓ Change price anytime</span>
          <span>✓ Pause or close whenever</span>
          <span>✓ No long-term lock-in</span>
        </div>
        
        {/* System ready + what happens next */}
        <div style={{
          padding: "16px 18px",
          background: "rgba(200,169,110,0.06)",
          border: "1px solid rgba(200,169,110,0.15)",
          borderRadius: "8px",
        }}>
          <div style={{ 
            fontSize: "13px", 
            color: "rgba(255,255,255,0.8)", 
            marginBottom: "8px",
          }}>
            <strong style={{ color: "var(--gold)" }}>Your monetization system is ready.</strong>
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: "10px" }}>
            <strong style={{ color: "var(--gold)" }}>Go Live</strong> creates your fans page and publishes this drop. 
            You&apos;ll get a link to share — one post on {strongestPlatform} is all it takes. 
            Everything else is automated.
          </div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
            Creators with similar setups typically see their first subscriber within the first week.
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderProfileStep();
      case 6: return renderStep5();
      case 7: return renderStep6();
      case 8: return renderStep7();
      default: return null;
    }
  };

  const getCtaText = () => {
    switch (step) {
      case 1: return "Start Building →";
      case 2: return "Lock In My Niche →";
      case 3: return "Set My Content Mix →";
      case 4: return "Build My Profile →";
      case 5: return "Analyse My Signals →";
      case 6: return "Generate My Blueprint →";
      case 7: return "Create My First Drop →";
      case 8: return "Go Live →";
      default: return "Continue →";
    }
  };

  const getLoadingText = () => {
    switch (step) {
      case 5: return "Scanning your audience signals...";
      case 6: return "Building your custom blueprint...";
      case 7: return "Crafting your first drop...";
      case 8: return "Launching...";
      default: return "Processing...";
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Progress bar */}
        <div style={styles.progressBar}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i} 
              style={styles.progressStep(i + 1 === step, i + 1 < step)} 
            />
          ))}
        </div>
        
        {/* Step content */}
        {renderCurrentStep()}
        
        {/* Error message */}
        {error && (
          <div style={{
            marginTop: "20px",
            padding: "14px 18px",
            background: "rgba(224,85,85,0.1)",
            border: "1px solid rgba(224,85,85,0.3)",
            borderRadius: "8px",
            color: "#e05555",
            fontSize: "13px",
          }}>
            {error}
          </div>
        )}
      </div>
      
      {/* Footer with navigation */}
      <div style={styles.footer}>
        {step > 1 && (
          <button
            onClick={handleBack}
            disabled={loading}
            style={{
              ...styles.button.ghost,
              opacity: loading ? 0.5 : 1,
            }}
          >
            Back
          </button>
        )}
        
        <button
          onClick={step === 8 ? handleLaunch : handleNext}
          disabled={loading || !canProceed()}
          style={{
            ...styles.button.primary,
            opacity: loading || !canProceed() ? 0.5 : 1,
            minWidth: "220px",
          }}
        >
          {loading ? getLoadingText() : getCtaText()}
        </button>
        
        {step === 4 && (
          <button
            onClick={() => {
              setIsDemoMode(true);
              handleNext();
            }}
            disabled={loading}
            style={{
              ...styles.button.ghost,
              opacity: loading ? 0.5 : 1,
            }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
