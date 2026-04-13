import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Nebulife Privacy Policy">
  <title>Privacy Policy — Nebulife</title>
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
  </style>
</head>
<body>
  <div class="container">
    <h1>Privacy Policy</h1>
    <div class="subtitle">Nebulife &mdash; Effective date: April 13, 2026</div>

    <p>This Privacy Policy explains how Nebulife (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) collects, uses, and protects information when you use the Nebulife mobile application and related services.</p>

    <hr class="divider">

    <h2>1. Information We Collect</h2>
    <p>We collect the following information to operate the game and provide our services:</p>
    <ul>
      <li><strong>Account information:</strong> email address, provided via Firebase Authentication (Google Sign-In or email/password).</li>
      <li><strong>Game state:</strong> player name, level, experience points, research progress, tech tree, colony state, and in-game currency (Quarks) balances.</li>
      <li><strong>Usage analytics:</strong> session duration, feature usage, and in-game events, collected via Firebase Analytics.</li>
      <li><strong>Purchase information:</strong> subscription and in-app purchase records processed via RevenueCat (we do not store payment card data).</li>
      <li><strong>Advertising identifier:</strong> device advertising ID (IDFA/GAID) used by Google AdMob to serve ads.</li>
      <li><strong>Chat messages:</strong> messages sent to the A.S.T.R.A. AI assistant are processed by Google Gemini AI and may be reviewed for safety and quality purposes.</li>
    </ul>

    <h2>2. Information We Do NOT Collect</h2>
    <p>We do not collect:</p>
    <ul>
      <li>Contacts or address book data</li>
      <li>Precise or coarse location data</li>
      <li>Health or fitness data</li>
      <li>Photos, videos, or microphone recordings</li>
      <li>Financial account information (payment processing is handled by Apple/Google/RevenueCat)</li>
    </ul>

    <h2>3. How We Use Your Information</h2>
    <ul>
      <li>To authenticate your account and save your game progress</li>
      <li>To process in-app purchases and manage subscriptions</li>
      <li>To display personalized and non-personalized advertisements via Google AdMob</li>
      <li>To power the A.S.T.R.A. AI assistant features via Google Gemini</li>
      <li>To analyze usage patterns and improve the game experience</li>
      <li>To moderate community content and enforce our Terms of Service</li>
    </ul>

    <h2>4. Third-Party Services</h2>
    <p>Nebulife uses the following third-party services, each with their own privacy policies:</p>
    <ul>
      <li><strong>Firebase (Google LLC):</strong> authentication and analytics &mdash; <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener">firebase.google.com/support/privacy</a></li>
      <li><strong>Google AdMob (Google LLC):</strong> advertising, uses advertising identifier &mdash; <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a></li>
      <li><strong>Google Gemini AI (Google LLC):</strong> powers A.S.T.R.A. assistant chat &mdash; <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a></li>
      <li><strong>RevenueCat:</strong> in-app purchase and subscription management &mdash; <a href="https://www.revenuecat.com/privacy" target="_blank" rel="noopener">revenuecat.com/privacy</a></li>
      <li><strong>Neon (Neon Inc.):</strong> cloud database hosting for game state</li>
    </ul>

    <h2>5. Data Retention</h2>
    <p>Your game data is stored on our servers for as long as your account is active. When you delete your account, all associated game data is permanently removed from our database within 30 days.</p>

    <h2>6. Your Rights (GDPR)</h2>
    <p>If you are located in the European Economic Area (EEA) or the United Kingdom, you have the right to:</p>
    <ul>
      <li>Access the personal data we hold about you</li>
      <li>Request correction of inaccurate data</li>
      <li>Request deletion of your data</li>
      <li>Object to processing of your data</li>
      <li>Request restriction of processing</li>
      <li>Data portability</li>
    </ul>
    <p>To exercise these rights, you can use the <strong>Delete Account</strong> button located in your in-app Profile Settings, or contact us directly at the email address below.</p>

    <h2>7. Children's Privacy (COPPA)</h2>
    <p>Nebulife is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have inadvertently collected such information, we will delete it promptly. If you believe a child under 13 has provided us with personal information, please contact us.</p>

    <h2>8. Data Security</h2>
    <p>We implement industry-standard security measures to protect your information, including encrypted connections (HTTPS/TLS) and secure cloud infrastructure. However, no method of transmission over the internet is 100% secure.</p>

    <h2>9. Changes to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the effective date at the top of this page. Continued use of Nebulife after changes constitutes acceptance of the updated policy.</p>

    <hr class="divider">

    <div class="contact">
      <p><strong>Contact</strong></p>
      <p>For privacy questions or data deletion requests:</p>
      <p><a href="mailto:nebulife.game@gmail.com">nebulife.game@gmail.com</a></p>
    </div>
  </div>
</body>
</html>`);
}
