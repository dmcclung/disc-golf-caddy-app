# DG Caddy

An AI disc golf coach. You film a throw, and DG Caddy pulls about ten key frames from the video, sends them to Claude, and returns form scores, the faults ranked by importance, drills, and a focus cue for your next throw.

```
app/       Expo (SDK 57) + expo-router app for iOS and Android
supabase/  Postgres schema, and edge functions for AI analysis, RevenueCat sync and account deletion
website/   Static marketing site with privacy and terms pages (no build step)
```

## How analysis works

1. **Record tab.** The player records or uploads a clip. They can also drag a scrubber to mark the release moment.
2. **`app/src/lib/frames.ts`.** Uses `expo-video` to grab 10 frames and `expo-image-manipulator` to turn them into JPEGs of at most 768px. If a release moment is marked, the frames cluster in the window from 1.4s before release to 0.6s after it. Claude can't watch video, so these frames are all it sees.
3. **`supabase/functions/analyze-throw`.** Checks the user's JWT and quota, then calls `claude-opus-5-5` with the frames. The call uses adaptive thinking at `medium` effort, returns structured JSON output, and has server-side refusal `fallbacks: "default"` turned on. The function also passes in the player's profile and their last 3 sessions so the coaching builds on itself. It stores the frames in the private `throw-frames` bucket and inserts a `throws` row.
4. **Report screen.** `app/src/app/throw/[id].tsx` renders the result.

The coaching prompt and JSON schema are in `supabase/functions/analyze-throw/coach.ts`.

## Free tier and Pro

- Free users get `FREE_ANALYSES` (3) analyses for the life of the account. The server counts them in `entitlements.analyses_used`, so deleting throws doesn't reset the count.
- Pro is the RevenueCat entitlement `pro`. The app logs into RevenueCat with the Supabase user id.
  - The `revenuecat-webhook` function mirrors Pro status into `entitlements`.
  - `analyze-throw` also asks the RevenueCat REST API directly when the table says "not Pro". That covers the few seconds after a purchase before the webhook arrives.
- Pro users are capped at `PRO_DAILY_LIMIT` (30) analyses per 24 hours to keep costs bounded.
- In the app, trend charts on the Progress tab are Pro-only.

## Setup

### 1. Supabase
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push                       # applies supabase/migrations
cp supabase/functions/.env.example supabase/functions/.env   # fill it in
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy analyze-throw
npx supabase functions deploy delete-account
npx supabase functions deploy revenuecat-webhook --no-verify-jwt
```
In the dashboard, enable **Authentication → Sign In / Providers → Anonymous sign-ins**. The app signs every user in anonymously, so there is no signup wall.

### 2. RevenueCat
1. Create the products in App Store Connect and Google Play (for example, monthly and annual with a 7-day trial).
2. In RevenueCat, attach those products to an entitlement named `pro`, and put the packages in the **current** offering.
3. Add a webhook pointing at `https://<ref>.supabase.co/functions/v1/revenuecat-webhook`, leave the Authorization header empty, and enable HMAC signing. Copy the signing secret (shown once) into `REVENUECAT_WEBHOOK_SIGNING_SECRET`.
4. Copy the public iOS and Android SDK keys into `app/.env`, and the secret API key into the functions `.env`.

### 3. App
```bash
cd app
cp .env.example .env        # Supabase URL/anon key + RevenueCat public keys
npm install
npx expo run:ios            # or run:android; RevenueCat needs a dev build, not Expo Go
```
Useful scripts:
- `npx tsc --noEmit` and `npx expo lint` run the typecheck and lint.
- `node scripts/check-sprites.mjs` validates the pixel art.
- `node scripts/generate-icons.mjs` rebuilds the app icon, splash, and website images from `src/pixel/sprites.ts`.

Ship with EAS: `npx eas-cli@latest build --platform all`.

### 4. Website
`website/` is plain HTML and CSS. Deploy it to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages) at `dgcaddy.hyzer.xyz` (point a CNAME for the `dgcaddy` subdomain at your host; the app links to it via `links` in `app/src/theme.ts`). Before launch, replace the `href="#"` store links in `website/index.html`.

## Design

- **Colors.** Purple and white, defined in `app/src/theme.ts` and `website/styles.css`. Gold appears only on stars and the Pro crown.
- **Fonts.** Press Start 2P for display text, VT323 for body text.
- **Sprites.** Every sprite is a string grid in `app/src/pixel/sprites.ts`. `PixelArt` renders them as SVG rects in the app, and the same data generates the icons and website PNGs.

## Before launch
- [ ] Confirm the prices on the website pricing section match your store products (currently $7.99/mo and $39.99/yr with a 7-day trial).
- [ ] Set up the support@hyzer.xyz mailbox (MX + SPF/DKIM/DMARC on hyzer.xyz).
- [ ] Have the privacy policy and terms reviewed. App Store privacy labels: user content (photos/videos), identifiers, and purchases.
- [ ] Anonymous accounts are tied to the device. Consider adding Sign in with Apple/Google using Supabase `linkIdentity` so users can move their history to a new phone.
