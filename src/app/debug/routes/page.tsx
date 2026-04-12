"use client";

import { useEffect, useState } from "react";

const ROUTE_CATEGORIES = {
  public: {
    label: "Public Routes",
    routes: [
      { path: "/", methods: ["GET"], description: "Landing page - main marketing page" },
      { path: "/login", methods: ["GET", "POST"], description: "User login page + form handler" },
      { path: "/apply", methods: ["GET", "POST"], description: "Creator application form" },
      { path: "/success", methods: ["GET"], description: "Post-signup success page" },
      { path: "/error", methods: ["GET"], description: "Error page" },
      { path: "/setup-admin", methods: ["GET", "POST"], description: "Initial admin setup (first-run only)" },
      { path: "/marketing", methods: ["GET"], description: "Marketing landing page" },
      { path: "/r/[slug]", methods: ["GET"], description: "Referral link landing - tracks referral and redirects to creator page" },
      { path: "/offer/[id]", methods: ["GET"], description: "Public offer page - fans can purchase without login" },
      { path: "/unlock/[code]", methods: ["GET", "POST"], description: "Unlock content with access code" },
    ],
  },
  fanPublic: {
    label: "Fan-Facing Public Routes",
    routes: [
      { path: "/[handle]", methods: ["GET"], description: "Creator public fan page - shows bio, offers, vault" },
      { path: "/book/[handle]", methods: ["GET"], description: "Public booking page for creator" },
      { path: "/booking/success", methods: ["GET"], description: "Booking confirmation page" },
      { path: "/commission/[handle]", methods: ["GET"], description: "Public commission request page" },
      { path: "/commission/status", methods: ["GET"], description: "Commission status check page" },
      { path: "/tips/[handle]", methods: ["GET"], description: "Public tip jar page" },
      { path: "/series/[handle]", methods: ["GET"], description: "Public series/drops listing page" },
      { path: "/series/[handle]/[seriesId]", methods: ["GET"], description: "Public series detail page" },
      { path: "/vault/[handle]", methods: ["GET"], description: "Public vault preview page" },
      { path: "/pay/[id]", methods: ["GET", "POST"], description: "Payment link page - for standalone payment links" },
      { path: "/fan/access/[token]", methods: ["GET"], description: "Fan access token page - grant temp access to content" },
      { path: "/vault/success", methods: ["GET"], description: "Vault purchase success page" },
    ],
  },
  dashboard: {
    label: "Creator Dashboard Routes (Auth Required)",
    routes: [
      { path: "/dashboard", methods: ["GET"], description: "Main dashboard - overview stats" },
      { path: "/dashboard/onboarding", methods: ["GET"], description: "Onboarding wizard - multi-step flow" },
      { path: "/dashboard/content", methods: ["GET"], description: "Content management page" },
      { path: "/dashboard/series", methods: ["GET"], description: "Series/drops management" },
      { path: "/dashboard/vault", methods: ["GET"], description: "Creator vault management" },
      { path: "/dashboard/tips", methods: ["GET"], description: "Tips management and analytics" },
      { path: "/dashboard/signals", methods: ["GET"], description: "Signal board - fan engagement signals" },
      { path: "/dashboard/commissions", methods: ["GET"], description: "Commission requests management" },
      { path: "/dashboard/deals", methods: ["GET"], description: "Brand deals management" },
      { path: "/dashboard/bookings", methods: ["GET"], description: "Bookings management" },
      { path: "/dashboard/rate-card", methods: ["GET"], description: "Rate card builder" },
      { path: "/dashboard/referrals", methods: ["GET"], description: "Referral program stats" },
      { path: "/dashboard/presence", methods: ["GET"], description: "Fan presence analytics" },
      { path: "/dashboard/settings", methods: ["GET"], description: "Creator settings" },
      { path: "/dashboard/offers/new", methods: ["GET"], description: "Create new offer" },
    ],
  },
  admin: {
    label: "Admin Routes (Admin Only - Returns 404)",
    routes: [
      { path: "/admin", methods: ["GET"], description: "Admin dashboard redirect" },
      { path: "/admin/login", methods: ["GET", "POST"], description: "Admin login page" },
      { path: "/admin/command-center", methods: ["GET"], description: "Main admin command center" },
      { path: "/admin/applications", methods: ["GET"], description: "Creator applications list" },
    ],
  },
  api: {
    label: "API Endpoints",
    routes: [
      // Auth
      { path: "/api/auth/twitter/connect", methods: ["GET"], description: "Twitter OAuth init" },
      { path: "/api/auth/twitter/callback", methods: ["GET"], description: "Twitter OAuth callback" },
      { path: "/api/auth/instagram/connect", methods: ["GET"], description: "Instagram OAuth init" },
      { path: "/api/auth/instagram/callback", methods: ["GET"], description: "Instagram OAuth callback" },
      { path: "/api/auth/tiktok/connect", methods: ["GET"], description: "TikTok OAuth init" },
      { path: "/api/auth/tiktok/callback", methods: ["GET"], description: "TikTok OAuth callback" },
      { path: "/api/auth/telegram/connect", methods: ["GET"], description: "Telegram OAuth init" },
      { path: "/api/auth/telegram/callback", methods: ["GET"], description: "Telegram OAuth callback" },
      { path: "/api/auth/youtube/connect", methods: ["GET"], description: "YouTube OAuth init" },
      { path: "/api/auth/youtube/callback", methods: ["GET"], description: "YouTube OAuth callback" },
      
      // Apply & Onboarding
      { path: "/api/apply", methods: ["POST"], description: "Submit creator application" },
      { path: "/api/onboarding/draft", methods: ["POST"], description: "Save onboarding draft" },
      { path: "/api/onboarding/profile-save", methods: ["POST"], description: "Save profile during onboarding" },
      { path: "/api/onboarding/profile-draft", methods: ["POST"], description: "Save profile draft" },
      { path: "/api/profile/save", methods: ["POST"], description: "Save creator profile" },
      
      // AI
      { path: "/api/ai/onboarding/analyze", methods: ["POST"], description: "AI onboarding analysis" },
      { path: "/api/ai/onboarding/blueprint", methods: ["POST"], description: "AI generate content blueprint" },
      { path: "/api/ai/onboarding/complete", methods: ["POST"], description: "Complete AI onboarding" },
      { path: "/api/ai/content/ideas", methods: ["POST"], description: "AI content ideas generator" },
      { path: "/api/ai/ghostwrite", methods: ["POST"], description: "AI ghostwriting tool" },
      { path: "/api/ai/voice/clone", methods: ["POST"], description: "AI voice cloning" },
      { path: "/api/ai/voice/tts", methods: ["POST"], description: "AI text-to-speech" },
      { path: "/api/ai/copilot/daily-brief", methods: ["POST"], description: "AI daily brief" },
      { path: "/api/ai/fans/personas", methods: ["POST"], description: "AI fan persona analysis" },
      { path: "/api/ai/monetization/dynamic-pricing", methods: ["POST"], description: "AI dynamic pricing" },
      { path: "/api/ai/signals/action-plan", methods: ["POST"], description: "AI signal action plan" },
      
      // Tools
      { path: "/api/tools/bio", methods: ["POST"], description: "Bio generator tool" },
      { path: "/api/tools/predict", methods: ["POST"], description: "AI predictor tool" },
      
      // Social
      { path: "/api/social/analyze", methods: ["POST"], description: "Social media analysis" },
      { path: "/api/social/refresh-metrics", methods: ["POST"], description: "Refresh social metrics cache" },
      { path: "/api/social/auto-share", methods: ["POST"], description: "Auto-share content to socials" },
      { path: "/api/social/connections", methods: ["GET", "POST"], description: "Manage social connections" },
      
      // Offers
      { path: "/api/offers", methods: ["GET", "POST"], description: "List/create offers" },
      { path: "/api/offers/[id]", methods: ["GET", "PATCH", "DELETE"], description: "Get/update/delete offer" },
      { path: "/api/offers/[id]/launch", methods: ["POST"], description: "Launch offer" },
      { path: "/api/offers/[id]/unlock", methods: ["POST"], description: "Unlock offer content" },
      { path: "/api/offers/manage", methods: ["POST"], description: "Bulk offer management" },
      { path: "/api/offers/purchase", methods: ["POST"], description: "Purchase offer (payment)" },
      
      // Payments
      { path: "/api/pay/[id]", methods: ["GET", "POST"], description: "Payment page endpoint" },
      { path: "/api/pay/[id]/verify", methods: ["POST"], description: "Verify payment" },
      { path: "/api/payment-links", methods: ["GET", "POST"], description: "List/create payment links" },
      { path: "/api/payment-links/[id]", methods: ["GET", "PATCH", "DELETE"], description: "Manage payment link" },
      { path: "/api/whop-link", methods: ["POST"], description: "Generate Whop payment link" },
      { path: "/api/webhooks/whop", methods: ["POST"], description: "Whop webhook handler" },
      
      // Vault
      { path: "/api/vault/upload", methods: ["POST"], description: "Upload file to vault" },
      { path: "/api/vault/setup", methods: ["POST"], description: "Setup vault" },
      { path: "/api/vault/[id]", methods: ["GET", "POST"], description: "Get/update vault item" },
      { path: "/api/vault/[id]/view", methods: ["POST"], description: "View vault content" },
      { path: "/api/vault/[id]/checkout", methods: ["POST"], description: "Checkout vault item" },
      { path: "/api/vault/items/[handle]", methods: ["GET"], description: "Get vault items by creator" },
      
      // Series
      { path: "/api/series", methods: ["GET", "POST"], description: "List/create series" },
      { path: "/api/series/[id]", methods: ["GET", "PATCH", "DELETE"], description: "Get/update/delete series" },
      { path: "/api/series/[id]/read", methods: ["POST"], description: "Mark series as read" },
      { path: "/api/series/public/[handle]", methods: ["GET"], description: "Get public series" },
      
      // Bookings
      { path: "/api/bookings/create", methods: ["POST"], description: "Create booking" },
      { path: "/api/bookings/slots/[handle]", methods: ["GET"], description: "Get available slots" },
      { path: "/api/dashboard/bookings/slots", methods: ["GET", "POST"], description: "Manage booking slots" },
      { path: "/api/dashboard/bookings/slots/[id]", methods: ["GET", "PATCH", "DELETE"], description: "Manage single slot" },
      
      // Commissions
      { path: "/api/commissions", methods: ["GET", "POST"], description: "List/create commissions" },
      { path: "/api/commissions/[id]", methods: ["GET", "PATCH", "DELETE"], description: "Get/update/delete commission" },
      { path: "/api/commissions/[id]/status", methods: ["GET", "POST"], description: "Commission status" },
      { path: "/api/commissions/creator/[handle]", methods: ["GET"], description: "Get commissions for creator" },
      
      // Deals
      { path: "/api/deals", methods: ["GET", "POST"], description: "List/create brand deals" },
      { path: "/api/deals/[id]", methods: ["GET", "PATCH", "DELETE"], description: "Get/update/delete deal" },
      
      // Rate Card
      { path: "/api/rate-card/[slug]", methods: ["GET"], description: "Get rate card" },
      { path: "/api/rate-card/generate", methods: ["POST"], description: "Generate rate card" },
      
      // Signals
      { path: "/api/signals", methods: ["GET"], description: "Get signals" },
      { path: "/api/signals/refresh", methods: ["POST"], description: "Refresh signals" },
      { path: "/api/signals/engage", methods: ["POST"], description: "Engage with signal" },
      { path: "/api/signals/action-plan", methods: ["POST"], description: "Get AI action plan for signal" },
      
      // Referrals
      { path: "/api/referrals/stats", methods: ["GET"], description: "Get referral stats" },
      { path: "/api/referrals/leaderboard", methods: ["GET"], description: "Get referral leaderboard" },
      { path: "/api/referrals/click", methods: ["POST"], description: "Track referral click" },
      { path: "/api/referrals/purchase", methods: ["POST"], description: "Track referral purchase" },
      
      // Fans
      { path: "/api/fans/generate", methods: ["POST"], description: "Generate fan code" },
      { path: "/api/fans/[fan_code]", methods: ["GET"], description: "Get fan by code" },
      { path: "/api/fan/access-tokens", methods: ["GET", "POST"], description: "Manage fan access tokens" },
      { path: "/api/fan/activity", methods: ["GET", "POST"], description: "Track fan activity" },
      { path: "/api/fan/presence", methods: ["GET", "POST"], description: "Fan presence data" },
      { path: "/api/fan/ping", methods: ["POST"], description: "Fan ping endpoint" },
      
      // Creator
      { path: "/api/creator/presence", methods: ["GET", "POST"], description: "Creator presence" },
      
      // Admin
      { path: "/api/admin/stats", methods: ["GET"], description: "Admin stats dashboard" },
      { path: "/api/admin/applications", methods: ["GET"], description: "List applications" },
      { path: "/api/admin/applications/[id]", methods: ["GET", "PATCH"], description: "Review application" },
      { path: "/api/admin/creators", methods: ["GET"], description: "List creators" },
      { path: "/api/admin/creators/[id]", methods: ["GET", "PATCH"], description: "Manage creator" },
      { path: "/api/admin/fans", methods: ["GET"], description: "List fans" },
      { path: "/api/admin/messages", methods: ["GET"], description: "Admin messages" },
      { path: "/api/admin/transactions", methods: ["GET"], description: "List transactions" },
      { path: "/api/admin/activity", methods: ["GET"], description: "Admin activity log" },
      { path: "/api/admin/audit-logs", methods: ["GET"], description: "Audit logs" },
      { path: "/api/admin/actions", methods: ["POST"], description: "Admin bulk actions" },
      { path: "/api/admin/bootstrap", methods: ["POST"], description: "Bootstrap admin data" },
      
      // Other
      { path: "/api/waitlist", methods: ["POST"], description: "Join waitlist" },
      { path: "/api/messages", methods: ["GET", "POST"], description: "Fan messages" },
      { path: "/api/upload", methods: ["POST"], description: "File upload" },
      { path: "/api/withdrawal", methods: ["GET", "POST"], description: "Withdrawal requests" },
      { path: "/api/withdrawal/[id]", methods: ["GET", "PATCH"], description: "Manage withdrawal" },
      { path: "/api/dashboard/notifications", methods: ["GET"], description: "Get notifications" },
      { path: "/api/notifications/send", methods: ["POST"], description: "Send notification" },
      { path: "/api/marketing-agent", methods: ["POST"], description: "Marketing AI agent" },
      { path: "/api/launch-actions", methods: ["POST"], description: "Launch actions handler" },
    ],
  },
  debug: {
    label: "Debug Routes (Dev Only - 404 in Prod)",
    routes: [
      { path: "/debug", methods: ["GET"], description: "Debug hub - main page" },
      { path: "/debug/env", methods: ["GET"], description: "Environment variables" },
      { path: "/debug/api", methods: ["GET"], description: "API test console" },
      { path: "/debug/auth", methods: ["GET"], description: "Auth debugging" },
      { path: "/debug/database", methods: ["GET"], description: "Database query tool" },
      { path: "/debug/dashboard", methods: ["GET"], description: "Dashboard debug" },
      { path: "/debug/analytics", methods: ["GET"], description: "Analytics debug" },
      { path: "/debug/content", methods: ["GET"], description: "Content debug" },
      { path: "/debug/social", methods: ["GET"], description: "Social debug" },
      { path: "/debug/health", methods: ["GET"], description: "Health check" },
      { path: "/debug/monetization", methods: ["GET"], description: "Monetization debug" },
      { path: "/debug/email", methods: ["GET"], description: "Email debug" },
      { path: "/debug/ai", methods: ["GET"], description: "AI features debug" },
    ],
  },
};

