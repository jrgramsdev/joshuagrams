#!/usr/bin/env node
// Encrypts the <main class="resume-wrap"> content of resume-source.html
// with AES-256-GCM (PBKDF2-derived key, 200k iterations, SHA-256).
// Outputs resume.html — a password-gated page that decrypts in-browser
// via the Web Crypto API.
//
// Usage:
//   node encrypt-resume.js <password>
//
// Re-run any time you change resume-source.html or the password.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node encrypt-resume.js <password>');
  process.exit(1);
}

const root = __dirname;
const src = fs.readFileSync(path.join(root, 'resume-source.html'), 'utf8');

const mainMatch = src.match(/<main class="resume-wrap">([\s\S]*?)<\/main>/);
if (!mainMatch) {
  console.error('ERROR: could not find <main class="resume-wrap">...</main> in resume-source.html');
  process.exit(1);
}
const plaintext = mainMatch[1];

// --- Encrypt ---
const iterations = 200000;
const salt = crypto.randomBytes(16);
const key  = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const iv   = crypto.randomBytes(12);

const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const ctBuf  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
const tag    = cipher.getAuthTag();

const payload = {
  salt: salt.toString('base64'),
  iv:   iv.toString('base64'),
  ct:   ctBuf.toString('base64'),
  tag:  tag.toString('base64'),
  iter: iterations,
};

// --- Output shell ---
const output = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Resume · Joshua Grams</title>
  <link rel="stylesheet" href="style.css" />
  <style>
    .gate-wrap {
      min-height: 70vh;
      display: flex; align-items: center; justify-content: center;
      padding: 40px 20px;
    }
    .gate-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 40px 36px;
      max-width: 420px; width: 100%;
      text-align: center;
    }
    .gate-card .lock {
      width: 42px; height: 42px;
      margin: 0 auto 18px;
      border: 2px solid var(--signal);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: var(--signal);
      font-size: 18px;
      box-shadow: 0 0 30px var(--signal-dim);
    }
    .gate-card h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -.01em;
    }
    .gate-card p.gate-sub {
      color: var(--fg-dim);
      font-size: 14px;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .gate-form {
      display: flex; flex-direction: column; gap: 12px;
    }
    .gate-form input[type="password"] {
      background: var(--bg);
      border: 1px solid var(--border-strong);
      color: var(--fg);
      padding: 12px 14px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 14px;
      outline: none;
      transition: border-color .15s ease;
    }
    .gate-form input[type="password"]:focus { border-color: var(--signal); }
    .gate-form button {
      background: var(--signal);
      color: #000;
      border: none;
      padding: 12px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: box-shadow .15s ease;
    }
    .gate-form button:hover { box-shadow: 0 0 20px var(--signal-dim); }
    .gate-form button:disabled { opacity: .5; cursor: wait; }
    .gate-error {
      color: var(--danger);
      font-family: var(--font-mono);
      font-size: 12.5px;
      min-height: 18px;
      margin-top: 4px;
    }
  </style>
</head>
<body>

  <nav class="nav resume-print-hide">
    <div class="nav-inner">
      <div class="nav-brand">
        <span class="dot"></span>
        <span>jrgramsdev</span>
      </div>
      <div class="nav-links">
        <a href="index.html">← Portfolio</a>
        <a href="#" id="print-btn" class="cta" style="display:none;">Print / Save PDF</a>
      </div>
    </div>
  </nav>

  <div id="gate" class="gate-wrap">
    <div class="gate-card">
      <div class="lock">🔒</div>
      <h1>Resume access</h1>
      <p class="gate-sub">This resume is password-protected. Enter the password you were given to view it.</p>
      <form class="gate-form" id="gate-form" autocomplete="off">
        <input type="password" id="gate-pw" placeholder="Password" autofocus required />
        <button type="submit" id="gate-btn">Unlock</button>
        <div class="gate-error" id="gate-error"></div>
      </form>
    </div>
  </div>

  <main id="resume-content" class="resume-wrap" style="display:none;"></main>

  <script>
    const PAYLOAD = ${JSON.stringify(payload)};

    function b64ToBytes(b64) {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }

    async function deriveKey(password, salt, iter) {
      const baseKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
    }

    async function tryUnlock(password) {
      const salt = b64ToBytes(PAYLOAD.salt);
      const iv   = b64ToBytes(PAYLOAD.iv);
      const ct   = b64ToBytes(PAYLOAD.ct);
      const tag  = b64ToBytes(PAYLOAD.tag);

      // WebCrypto AES-GCM expects ciphertext||tag
      const joined = new Uint8Array(ct.length + tag.length);
      joined.set(ct, 0);
      joined.set(tag, ct.length);

      const key = await deriveKey(password, salt, PAYLOAD.iter);
      const plainBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        joined
      );
      return new TextDecoder().decode(plainBuf);
    }

    const form = document.getElementById('gate-form');
    const pwInput = document.getElementById('gate-pw');
    const btn = document.getElementById('gate-btn');
    const errEl = document.getElementById('gate-error');
    const gate = document.getElementById('gate');
    const content = document.getElementById('resume-content');
    const printBtn = document.getElementById('print-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Unlocking…';
      try {
        const html = await tryUnlock(pwInput.value);
        content.innerHTML = html;
        gate.style.display = 'none';
        content.style.display = '';
        printBtn.style.display = '';
        // Cache for this tab only
        try { sessionStorage.setItem('resume-pw', pwInput.value); } catch {}
      } catch (err) {
        errEl.textContent = 'Incorrect password.';
        btn.disabled = false;
        btn.textContent = 'Unlock';
        pwInput.select();
      }
    });

    printBtn.addEventListener('click', (e) => { e.preventDefault(); window.print(); });

    // Auto-unlock if session already had it (handy for back/forward nav within tab)
    (async () => {
      const cached = (() => { try { return sessionStorage.getItem('resume-pw'); } catch { return null; } })();
      if (cached) {
        try {
          const html = await tryUnlock(cached);
          content.innerHTML = html;
          gate.style.display = 'none';
          content.style.display = '';
          printBtn.style.display = '';
        } catch {}
      }
    })();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'resume.html'), output);
console.log(`OK — resume.html written (${output.length.toLocaleString()} chars, payload ${ctBuf.length.toLocaleString()} bytes).`);
console.log(`Password: "${password}"`);
console.log(`Salt/IV randomized. Rerun with a different password any time to rotate.`);
