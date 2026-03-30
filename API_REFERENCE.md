# CIPHER API Reference

> All API routes are located in `src/app/api/`. Authentication is handled via Supabase.

---

## Authentication

Most endpoints require authentication. The API uses Supabase session cookies.

**Unauthenticated Response:**
```json
{
  "error": "Unauthorized"
}
```
Status: `401`

---

## Waitlist

### Join Waitlist

`POST /api/waitlist`

Add email to waitlist. Sends confirmation email via Resend.

**Request:**
```json
{
  "email": "user@example.com",
  "type": "creator" | "fan",
  "source": "landing"
}
```

**Response:**
```json
{
  "success": true,
  "alreadyExists": false
}
```

**Errors:**
- `400` — Invalid email or type
- `500` — Database or server error

---

## Creator Application

### Submit Application

`POST /api/apply`

Submit creator application for review.

**Request:**
```json
{
  "email": "creator@example.com",
  "name": "Creator Name",
  "handle": "creatorhandle",
  "category": "fitness",
  "content": ["photos", "videos", "tutorials"],
  "country": "US",
  "payout": "crypto",
  "audience": "10k-50k",
  "bio": "Optional bio text"
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- `400` — Missing required fields (email, name, handle, content)
- `500` — Database error

---

## AI Features

### Ghostwrite Content

`POST /api/ai/ghostwrite`

🔐 **Requires Authentication**

Generate AI content in the creator's brand voice. Streams response.

**Request:**
```json
{
  "prompt": "Write a teaser for my new exclusive photoshoot"
}
```

**Response:** Server-Sent Events (SSE) stream of generated text.

**Rate Limit:** 10 requests per minute per user.

**Errors:**
- `400` — Missing prompt or prompt > 2000 chars
- `401` — Unauthorized
- `429` — Rate limited
- `504` — Timeout (30s)

---

## Creator Tools

### Bio Generator

`POST /api/tools/bio`

🔐 **Requires Authentication**

Generate 3 creator bio variations using AI.

**Request:**
```json
{
  "keywords": "luxury, exclusive, mystery",
  "category": "luxury"
}
```

**Response:** SSE stream with format:
```
BIO_1: [generated bio]
BIO_2: [generated bio]
BIO_3: [generated bio]
```

**Errors:**
- `400` — Missing keywords
- `401` — Unauthorized
- `500` — AI not configured

### Price Prediction

`POST /api/tools/predict`

🔐 **Requires Authentication**

Predict optimal content pricing.

**Request:**
```json
{
  "contentType": "photo_set",
  "audienceSize": 5000,
  "engagementRate": 0.08
}
```

**Response:**
```json
{
  "suggestedPrice": 29.99,
  "priceRange": { "min": 19.99, "max": 39.99 },
  "confidence": 0.85
}
```

---

## Social Integrations

### Connect Platform

`GET /api/auth/{platform}/connect`

Initiate OAuth flow for social platform connection.

**Platforms:** `twitter`, `instagram`, `tiktok`, `youtube`, `telegram`

**Response:** Redirects to platform OAuth page.

### OAuth Callback

`GET /api/auth/{platform}/callback`

Handle OAuth callback and store tokens.

**Query Parameters:**
- `code` — Authorization code
- `state` — CSRF state token

**Response:** Redirects to dashboard on success.

---

### Auto-Share Content

`POST /api/social/auto-share`

🔐 **Requires Authentication**

Share content announcement to connected platforms.

**Request:**
```json
{
  "contentTitle": "New Exclusive Drop",
  "shareText": "Check out my latest content 🔒"
}
```

**Response:**
```json
{
  "results": [
    { "platform": "twitter", "ok": true },
    { "platform": "telegram", "ok": true }
  ]
}
```

**Supported Platforms:** Twitter, Telegram

---

## Dashboard

### Get Notifications

`GET /api/dashboard/notifications`

🔐 **Requires Authentication**

Fetch creator notifications.

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "message": "New fan subscribed!",
      "created_at": "2026-03-30T12:00:00Z",
      "unread": true
    }
  ]
}
```

---

## Fan Codes

### Get Fan Details

`GET /api/fans/{fan_code}`

🔐 **Requires Authentication**

Get details for a specific fan code.

**Response:**
```json
{
  "code": "ABC123",
  "status": "active",
  "custom_name": "Premium Fan",
  "creator_notes": "Top supporter",
  "tags": ["VIP", "early-adopter"],
  "is_vip": true,
  "created_at": "2026-03-15T08:00:00Z"
}
```

---

## Marketing Agent

### Generate Campaign

`POST /api/marketing-agent`

🔐 **Requires Authentication**

AI-powered marketing campaign generation.

**Request:**
```json
{
  "goal": "Increase subscriber count",
  "audience": "fitness enthusiasts",
  "platforms": ["twitter", "instagram"]
}
```

**Response:** Campaign suggestions and copy.

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad request (invalid input) |
| `401` | Unauthorized (not logged in) |
| `403` | Forbidden (no access) |
| `404` | Not found |
| `429` | Rate limited |
| `500` | Internal server error |
| `502` | Upstream service error |
| `504` | Timeout |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/api/ai/ghostwrite` | 10/minute |
| `/api/tools/bio` | 10/minute |
| `/api/waitlist` | 5/minute per IP |

Rate limit responses include:
```json
{
  "error": "Too many requests"
}
```
Status: `429`

---

## Environment Variables

Required for API functionality:

```env
# Core
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Email
RESEND_API_KEY=

# AI Features
ANTHROPIC_API_KEY=

# Social OAuth
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
TELEGRAM_BOT_TOKEN=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# Security
TOKEN_ENCRYPTION_KEY=
```
