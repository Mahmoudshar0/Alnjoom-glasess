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
    ['-h', db.host, '-p', db.port, '-U', db.user, '-F', 'p',
     '--clean', '--if-exists', '-f', filepath, db.dbName],
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

// ─── Restore helpers ─────────────────────────────────────────────────────────

/**
 * Step 1 — Create a safety backup of the CURRENT database before any restore.
 * If this fails the restore is aborted — nothing has been touched yet.
 */
function createSafetyBackup(
  db: NonNullable<ReturnType<typeof parseDbUrl>>,
  env: NodeJS.ProcessEnv,
  cb: (err: Error | null, safetyFile: string) => void
) {
  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `pre-restore-safety-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  execFile(
    resolvePgBin('pg_dump'),
    ['-h', db.host, '-p', db.port, '-U', db.user, '-F', 'p',
     '--clean', '--if-exists', '-f', filepath, db.dbName],
    { env },
    (err) => cb(err, filepath)
  );
}

/**
 * Step 2 — Drop and recreate the public schema so the incoming SQL file can
 * run its CREATE TABLE statements on a clean slate. Without this, psql silently
 * skips conflicting CREATE TABLE calls and exits 0, giving a false "success".
 */
function cleanSchema(
  db: NonNullable<ReturnType<typeof parseDbUrl>>,
  env: NodeJS.ProcessEnv,
  cb: (err: Error | null, stderr: string) => void
) {
  const sql = [
    `DROP SCHEMA public CASCADE;`,
    `CREATE SCHEMA public;`,
    `GRANT ALL ON SCHEMA public TO "${db.user}";`,
    `GRANT ALL ON SCHEMA public TO public;`,
  ].join(' ');

  execFile(
    resolvePgBin('psql'),
    ['-h', db.host, '-p', db.port, '-U', db.user, '-d', db.dbName, '-c', sql],
    { env },
    (err, _stdout, stderr) => cb(err, stderr)
  );
}

/**
 * Step 3 — Run psql with the SQL file.
 * ON_ERROR_STOP=1 makes psql return a non-zero exit code on the first SQL error.
 * --single-transaction wraps the whole restore in one transaction so a failure
 * rolls back everything instead of leaving the database half-restored.
 */
function runPsqlRestore(
  db: NonNullable<ReturnType<typeof parseDbUrl>>,
  env: NodeJS.ProcessEnv,
  sqlFile: string,
  cb: (err: Error | null, stderr: string) => void
) {
  execFile(
    resolvePgBin('psql'),
    ['-h', db.host, '-p', db.port, '-U', db.user, '-d', db.dbName,
     '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f', sqlFile],
    { env },
    (err, _stdout, stderr) => cb(err, stderr)
  );
}

/**
 * Full restore pipeline:
 *   createSafetyBackup → cleanSchema → runPsqlRestore
 *
 * If createSafetyBackup fails  → abort, database untouched.
 * If cleanSchema fails         → abort, database untouched.
 * If runPsqlRestore fails      → single-transaction rolls back; admin can
 *                                restore from the safety backup created in step 1.
 */
function runRestorePipeline(
  db: NonNullable<ReturnType<typeof parseDbUrl>>,
  env: NodeJS.ProcessEnv,
  sqlFile: string,
  cleanup: (() => void) | null,
  res: Response
) {
  createSafetyBackup(db, env, (backupErr) => {
    if (backupErr) {
      if (cleanup) cleanup();
      return res.status(500).json({
        message: 'Restore aborted: could not create a safety backup of the current database. No data was changed.',
        error: backupErr.message,
      });
    }

    cleanSchema(db, env, (cleanErr, cleanStderr) => {
      if (cleanErr) {
        if (cleanup) cleanup();
        return res.status(500).json({
          message: 'Restore aborted: could not clear the database schema. A safety backup was saved. No data was changed.',
          error: cleanErr.message,
          stderr: cleanStderr,
        });
      }

      runPsqlRestore(db, env, sqlFile, (restoreErr, restoreStderr) => {
        if (cleanup) cleanup();
        if (restoreErr) {
          return res.status(500).json({
            message: 'Restore failed after clearing the schema. The database may be empty — use the pre-restore-safety backup to recover.',
            error: restoreErr.message,
            stderr: restoreStderr,
          });
        }
        return res.json({ message: 'Database restored successfully' });
      });
    });
  });
}

// ─── Restore routes ───────────────────────────────────────────────────────────

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

  runRestorePipeline(db, { ...process.env, PGPASSWORD: db.password }, filepath, null, res);
});

// POST /api/backup/restore-upload — restore from uploaded .sql file
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

  const filePath = req.file.path;
  const cleanup = () => { try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {} };

  runRestorePipeline(db, { ...process.env, PGPASSWORD: db.password }, filePath, cleanup, res);
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
    ['-h', db.host, '-p', db.port, '-U', db.user, '-F', 'p',
     '--clean', '--if-exists', '-f', filepath, db.dbName],
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
