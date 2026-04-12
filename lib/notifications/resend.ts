// MULUK Resend Email Notification System
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'MULUK <notifications@muluk.vip>';

type WelcomeEmailData = {
  name: string;
  to: string;
};

type EarningsEmailData = {
  amount: number;
  newBalance: number;
  to: string;
};

type PurchaseReceiptData = {
  itemType: string;
  creatorName: string;
  to: string;
};

const emailTemplate = (content: string, _title: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, sans-serif; background: #0a0a0a; color: #e5e5e5; }
    .container { max-width: 600px; margin: 0 auto; background: #141414; border: 1px solid #1a1a1a; }
    .header { background: linear-gradient(135deg, #b8860b 0%, #ffd700 100%); padding: 40px 30px; text-align: center; }
    .logo { font-size: 32px; font-weight: 700; color: #000; letter-spacing: 4px; }
    .content { padding: 40px 30px; line-height: 1.6; }
    .button { display: inline-block; background: linear-gradient(135deg, #b8860b 0%, #ffd700 100%); color: #000; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { background: #0a0a0a; padding: 30px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">MULUK</div></div>
    <div class="content">${content}</div>
    <div class="footer"><p>MULUK - The Dark Luxury Creator Platform</p></div>
  </div>
</body>
</html>
`;

export const sendWelcomeEmail = async (data: WelcomeEmailData) => {
  const content = `<h2>Welcome to MULUK, ${data.name}</h2><p>You've joined the most exclusive creator platform.</p>`;
  return await resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Welcome to MULUK',
    html: emailTemplate(content, 'Welcome'),
  });
};

export const sendEarningsNotification = async (data: EarningsEmailData) => {
  const content = `<h2>💰 You Just Earned $${data.amount}</h2><p>New balance: $${data.newBalance}</p>`;
  return await resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `💰 You earned $${data.amount} on MULUK`,
    html: emailTemplate(content, 'New Earnings'),
  });
};

export const sendPurchaseReceipt = async (data: PurchaseReceiptData) => {
  const content = `<h2>Purchase Successful</h2><p>You purchased ${data.itemType} from ${data.creatorName}</p>`;
  return await resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Your MULUK Purchase',
    html: emailTemplate(content, 'Purchase Receipt'),
  });
};

export default resend;
