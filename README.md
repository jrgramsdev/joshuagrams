# Portfolio

Static single-HTML portfolio site + resume page. No build step, no dependencies.

## Files

- `index.html` — main portfolio (hero, stats, 6 projects, about, skills)
- `resume.html` — **password-gated** resume page. AES-256-GCM encrypted payload, decrypts in-browser with Web Crypto on correct password entry. Has a "Print / Save PDF" button (shown after unlock).
- `resume-source.html` — **plaintext source** of the resume. NOT committed (`.gitignore`d). Edit this, then re-run the encrypt script.
- `encrypt-resume.js` — run `node encrypt-resume.js <password>` to regenerate `resume.html` from `resume-source.html`.
- `style.css` — shared styling (dark, neon-green accent, mobile-first, print-optimized for resume)

## Current password

`3grams` — change any time by re-running `node encrypt-resume.js <new-password>`. Salt and IV are randomized per encryption so the ciphertext differs every run even with the same password.

## What to fill in

Open `resume.html` and search for `[ ` — every red-dashed placeholder marks something I didn't have from memory:

1. `[ YOUR NAME ]` — your legal/display name
2. `[ CITY, STATE ]` — optional but common on resumes
3. `[ PHONE — OPTIONAL ]` — delete the line if you'd rather omit
4. `[ START YEAR ]` under 3GRAMS — when you launched the brand
5. `[ PREVIOUS ROLE — COMPANY ]` block — your earlier work history. Delete the block if you want to show only the current lane; add more blocks if you have multiple prior roles.
6. Education block — fill in or delete entirely

Also edit the `<title>` of `index.html` (currently "Josh · Builder portfolio") to use your full name, and likewise `resume.html`.

## Running locally

```bash
cd /Users/king50.ai/portfolio
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

## Deploying

### GitHub Pages (recommended — one command)

```bash
cd /Users/king50.ai/portfolio
git init
git add .
git commit -m "Initial portfolio"
gh repo create portfolio --public --source=. --push
```

Then in the repo settings → Pages → Source = `main` branch, `/ (root)`. It'll live at `https://jrgramsdev.github.io/portfolio`.

### Cloudflare Pages (custom domain easier)

1. Push to GitHub (as above).
2. In Cloudflare dashboard → Workers & Pages → Create → Connect to Git → select the repo.
3. Build command: *(leave empty)* · Output directory: `/`.
4. Add your custom domain (e.g. `josh.xyz`) — Cloudflare handles SSL automatically.

### Netlify drop (zero-config, no git)

Drag the `portfolio/` folder onto https://app.netlify.com/drop — instant URL.

## Printing the resume

Click the "Print / Save PDF" button top-right of `resume.html`, or Cmd-P. Print CSS strips the nav and renders for letter-size paper in black-and-white.

## Tweaks you might want

- Swap the neon-green accent (`--signal: #39ff14` in `style.css`) for a color matching your target industry (e.g. Tesla red `#e82127`, or a cooler blue for fintech/banking).
- Add real screenshots to `/assets/` and wire them into the project cards.
- The "hero-tag" ("Currently building") can become "Looking for full-time roles" or similar when you're actively searching.
