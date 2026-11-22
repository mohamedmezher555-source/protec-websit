import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { NextFunction, Request, Response } from 'express';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { ServerDataStore } from './src/server/dataStore';

const PORT = 3000;
const ADMIN_EMAIL = 'protecprotection4@gmail.com';

const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8')) as {
  projectId: string;
};

const adminApp = getApps().length
  ? getApp()
  : initializeApp({ projectId: firebaseConfig.projectId });
const adminAuth = getAuth(adminApp);

const uploadsRoot = path.resolve(process.cwd(), 'uploads');
const quoteUploadsDir = path.resolve(uploadsRoot, 'quotes');
const publicUploadsDir = path.resolve(uploadsRoot, 'public');
const dataRoot = path.resolve(process.cwd(), 'data');

fs.mkdirSync(quoteUploadsDir, { recursive: true });
fs.mkdirSync(publicUploadsDir, { recursive: true });
fs.mkdirSync(dataRoot, { recursive: true });

const dataStore = new ServerDataStore(dataRoot);

interface AdminRequest extends Request {
  adminIdentity?: string;
}

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);
const ALLOWED_MEDIA_MIMES = new Set([...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES]);

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(bucketKey: string, limit = 30, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = rateBuckets.get(bucketKey);
  if (!entry || entry.resetAt <= now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count += 1;
  return true;
}

function makeSafeStorage(targetDir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, targetDir);
    },
    filename: (_req, file, cb) => {
      const ext = EXTENSION_BY_MIME[file.mimetype] || '.bin';
      const randomName = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`;
      cb(null, randomName);
    },
  });
}

const quoteUpload = multer({
  storage: makeSafeStorage(quoteUploadsDir),
  limits: {
    fileSize: 40 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MEDIA_MIMES.has(file.mimetype)) {
      cb(
        new Error(
          'Unsupported file type. Only images (JPG, PNG, WEBP) and videos (MP4, WEBM, MOV) are allowed.'
        )
      );
      return;
    }
    cb(null, true);
  },
});

const adminImageUpload = multer({
  storage: makeSafeStorage(publicUploadsDir),
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      cb(new Error('Unsupported image type. Only JPG, PNG, WEBP, or GIF are allowed.'));
      return;
    }
    cb(null, true);
  },
});

async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Invalid Bearer token' });
    return;
  }

  // Strictly verify Firebase ID token for authorized Protec admin
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email_verified || decoded.email?.toLowerCase() !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Admin privileges required' });
      return;
    }
    req.adminIdentity = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired Firebase authentication token' });
  }
}

function resolveSafeFile(baseDir: string, requestedName: string): string | null {
  const safeBase = path.basename(requestedName);
  if (!/^[a-zA-Z0-9._-]+$/.test(safeBase)) {
    return null;
  }
  const resolved = path.resolve(baseDir, safeBase);
  if (!resolved.startsWith(baseDir + path.sep)) {
    return null;
  }
  return resolved;
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'protec-web' });
  });

  // ── Public Data & Quote Submission ──
  app.get('/api/public-data', (_req, res) => {
    res.json(dataStore.getPublicCatalog());
  });

  app.post('/api/quotes', (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(`quote-submit:${ip}`, 30, 15 * 60 * 1000)) {
      res.status(429).json({ error: 'Too many requests. Please wait a few minutes.' });
      return;
    }
    const result = dataStore.createQuote(req.body || {});
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json({ quote: result.quote });
  });

  // ── Admin Quotes Management ──
  app.get('/api/admin/quotes', requireAdmin, (_req, res) => {
    res.json({ quotes: dataStore.listQuotes() });
  });

  app.patch('/api/admin/quotes/:id', requireAdmin, (req, res) => {
    const { status, adminNotes } = (req.body || {}) as {
      status?: string;
      adminNotes?: string;
    };
    const result = dataStore.updateQuote(req.params.id, status || '', adminNotes);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ quote: result.quote });
  });

  app.delete('/api/admin/quotes/:id', requireAdmin, (req, res) => {
    const deleted = dataStore.deleteQuote(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Quote request not found.' });
      return;
    }
    res.json({ ok: true });
  });

  // ── Admin Catalog & Site Settings Management ──
  app.put('/api/admin/site-content', requireAdmin, (req, res) => {
    const result = dataStore.saveSiteContent(req.body);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ siteContent: result.siteContent });
  });

  app.post('/api/admin/services', requireAdmin, (req, res) => {
    const result = dataStore.upsertService(req.body);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json({ service: result.service });
  });

  app.put('/api/admin/services/:id', requireAdmin, (req, res) => {
    const result = dataStore.upsertService({ ...req.body, id: req.params.id });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ service: result.service });
  });

  app.delete('/api/admin/services/:id', requireAdmin, (req, res) => {
    dataStore.deleteService(req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/admin/projects', requireAdmin, (req, res) => {
    const result = dataStore.upsertProject(req.body);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json({ project: result.project });
  });

  app.put('/api/admin/projects/:id', requireAdmin, (req, res) => {
    const result = dataStore.upsertProject({ ...req.body, id: req.params.id });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ project: result.project });
  });

  app.delete('/api/admin/projects/:id', requireAdmin, (req, res) => {
    dataStore.deleteProject(req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/admin/offers', requireAdmin, (req, res) => {
    const result = dataStore.upsertOffer(req.body);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json({ offer: result.offer });
  });

  app.put('/api/admin/offers/:id', requireAdmin, (req, res) => {
    const result = dataStore.upsertOffer({ ...req.body, id: req.params.id });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ offer: result.offer });
  });

  app.delete('/api/admin/offers/:id', requireAdmin, (req, res) => {
    dataStore.deleteOffer(req.params.id);
    res.json({ ok: true });
  });

  // ── Media Uploads & Protected Quote Media Serving ──
  app.post('/api/uploads/quote', (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(`quote-upload:${clientIp}`, 30, 15 * 60 * 1000)) {
      res.status(429).json({ error: 'Too many upload requests. Please try again shortly.' });
      return;
    }

    quoteUpload.array('files', 10)(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
        return;
      }
      const files = (req.files as Express.Multer.File[]) || [];
      const result = files.map((file) => {
        const kind: 'image' | 'video' = ALLOWED_VIDEO_MIMES.has(file.mimetype) ? 'video' : 'image';
        return {
          id: crypto.randomUUID(),
          filename: file.filename,
          originalName: file.originalname.slice(0, 140),
          mimeType: file.mimetype,
          size: file.size,
          kind,
          url: `/api/quotes/media/${encodeURIComponent(file.filename)}`,
        };
      });
      res.status(201).json({ files: result });
    });
  });

  app.get('/api/quotes/media/:filename', requireAdmin, (req, res) => {
    const resolved = resolveSafeFile(quoteUploadsDir, req.params.filename);
    if (!resolved || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    if (req.query.download === '1') {
      res.download(resolved, path.basename(resolved));
      return;
    }
    res.sendFile(resolved);
  });

  app.post('/api/uploads/admin', requireAdmin, (req, res) => {
    adminImageUpload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Image upload failed' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }
      res.status(201).json({
        filename: req.file.filename,
        url: `/uploads/public/${encodeURIComponent(req.file.filename)}`,
      });
    });
  });

  app.get('/uploads/public/:filename', (req, res) => {
    const resolved = resolveSafeFile(publicUploadsDir, req.params.filename);
    if (!resolved || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    res.sendFile(resolved);
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Protec server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
