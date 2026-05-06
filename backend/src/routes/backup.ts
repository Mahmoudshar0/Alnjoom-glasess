import { Router, Response } from 'express';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const SETTINGS_FILE = path.join(BACKUP_DIR, 'settings.json');

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

interface BackupSettings {
  autoEnabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  keepLast: number;
  lastAutoBackup?: string;
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function parseDbUrl(dbUrl: string) {
  const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+?)(?:\?.*)?$/);
  if (!match) return null;
  const [, user, password, host, port, dbName] = match;
  return { user, password, host, port, dbName };
}

function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9_\-.]/g, '');
}

/**
 * Resolves the full path to a PostgreSQL binary (pg_dump or psql).
 *
 * On Linux/Mac these are always in PATH. On Windows they are usually NOT
 * in PATH, so we search the default PostgreSQL install directories.
 * Falls back to the bare command name if nothing is found (works on Unix).
 */
function resolvePgBin(bin: 'pg_dump' | 'psql'): string {
  if (process.platform !== 'win32') return bin;

  // Walk C:\Program Files\PostgreSQL\<version>\bin\ from newest to oldest
  const pgBase = 'C:\\Program Files\\PostgreSQL';
  try {
    if (fs.existsSync(pgBase)) {
      const versions = fs.readdirSync(pgBase)
        .filter(v => fs.statSync(path.join(pgBase, v)).isDirectory())
        .sort((a, b) => parseFloat(b) - parseFloat(a)); // newest first

      for (const ver of versions) {
        const full = path.join(pgBase, ver, 'bin', `${bin}.exe`);
        if (fs.existsSync(full)) return full;
      }
    }
  } catch {
    // ignore fs errors, fall through to bare name
  }

  return bin; // last resort — works if user added PG to PATH manually
}

