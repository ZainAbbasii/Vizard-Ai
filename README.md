# Cutroom

A Node.js (Express) site modeled on the structure of an AI video-clipping product: hero with a working clip demo, audience section, how-it-works, edit-by-text demo, pricing with a credits calculator, FAQ, and an optional proxy to the Vizard clipping API.

This is an original design with placeholder branding. It does not reuse any third-party logos, images, testimonials, or copy.

## Run it

```bash
npm install
cp .env.example .env     # optional
npm start
```

Open http://localhost:3000. Requires Node 18 or newer (uses built-in `fetch`).

## Demo mode vs live mode

- **Demo mode (default):** the hero runs a scripted sample episode.
- **Live mode:** set `VIZARDAI_API_KEY` in `.env`. The form then submits your link to the Vizard API (paid plan required) and polls every 30 seconds until clips return. The key stays on the server and is never sent to the browser.

Supported links: YouTube, Vimeo, or a direct `.mp4`, `.mov`, `.avi`, `.3gp` file URL.

## Structure

```
server.js            Express app, API proxy, rate limit, security headers
public/index.html    Home page
public/pricing.html  Plans, credits calculator, comparison table
public/css/styles.css
public/js/main.js    Demo, live mode, edit-by-text, pricing calculator
```

## Customize

- Rename the brand: search for "Cutroom" in `public/*.html`.
- Pricing: edit the `TIERS` table in `public/js/main.js`.
- Colors and fonts: CSS variables at the top of `styles.css`.
- Sample clips: the `SAMPLE` object in `main.js`.

## Not included

- User accounts, uploads, a real editor, payments, or social publishing. Those need a real backend and product. The live-mode proxy covers clip creation and retrieval only.
- Customer testimonials. Add real ones with permission.

## Deploy to Cloudways Velocity

Velocity deploys from a Git repository, so the steps are: push to Git, connect the repo, set the secret, deploy.

1. **Create the repo.** From the project folder:
   ```bash
   npm install            # creates package-lock.json; commit it
   git init
   git add .
   git commit -m "Initial commit"
   ```
   Push it to a new GitHub, GitLab, or Bitbucket repository. The included `.gitignore` keeps `node_modules` and `.env` out of the repo.
2. **Create the app.** In the Cloudways console open **Velocity**, choose a plan, pick **Connect via Git**, authorize your Git provider, and select the repository.
3. **Check the preset.** Velocity should detect Express and use `npm install` and `npm start`. If it asks, set the start command to `npm start`. Pick Node.js 22 or 24.
4. **Add environment variables** in the app's settings (do not commit them):
   - `VIZARDAI_API_KEY` (optional; omit it to run in demo mode)
   - Do not set `PORT`; the platform supplies it and `server.js` reads it.
5. **Deploy.** Click Deploy, then open the Application URL. `/healthz` returns `ok` if the server is up.
6. **Custom domain.** Add your domain in the app's settings and point DNS as instructed. SSL is handled by the platform.

Pushes to the connected branch can auto-deploy. Use a dedicated production branch and review commits before enabling that.

Notes:
- The server sets `trust proxy` so the rate limiter sees real visitor IPs behind Velocity's proxy.
- The in-memory rate limiter resets on each restart and is per-instance. That is fine for one instance; use a shared store if you scale out.
- Check Cloudways' current Velocity docs for plan limits and pricing, since the product is new and details may change.
