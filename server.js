/* PostFlow server — no npm packages needed (Node 18+).
   Run:  node server.js
   Settings come from environment variables (see README.txt). */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const SECURE_COOKIE = BASE_URL.startsWith('https://');
const FB_VERSION = 'v21.0';
const GRAPH_HOST = process.env.FB_GRAPH_HOST || 'https://graph.facebook.com';   // only changed for testing
const FB_SCOPES = 'pages_show_list,pages_manage_posts,pages_read_engagement';
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');   // on Railway: point this at the volume, e.g. /app/data
const DB_FILE = path.join(DATA_DIR, 'db.json');
const KEY_FILE = path.join(DATA_DIR, '.key');

/* ------------------------------------------------------------------ storage */
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(KEY_FILE)) fs.writeFileSync(KEY_FILE, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
const KEY = Buffer.from(process.env.SECRET_KEY || fs.readFileSync(KEY_FILE, 'utf8').trim(), 'hex');

let db = { users: [], apps: [], accounts: [], magic: [], media: [], jobs: [], logs: [], folders: [], sources: [] };
if (fs.existsSync(DB_FILE)) db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
const uid = () => crypto.randomBytes(8).toString('hex');

/* app secrets and Facebook tokens are encrypted before they touch the disk */
function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map(b => b.toString('base64')).join('.');
}
function decrypt(blob) {
  const [iv, tag, enc] = blob.split('.').map(s => Buffer.from(s, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

/* ------------------------------------------------------------------ auth */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return salt.toString('hex') + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
}
function checkPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pw, Buffer.from(salt, 'hex'), 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}

const sessions = new Map();               // token -> { userId, exp }   (lost on restart: users just sign in again)
const SESSION_MS = 7 * 24 * 3600 * 1000;
function newSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId, exp: Date.now() + SESSION_MS });
  setCookie(res, 'pf_session', token, SESSION_MS / 1000);
}
function setCookie(res, name, value, maxAge) {
  res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SECURE_COOKIE ? '; Secure' : ''}`);
}
function getUser(req) {
  const m = /(?:^|;\s*)pf_session=([a-f0-9]+)/.exec(req.headers.cookie || '');
  if (!m) return null;
  const s = sessions.get(m[1]);
  if (!s || s.exp < Date.now()) { sessions.delete(m[1]); return null; }
  return db.users.find(u => u.id === s.userId) || null;
}

const attempts = new Map();               // simple brute-force guard: ip -> [timestamps]
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
  attempts.set(ip, list);
  return list.length >= 10;
}
const noteAttempt = ip => attempts.get(ip).push(Date.now());

/* ------------------------------------------------------------------ helpers */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const PUBLIC_PAGES = new Set(['/login.html', '/signup.html', '/privacy.html', '/data-deletion.html']);

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) { req.destroy(); reject(new Error('Too large')); } });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('Invalid JSON')); } });
  });
}
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/* ------------------------------------------------------------------ Facebook OAuth */
const oauthStates = new Map();            // state -> { userId, exp }
function startOAuth(res, userId) {
  const app = db.apps.find(a => a.userId === userId && a.active);
  if (!app) return redirect(res, '/connect-app.html?need=app');
  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, { userId, appId: app.id, exp: Date.now() + 10 * 60 * 1000 });
  const url = new URL(`https://www.facebook.com/${FB_VERSION}/dialog/oauth`);
  url.search = new URLSearchParams({
    client_id: app.fbAppId, redirect_uri: `${BASE_URL}/fb/callback`, state, scope: FB_SCOPES
  });
  redirect(res, url.toString());
}

async function graph(pathname, params) {
  const url = new URL(`${GRAPH_HOST}/${FB_VERSION}/${pathname}`);
  url.search = new URLSearchParams(params);
  const r = await fetch(url);
  const data = await r.json();
  if (!r.ok || data.error) throw new Error(data.error?.message || 'Facebook request failed');
  return data;
}

