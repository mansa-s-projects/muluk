// MULUK Resend Email Notification System
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'MULUK <notifications@muluk.vip>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muluk.vip';

// ─── Types ────────────────────────────────────────────────────────────────────

type WelcomeEmailData    = { name: string; to: string };
type EarningsEmailData   = { amount: number; newBalance: number; to: string };
type PurchaseReceiptData = { itemType: string; creatorName: string; to: string };

export type CreatorApprovalData = {
  name: string;
  to: string;
  dashboardUrl?: string;
};

export type CreatorRejectionData = {
  name: string;
  to: string;
  reason?: string;
};

export type PurchaseSequenceData = {
  fanEmail: string;
  fanName?: string;
  offerTitle: string;
  amount: string;
  accessUrl: string;
  creatorHandle: string;
  nextOfferTitle?: string;
  nextOfferUrl?: string;
};

// ─── Base template ────────────────────────────────────────────────────────────

const emailTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { margin:0;padding:0;font-family:-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5; }
    .wrap{ max-width:580px;margin:0 auto;background:#111;border:1px solid #1c1c1c;border-radius:8px;overflow:hidden; }
    .hdr { background:linear-gradient(135deg,#8a6530 0%,#c8a96e 50%,#8a6530 100%);padding:36px 32px;text-align:center; }
    .logo{ font-size:22px;font-weight:700;color:#000;letter-spacing:6px; }
    .bod { padding:40px 32px;line-height:1.7;color:#ccc;font-size:14px; }
    .bod h2{ color:#c8a96e;margin:0 0 20px;font-size:20px;font-weight:400; }
    .bod p { margin:0 0 16px; }
    .btn { display:inline-block;background:linear-gradient(135deg,#8a6530,#c8a96e);color:#000;
           padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;
           font-size:13px;letter-spacing:0.08em;margin:8px 0 24px; }
    .box { background:#0f0f0f;border:1px solid #222;border-radius:6px;padding:20px;margin:16px 0 24px; }
    .lbl { color:#555;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:6px; }
    .val { color:#e8cc90;font-size:15px; }
    .ftr { background:#0a0a0a;padding:28px 32px;text-align:center;color:#444;font-size:11px; }
    .dim { color:#555; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr"><div class="logo">MULUK</div></div>
    <div class="bod">${content}</div>
    <div class="ftr">MULUK · The Creator Monetization Platform</div>
  </div>
</body>
</html>
`;

// ─── Existing functions ───────────────────────────────────────────────────────

export const sendWelcomeEmail = async (data: WelcomeEmailData) => {
  const content = `<h2>Welcome to MULUK, ${data.name}</h2>
    <p>You've joined the most exclusive creator platform. 88% of every dollar goes to you.</p>`;
  return resend.emails.send({ from: FROM_EMAIL, to: data.to, subject: 'Welcome to MULUK', html: emailTemplate(content) });
};

export const sendEarningsNotification = async (data: EarningsEmailData) => {
  const content = `<h2>You just earned $${data.amount}</h2>
    <p>New balance: <strong style="color:#e8cc90">$${data.newBalance}</strong></p>`;
  return resend.emails.send({ from: FROM_EMAIL, to: data.to, subject: `You earned $${data.amount} on MULUK`, html: emailTemplate(content) });
};

export const sendPurchaseReceipt = async (data: PurchaseReceiptData) => {
  const content = `<h2>Purchase Successful</h2><p>You purchased ${data.itemType} from ${data.creatorName}.</p>`;
  return resend.emails.send({ from: FROM_EMAIL, to: data.to, subject: 'Your MULUK Purchase', html: emailTemplate(content) });
};

// ─── Creator approval ─────────────────────────────────────────────────────────

export const sendCreatorApprovalEmail = async (data: CreatorApprovalData) => {
  const dashboardUrl = data.dashboardUrl ?? `${SITE_URL}/dashboard`;
  const content = `
    <h2>You're approved.</h2>
    <p>Hey ${data.name}, your MULUK creator account is live.</p>
    <div class="box">
      <div class="lbl">Your payout rate</div>
      <div class="val">88% of every dollar</div>
    </div>
    <p>Set up your profile, upload your first offer, and share your link. You can be earning within 20 minutes.</p>
    <a href="${dashboardUrl}" class="btn">Open Dashboard →</a>
    <p class="dim" style="font-size:12px;margin-top:8px;">Direct link: ${dashboardUrl}</p>
  `;
  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: "You're approved — start earning now",
    html: emailTemplate(content),
  });
};

// ─── Creator rejection ────────────────────────────────────────────────────────

export const sendCreatorRejectionEmail = async (data: CreatorRejectionData) => {
  const reason = data.reason?.trim() || "Your application didn't meet our current requirements.";
  const content = `
    <h2>Application update</h2>
    <p>Hi ${data.name},</p>
    <p>${reason}</p>
    <p>You're welcome to reapply after 30 days.</p>
  `;
  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Your MULUK application',
    html: emailTemplate(content),
  });
};

// ─── Purchase receipt + scheduled follow-ups ──────────────────────────────────
// Requires Resend Pro for scheduledAt. Email 1 fires immediately.
// Emails 2 & 3 are scheduled at 24h and 7d.

export const sendPurchaseEmailSequence = async (data: PurchaseSequenceData) => {
  const fan   = data.fanName?.trim() || 'there';
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const in7d  = new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString();

  const receipt = `
    <h2>Purchase confirmed.</h2>
    <p>Hey ${fan}, your payment went through.</p>
    <div class="box">
      <div class="lbl">You unlocked</div>
      <div class="val">${data.offerTitle}</div>
      <div style="color:#555;font-size:12px;margin-top:4px;">${data.amount}</div>
    </div>
    <a href="${data.accessUrl}" class="btn">Access Your Purchase →</a>
    ${data.nextOfferTitle && data.nextOfferUrl ? `
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #1c1c1c;">
      <p class="dim" style="font-size:12px;">Fans who bought this also loved:</p>
      <a href="${data.nextOfferUrl}" style="color:#c8a96e;text-decoration:none;font-size:14px;">${data.nextOfferTitle} →</a>
    </div>` : ''}
  `;

  const followup = `
    <h2 style="color:rgba(255,255,255,0.8)">Enjoying it?</h2>
    <p>Hey ${fan}, you unlocked <strong style="color:#e8cc90">${data.offerTitle}</strong> from @${data.creatorHandle} yesterday.</p>
    <p>There's more where that came from.</p>
    <a href="${SITE_URL}/@${data.creatorHandle}" class="btn">See What's New →</a>
  `;

  const reengagement = `
    <h2 style="color:rgba(255,255,255,0.8)">Still here.</h2>
    <p>Hey ${fan}, @${data.creatorHandle} has been active. New drops, new content.</p>
    <a href="${SITE_URL}/@${data.creatorHandle}" class="btn">Check It Out →</a>
  `;

  await Promise.allSettled([
    resend.emails.send({ from: FROM_EMAIL, to: data.fanEmail, subject: `You unlocked: ${data.offerTitle}`, html: emailTemplate(receipt) }),
    resend.emails.send({ from: FROM_EMAIL, to: data.fanEmail, subject: `More from @${data.creatorHandle}`, html: emailTemplate(followup), scheduledAt: in24h }),
    resend.emails.send({ from: FROM_EMAIL, to: data.fanEmail, subject: `@${data.creatorHandle} just dropped something`, html: emailTemplate(reengagement), scheduledAt: in7d }),
  ]);
};

export default resend;
