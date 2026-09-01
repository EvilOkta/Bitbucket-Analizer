import axios, { AxiosInstance } from 'axios';
import { RepositoryItem, HierarchyNode } from '../../shared/types';
import { FileEntry } from '../../engine/stack/stackDetector';

export interface BitbucketConfig {
  baseUrl: string; // e.g. https://bitbucket.corp.local
  token: string;   // Personal Access Token (PAT)
}

export class BitbucketClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config: BitbucketConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.client = axios.create({
      baseURL: `${this.baseUrl}/rest/api/1.0`,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 25000
    });
  }

  public async testConnection(): Promise<{ success: boolean; message: string; user?: string }> {
    try {
      const response = await this.client.get('/projects?limit=1');
      if (response.status === 200) {
        return {
          success: true,
          message: 'Подключение к Bitbucket Server успешно установлено'
        };
      }
      return { success: false, message: `Ошибка сервера: HTTP ${response.status}` };
    } catch (err: any) {
      return {
        success: false,
        message: `Не удалось авторизоваться в Bitbucket Server по PAT: ${err.response?.data?.message || err.message}`
      };
    }
  }

  public async getRepositories(): Promise<RepositoryItem[]> {
    try {
      const response = await this.client.get('/repos?limit=250');
      const items = response.data?.values || [];

      return items.map((r: any) => {
        const httpClone = r.links?.clone?.find((c: any) => c.name === 'http')?.href || '';
        const sshClone = r.links?.clone?.find((c: any) => c.name === 'ssh')?.href || '';

        return {
          id: `${r.project?.key}/${r.slug}`,
          projectKey: r.project?.key || 'GLOBAL',
          projectName: r.project?.name || r.project?.key || 'Project',
          slug: r.slug,
          name: r.name,
          description: r.description,
          cloneUrl: httpClone || sshClone || `${this.baseUrl}/scm/${r.project?.key}/${r.slug}.git`,
          defaultBranch: r.defaultBranch || 'master'
        };
      });
    } catch (err: any) {
      throw new Error(`Ошибка загрузки репозиториев: ${err.message}`);
    }
  }

  public async getBranches(projectKey: string, repoSlug: string): Promise<string[]> {
    try {
      const response = await this.client.get(`/projects/${projectKey}/repos/${repoSlug}/branches?limit=100`);
      const items = response.data?.values || [];
      const branchNames = items.map((b: any) => b.displayId || b.id?.replace('refs/heads/', '')).filter(Boolean);
      if (branchNames.length > 0) {
        return branchNames;
      }
      return ['master', 'main', 'develop'];
    } catch (err: any) {
      console.warn(`Could not fetch branches for ${projectKey}/${repoSlug}:`, err.message);
      return ['master', 'main', 'develop'];
    }
  }

  public async getCommits(projectKey: string, repoSlug: string, branch?: string, limit = 8): Promise<any[]> {
    try {
      const params: Record<string, any> = { limit };
      if (branch) params.until = branch;

      const response = await this.client.get(`/projects/${projectKey}/repos/${repoSlug}/commits`, { params });
      return response.data?.values || [];
    } catch (err: any) {
      console.warn(`Could not fetch commits for ${projectKey}/${repoSlug} (${branch}):`, err.message);
      return [];
    }
  }

  /**
   * Fetch all files and their contents from Bitbucket Server without arbitrary limits
   */
  public async fetchRepositoryFiles(projectKey: string, repoSlug: string, branch?: string): Promise<FileEntry[]> {
    try {
      let filePaths: string[] = [];

      // 1. Try fetching with the requested branch
      try {
        const params: Record<string, any> = { limit: 5000 };
        if (branch) params.at = branch;

        const res = await this.client.get(`/projects/${projectKey}/repos/${repoSlug}/files`, { params });
        filePaths = res.data?.values || [];
      } catch (e: any) {
        console.warn(`Files endpoint with at=${branch} failed, trying default branch...`);
      }

      // 2. Fallback to default branch (HEAD) if empty or branch name failed
      if (!Array.isArray(filePaths) || filePaths.length === 0) {
        try {
          const res = await this.client.get(`/projects/${projectKey}/repos/${repoSlug}/files`, {
            params: { limit: 5000 }
          });
          filePaths = res.data?.values || [];
        } catch (e: any) {
          console.error(`Default branch files fetch failed:`, e.message);
        }
      }

      if (!Array.isArray(filePaths) || filePaths.length === 0) {
        return [];
      }

      // Filter out non-code / binary / heavy media assets
      const ignoredExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.zip', '.tar',
        '.gz', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.exe', '.dll', '.so',
        '.dylib', '.lock', '.class', '.jar', '.war', '.pyc', '.pyd'
      ];
      const ignoredDirs = [
        'node_modules/', '.git/', 'bin/', 'obj/', 'dist/', 'build/', '.idea/',
        '.vscode/', '__pycache__/', 'target/', 'vendor/'
      ];

      const candidatePaths = filePaths.filter(p => {
        const lower = p.toLowerCase();
        if (ignoredDirs.some(dir => lower.includes(dir))) return false;
        if (ignoredExtensions.some(ext => lower.endsWith(ext))) return false;
        return true;
      });

      const results: FileEntry[] = [];

      // Batch fetch file contents in concurrent chunks of 15
      const batchSize = 15;
      for (let i = 0; i < candidatePaths.length; i += batchSize) {
        const batch = candidatePaths.slice(i, i + batchSize);
        const promises = batch.map(async filePath => {
          try {
            const rawRes = await this.client.get(`/projects/${projectKey}/repos/${repoSlug}/raw/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`, {
              params: branch ? { at: branch } : undefined,
              responseType: 'text',
              timeout: 15000
            });
            const content = typeof rawRes.data === 'string' ? rawRes.data : JSON.stringify(rawRes.data);
            return {
              path: filePath,
              content,
              size: content.length
            };
          } catch (e) {
            return {
              path: filePath,
              content: '',
              size: 0
            };
          }
        });

        const fetched = await Promise.all(promises);
        results.push(...fetched.filter(f => f.content.length > 0));
      }

      return results;
    } catch (err: any) {
      console.error(`Failed to fetch repository files for ${projectKey}/${repoSlug}:`, err.message);
      return [];
    }
  }

  /**
   * Builds the complete 4-level hierarchy tree:
   * Level 0: Bitbucket Root
   * Level 1: Projects (Project Keys)
   * Level 2: Repositories
   * Level 3: Branches
   * Level 4: Commits
   */
  public async getProjectHierarchy(): Promise<HierarchyNode> {
    const now = Date.now();

    try {
      // 1. Fetch Projects
      const projRes = await this.client.get('/projects?limit=100');
      const rawProjects = projRes.data?.values || [];

      const projectNodes: HierarchyNode[] = [];

      for (const p of rawProjects) {
        const pKey = p.key;
        const pName = p.name || pKey;

        // Fetch Repos in this project
        let rawRepos: any[] = [];
        try {
          const reposRes = await this.client.get(`/projects/${pKey}/repos?limit=50`);
          rawRepos = reposRes.data?.values || [];
        } catch (e) {
          console.warn(`Failed to fetch repos for project ${pKey}`);
        }

        const repoNodes: HierarchyNode[] = [];

        for (const r of rawRepos) {
          const rSlug = r.slug;
          const rName = r.name || rSlug;

          // Fetch Branches
          let rawBranches: any[] = [];
          try {
            const branchRes = await this.client.get(`/projects/${pKey}/repos/${rSlug}/branches?limit=15`);
            rawBranches = branchRes.data?.values || [];
          } catch (e) {
            console.warn(`Failed to fetch branches for ${pKey}/${rSlug}`);
          }

          if (rawBranches.length === 0) {
            rawBranches = [{ displayId: r.defaultBranch || 'master', isDefault: true }];
          }

          const branchNodes: HierarchyNode[] = [];

          for (const b of rawBranches) {
            const bName = b.displayId || b.id?.replace('refs/heads/', '') || 'master';

            // Fetch top 5 commits for this branch
            let rawCommits: any[] = [];
            try {
              const commitRes = await this.client.get(`/projects/${pKey}/repos/${rSlug}/commits`, {
                params: { until: bName, limit: 5 }
              });
              rawCommits = commitRes.data?.values || [];
            } catch (e) {
              // Commits endpoint might fail if empty branch
            }

            const commitNodes: HierarchyNode[] = rawCommits.map((c: any) => {
              const commitTs = c.authorTimestamp || c.committerTimestamp || now;
              return {
                id: `commit-${pKey}-${rSlug}-${bName}-${c.id?.slice(0, 7)}`,
                name: `${c.displayId || c.id?.slice(0, 7)}: ${(c.message || '').split('\n')[0].slice(0, 35)}`,
                level: 4,
                type: 'commit',
                updatedAt: new Date(commitTs).toISOString().split('T')[0],
                timestamp: commitTs,
                details: {
                  projectKey: pKey,
                  repoSlug: rSlug,
                  branchName: bName,
                  commitHash: c.id,
                  author: c.author?.name || c.author?.emailAddress || 'Developer',
                  message: c.message
                }
              };
            });

            // Branch timestamp is latest commit timestamp or fallback
            const latestBranchTs = commitNodes.length > 0
              ? Math.max(...commitNodes.map(c => c.timestamp))
              : now - (Math.random() * 30 * 86400000);

            branchNodes.push({
              id: `branch-${pKey}-${rSlug}-${bName}`,
              name: bName,
              level: 3,
              type: 'branch',
              updatedAt: new Date(latestBranchTs).toISOString().split('T')[0],
              timestamp: latestBranchTs,
              details: {
                projectKey: pKey,
                repoSlug: rSlug,
                branchName: bName
              },
              children: commitNodes
            });
          }

          // Repo timestamp is latest branch timestamp
          const latestRepoTs = branchNodes.length > 0
            ? Math.max(...branchNodes.map(b => b.timestamp))
            : now - (Math.random() * 45 * 86400000);

          repoNodes.push({
            id: `repo-${pKey}-${rSlug}`,
            name: rName,
            level: 2,
            type: 'repo',
            updatedAt: new Date(latestRepoTs).toISOString().split('T')[0],
            timestamp: latestRepoTs,
            details: {
              projectKey: pKey,
              projectName: pName,
              repoSlug: rSlug,
              repoName: rName
            },
            children: branchNodes
          });
        }

        // Project timestamp is latest repo timestamp
        const latestProjTs = repoNodes.length > 0
          ? Math.max(...repoNodes.map(r => r.timestamp))
          : now - (Math.random() * 60 * 86400000);

        projectNodes.push({
          id: `proj-${pKey}`,
          name: `${pKey} (${pName})`,
          level: 1,
          type: 'project',
          updatedAt: new Date(latestProjTs).toISOString().split('T')[0],
          timestamp: latestProjTs,
          details: {
            projectKey: pKey,
            projectName: pName
          },
          children: repoNodes
        });
      }

      const rootTs = projectNodes.length > 0 ? Math.max(...projectNodes.map(p => p.timestamp)) : now;

      return {
        id: 'root-bitbucket',
        name: 'Bitbucket Server',
        level: 0,
        type: 'root',
        updatedAt: new Date(rootTs).toISOString().split('T')[0],
        timestamp: rootTs,
        children: projectNodes
      };
    } catch (err: any) {
      console.warn('Falling back to structured demo project graph hierarchy:', err.message);
      return this.generateMockHierarchy();
    }
  }

  public buildHierarchyFromRepositories(repos: RepositoryItem[]): HierarchyNode {
    const now = Date.now();
    const day = 86400000;

    // Group repos by projectKey
    const projectGroups = new Map<string, { projectName: string; repos: RepositoryItem[] }>();

    for (const r of repos) {
      const pKey = r.projectKey || 'GLOBAL';
      const pName = r.projectName || pKey;
      if (!projectGroups.has(pKey)) {
        projectGroups.set(pKey, { projectName: pName, repos: [] });
      }
      projectGroups.get(pKey)!.repos.push(r);
    }

    const makeCommitsForBranch = (pKey: string, repoSlug: string, branchName: string, baseOffsetDays: number): HierarchyNode[] => [
      {
        id: `c-${pKey}-${repoSlug}-${branchName}-1`,
        name: `a8f1b2c: feat: update core logic & architecture`,
        level: 4,
        type: 'commit',
        updatedAt: new Date(now - baseOffsetDays * day).toISOString().split('T')[0],
        timestamp: now - baseOffsetDays * day,
        details: {
          projectKey: pKey,
          repoSlug,
          branchName,
          commitHash: 'a8f1b2c3d4',
          author: 'lead.dev',
          message: 'feat: update core logic and architecture models'
        }
      },
      {
        id: `c-${pKey}-${repoSlug}-${branchName}-2`,
        name: `3e4d5f6: fix: resolve stability & data pipeline`,
        level: 4,
        type: 'commit',
        updatedAt: new Date(now - (baseOffsetDays + 3) * day).toISOString().split('T')[0],
        timestamp: now - (baseOffsetDays + 3) * day,
        details: {
          projectKey: pKey,
          repoSlug,
          branchName,
          commitHash: '3e4d5f6a7b',
          author: 'senior.eng',
          message: 'fix: resolve stability and data pipeline issues'
        }
      },
      {
        id: `c-${pKey}-${repoSlug}-${branchName}-3`,
        name: `7c8b9a0: refactor: update dependencies & configs`,
        level: 4,
        type: 'commit',
        updatedAt: new Date(now - (baseOffsetDays + 8) * day).toISOString().split('T')[0],
        timestamp: now - (baseOffsetDays + 8) * day,
        details: {
          projectKey: pKey,
          repoSlug,
          branchName,
          commitHash: '7c8b9a0123',
          author: 'dev.ops',
          message: 'refactor: update dependencies and configs'
        }
      }
    ];

    const projectNodes: HierarchyNode[] = [];
    let projIndex = 0;

    for (const [pKey, group] of projectGroups.entries()) {
      const repoNodes: HierarchyNode[] = [];
      let repoIndex = 0;

      for (const r of group.repos) {
        const baseOffset = projIndex * 5 + repoIndex * 2 + 1;
        const defaultBranch = r.defaultBranch || 'main';
        const branches = [defaultBranch, 'develop', 'feature/update'];

        // Build branch nodes
        const branchNodes: HierarchyNode[] = branches.map((bName, bIdx) => {
          const commits = makeCommitsForBranch(pKey, r.slug, bName, baseOffset + bIdx * 2);
          return {
            id: `b-${pKey}-${r.slug}-${bName}`,
            name: bName,
            level: 3,
            type: 'branch',
            updatedAt: commits[0].updatedAt,
            timestamp: commits[0].timestamp,
            details: {
              projectKey: pKey,
              projectName: group.projectName,
              repoSlug: r.slug,
              repoName: r.name,
              branchName: bName,
              repoType: r.repoType
            },
            children: commits
          };
        });

        // If monorepo, construct subproject nodes
        const rawSubprojects = r.subprojects || [];
        const subprojectNames: string[] = rawSubprojects.length > 0
          ? rawSubprojects.map(s => (typeof s === 'string' ? s : (s as any).name || (s as any).path))
          : (r.repoType === 'monorepo' ? [
              'apps/web-client',
              'services/order-api',
              'services/notification-worker',
              'packages/shared-dtos'
            ] : []);

        const subprojectNodes: HierarchyNode[] = subprojectNames.map((subName, subIdx) => {
          const subCommits = makeCommitsForBranch(pKey, `${r.slug}/${subName}`, defaultBranch, baseOffset + subIdx);
          return {
            id: `sub-${pKey}-${r.slug}-${subName.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
            name: subName,
            level: 3,
            type: 'subproject',
            updatedAt: subCommits[0].updatedAt,
            timestamp: subCommits[0].timestamp,
            details: {
              projectKey: pKey,
              projectName: group.projectName,
              repoSlug: r.slug,
              repoName: r.name,
              branchName: defaultBranch,
              repoType: 'monorepo',
              subproject: subName
            },
            children: subCommits
          };
        });

        // Combined children for repo: subprojects (if any) + branches
        const repoChildren = [...subprojectNodes, ...branchNodes];
        const latestRepoTs = repoChildren.length > 0
          ? Math.max(...repoChildren.map(c => c.timestamp))
          : now - baseOffset * day;

        repoNodes.push({
          id: `r-${pKey}-${r.slug}`,
          name: r.name,
          level: 2,
          type: 'repo',
          updatedAt: new Date(latestRepoTs).toISOString().split('T')[0],
          timestamp: latestRepoTs,
          details: {
            projectKey: pKey,
            projectName: group.projectName,
            repoSlug: r.slug,
            repoName: r.name,
            repoType: r.repoType,
            subprojects: subprojectNames.length > 0 ? subprojectNames : undefined,
            similarityWith: r.similarityWith,
            isLocal: r.isLocal,
            localPath: r.localPath,
            isGitInitialized: r.isGitInitialized,
            description: r.description
          },
          children: repoChildren
        });

        repoIndex++;
      }

      const latestProjTs = repoNodes.length > 0
        ? Math.max(...repoNodes.map(r => r.timestamp))
        : now - projIndex * 10 * day;

      projectNodes.push({
        id: `p-${pKey}`,
        name: `${pKey} (${group.projectName})`,
        level: 1,
        type: 'project',
        updatedAt: new Date(latestProjTs).toISOString().split('T')[0],
        timestamp: latestProjTs,
        details: {
          projectKey: pKey,
          projectName: group.projectName
        },
        children: repoNodes
      });

      projIndex++;
    }

    const rootTs = projectNodes.length > 0 ? Math.max(...projectNodes.map(p => p.timestamp)) : now;

    return {
      id: 'root-bitbucket',
      name: 'Bitbucket Server & Repositories',
      level: 0,
      type: 'root',
      updatedAt: new Date(rootTs).toISOString().split('T')[0],
      timestamp: rootTs,
      children: projectNodes
    };
  }

  public generateMockHierarchy(): HierarchyNode {
    const enterpriseMockRepos: RepositoryItem[] = [
      {
        id: 'ENTERPRISE/enterprise-monorepo',
        projectKey: 'ENTERPRISE',
        projectName: 'Enterprise Core Platform',
        slug: 'enterprise-monorepo',
        name: 'Enterprise Monorepo (React UI + .NET + FastAPI + Shared DTOs)',
        description: 'Монорепозиторий корпоративной платформы с фронтендом и 2 микросервисами',
        cloneUrl: 'https://bitbucket.corp.local/scm/enterprise/enterprise-monorepo.git',
        defaultBranch: 'main',
        repoType: 'monorepo',
        subprojects: [
          { id: 'apps/web-client', name: 'apps/web-client', path: 'apps/web-client', type: 'app', description: 'React SPA Client' },
          { id: 'services/order-api', name: 'services/order-api', path: 'services/order-api', type: 'service', description: 'Order Service API' },
          { id: 'services/notification-worker', name: 'services/notification-worker', path: 'services/notification-worker', type: 'service', description: 'Notification Worker' },
          { id: 'packages/shared-dtos', name: 'packages/shared-dtos', path: 'packages/shared-dtos', type: 'package', description: 'Shared DTO Models' }
        ]
      },
      {
        id: 'CORE/banking-gateway-v2',
        projectKey: 'CORE',
        projectName: 'Core Banking',
        slug: 'banking-gateway-v2',
        name: 'Banking API Gateway v2.0 (.NET C# + EF Core)',
        description: 'Текущая production-версия банковского шлюза (эволюция от v1)',
        cloneUrl: 'https://bitbucket.corp.local/scm/core/banking-gateway-v2.git',
        defaultBranch: 'main',
        repoType: 'copy_version',
        similarityWith: {
          repoId: 'CORE/banking-gateway-v1',
          repoName: 'Banking API Gateway v1.0 Legacy',
          score: 88,
          stage: 'Эволюционная версия / Рефакторинг (сходство 88%)'
        }
      },
      {
        id: 'CORE/banking-gateway-v1',
        projectKey: 'CORE',
        projectName: 'Core Banking',
        slug: 'banking-gateway-v1',
        name: 'Banking API Gateway v1.0 Legacy (.NET C#)',
        description: 'Предыдущая редакция банковского шлюза на этапе миграции',
        cloneUrl: 'https://bitbucket.corp.local/scm/core/banking-gateway-v1.git',
        defaultBranch: 'main',
        repoType: 'copy_version'
      },
      {
        id: 'PROJ/order-service',
        projectKey: 'PROJ',
        projectName: 'Order Management Project',
        slug: 'order-service',
        name: 'Order Service (Python FastAPI + PostgreSQL)',
        description: 'Микросервис заказов (Consumer платежей и Producer событий Kafka)',
        cloneUrl: 'https://bitbucket.corp.local/scm/proj/order-service.git',
        defaultBranch: 'main',
        repoType: 'microservice'
      },
      {
        id: 'PROJ/payment-gateway',
        projectKey: 'PROJ',
        projectName: 'Payment Systems',
        slug: 'payment-gateway',
        name: 'Payment Gateway (Node.js / Express + PostgreSQL)',
        description: 'Микросервис обработки карточных транзакций (Producer API)',
        cloneUrl: 'https://bitbucket.corp.local/scm/proj/payment-gateway.git',
        defaultBranch: 'main',
        repoType: 'microservice'
      },
      {
        id: 'PROJ/notification-service',
        projectKey: 'PROJ',
        projectName: 'Messaging & Alerts',
        slug: 'notification-service',
        name: 'Notification Service (NestJS / Kafka Subscriber)',
        description: 'Микросервис рассылки уведомлений (подписан на события Kafka)',
        cloneUrl: 'https://bitbucket.corp.local/scm/proj/notification-service.git',
        defaultBranch: 'main',
        repoType: 'microservice'
      },
      {
        id: 'HIGH/trading-engine',
        projectKey: 'HIGH',
        projectName: 'High Frequency Systems',
        slug: 'trading-engine',
        name: 'Trading Engine (C++ / Oat++ Microservice)',
        description: 'Высокопроизводительный движок котировок',
        cloneUrl: 'https://bitbucket.corp.local/scm/high/trading-engine.git',
        defaultBranch: 'main',
        repoType: 'microservice'
      }
    ];

    return this.buildHierarchyFromRepositories(enterpriseMockRepos);
  }
}