export default function DebugRoutesPage() {
  const [expanded, setExpanded] = useState<string[]>(["public", "api"]);

  const toggle = (key: string) => {
    setExpanded((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const totalRoutes = Object.values(ROUTE_CATEGORIES).reduce(
    (acc, cat) => acc + cat.routes.length,
    0
  );

  return (
    <div className="min-h-screen bg-black text-gray-200 p-8 font-mono">
      <h1 className="text-2xl font-bold text-[#c8a96e] mb-2">
        MULUK Route Debug Guide
      </h1>
      <p className="text-gray-400 mb-8">
        Total: {totalRoutes} routes | Middleware: auth, admin=404 in prod, debug=404 in prod
      </p>

      {Object.entries(ROUTE_CATEGORIES).map(([key, category]) => (
        <div key={key} className="mb-6 border border-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle(key)}
            className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 flex justify-between items-center"
          >
            <span className="font-bold text-[#c8a96e]">{category.label}</span>
            <span className="text-gray-500 text-sm">
              {expanded.includes(key) ? "▼" : "▶"} ({category.routes.length})
            </span>
          </button>

          {expanded.includes(key) && (
            <div className="bg-gray-950 p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="pb-2 font-medium">Path</th>
                    <th className="pb-2 font-medium w-24">Methods</th>
                    <th className="pb-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {category.routes.map((route, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-900 last:border-0 hover:bg-gray-900/50"
                    >
                      <td className="py-2 font-mono text-green-400">{route.path}</td>
                      <td className="py-2 text-gray-400">{route.methods.join(", ")}</td>
                      <td className="py-2 text-gray-300">{route.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      <div className="mt-8 p-4 bg-gray-900 rounded-lg">
        <h2 className="text-[#c8a96e] font-bold mb-2">Route Protection Rules</h2>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Public: /, /login, /apply - No auth required</li>
          <li>• Fan-Facing: /book, /commission, /tips, /series, /vault, /[handle] - No auth, public</li>
          <li>• Dashboard: /dashboard/* - Auth required</li>
          <li>• Admin: /admin/* - Auth + admin role (returns 404 if not admin)</li>
          <li>• Debug: /debug/* - Dev only (returns 404 in production)</li>
          <li>• API: All /api/* - Bypasses middleware, handled individually</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-gray-900 rounded-lg">
        <h2 className="text-[#c8a96e] font-bold mb-2">Database Tables (49 migrations)</h2>
        <ul className="text-sm text-gray-400 columns-2 gap-8">
          <li>• users / profiles</li>
          <li>• creator_applications</li>
          <li>• content_items</li>
          <li>• offers</li>
          <li>• payment_links</li>
          <li>• purchases</li>
          <li>• fan_accounts</li>
          <li>• fan_access_tokens</li>
          <li>• vault_items</li>
          <li>• series</li>
          <li>• bookings</li>
          <li>• commissions</li>
          <li>• deals</li>
          <li>• rate_cards</li>
          <li>• signals</li>
          <li>• referrals</li>
          <li>• admin_users</li>
          <li>• audit_logs</li>
        </ul>
      </div>
    </div>
  );
}