async function handleFbCallback(req, res, url) {
  const state = oauthStates.get(url.searchParams.get('state'));
  oauthStates.delete(url.searchParams.get('state'));
  if (!state || state.exp < Date.now()) return page(res, 'Link expired', 'This connection link has expired. Please start again from PostFlow.');
  if (url.searchParams.get('error')) return redirect(res, '/accounts.html?error=cancelled');

  const app = db.apps.find(a => a.id === state.appId);
  if (!app) return redirect(res, '/connect-app.html?need=app');
  try {
    const secret = decrypt(app.secretEnc);
    const short = await graph('oauth/access_token', {
      client_id: app.fbAppId, client_secret: secret,
      redirect_uri: `${BASE_URL}/fb/callback`, code: url.searchParams.get('code')
    });
    const long = await graph('oauth/access_token', {
      grant_type: 'fb_exchange_token', client_id: app.fbAppId, client_secret: secret,
      fb_exchange_token: short.access_token
    });
    const me = await graph('me', { fields: 'id,name', access_token: long.access_token });
    const pages = await graph('me/accounts', { fields: 'id,name,access_token', limit: '100', access_token: long.access_token });

    const record = {
      userId: state.userId, appId: app.id, fbId: me.id, name: me.name, status: 'active',
      tokenEnc: encrypt(long.access_token),
      pages: (pages.data || []).map(p => ({ id: p.id, name: p.name, tokenEnc: encrypt(p.access_token) })),
      connectedAt: new Date().toISOString()
    };
    const existing = db.accounts.find(a => a.userId === state.userId && a.fbId === me.id);
    if (existing) Object.assign(existing, record); else db.accounts.push({ id: uid(), ...record });
    save();
  } catch (e) {
    console.error('Facebook connect failed:', e.message);
    return page(res, 'Could not connect', 'Facebook did not accept the connection: ' + e.message.replace(/[<>&]/g, ''));
  }
  const loggedIn = getUser(req);
  if (loggedIn && loggedIn.id === state.userId) return redirect(res, '/accounts.html?connected=1');
  page(res, 'Account connected', 'Your Facebook account is connected. You can close this tab.');
}