function getBackupFiles(): BackupFile[] {
  ensureBackupDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql') && !f.startsWith('restore_upload_'))
    .map(f => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      return { filename: f, size: stats.size, createdAt: stats.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function pruneBackups(keep = 8) {
  const files = getBackupFiles();
  if (files.length > keep) {
    files.slice(keep).forEach(f => {
      try { fs.unlinkSync(path.join(BACKUP_DIR, f.filename)); } catch {}
    });
  }
}

function readSettings(): BackupSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch {}
  return { autoEnabled: true, frequency: 'weekly', keepLast: 8 };
}

function writeSettings(s: BackupSettings) {
  ensureBackupDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
}

// POST /api/backup/create — saves backup to disk, returns metadata
router.post('/create', (_req: AuthRequest, res: Response) => {
  const db = parseDbUrl(process.env.DATABASE_URL || '');
  if (!db) return res.status(500).json({ message: 'Invalid DATABASE_URL' });

  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `optivision-backup-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);
  const env = { ...process.env, PGPASSWORD: db.password };

  execFile(
    resolvePgBin('pg_dump'),
    ['-h', db.host, '-p', db.port, '-U', db.user, '-F', 'p', '-f', filepath, db.dbName],
    { env },
    (err) => {
      if (err) {
        return res.status(500).json({
          message: 'Backup failed. Make sure pg_dump is installed and in your PATH.',
          error: err.message,
        });
      }
      const stats = fs.statSync(filepath);
      pruneBackups(readSettings().keepLast);
      return res.json({
        message: 'Backup created successfully',
        backup: { filename, size: stats.size, createdAt: new Date().toISOString() },
      });
    }
  );
});

// GET /api/backup/list — returns list of saved backups
router.get('/list', (_req: AuthRequest, res: Response) => {
  return res.json(getBackupFiles());
});

// GET /api/backup/settings
router.get('/settings', (_req: AuthRequest, res: Response) => {
  return res.json(readSettings());
});

// PUT /api/backup/settings
router.put('/settings', (req: AuthRequest, res: Response) => {
  const current = readSettings();
  const { autoEnabled, frequency, keepLast } = req.body;
  const updated: BackupSettings = {
    ...current,
    ...(typeof autoEnabled === 'boolean' && { autoEnabled }),
    ...(['daily', 'weekly', 'monthly'].includes(frequency) && { frequency }),
    ...(typeof keepLast === 'number' && keepLast > 0 && { keepLast }),
  };
  writeSettings(updated);
  initAutoBackup();
  return res.json(updated);
});

// GET /api/backup/download/latest  — must be registered BEFORE /download/:filename
router.get('/download/latest', (_req: AuthRequest, res: Response) => {
  const files = getBackupFiles();
  if (files.length === 0) {
    return res.status(404).json({ message: 'No backups available. Create one first.' });
  }
  return res.download(path.join(BACKUP_DIR, files[0].filename), files[0].filename);
});

// GET /api/backup/download/:filename
router.get('/download/:filename', (req: AuthRequest, res: Response) => {
  const filename = sanitizeFilename(req.params.filename);
  if (!filename.endsWith('.sql')) {
    return res.status(400).json({ message: 'Invalid backup file' });
  }
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ message: 'Backup file not found' });
  }
  return res.download(filepath, filename);
});

// POST /api/backup/restore/:filename — restore from a saved backup
router.post('/restore/:filename', (req: AuthRequest, res: Response) => {
  const filename = sanitizeFilename(req.params.filename);
  if (!filename.endsWith('.sql')) {
    return res.status(400).json({ message: 'Invalid backup file' });
  }
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ message: 'Backup file not found' });
  }

  const db = parseDbUrl(process.env.DATABASE_URL || '');
  if (!db) return res.status(500).json({ message: 'Invalid DATABASE_URL' });

  const env = { ...process.env, PGPASSWORD: db.password };
  execFile(
    resolvePgBin('psql'),
    ['-h', db.host, '-p', db.port, '-U', db.user, '-d', db.dbName, '-f', filepath],
    { env },
    (err, _stdout, stderr) => {
      if (err) {
        return res.status(500).json({
          message: 'Restore failed. Make sure psql is installed and in your PATH.',
          error: err.message,
          stderr,
        });
      }
      return res.json({ message: 'Database restored successfully' });
    }
  );
});

// POST /api/backup/restore-upload — advanced: restore from uploaded file
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => { ensureBackupDir(); cb(null, BACKUP_DIR); },
    filename: (_req, _file, cb) => { cb(null, `restore_upload_${Date.now()}.sql`); },
  }),
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.sql')) cb(null, true);
    else cb(new Error('Only .sql files are accepted'));
  },
  limits: { fileSize: 500 * 1024 * 1024 },
});

router.post('/restore-upload', upload.single('backup'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'No backup file uploaded' });

  const db = parseDbUrl(process.env.DATABASE_URL || '');
  if (!db) {
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(500).json({ message: 'Invalid DATABASE_URL' });
  }

  const env = { ...process.env, PGPASSWORD: db.password };
  execFile(
    resolvePgBin('psql'),
    ['-h', db.host, '-p', db.port, '-U', db.user, '-d', db.dbName, '-f', req.file.path],
    { env },
    (err, _stdout, stderr) => {
      try { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch {}
      if (err) {
        return res.status(500).json({
          message: 'Restore failed. Make sure psql is installed and in your PATH.',
          error: err.message,
          stderr,
        });
      }
      return res.json({ message: 'Database restored successfully' });
    }
  );
});

// DELETE /api/backup/:filename
router.delete('/:filename', (req: AuthRequest, res: Response) => {
  const filename = sanitizeFilename(req.params.filename);
  if (!filename.endsWith('.sql')) {
    return res.status(400).json({ message: 'Invalid backup file' });
  }
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ message: 'Backup file not found' });
  }
  try {
    fs.unlinkSync(filepath);
    return res.json({ message: 'Backup deleted' });
  } catch {
    return res.status(500).json({ message: 'Failed to delete backup' });
  }
});

// ─── Auto-backup scheduler ────────────────────────────────────────────────────

let autoBackupTimer: ReturnType<typeof setInterval> | null = null;

function getIntervalMs(frequency: string): number {
  if (frequency === 'daily') return 24 * 60 * 60 * 1000;
  if (frequency === 'monthly') return 30 * 24 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000; // weekly default
}

function runAutoBackup() {
  const db = parseDbUrl(process.env.DATABASE_URL || '');
  if (!db) return;

  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `optivision-auto-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);
  const env = { ...process.env, PGPASSWORD: db.password };

  execFile(
    resolvePgBin('pg_dump'),
    ['-h', db.host, '-p', db.port, '-U', db.user, '-F', 'p', '-f', filepath, db.dbName],
    { env },
    (err) => {
      if (!err) {
        const settings = readSettings();
        settings.lastAutoBackup = new Date().toISOString();
        writeSettings(settings);
        pruneBackups(settings.keepLast);
        console.log(`[AutoBackup] Created: ${filename}`);
      } else {
        console.error('[AutoBackup] Failed:', err.message);
      }
    }
  );
}

export function initAutoBackup() {
  if (autoBackupTimer) { clearInterval(autoBackupTimer); autoBackupTimer = null; }
  const settings = readSettings();
  if (!settings.autoEnabled) {
    console.log('[AutoBackup] Disabled');
    return;
  }
  const ms = getIntervalMs(settings.frequency);
  autoBackupTimer = setInterval(runAutoBackup, ms);
  console.log(`[AutoBackup] Scheduled (${settings.frequency})`);
}

export default router;
