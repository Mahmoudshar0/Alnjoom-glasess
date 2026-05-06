import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download, Upload, AlertTriangle, Database, CheckCircle,
  XCircle, Trash2, RefreshCw, Settings, ChevronDown, ChevronRight, Clock, HardDrive,
} from 'lucide-react';
import {
  createBackup, listBackups, downloadBackup, downloadLatestBackup,
  restoreBackup, restoreFromUpload, deleteBackup,
  getBackupSettings, updateBackupSettings,
  BackupFile, BackupSettings,
} from '../../api/backup';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDT(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function BackupPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [restoreTarget, setRestoreTarget] = useState<BackupFile | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadConfirmed, setUploadConfirmed] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [localSettings, setLocalSettings] = useState<BackupSettings | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);

  const { data: backups = [], isLoading: backupsLoading, refetch: refetchBackups } = useQuery({
    queryKey: ['backups'],
    queryFn: listBackups,
  });

  const { data: serverSettings } = useQuery({
    queryKey: ['backupSettings'],
    queryFn: getBackupSettings,
  });

  useEffect(() => {
    if (serverSettings && !settingsDirty) {
      setLocalSettings(serverSettings);
    }
  }, [serverSettings]);

  const displaySettings = localSettings ?? serverSettings;

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 6000);
  };

  const createMut = useMutation({
    mutationFn: createBackup,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['backups'] });
      notify('success', `Backup created: ${data.backup.filename}`);
    },
    onError: (err: any) => notify('error', err.response?.data?.message ?? 'Backup creation failed'),
  });

  const downloadLatestMut = useMutation({
    mutationFn: downloadLatestBackup,
    onError: (err: any) => notify('error', err.response?.data?.message ?? 'Download failed'),
  });

  const downloadMut = useMutation({
    mutationFn: downloadBackup,
    onError: (err: any) => notify('error', err.response?.data?.message ?? 'Download failed'),
  });

  const restoreMut = useMutation({
    mutationFn: (filename: string) => restoreBackup(filename),
    onSuccess: () => { setRestoreTarget(null); notify('success', 'Database restored successfully'); },
    onError: (err: any) => { setRestoreTarget(null); notify('error', err.response?.data?.message ?? 'Restore failed'); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteBackup,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backups'] }),
    onError: (err: any) => notify('error', err.response?.data?.message ?? 'Delete failed'),
  });

  const uploadRestoreMut = useMutation({
    mutationFn: (file: File) => restoreFromUpload(file),
    onSuccess: () => {
      notify('success', 'Database restored successfully');
      setUploadFile(null);
      setUploadConfirmed(false);
      if (fileRef.current) fileRef.current.value = '';
    },
    onError: (err: any) => notify('error', err.response?.data?.message ?? 'Restore failed'),
  });

  const settingsMut = useMutation({
    mutationFn: updateBackupSettings,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['backupSettings'] });
      setLocalSettings(data);
      setSettingsDirty(false);
      notify('success', 'Auto-backup settings saved');
    },
    onError: () => notify('error', 'Failed to save settings'),
  });

  const latestBackup = backups[0];

  const handleSettingChange = <K extends keyof BackupSettings>(key: K, value: BackupSettings[K]) => {
    setLocalSettings(prev => (prev ? { ...prev, [key]: value } : null));
    setSettingsDirty(true);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Notification */}
      {notification && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
          notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {notification.type === 'success'
            ? <CheckCircle size={15} className="flex-shrink-0" />
            : <XCircle size={15} className="flex-shrink-0" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Primary Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          leftIcon={<Database size={16} />}
          isLoading={createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          Create Backup Now
        </Button>
        <Button
          variant="secondary"
          leftIcon={<Download size={16} />}
          isLoading={downloadLatestMut.isPending}
          disabled={backups.length === 0}
          onClick={() => downloadLatestMut.mutate()}
        >
          Download Latest Backup
        </Button>
        <button
          onClick={() => refetchBackups()}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Refresh backup list"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Status Bar */}
      {latestBackup && (
        <div className="flex flex-wrap gap-6 p-4 bg-sky-50 border border-sky-200 rounded-xl text-sm">
          <span className="flex items-center gap-2 text-sky-700">
            <Clock size={14} />
            <span className="font-medium">Latest backup:</span>
            <span>{formatDT(latestBackup.createdAt)}</span>
          </span>
          <span className="flex items-center gap-2 text-sky-700">
            <HardDrive size={14} />
            <span className="font-medium">Saved backups:</span>
            <span>{backups.length}</span>
          </span>
        </div>
      )}

      {/* Backups Table */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Available Backups</h3>
          </div>
          <span className="text-xs text-slate-500">{backups.length} backup{backups.length !== 1 ? 's' : ''}</span>
        </div>

        {backupsLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading backups…</div>
        ) : backups.length === 0 ? (
          <div className="p-10 text-center">
            <Database size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No backups yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "Create Backup Now" to create your first backup.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Backup Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">File Name</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Size</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {backups.map((b, i) => (
                  <tr key={b.filename} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-900">{formatDT(b.createdAt)}</span>
                        {i === 0 && (
                          <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-medium">Latest</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-slate-400 font-mono truncate max-w-xs block">{b.filename}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-slate-600">{formatBytes(b.size)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => downloadMut.mutate(b.filename)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors flex items-center gap-1"
                        >
                          <Download size={12} />Download
                        </button>
                        <button
                          onClick={() => setRestoreTarget(b)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center gap-1"
                        >
                          <RefreshCw size={12} />Restore
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${b.filename}"? This cannot be undone.`)) {
                              deleteMut.mutate(b.filename);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete this backup"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Auto-Backup Settings */}
      {displaySettings && (
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-violet-50 rounded-lg"><Settings size={18} className="text-violet-600" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Automatic Backup</h3>
              <p className="text-xs text-slate-500">Runs automatically while the app is running</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Toggle */}
            <label className="flex items-center gap-3 cursor-pointer w-fit">
              <button
                type="button"
                onClick={() => handleSettingChange('autoEnabled', !displaySettings.autoEnabled)}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  displaySettings.autoEnabled ? 'bg-sky-500' : 'bg-slate-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  displaySettings.autoEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
              <span className="text-sm text-slate-700">
                {displaySettings.autoEnabled ? 'Auto-backup enabled' : 'Auto-backup disabled'}
              </span>
            </label>

            {displaySettings.autoEnabled && (
              <div className="grid grid-cols-2 gap-4 pl-1">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Backup Frequency</label>
                  <select
                    value={displaySettings.frequency}
                    onChange={e => handleSettingChange('frequency', e.target.value as BackupSettings['frequency'])}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly (recommended)</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Keep Last</label>
                  <select
                    value={displaySettings.keepLast}
                    onChange={e => handleSettingChange('keepLast', parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value={3}>3 backups</option>
                    <option value={5}>5 backups</option>
                    <option value={8}>8 backups (recommended)</option>
                    <option value={12}>12 backups</option>
                    <option value={20}>20 backups</option>
                  </select>
                </div>
              </div>
            )}

            {settingsDirty && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  isLoading={settingsMut.isPending}
                  onClick={() => displaySettings && settingsMut.mutate(displaySettings)}
                >
                  Save Settings
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setLocalSettings(serverSettings ?? null);
                    setSettingsDirty(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {displaySettings.lastAutoBackup && (
              <p className="text-xs text-slate-400">
                Last auto-backup: {formatDT(displaySettings.lastAutoBackup)}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Advanced Restore (collapsed) */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => setAdvancedOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-slate-100 rounded-lg">
              <Upload size={15} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Advanced Restore</p>
              <p className="text-xs text-slate-500">Restore from a manually uploaded .sql file</p>
            </div>
          </div>
          {advancedOpen
            ? <ChevronDown size={16} className="text-slate-400" />
            : <ChevronRight size={16} className="text-slate-400" />}
        </button>

        {advancedOpen && (
          <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
              <p><strong>Warning:</strong> Restoring will replace all current data. Create a backup first.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Select .sql backup file</label>
              <input
                ref={fileRef}
                type="file"
                accept=".sql"
                onChange={e => {
                  setUploadFile(e.target.files?.[0] ?? null);
                  setUploadConfirmed(false);
                }}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
              {uploadFile && (
                <p className="text-xs text-slate-500 mt-1.5">
                  {uploadFile.name} ({formatBytes(uploadFile.size)})
                </p>
              )}
            </div>

            {uploadFile && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uploadConfirmed}
                  onChange={e => setUploadConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700">
                  I understand this will <strong>overwrite all current data</strong> and cannot be undone.
                </span>
              </label>
            )}

            <Button
              leftIcon={<Upload size={16} />}
              variant={uploadConfirmed && uploadFile ? 'danger' : 'secondary'}
              isLoading={uploadRestoreMut.isPending}
              disabled={!uploadFile || !uploadConfirmed}
              onClick={() => uploadFile && uploadRestoreMut.mutate(uploadFile)}
            >
              Restore from File
            </Button>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={!!restoreTarget}
        onClose={() => !restoreMut.isPending && setRestoreTarget(null)}
        title="Confirm Restore"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">This will replace all current data</p>
              <p className="text-sm text-amber-700 mt-1">
                All customers, examinations, orders, invoices, and inventory will be replaced with the content
                from this backup. This action cannot be undone.
              </p>
            </div>
          </div>

          {restoreTarget && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-0.5">
              <p className="font-medium text-slate-800">{restoreTarget.filename}</p>
              <p className="text-slate-500">{formatDT(restoreTarget.createdAt)} · {formatBytes(restoreTarget.size)}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={restoreMut.isPending}
              onClick={() => setRestoreTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              isLoading={restoreMut.isPending}
              onClick={() => restoreTarget && restoreMut.mutate(restoreTarget.filename)}
            >
              Yes, Restore Database
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
