import { contextBridge, ipcRenderer } from 'electron';
import {
  IntegrationCredential,
  RepositoryItem,
  AnalysisRun,
  ConfluencePublishRequest,
  AuditLogItem
} from '../shared/types';
import { FullAnalysisResult } from '../engine/engineService';
import { FileEntry } from '../engine/stack/stackDetector';

export const electronApi = {
  // Credentials
  getCredentials: (): Promise<IntegrationCredential[]> => ipcRenderer.invoke('get-credentials'),
  saveCredential: (cred: IntegrationCredential): Promise<boolean> => ipcRenderer.invoke('save-credential', cred),
  testConnection: (cred: IntegrationCredential): Promise<{ success: boolean; message: string }> => ipcRenderer.invoke('test-connection', cred),

  // Bitbucket & Repositories
  fetchBitbucketRepos: (credId: string): Promise<RepositoryItem[]> => ipcRenderer.invoke('fetch-bb-repos', credId),
  getBranches: (credId: string, projectKey: string, repoSlug: string): Promise<string[]> => ipcRenderer.invoke('get-branches', credId, projectKey, repoSlug),
  getProjectGraph: (): Promise<any> => ipcRenderer.invoke('get-project-graph'),

  // Local Repository Selection & Scanning
  openLocalRepoDialog: (): Promise<string | null> => ipcRenderer.invoke('open-local-repo-dialog'),
  scanLocalRepository: (folderPath: string): Promise<{ repo: RepositoryItem; files: FileEntry[]; isGitInitialized: boolean }> =>
    ipcRenderer.invoke('scan-local-repo', folderPath),

  // Analysis Engine
  runAnalysis: (repo: RepositoryItem, branch: string, customFiles?: FileEntry[], subproject?: string): Promise<FullAnalysisResult> =>
    ipcRenderer.invoke('run-analysis', repo, branch, customFiles, subproject),
  getRuns: (): Promise<AnalysisRun[]> => ipcRenderer.invoke('get-runs'),
  getLatestAnalysisResult: (): Promise<FullAnalysisResult | null> => ipcRenderer.invoke('get-latest-analysis-result'),

  // Confluence Publisher
  getConfluenceSpaces: (credId: string): Promise<{ key: string; name: string }[]> => ipcRenderer.invoke('get-confluence-spaces', credId),
  publishToConfluence: (credId: string, req: ConfluencePublishRequest, htmlContent: string): Promise<{ success: boolean; pageUrl?: string; message: string }> =>
    ipcRenderer.invoke('publish-to-confluence', credId, req, htmlContent),

  // Audit Logs
  getAuditLogs: (): Promise<AuditLogItem[]> => ipcRenderer.invoke('get-audit-logs'),

  // LLM Interactive test
  testQwenPrompt: (promptText: string): Promise<{ success: boolean; responseText: string; latencyMs?: number }> =>
    ipcRenderer.invoke('test-qwen-prompt', promptText),

  // Autotests & Test Runner
  runDiagnosticTests: (): Promise<any> => ipcRenderer.invoke('run-diagnostic-tests'),
  generateTestCode: (targetType: 'endpoint' | 'screen_form', targetItem: any, framework: string): Promise<any> =>
    ipcRenderer.invoke('generate-test-code', targetType, targetItem, framework),

  // Platform info
  getPlatform: (): string => process.platform
};

contextBridge.exposeInMainWorld('electronApi', electronApi);

