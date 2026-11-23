/// <reference types="node" />
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = Number(process.env.TIKTOK_API_PORT || 3001);
const tokenPath = path.resolve('.data/tiktok-tokens.json');
const scopes = 'user.info.basic,video.list';
const pendingStates = new Map<string, number>();

interface StoredToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  refresh_expires_at: number;
  open_id: string;
}

function credentials() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) throw new Error('TikTok credentials are not configured on the server.');
  return { clientKey, clientSecret };
}

function redirectUri() {
  return process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3000/api/tiktok/callback';
}

async function readToken(): Promise<StoredToken | null> {
  try {
    return JSON.parse(await fs.readFile(tokenPath, 'utf8')) as StoredToken;
  } catch {
    return null;
  }
}

async function writeToken(token: StoredToken) {
  await fs.mkdir(path.dirname(tokenPath), { recursive: true });
  await fs.writeFile(tokenPath, JSON.stringify(token, null, 2), { encoding: 'utf8', mode: 0o600 });
}

async function refreshToken(token: StoredToken): Promise<StoredToken> {
  const { clientKey, clientSecret } = credentials();
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
  });
  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const result = await response.json() as Partial<StoredToken> & { expires_in?: number; refresh_expires_in?: number };
  if (!response.ok || !result.access_token || !result.refresh_token) throw new Error('TikTok authorization expired. Reconnect the account.');
  const updated: StoredToken = {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expires_at: Date.now() + Number(result.expires_in || 0) * 1000,
    refresh_expires_at: Date.now() + Number(result.refresh_expires_in || 0) * 1000,
    open_id: result.open_id || token.open_id,
  };
  await writeToken(updated);
  return updated;
}

app.get('/api/tiktok/status', async (_req, res) => {
  let configured = false;
  try { credentials(); configured = true; } catch { /* status response intentionally omits secrets */ }
  const token = await readToken();
  res.json({ configured, connected: Boolean(token), redirectUri: redirectUri() });
});

app.get('/api/tiktok/auth', (_req, res) => {
  try {
    const { clientKey } = credentials();
    const state = crypto.randomBytes(24).toString('hex');
    pendingStates.set(state, Date.now() + 10 * 60 * 1000);
    const authorize = new URL('https://www.tiktok.com/v2/auth/authorize/');
    authorize.search = new URLSearchParams({
      client_key: clientKey,
      response_type: 'code',
      scope: scopes,
      redirect_uri: redirectUri(),
      state,
    }).toString();
    res.redirect(authorize.toString());
  } catch (error) {
    res.status(503).send(error instanceof Error ? error.message : 'TikTok integration is not configured.');
  }
});

app.get('/api/tiktok/callback', async (req, res) => {
  const state = String(req.query.state || '');
  const expiresAt = pendingStates.get(state);
  pendingStates.delete(state);
  if (!state || !expiresAt || expiresAt < Date.now()) return res.status(400).send('TikTok authorization state is missing or expired. Restart the connection from the portfolio.');
  if (req.query.error) return res.status(400).send(`TikTok authorization failed: ${String(req.query.error_description || req.query.error)}`);
  const code = String(req.query.code || '');
  if (!code) return res.status(400).send('TikTok did not return an authorization code.');
  try {
    const { clientKey, clientSecret } = credentials();
    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(),
    });
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const result = await response.json() as Partial<StoredToken> & { expires_in?: number; refresh_expires_in?: number; error_description?: string };
    if (!response.ok || !result.access_token || !result.refresh_token) throw new Error(result.error_description || 'TikTok token exchange failed.');
    await writeToken({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_at: Date.now() + Number(result.expires_in || 0) * 1000,
      refresh_expires_at: Date.now() + Number(result.refresh_expires_in || 0) * 1000,
      open_id: result.open_id || '',
    });
    res.redirect('/?tiktok=connected');
  } catch (error) {
    res.status(502).send(error instanceof Error ? error.message : 'TikTok token exchange failed.');
  }
});

app.get('/api/tiktok/videos', async (req, res) => {
  try {
    let token = await readToken();
    if (!token) return res.status(401).json({ error: 'Connect the TikTok account first.' });
    if (token.expires_at < Date.now() + 60_000) token = await refreshToken(token);

    const fields = 'id,title,video_description,duration,cover_image_url,embed_link,share_url,create_time';
    const endpoint = new URL(`https://open.tiktokapis.com/v2/video/list/?fields=${fields}`);
    const cursor = String(req.query.cursor || '');
    const payload: { max_count: number; cursor?: number } = { max_count: 20 };
    if (cursor && /^\d+$/.test(cursor)) payload.cursor = Number(cursor);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { data?: unknown; error?: { code?: string; message?: string; log_id?: string } };
    if (!response.ok || (result.error?.code && result.error.code !== 'ok')) {
      return res.status(response.status || 502).json({ error: result.error?.message || 'TikTok could not return the video list.' });
    }
    res.json(result.data);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'TikTok request failed.' });
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`TikTok API server listening on http://127.0.0.1:${port}`);
});
