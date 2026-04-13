import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Nebulife Terms of Service">
  <title>Terms of Service — Nebulife</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 16px; }
    body {
      background: #020510;
      color: #aabbcc;
      font-family: 'Courier New', Courier, monospace;
      line-height: 1.7;
      padding: 40px 20px 80px;
    }
    .container {
      max-width: 700px;
      margin: 0 auto;
    }
    h1 {
      color: #aabbcc;
      font-size: 1.5rem;
      margin-bottom: 8px;
      letter-spacing: 0.05em;
    }
    .subtitle {
      color: #667788;
      font-size: 0.85rem;
      margin-bottom: 40px;
    }
    h2 {
      color: #8899aa;
      font-size: 1rem;
      margin-top: 36px;
      margin-bottom: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    p {
      color: #aabbcc;
      font-size: 0.9rem;
      margin-bottom: 12px;
    }
    ul {
      padding-left: 20px;
      margin-bottom: 12px;
    }
    li {
      color: #aabbcc;
      font-size: 0.9rem;
      margin-bottom: 6px;
    }
    a {
      color: #4488aa;
      text-decoration: none;
    }
    a:hover {
      color: #7bb8ff;
    }
    .divider {
      border: none;
      border-top: 1px solid #334455;
      margin: 32px 0;
    }
    .contact {
      margin-top: 40px;
      padding: 20px;
      border: 1px solid #334455;
      border-radius: 4px;
      background: rgba(10,15,25,0.92);
    }
    .contact p {
      margin-bottom: 4px;
    }
    .warning {
      border-left: 3px solid #ff8844;
      padding-left: 16px;
      margin-bottom: 12px;
    }
    .warning p {
      color: #8899aa;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Terms of Service</h1>
    <div class="subtitle">Nebulife &mdash; Effective date: April 13, 2026</div>

    <p>These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Nebulife mobile game and related services (&quot;Nebulife&quot;, &quot;the Game&quot;). By downloading or using Nebulife, you agree to be bound by these Terms.</p>

    <hr class="divider">

    <h2>1. Eligibility</h2>
    <p>You must be at least 13 years of age to use Nebulife. By using the game, you represent that you meet this requirement. If you are under 18, you must have parental or guardian consent.</p>

    <h2>2. Account</h2>
    <p>You are responsible for maintaining the security of your account and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized use. We reserve the right to terminate accounts that violate these Terms.</p>

    <h2>3. Virtual Currency &mdash; Quarks</h2>
    <p>Nebulife includes a virtual in-game currency called <strong>Quarks</strong>. Please note the following:</p>
    <ul>
      <li>Quarks are a virtual item with no real-world monetary value.</li>
      <li>Quarks are non-transferable and cannot be exchanged, sold, or redeemed for real money or any other item of real-world value.</li>
      <li>Quarks are licensed to you, not sold. We reserve the right to modify, manage, or eliminate Quarks at any time.</li>
      <li>Unused Quarks may be forfeited upon account termination.</li>
    </ul>

    <h2>4. In-App Purchases</h2>
    <p>Nebulife offers optional in-app purchases, including Quarks packs and other digital items, processed through Apple App Store or Google Play Store. By making a purchase, you agree to their respective terms and payment policies.</p>
    <ul>
      <li>All purchases are final and non-refundable, except as required by applicable law or the platform policies of Apple or Google.</li>
      <li>Refund requests must be submitted directly to Apple or Google through their standard refund processes.</li>
      <li>We are not responsible for purchases made by unauthorized users on your account.</li>
    </ul>

    <h2>5. Nebulife Pro Subscription</h2>
    <p>Nebulife Pro is an optional auto-renewing subscription that provides premium features and benefits within the game.</p>
    <ul>
      <li>The subscription automatically renews at the end of each billing period unless cancelled at least 24 hours before the renewal date.</li>
      <li>You can manage and cancel your subscription at any time through your Apple App Store or Google Play account settings.</li>
      <li>No refund is provided for the unused portion of a subscription period upon cancellation, unless required by law.</li>
      <li>Prices may change upon renewal; we will notify you in advance of any price change as required by platform policies.</li>
    </ul>

    <h2>6. User Conduct</h2>
    <p>You agree not to engage in any of the following prohibited activities:</p>
    <ul>
      <li><strong>Cheating:</strong> using unauthorized software, bots, scripts, or exploits to gain an unfair advantage.</li>
      <li><strong>Multi-accounting:</strong> creating or operating multiple accounts to circumvent game mechanics or restrictions.</li>
      <li><strong>Harassment:</strong> engaging in abusive, threatening, or harmful behavior toward other players.</li>
      <li><strong>Impersonation:</strong> impersonating other players, Nebulife staff, or third parties.</li>
      <li><strong>Illegal activity:</strong> using the game for any unlawful purpose or in violation of any applicable laws.</li>
      <li><strong>Reverse engineering:</strong> attempting to decompile, reverse engineer, or extract the source code of the game.</li>
    </ul>

    <h2>7. AI Features &mdash; A.S.T.R.A. Assistant</h2>
    <p>The A.S.T.R.A. assistant is an AI-powered feature powered by Google Gemini AI.</p>
    <div class="warning">
      <p>AI-generated responses may be inaccurate, incomplete, or misleading. Do not rely on A.S.T.R.A. for medical, legal, financial, or safety-critical decisions.</p>
    </div>
    <ul>
      <li>Messages sent to A.S.T.R.A. may be processed and stored by Google in accordance with their privacy policy.</li>
      <li>Do not share sensitive personal information (passwords, financial data, etc.) with A.S.T.R.A.</li>
      <li>We are not responsible for any decisions made based on AI-generated responses.</li>
    </ul>

    <h2>8. Content Moderation</h2>
    <p>Nebulife includes community features such as player chat. By participating, you agree that:</p>
    <ul>
      <li>Messages may be reviewed by automated systems and human moderators for safety and compliance.</li>
      <li>We may remove content and restrict or terminate accounts that violate our community standards.</li>
      <li>You are solely responsible for content you submit to the game.</li>
    </ul>

    <h2>9. Intellectual Property</h2>
    <p>All content within Nebulife, including but not limited to graphics, game mechanics, text, and software, is owned by or licensed to us and is protected by intellectual property laws. You may not copy, reproduce, distribute, or create derivative works from any game content without our express written permission.</p>

    <h2>10. Termination</h2>
    <p>We reserve the right to suspend or permanently terminate your account at any time, with or without notice, if we determine that you have violated these Terms or engaged in conduct that is harmful to other players or to the integrity of the game. Upon termination, you lose access to your account and any virtual items or currency associated with it.</p>

    <h2>11. Disclaimer of Warranties</h2>
    <p>Nebulife is provided <strong>"as is"</strong> and <strong>"as available"</strong> without warranties of any kind, express or implied. We do not warrant that the game will be uninterrupted, error-free, or free of harmful components. Your use of the game is at your sole risk.</p>

    <h2>12. Limitation of Liability</h2>
    <p>To the maximum extent permitted by applicable law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of Nebulife, including loss of data, virtual items, or in-game progress.</p>

    <h2>13. Changes to These Terms</h2>
    <p>We may update these Terms from time to time. We will notify you of material changes by updating the effective date. Continued use of Nebulife after changes constitutes your acceptance of the revised Terms.</p>

    <h2>14. Governing Law</h2>
    <p>These Terms are governed by and construed in accordance with applicable law. Any disputes arising under these Terms shall be resolved through binding arbitration or in the courts of competent jurisdiction.</p>

    <hr class="divider">

    <div class="contact">
      <p><strong>Contact</strong></p>
      <p>For questions about these Terms or to report violations:</p>
      <p><a href="mailto:woodoo.ukraine@gmail.com">woodoo.ukraine@gmail.com</a></p>
    </div>
  </div>
</body>
</html>`);
}
