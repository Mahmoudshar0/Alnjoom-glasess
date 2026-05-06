import client from './client';

export interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

export interface BackupSettings {
  autoEnabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  keepLast: number;
  lastAutoBackup?: string;
}

export const createBackup = () =>
  client.post<{ message: string; backup: BackupFile }>('/backup/create').then(r => r.data);

export const listBackups = () =>
  client.get<BackupFile[]>('/backup/list').then(r => r.data);

export const getBackupSettings = () =>
  client.get<BackupSettings>('/backup/settings').then(r => r.data);

export const updateBackupSettings = (settings: Partial<BackupSettings>) =>
  client.put<BackupSettings>('/backup/settings', settings).then(r => r.data);

export const downloadBackup = async (filename: string): Promise<void> => {
  const response = await client.get(`/backup/download/${encodeURIComponent(filename)}`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const downloadLatestBackup = async (): Promise<void> => {
  const response = await client.get('/backup/download/latest', { responseType: 'blob' });
  const disposition = response.headers['content-disposition'] as string | undefined;
  const filename = disposition?.match(/filename="?([^";\n]+)"?/)?.[1] ?? 'optivision-backup.sql';
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const restoreBackup = (filename: string) =>
  client.post<{ message: string }>(`/backup/restore/${encodeURIComponent(filename)}`).then(r => r.data);

export const restoreFromUpload = (file: File) => {
  const fd = new FormData();
  fd.append('backup', file);
  return client
    .post<{ message: string }>('/backup/restore-upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data);
};

export const deleteBackup = (filename: string) =>
  client.delete(`/backup/${encodeURIComponent(filename)}`).then(r => r.data);