function page(res, title, msg) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
  <body style="font-family:system-ui;background:#F2F5F7;display:grid;place-items:center;min-height:100vh;margin:0">
  <div style="background:#fff;border-radius:14px;padding:32px;max-width:420px;border:1px solid #D8E0E5">
  <h2 style="margin:0 0 10px;color:#0E2A2F">${title}</h2><p style="color:#5B6B73;line-height:1.5">${msg}</p>
  <a href="/dashboard.html" style="color:#0E2A2F;font-weight:600">Open PostFlow</a></div></body>`);
}

/* ------------------------------------------------------------------ API */
async function api(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  // behind a proxy (Railway) the socket address is the proxy's, so use the last X-Forwarded-For entry
  // (added by the proxy itself, not by the visitor). Only enabled when TRUST_PROXY=1.
  const fwd = (req.headers['x-forwarded-for'] || '').split(',').pop().trim();
  const ip = (process.env.TRUST_PROXY === '1' && fwd) || req.socket.remoteAddress;

  // block cross-site requests: every changing request must carry this header
  if (req.method !== 'GET' && req.headers['x-postflow'] !== '1') return json(res, 403, { error: 'Forbidden' });

  /* ---- public: signup / login / logout ---- */
  if (route === 'POST /api/signup') {
    const { email = '', password = '' } = await readBody(req);
    const e = email.trim().toLowerCase();
    if (!validEmail(e)) return json(res, 400, { error: 'Enter a valid email address.' });
    if (password.length < 8) return json(res, 400, { error: 'Password must be at least 8 characters.' });
    if (db.users.some(u => u.email === e)) return json(res, 409, { error: 'An account with this email already exists.' });
    const user = { id: uid(), email: e, passHash: hashPassword(password), createdAt: new Date().toISOString() };
    db.users.push(user); save();
    newSession(res, user.id);
    return json(res, 200, { ok: true });
  }
  if (route === 'POST /api/login') {
    if (tooManyAttempts(ip)) return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    const { email = '', password = '' } = await readBody(req);
    const user = db.users.find(u => u.email === email.trim().toLowerCase());
    if (!user || !checkPassword(password, user.passHash)) {
      noteAttempt(ip);
      return json(res, 401, { error: 'Email or password is incorrect.' });
    }
    newSession(res, user.id);
    return json(res, 200, { ok: true });
  }
  if (route === 'POST /api/logout') {
    const m = /pf_session=([a-f0-9]+)/.exec(req.headers.cookie || '');
    if (m) sessions.delete(m[1]);
    setCookie(res, 'pf_session', '', 0);
    return json(res, 200, { ok: true });
  }

  /* ---- everything below needs a signed-in user ---- */
  const user = getUser(req);
  if (!user) return json(res, 401, { error: 'Please sign in.' });
  if (route === 'POST /api/media') return uploadMedia(req, res, user);

  if (route === 'GET /api/me') return json(res, 200, { email: user.email, baseUrl: BASE_URL });

  if (route === 'GET /api/dashboard') {
    const accounts = db.accounts.filter(a => a.userId === user.id);
    const pageCount = accounts.reduce((n, a) => n + a.pages.length, 0);
    const bad = accounts.filter(a => a.status !== 'active');
    return json(res, 200, {
      pages: pageCount, accounts: accounts.length,
      activePages: accounts.filter(a => a.status === 'active').reduce((n, a) => n + a.pages.length, 0),
      ready: 0, readyPages: 0, lowStock: 0, followers: 0, queuedUrls: 0, scheduled: db.jobs.filter(j => j.userId === user.id && j.status === 'pending').length,   // filled in by later features
      attention: bad.map(a => ({ name: a.name, issue: 'Facebook access needs attention', tone: 'bad', status: 'needs', label: 'Reconnect' }))
    });
  }

  /* ---- Facebook apps ---- */
  if (route === 'GET /api/apps') {
    return json(res, 200, db.apps.filter(a => a.userId === user.id)
      .map(a => ({ id: a.id, name: a.name, appId: a.fbAppId, secretEnd: a.secretEnd, active: a.active })));
  }
  if (route === 'POST /api/apps') {
    const { name = '', appId = '', secret = '' } = await readBody(req);
    if (!/^\d{6,20}$/.test(appId.trim())) return json(res, 400, { error: 'App ID should be numbers only.' });
    if (secret.trim().length < 8) return json(res, 400, { error: 'App Secret looks too short.' });
    const mine = db.apps.filter(a => a.userId === user.id);
    if (mine.some(a => a.fbAppId === appId.trim())) return json(res, 409, { error: 'This App ID is already saved.' });
    db.apps.push({
      id: uid(), userId: user.id, name: name.trim().slice(0, 60), fbAppId: appId.trim(),
      secretEnc: encrypt(secret.trim()), secretEnd: secret.trim().slice(-4), active: mine.length === 0
    });
    save();
    return json(res, 200, { ok: true });
  }
  let m;
  if ((m = /^POST \/api\/apps\/(\w+)\/activate$/.exec(route))) {
    const app = db.apps.find(a => a.id === m[1] && a.userId === user.id);
    if (!app) return json(res, 404, { error: 'App not found.' });
    db.apps.filter(a => a.userId === user.id).forEach(a => a.active = a.id === app.id);
    save();
    return json(res, 200, { ok: true });
  }
  if ((m = /^DELETE \/api\/apps\/(\w+)$/.exec(route))) {
    const app = db.apps.find(a => a.id === m[1] && a.userId === user.id);
    if (!app) return json(res, 404, { error: 'App not found.' });
    db.apps = db.apps.filter(a => a.id !== app.id);
    db.accounts = db.accounts.filter(a => a.appId !== app.id || a.userId !== user.id);   // accounts made with this app stop working
    const left = db.apps.filter(a => a.userId === user.id);
    if (app.active && left[0]) left[0].active = true;
    save();
    return json(res, 200, { ok: true });
  }

  /* ---- connected Facebook accounts ---- */
  if (route === 'GET /api/accounts') {
    return json(res, 200, db.accounts.filter(a => a.userId === user.id).map(a => ({
      id: a.id, name: a.name, fbId: a.fbId, status: a.status, pages: a.pages.length, connected: a.connectedAt
    })));
  }
  if ((m = /^DELETE \/api\/accounts\/(\w+)$/.exec(route))) {
    const before = db.accounts.length;
    db.accounts = db.accounts.filter(a => !(a.id === m[1] && a.userId === user.id));
    if (db.accounts.length === before) return json(res, 404, { error: 'Account not found.' });
    save();
    return json(res, 200, { ok: true });
  }

  /* ---- magic link: lets someone else connect their Facebook without signing in ---- */
  if (route === 'POST /api/magic-link') {
    if (!db.apps.some(a => a.userId === user.id && a.active)) return json(res, 400, { error: 'Add and activate a Facebook app first.' });
    const token = crypto.randomBytes(24).toString('hex');
    db.magic = db.magic.filter(x => x.exp > Date.now());
    db.magic.push({ token, userId: user.id, exp: Date.now() + 24 * 3600 * 1000 });
    save();
    return json(res, 200, { magic_url: `${BASE_URL}/m/${token}` });
  }

  /* ---- pages, files, publishing ---- */
  if (route === 'GET /api/pages') return json(res, 200, db.accounts.filter(a => a.userId === user.id)
    .flatMap(a => a.pages.map(p => ({ id: p.id, name: p.name, needsReconnect: a.status !== 'active' }))));
  if (route === 'GET /api/media') return json(res, 200, db.media.filter(x => x.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(({ id, name, type, size, folderId }) => ({ id, name, type, size, folderId: folderId || null })));
  if ((m = /^DELETE \/api\/media\/(\w+)$/.exec(route))) {
    const item = db.media.find(x => x.id === m[1] && x.userId === user.id);
    if (!item) return json(res, 404, { error: 'File not found.' });
    if (db.jobs.some(j => j.mediaId === item.id && ['pending', 'publishing'].includes(j.status))) return json(res, 409, { error: 'This file is waiting in the queue. Cancel those posts first.' });
    fs.rmSync(path.join(MEDIA_DIR, item.id + item.ext), { force: true });
    db.media = db.media.filter(x => x.id !== item.id); save();
    return json(res, 200, { ok: true });
  }
  const ownsPage = id => db.accounts.some(a => a.userId === user.id && a.pages.some(p => p.id === id));
  if (route === 'GET /api/plan-slots') {
    const pageId = url.searchParams.get('pageId');
    if (!ownsPage(pageId)) return json(res, 404, { error: 'Page not found.' });
    const count = Math.min(Math.max(Number(url.searchParams.get('count')) || 1, 1), 200);
    return json(res, 200, { slots: planSlots(user.id, pageId, count, Number(url.searchParams.get('tz')) || 0) });
  }
  if (route === 'GET /api/destination') {
    const pageId = url.searchParams.get('pageId');
    const acc = db.accounts.find(a => a.userId === user.id && a.pages.some(p => p.id === pageId));
    if (!acc) return json(res, 404, { error: 'Page not found.' });
    const q = db.jobs.filter(j => j.userId === user.id && j.pageId === pageId && j.status === 'pending').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    return json(res, 200, { name: acc.pages.find(p => p.id === pageId).name, postsPerDay: DEFAULT_SLOTS.length, queued: q.length, next: q[0] ? q[0].scheduledAt : null });
  }
  if (route === 'POST /api/publish') {
    const { pageIds = [], mediaIds = [], caption = '', mode = 'now', scheduledTime } = await readBody(req);
    if (!pageIds.length || !mediaIds.length) return json(res, 400, { error: 'Choose at least one page and one file.' });
    let at = new Date();
    if (mode === 'schedule') { at = new Date(scheduledTime); if (isNaN(at) || at < Date.now()) return json(res, 400, { error: 'Choose a time in the future.' }); }
    try {
      const ids = addJobs(user, pageIds.flatMap(pageId => mediaIds.map(mediaId => ({ pageId, mediaId, caption, at }))), 'pending');
      if (mode === 'now') setImmediate(runJobs);
      return json(res, 200, { ok: true, count: ids.length });
    } catch (e) { return json(res, 400, { error: e.message }); }
  }
  if (route === 'POST /api/publish/bulk') {
    const { pageId, items = [], draft = false, now = false } = await readBody(req);
    if (!pageId || !items.length) return json(res, 400, { error: 'Nothing to schedule.' });
    const rows = items.map(i => ({ pageId, mediaId: i.mediaId, caption: i.caption, at: now ? new Date() : new Date(i.scheduledTime) }));
    if (!draft && !now && rows.some(r => isNaN(r.at) || r.at < Date.now() - 60000)) return json(res, 400, { error: 'Every video needs a date and time in the future.' });
    try {
      const ids = addJobs(user, rows, draft ? 'draft' : 'pending');
      if (now) setImmediate(runJobs);
      return json(res, 200, { ok: true, count: ids.length });
    } catch (e) { return json(res, 400, { error: e.message }); }
  }
  const mine = db.jobs.filter(j => j.userId === user.id);
  if (route === 'GET /api/queue') return json(res, 200, mine.filter(j => ['pending', 'publishing'].includes(j.status))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).map(jobView));
  if (route === 'GET /api/history') {
    const q = (url.searchParams.get('q') || '').toLowerCase(), st = url.searchParams.get('status') || '';
    return json(res, 200, mine.filter(j => (!st || j.status === st) && (j.filename + ' ' + j.caption + ' ' + j.pageName).toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 300).map(jobView));
  }
  if (route === 'GET /api/logs') return json(res, 200, db.logs.filter(l => l.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200));
  if ((m = /^DELETE \/api\/jobs\/(\w+)$/.exec(route))) {
    const job = mine.find(j => j.id === m[1]);
    if (!job || !['pending', 'draft'].includes(job.status)) return json(res, 404, { error: 'Only waiting posts can be cancelled.' });
    db.jobs = db.jobs.filter(j => j.id !== job.id); save();
    return json(res, 200, { ok: true });
  }

  /* ---- folders ---- */
  if (route === 'GET /api/folders') return json(res, 200, db.folders.filter(f => f.userId === user.id).map(f => ({
    id: f.id, name: f.name,
    videos: db.media.filter(x => x.folderId === f.id && x.type === 'video').length,
    images: db.media.filter(x => x.folderId === f.id && x.type === 'image').length })));
  if (route === 'POST /api/folders') {
    const { name = '' } = await readBody(req);
    const n = name.trim().slice(0, 60);
    if (!n) return json(res, 400, { error: 'Enter a folder name.' });
    if (db.folders.some(f => f.userId === user.id && f.name.toLowerCase() === n.toLowerCase())) return json(res, 409, { error: 'A folder with this name already exists.' });
    db.folders.push({ id: uid(), userId: user.id, name: n }); save();
    return json(res, 200, { ok: true });
  }
  if ((m = /^DELETE \/api\/folders\/(\w+)$/.exec(route))) {
    const f = db.folders.find(x => x.id === m[1] && x.userId === user.id);
    if (!f) return json(res, 404, { error: 'Folder not found.' });
    if (db.sources.some(s => s.folderId === f.id)) return json(res, 409, { error: 'An auto-post source uses this folder. Remove that source first.' });
    db.media.forEach(x => { if (x.folderId === f.id) x.folderId = null; });
    db.folders = db.folders.filter(x => x.id !== f.id); save();
    return json(res, 200, { ok: true });
  }

  /* ---- auto-post sources ---- */
  if (route === 'GET /api/sources') return json(res, 200, db.sources.filter(s => s.userId === user.id).map(sourceView));
  if (route === 'POST /api/sources') {
    const b = await readBody(req);
    const acc = db.accounts.find(a => a.userId === user.id && a.pages.some(p => p.id === b.pageId));
    if (!acc) return json(res, 400, { error: 'Choose a page.' });
    if (!db.folders.some(f => f.id === b.folderId && f.userId === user.id)) return json(res, 400, { error: 'Choose a folder.' });
    const times = Array.isArray(b.times) ? [...new Set(b.times)].filter(t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)).slice(0, 6) : [];
    if (!times.length) return json(res, 400, { error: 'Set at least one posting time.' });
    if (db.sources.some(s => s.userId === user.id && s.pageId === b.pageId && s.folderId === b.folderId)) return json(res, 409, { error: 'This page already uses this folder.' });
    db.sources.push({ id: uid(), userId: user.id, pageId: b.pageId, pageName: acc.pages.find(p => p.id === b.pageId).name, folderId: b.folderId,
      mediaType: ['video', 'image', 'mixed'].includes(b.mediaType) ? b.mediaType : 'video', times, tz: Number(b.tz) || 0,
      captionMode: b.captionMode === 'custom' ? 'custom' : 'auto',
      captions: String(b.customCaption || '').split('\n').map(x => x.trim().slice(0, 500)).filter(Boolean).slice(0, 100),
      hashtags: String(b.hashtags || '').trim().slice(0, 300), status: 'active', postedIds: [], counter: 0,
      lastSlot: new Date().toISOString(), lastPostedAt: null, createdAt: new Date().toISOString() });
    save();
    return json(res, 200, { ok: true });
  }
  if ((m = /^POST \/api\/sources\/(\w+)\/toggle$/.exec(route))) {
    const s = db.sources.find(x => x.id === m[1] && x.userId === user.id);
    if (!s) return json(res, 404, { error: 'Source not found.' });
    s.status = s.status === 'active' ? 'paused' : 'active'; s.lastSlot = new Date().toISOString(); save();
    return json(res, 200, { ok: true });
  }
  if ((m = /^DELETE \/api\/sources\/(\w+)$/.exec(route))) {
    const before = db.sources.length;
    db.sources = db.sources.filter(x => !(x.id === m[1] && x.userId === user.id));
    if (db.sources.length === before) return json(res, 404, { error: 'Source not found.' });
    save();
    return json(res, 200, { ok: true });
  }

  json(res, 404, { error: 'Not found' });
}

/* ------------------------------------------------------------------ media + publishing */
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
fs.mkdirSync(MEDIA_DIR, { recursive: true });
const MAX_UPLOAD = (Number(process.env.MAX_UPLOAD_MB) || 500) * 1024 * 1024;
const TYPES = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
const GRAPH_VIDEO_HOST = process.env.FB_GRAPH_VIDEO_HOST || 'https://graph-video.facebook.com';
const DEFAULT_SLOTS = ['09:00', '13:00', '18:00', '21:00'];     // daily posting times (visitor's local time) used by auto-schedule

async function uploadMedia(req, res, user) {
  const name = path.basename(decodeURIComponent(req.headers['x-filename'] || 'file')).slice(0, 120);
  const ext = path.extname(name).toLowerCase();
  if (!TYPES[ext]) return json(res, 400, { error: 'Only mp4, mov, jpg and png files are allowed.' });
  if (Number(req.headers['content-length']) > MAX_UPLOAD) return json(res, 413, { error: 'File is too large.' });
  const folderId = req.headers['x-folder'] || null;
  if (folderId && !db.folders.some(f => f.id === folderId && f.userId === user.id)) return json(res, 400, { error: 'Folder not found.' });
  const id = uid(), file = path.join(MEDIA_DIR, id + ext);
  let size = 0;
  const limit = new Transform({ transform(chunk, _e, cb) { size += chunk.length; size > MAX_UPLOAD ? cb(new Error('too big')) : cb(null, chunk); } });
  try { await pipeline(req, limit, fs.createWriteStream(file)); }
  catch { fs.rmSync(file, { force: true }); return json(res, 413, { error: 'Upload failed or file is too large.' }); }
  db.media.push({ id, userId: user.id, folderId, name, ext, size, type: TYPES[ext].startsWith('video') ? 'video' : 'image', createdAt: new Date().toISOString() });
  save();
  json(res, 200, { ok: true, id });
}

function serveMedia(req, res, user, id) {
  const m = db.media.find(x => x.id === id && x.userId === user.id);
  if (!m) { res.writeHead(404); return res.end(); }
  const file = path.join(MEDIA_DIR, m.id + m.ext), total = fs.statSync(file).size, type = TYPES[m.ext];
  const r = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (r) {                                    // browsers need ranges to preview video
    const s = r[1] ? +r[1] : total - +r[2], e = Math.min(r[1] && r[2] ? +r[2] : total - 1, total - 1);
    if (!(s >= 0 && s <= e)) { res.writeHead(416); return res.end(); }
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${s}-${e}/${total}`, 'Accept-Ranges': 'bytes', 'Content-Length': e - s + 1 });
    return fs.createReadStream(file, { start: s, end: e }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': total, 'Accept-Ranges': 'bytes' });
  fs.createReadStream(file).pipe(res);
}

