# Contributing to MANSA’S MOGULES

## Overview

Mansa’s Mogules is an operating system for digital empires.

Built for:
operators,
founders,
educators,
internet brands,
and modern digital mogules.

The platform focuses on:
audience ownership,
treasury systems,
AI intelligence,
distribution infrastructure,
and empire expansion.

This is NOT:
a creator platform,
an influencer tool,
or generic SaaS software.

Every contribution should reinforce:
ownership over dependency.

---

# Quick Start

## Requirements

Node.js 18+

npm or pnpm

Supabase account

Resend account

OpenRouter API access

---

# 1. Clone & Install

```bash id="5jj0ik"
git clone https://github.com/MansaMusaMogule86/mansas-mogules.git

cd mansas-mogules

npm install
```

---

# 2. Environment Setup

Copy:

```bash id="l6f8d8"
cp .env.example .env.local
```

Required variables:

```env id="q2cny2"
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

NEXT_PUBLIC_SITE_URL=http://localhost:3000

TOKEN_ENCRYPTION_KEY=

RESEND_API_KEY=

OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=

POSTHOG_KEY=

STRIPE_SECRET_KEY=
WHOP_API_KEY=

TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=

TELEGRAM_BOT_TOKEN=

YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
```

---

# 3. Database Setup

Run migrations sequentially inside Supabase SQL Editor.

```bash id="yb3e3k"
src/supabase/migrations/
```

Important:
All migrations must remain sequentially numbered.

Never modify historical migrations after deployment.

Always create new migration files.

---

# 4. Start Development Server

```bash id="r94p6g"
npm run dev
```

Alternative raw mode:

```bash id="1q2fbe"
npm run dev:raw
```

Open:
http://localhost:3000

---

# Development Philosophy

Mansa’s Mogules is NOT:
a generic dashboard app.

The product should feel:
strategic,
architectural,
controlled,
minimal,
and operational.

Every system should reinforce:
ownership,
infrastructure,
and expansion.

---

# Core Naming Rules

## NEVER USE

creator

influencer

supporter

tips

subscriptions

referrals

marketing dashboard

creator economy

luxury creator platform

---

# APPROVED LANGUAGE

creator → operator

supporters → citizens

tips → tributes

dashboard → throne

analytics → dominion

vault → archives

messages → signals

referrals → alliances

tools → arsenal

settings → sovereignty

content → forge assets

subscriptions → royal access

---

# Branch Naming

```txt id="m8lq5v"
feature/short-description

fix/issue-description

refactor/system-name
```

---

# Commit Standards

```txt id="wjlwmn"
feat: add dominion territory map

fix: resolve treasury loading issue

refactor: improve signal distribution logic

docs: update empire intelligence guide
```

---

# TypeScript Standards

Strict mode enabled.

Explicit return types required.

Use type imports where possible.

Avoid:
any
unsafe casting
undefined rendering

---

# React Standards

Functional components only.

Use:
"use client"

only when necessary.

Prefer:
composition over prop drilling.

Avoid:
deep nested component trees.

---

# UI Standards

## Design Direction

Dark.
Minimal.
Strategic.
Cinematic.
Architectural.

NOT:
generic startup UI,
crypto hype,
fake luxury branding,
fantasy RPG interfaces.

---

# Color System

```css id="g40t9p"
--void: #020203
--surface: #0d0d18
--gold: #c8a96e
--white: rgba(255,255,255,0.92)
--muted: rgba(255,255,255,0.48)
```

---

# Typography

Display:
Cormorant Garamond

Body:
Outfit

Data:
DM Mono

---

# Motion Principles

Motion should feel:
inevitable,
heavy,
controlled.

Avoid:
playful animations,
cheap transitions,
bouncy interactions.

---

# Dashboard Philosophy

The dashboard is:
The Throne.

NOT:
a SaaS analytics page.

The interface should feel like:
a living empire map.

Core territories:

Treasury

Citizens

Dominion

Signals

Alliances

Forge

Archives

Gateways

Arsenal

---

# API Standards

Authenticated routes pattern:

```typescript id="eajp6q"
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Handle request
}
```

---

# Error Handling Rules

Never expose:
raw backend errors,
undefined values,
NaN states,
or database failures.

Bad:
“Failed to fetch referral stats”

Good:
“Alliance intelligence is temporarily unavailable.”

---

# Security Rules

All tables:
RLS enabled.

OAuth tokens:
AES-256-GCM encrypted.

Never expose:
admin routes,
service role keys,
or sensitive operator data.

Device fingerprints:
one-way hashes only.

Retention:
maximum 90 days.

---

# Testing Standards

## Manual Testing

Verify:

Landing page

Waitlist flow

Authentication

Throne dashboard

Treasury systems

Signals

Social integrations

Empire intelligence

---

# Smoke Test Checklist

[ ] Landing loads correctly

[ ] Authentication works

[ ] Throne loads without errors

[ ] Treasury data renders correctly

[ ] No NaN or undefined UI states

[ ] Signal systems operate correctly

[ ] Dominion analytics render safely

[ ] AI systems respond correctly

---

# Troubleshooting

## Dev Server Conflict

```powershell id="w56sne"
Get-Process node |
Where-Object Path -Match "next" |
Stop-Process
```

---

# Supabase Issues

Verify:
RLS policies,
migration order,
and authenticated session handling.

---

# OAuth Issues

Check:
callback URLs,
platform credentials,
and TOKEN_ENCRYPTION_KEY configuration.

---

# Pull Request Process

1. Create feature branch

2. Build feature

3. Test locally

4. Push changes

5. Open PR

6. Request review

---

# PR Checklist

[ ] TypeScript passes

[ ] No console errors

[ ] No broken loading states

[ ] No undefined or NaN rendering

[ ] New env variables documented

[ ] Migrations included if required

[ ] UI follows empire system language

[ ] No generic creator-platform terminology

---

# Final Contribution Rule

Every feature,
API,
page,
component,
and interaction
must reinforce one idea:

Mansa’s Mogules is infrastructure for digital ownership.

NOT:
another creator platform.
