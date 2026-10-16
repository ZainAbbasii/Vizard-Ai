require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.VIZARDAI_API_KEY || '';
const API_BASE =
  'https://elb-api.vizard.ai/hvizard-server-front/open-api/v1/project';

app.disable('x-powered-by');
// Hosted behind a reverse proxy (Cloudways Velocity). Without this, every
// visitor shares the proxy's IP and the rate limit below would block everyone together.
app.set('trust proxy', 1);
app.use(express.json({ limit: '50kb' }));
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  next();
});

// Minimal in-memory rate limit: 10 API calls per IP per minute.
const hits = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const recent = (hits.get(req.ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 10) {
    return res
      .status(429)
      .json({ error: 'Too many requests. Wait a minute and try again.' });
  }
  recent.push(now);
  hits.set(req.ip, recent);
  next();
}

// Vizard error codes from the public API docs.
const ERRORS = {
  4001: 'The API key is invalid. Check VIZARDAI_API_KEY in your .env file.',
  4002: 'The service could not create the project. Try again.',
  4003: 'The clipping service rate limit was hit. Wait and retry.',
  4004: 'That video format is not supported.',
  4005: 'The video file is broken or too long.',
  4006: 'One of the request parameters was rejected.',
  4007: 'The account has no processing minutes left.',
  4008: 'The video could not be downloaded from that link.',
  4009: 'That video link is not valid.',
  4010: 'The spoken language could not be detected.',
};

function detectSource(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtube.com' || host === 'youtu.be') return { videoType: 2 };
  if (host.endsWith('vimeo.com')) return { videoType: 4 };
  const ext = (url.pathname.match(/\.(mp4|3gp|avi|mov)$/i) || [])[1];
  if (ext) return { videoType: 1, ext: ext.toLowerCase() };
  return null;
}

app.get('/healthz', (req, res) => res.type('text').send('ok'));

app.get('/api/status', (req, res) => {
  res.json({ live: Boolean(API_KEY) });
});

app.post('/api/projects', rateLimit, async (req, res) => {
  if (!API_KEY) {
    return res.status(503).json({ error: 'Live mode is off. Add VIZARDAI_API_KEY to .env.' });
  }
  const url = typeof req.body.url === 'string' ? req.body.url.trim() : '';
  const source = detectSource(url);
  if (!source) {
    return res.status(400).json({
      error: 'Use a YouTube or Vimeo link, or a direct .mp4, .mov, .avi, or .3gp file URL.',
    });
  }
  try {
    const upstream = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', VIZARDAI_API_KEY: API_KEY },
      body: JSON.stringify({
        videoUrl: url,
        lang: 'auto',
        preferLength: [0],
        ratioOfClip: 1,
        maxClipNumber: 8,
        subtitleSwitch: 1,
        headlineSwitch: 1,
        ...source,
      }),
    });
    const data = await upstream.json();
    if (data.code !== 2000) {
      return res.status(502).json({ error: ERRORS[data.code] || data.errMsg || 'The clipping service returned an error.' });
    }
    res.json({ projectId: data.projectId });
  } catch (err) {
    console.error('create failed:', err.message);
    res.status(502).json({ error: 'Could not reach the clipping service.' });
  }
});

app.get('/api/projects/:id', rateLimit, async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: 'Live mode is off.' });
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid project id.' });
  }
  try {
    const upstream = await fetch(`${API_BASE}/query/${req.params.id}`, {
      headers: { VIZARDAI_API_KEY: API_KEY },
    });
    const data = await upstream.json();
    // 1000 means still processing; 2000 means done.
    if (data.code !== 1000 && data.code !== 2000) {
      return res.status(502).json({ code: data.code, error: ERRORS[data.code] || data.errMsg || 'Clipping failed.' });
    }
    res.json({
      code: data.code,
      videos: (data.videos || []).map((v) => ({
        id: v.videoId,
        url: v.videoUrl,
        durationMs: v.videoMsDuration,
        title: v.title,
        score: v.viralScore,
        reason: v.viralReason,
      })),
    });
  } catch (err) {
    console.error('query failed:', err.message);
    res.status(502).json({ error: 'Could not reach the clipping service.' });
  }
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Cutroom running at http://localhost:${PORT} (${API_KEY ? 'live' : 'demo'} mode)`);
});