/* next free posting times for a page. tz = browser's getTimezoneOffset() (minutes) */
function planSlots(userId, pageId, count, tz) {
  const taken = new Set(db.jobs.filter(j => j.userId === userId && j.pageId === pageId && ['pending', 'draft'].includes(j.status)).map(j => j.scheduledAt));
  const localNow = new Date(Date.now() - tz * 60000), out = [];
  for (let d = 0; d < 400 && out.length < count; d++) {
    for (const t of DEFAULT_SLOTS) {
      const [h, mi] = t.split(':').map(Number);
      const iso = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + d, h, mi) + tz * 60000).toISOString();
      if (out.length < count && new Date(iso).getTime() > Date.now() + 5 * 60000 && !taken.has(iso)) out.push(iso);
    }
  }
  return out;
}

function addJobs(user, rows, status) {
  const ids = [];
  for (const r of rows) {
    const acc = db.accounts.find(a => a.userId === user.id && a.pages.some(p => p.id === r.pageId));
    const media = db.media.find(m => m.id === r.mediaId && m.userId === user.id);
    if (!acc || !media) throw new Error('Page or file not found.');
    const at = isNaN(new Date(r.at)) ? new Date() : new Date(r.at);
    const job = { id: uid(), userId: user.id, accountId: acc.id, pageId: r.pageId, pageName: acc.pages.find(p => p.id === r.pageId).name,
      mediaId: media.id, filename: media.name, caption: String(r.caption || '').slice(0, 2000), status,
      scheduledAt: at.toISOString(), createdAt: new Date().toISOString(), postedAt: null, error: null };
    db.jobs.push(job); ids.push(job.id);
  }
  save();
  return ids;
}
const jobView = j => ({ id: j.id, page_name: j.pageName, filename: j.filename, caption: j.caption, status: j.status, error: j.error, when: j.postedAt || j.scheduledAt });

