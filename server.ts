import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Storage directory for background scheduler persistence (works when PC is off)
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const SCHEDULE_FILE = path.join(DATA_DIR, 'scheduled_posts.json');
const LOGS_FILE = path.join(DATA_DIR, 'posting_logs.json');

function readJsonFile(filePath: string, fallback: any = []) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Health Check endpoint (Railway uses this to verify deployment)
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    domain: 'postflowapp.online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get scheduled queue
app.get('/api/schedule/queue', (req: Request, res: Response) => {
  const queue = readJsonFile(SCHEDULE_FILE, []);
  res.json({ success: true, count: queue.length, queue });
});

// Add new scheduled post to 24/7 background queue
app.post('/api/schedule/add', (req: Request, res: Response) => {
  const { pageId, pageName, caption, videoUrl, targetTime, jitterMinutes, pageAccessToken } = req.body;
  if (!pageName || !targetTime) {
    return res.status(400).json({ success: false, error: 'pageName and targetTime are required' });
  }

  const baseDate = new Date(targetTime);
  const jitter = Number(jitterMinutes) || Math.floor(Math.random() * 4) + 2;
  const executionDate = new Date(baseDate.getTime() + jitter * 60000);

  const newJob = {
    id: 'job_' + Date.now(),
    pageId: pageId || '',
    pageName,
    caption: caption || '',
    videoUrl: videoUrl || '',
    baseTime: baseDate.toISOString(),
    executionTime: executionDate.toISOString(),
    jitterMinutes: jitter,
    status: 'Queued',
    pageAccessToken: pageAccessToken || '',
    createdAt: new Date().toISOString()
  };

  const queue = readJsonFile(SCHEDULE_FILE, []);
  queue.push(newJob);
  writeJsonFile(SCHEDULE_FILE, queue);

  res.json({
    success: true,
    message: 'Post queued for 24/7 background execution',
    job: newJob
  });
});

// Background Worker: Runs every 30 seconds to publish due posts
setInterval(async () => {
  try {
    const queue = readJsonFile(SCHEDULE_FILE, []);
    if (!queue || queue.length === 0) return;

    const now = new Date();
    let updated = false;

    for (const job of queue) {
      if (job.status === 'Queued') {
        const execTime = new Date(job.executionTime || job.baseTime);
        if (now >= execTime) {
          console.log(`[Auto-Publisher] Triggering scheduled post for "${job.pageName}"...`);

          // Execute post to Meta Graph API if access token is present
          if (job.pageId && job.pageAccessToken) {
            try {
              const fbUrl = `https://graph.facebook.com/v21.0/${job.pageId}/feed`;
              const response = await fetch(fbUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: job.caption,
                  link: job.videoUrl || undefined,
                  access_token: job.pageAccessToken
                })
              });
              const fbData = await response.json();
              if (fbData.id) {
                job.status = 'Published';
                job.publishedAt = new Date().toISOString();
                job.fbPostId = fbData.id;
              } else {
                job.status = 'Failed';
                job.error = fbData.error?.message || 'Meta API Error';
              }
            } catch (err: any) {
              job.status = 'Failed';
              job.error = err.message;
            }
          } else {
            // Simulated live publish log if testing mode
            job.status = 'Published';
            job.publishedAt = new Date().toISOString();
            job.fbPostId = 'sim_' + Date.now();
          }

          const logs = readJsonFile(LOGS_FILE, []);
          logs.unshift({
            jobId: job.id,
            pageName: job.pageName,
            status: job.status,
            time: new Date().toISOString(),
            error: job.error || null
          });
          writeJsonFile(LOGS_FILE, logs.slice(0, 200));

          updated = true;
        }
      }
    }

    if (updated) {
      writeJsonFile(SCHEDULE_FILE, queue);
    }
  } catch (err) {
    console.error('[Background Worker Error]:', err);
  }
}, 30000);

// Serve static frontend assets
const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.use(express.static(publicPath));

// Fallback route for SPA / HTML files
app.get('*', (req: Request, res: Response) => {
  const reqPath = req.path;
  const htmlFileInPublic = path.join(publicPath, reqPath.endsWith('.html') ? reqPath : `${reqPath}.html`);

  if (fs.existsSync(htmlFileInPublic)) {
    return res.sendFile(htmlFileInPublic);
  }

  const indexHtml = fs.existsSync(path.join(distPath, 'index.html'))
    ? path.join(distPath, 'index.html')
    : fs.existsSync(path.join(publicPath, 'dashboard.html'))
    ? path.join(publicPath, 'dashboard.html')
    : path.join(__dirname, 'index.html');

  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }

  res.send('PostFlow Server Active');
});

app.listen(PORT, () => {
  console.log(`🚀 PostFlow 24/7 Automation Server is running on port ${PORT}`);
  console.log(`🌐 Live URL Target: https://postflowapp.online`);
});
