import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IntegrationCredential, AnalysisRun, RepositoryItem, AuditLogItem } from '../../shared/types';

// In-memory + persisted encrypted JSON store for maximum portability and zero-dependency reliability
export class LocalStore {
  private dataDir: string;
  private dbPath: string;
  private secretKey: Buffer;
  private state: {
    credentials: IntegrationCredential[];
    repositories: RepositoryItem[];
    runs: AnalysisRun[];
    auditLogs: AuditLogItem[];
  };

  constructor(appDataDir?: string) {
    this.dataDir = appDataDir || path.join(process.env.APPDATA || process.env.HOME || '.', '.bitbucket-analyzer');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.dbPath = path.join(this.dataDir, 'app_metadata.enc');
    
    // Derive machine-specific key for AES-256 encryption
    const machineId = process.env.COMPUTERNAME || process.env.USER || 'bitbucket-analyzer-key';
    this.secretKey = crypto.createHash('sha256').update(machineId).digest();

    this.state = {
      credentials: [],
      repositories: [],
      runs: [],
      auditLogs: []
    };

    this.load();
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(text: string): string {
    try {
      const parts = text.split(':');
      if (parts.length !== 2) return text;
      const iv = Buffer.from(parts[0], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.secretKey, iv);
      let decrypted = decipher.update(parts[1], 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return text;
    }
  }

  private save(): void {
    try {
      const raw = JSON.stringify(this.state);
      const encrypted = this.encrypt(raw);
      fs.writeFileSync(this.dbPath, encrypted, 'utf8');
    } catch (err: any) {
      console.error('Failed to persist metadata:', err.message);
    }
  }

  private load(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const encrypted = fs.readFileSync(this.dbPath, 'utf8');
        const raw = this.decrypt(encrypted);
        this.state = JSON.parse(raw);
      }
    } catch {
      // Defaults
      this.state = {
        credentials: [],
        repositories: [],
        runs: [],
        auditLogs: []
      };
    }
  }

  // Credentials API
  public getCredentials(): IntegrationCredential[] {
    // Return with masked tokens for UI safety
    return this.state.credentials.map(c => ({
      ...c,
      token: c.token ? (c.token.length > 4 ? `••••••••${c.token.slice(-4)}` : '••••••••') : undefined
    }));
  }

  public getRawCredential(id: string): IntegrationCredential | undefined {
    return this.state.credentials.find(c => c.id === id);
  }

  public getRawCredentials(): IntegrationCredential[] {
    return this.state.credentials;
  }

  public saveCredential(cred: IntegrationCredential): void {
    const idx = this.state.credentials.findIndex(c => c.id === cred.id || c.type === cred.type);
    if (idx >= 0) {
      // If token was masked from UI and not modified, keep original
      if (cred.token?.startsWith('••••••••')) {
        cred.token = this.state.credentials[idx].token;
      }
      this.state.credentials[idx] = cred;
    } else {
      this.state.credentials.push(cred);
    }
    this.addAuditLog('Сохранение подключения', 'Credential', cred.id, `Тип: ${cred.type}, URL: ${cred.url}`, 'success');
    this.save();
  }

  // Repositories API
  public getRepositories(): RepositoryItem[] {
    return this.state.repositories;
  }

  public saveRepositories(repos: RepositoryItem[]): void {
    this.state.repositories = repos;
    this.save();
  }

  // Analysis Runs API
  public getRuns(): AnalysisRun[] {
    return this.state.runs;
  }

  public saveRun(run: AnalysisRun): void {
    const idx = this.state.runs.findIndex(r => r.id === run.id);
    if (idx >= 0) {
      this.state.runs[idx] = run;
    } else {
      this.state.runs.unshift(run);
    }
    this.addAuditLog('Анализ репозитория', 'AnalysisRun', run.id, `Статус: ${run.status}, Файлов: ${run.stats.totalFiles}`, run.status === 'failed' ? 'error' : 'success');
    this.save();
  }

  // Audit Logs API
  public getAuditLogs(): AuditLogItem[] {
    return this.state.auditLogs;
  }

  public addAuditLog(action: string, targetType: string, targetId: string, details: string, status: 'success' | 'warning' | 'error' = 'success'): void {
    this.state.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      action,
      targetType,
      targetId,
      details,
      status
    });
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 500);
    }
    this.save();
  }
}