async function publishJob(job) {
  const acc = db.accounts.find(a => a.id === job.accountId), page = acc && acc.pages.find(p => p.id === job.pageId);
  const media = db.media.find(m => m.id === job.mediaId);
  if (!page) throw new Error('Page is no longer connected.');
  if (!media) throw new Error('The file was deleted.');
  const isVideo = media.type === 'video';
  const form = new FormData();
  form.set('access_token', decrypt(page.tokenEnc));
  form.set(isVideo ? 'description' : 'caption', job.caption);
  form.set('source', await fs.openAsBlob(path.join(MEDIA_DIR, media.id + media.ext), { type: TYPES[media.ext] }), media.name);
  const r = await fetch(`${isVideo ? GRAPH_VIDEO_HOST : GRAPH_HOST}/${FB_VERSION}/${page.id}/${isVideo ? 'videos' : 'photos'}`, { method: 'POST', body: form });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) { const e = new Error(data.error?.message || 'Facebook rejected the upload.'); e.code = data.error?.code; throw e; }
  return data.id || data.post_id || '';
}

/* Auto-post: every 30s, see if a source's posting time has passed and queue the next unposted file from its folder */
function pickMedia(s) {
  const pool = db.media.filter(m => m.userId === s.userId && m.folderId === s.folderId && !s.postedIds.includes(m.id));
  const want = s.mediaType === 'mixed' ? (s.counter % 2 === 0 ? 'video' : 'image') : (s.mediaType === 'image' ? 'image' : 'video');
  return pool.find(m => m.type === want) || (s.mediaType === 'mixed' ? pool[0] : null);
}
function sourceTick() {
  const now = Date.now();
  for (const s of db.sources) {
    if (s.status !== 'active') continue;
    const localNow = new Date(now - s.tz * 60000);
    let latest = 0;
    for (const d of [-1, 0]) for (const t of s.times) {
      const [h, mi] = t.split(':').map(Number);
      const ms = Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + d, h, mi) + s.tz * 60000;
      if (ms <= now && ms > latest) latest = ms;
    }
    if (!latest || latest <= new Date(s.lastSlot).getTime()) continue;
    s.lastSlot = new Date(latest).toISOString();
    if (now - latest > 30 * 60000) continue;               // server was off: skip old slots instead of posting a pile at once
    const media = pickMedia(s);
    if (!media) { s.status = 'exhausted'; continue; }
    const base = s.captionMode === 'custom' && s.captions.length ? s.captions[Math.floor(Math.random() * s.captions.length)] : '';
    try {
      addJobs({ id: s.userId }, [{ pageId: s.pageId, mediaId: media.id, caption: [base, s.hashtags].filter(Boolean).join('\n\n'), at: new Date() }], 'pending');
      s.postedIds.push(media.id); s.counter++; s.lastPostedAt = new Date().toISOString();
    } catch { s.status = 'paused'; }                       // page or file disappeared
  }
  save();
  runJobs();
}
function sourceView(s) {
  const items = db.media.filter(m => m.userId === s.userId && m.folderId === s.folderId && (s.mediaType === 'mixed' || m.type === (s.mediaType === 'image' ? 'image' : 'video')));
  const posted = items.filter(m => s.postedIds.includes(m.id)).length;
  const folder = db.folders.find(f => f.id === s.folderId);
  return { id: s.id, pageName: s.pageName, folderName: folder ? folder.name : '(deleted folder)', mediaType: s.mediaType, times: s.times,
    status: s.status, total: items.length, posted, remaining: items.length - posted, captionMode: s.captionMode, lastPostedAt: s.lastPostedAt };
}

