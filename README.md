<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/eafd1163-fde1-4c33-9d61-104c5414967b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## TikTok course videos (local development)

The TikTok Display API needs a backend so the client secret and user tokens never enter the browser bundle.

1. Add `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, and `TIKTOK_REDIRECT_URI` to `.env.local` using `.env.example` as a template.
2. In the TikTok developer portal, enable Login Kit and Display API, request the `user.info.basic` and `video.list` scopes, and register the exact redirect URI from `.env.local`.
3. Start the API in a second terminal with `bun run dev:tiktok-api` (or `npm run dev:tiktok-api`).
4. Start Vite with `bun run dev` (or `npm run dev`) and open `http://localhost:3000/api/tiktok/auth` to authorize the TikTok account.

The local API stores refreshable account tokens in the ignored `.data/` directory. Never commit `.env.local` or `.data/`.