let running = false;
async function runJobs() {                     // posts everything that is due, one at a time
  if (running) return;
  running = true;
  try {
    for (;;) {
      const job = db.jobs.filter(j => j.status === 'pending' && new Date(j.scheduledAt) <= Date.now())
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
      if (!job) break;
      job.status = 'publishing'; save();
      try { job.fbPostId = await publishJob(job); job.status = 'posted'; job.postedAt = new Date().toISOString(); job.error = null; }
      catch (e) {
        job.status = 'failed'; job.error = e.message;
        db.logs.push({ id: uid(), userId: job.userId, pageName: job.pageName, type: e.code === 190 ? 'token' : 'publish', message: e.message, createdAt: new Date().toISOString() });
        if (e.code === 190) { const acc = db.accounts.find(a => a.id === job.accountId); if (acc) acc.status = 'invalid-token'; }
      }
      save();
    }
  } finally { running = false; }
}

/* ------------------------------------------------------------------ router */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, BASE_URL);
    const p = url.pathname;

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');

    if (p.startsWith('/api/')) return await api(req, res, url);

    if (p === '/fb/connect') {
      const user = getUser(req);
      return user ? startOAuth(res, user.id) : redirect(res, '/login.html');
    }
    if (p === '/fb/callback') return await handleFbCallback(req, res, url);

    let mm;
    if ((mm = /^\/m\/([a-f0-9]+)$/.exec(p))) {
      const link = db.magic.find(x => x.token === mm[1] && x.exp > Date.now());
      if (!link) return page(res, 'Link expired', 'This link is no longer valid. Ask for a new one.');
      return startOAuth(res, link.userId);
    }

    if ((mm = /^\/media\/(\w+)$/.exec(p))) {
      const u = getUser(req);
      if (!u) { res.writeHead(401); return res.end(); }
      return serveMedia(req, res, u, mm[1]);
    }

    // pretty addresses
    const clean = { '/': '/dashboard.html', '/login': '/login.html', '/signup': '/signup.html', '/dashboard': '/dashboard.html',
      '/accounts': '/accounts.html', '/connect-app': '/connect-app.html', '/privacy': '/privacy.html', '/data-deletion': '/data-deletion.html' };
    const file = clean[p] || p;

    const full = path.normalize(path.join(PUBLIC, file));
    if (!full.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<body style="font-family:system-ui;padding:40px"><h2>Page not found</h2><p>This page has not been built yet.</p><a href="/dashboard.html">Back to dashboard</a></body>');
    }

    const ext = path.extname(full);
    // app pages need a login; css/js and the public pages do not
    if (ext === '.html' && !PUBLIC_PAGES.has(file) && !getUser(req)) return redirect(res, '/login.html');
    // already signed in? skip the login/signup screens
    if ((file === '/login.html' || file === '/signup.html') && getUser(req)) return redirect(res, '/dashboard.html');

    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(full).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) json(res, 500, { error: 'Something went wrong on the server.' });
  }
});

// a post that was mid-upload when the server stopped cannot be trusted: mark it failed instead of posting twice
db.jobs.forEach(j => { if (j.status === 'publishing') { j.status = 'failed'; j.error = 'Server restarted during upload. Schedule it again.'; } });
save();
setInterval(runJobs, 20000);
setInterval(sourceTick, 30000);
runJobs();

server.listen(PORT, () => console.log(`PostFlow running at ${BASE_URL}`));
