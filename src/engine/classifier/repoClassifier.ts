import { FileEntry } from '../stack/stackDetector';
import { ApiEndpoint, CrossServiceLink, RepoType, RepositoryItem } from '../../shared/types';

export interface RepoFingerprint {
  repoId: string;
  repoName: string;
  files: Set<string>;
  fileNames: Set<string>;
  endpoints: Set<string>;
  models: Set<string>;
}

export class RepoClassifier {
  /**
   * Generates a structural fingerprint for a repository.
   */
  public static generateFingerprint(repoId: string, repoName: string, files: FileEntry[], endpoints: ApiEndpoint[]): RepoFingerprint {
    const filePaths = new Set<string>();
    const fileNames = new Set<string>();
    const endpointPaths = new Set<string>();
    const models = new Set<string>();

    for (const file of files) {
      const norm = file.path.replace(/\\/g, '/').toLowerCase();
      filePaths.add(norm);
      const name = norm.split('/').pop() || '';
      fileNames.add(name);

      if (norm.includes('model') || norm.includes('dto') || norm.includes('schema') || norm.endsWith('.sql')) {
        models.add(name.replace(/\.[^.]+$/, ''));
      }
    }

    for (const ep of endpoints) {
      endpointPaths.add(`${ep.method} ${ep.path.toLowerCase()}`);
    }

    return {
      repoId,
      repoName,
      files: filePaths,
      fileNames,
      endpoints: endpointPaths,
      models
    };
  }

  /**
   * Computes structural Jaccard similarity score (0 - 100%) between two repository fingerprints.
   */
  public static computeSimilarity(a: RepoFingerprint, b: RepoFingerprint): number {
    if (a.fileNames.size === 0 || b.fileNames.size === 0) return 0;

    let commonNames = 0;
    for (const name of a.fileNames) {
      if (b.fileNames.has(name)) {
        commonNames++;
      }
    }

    let commonEndpoints = 0;
    for (const ep of a.endpoints) {
      if (b.endpoints.has(ep)) {
        commonEndpoints++;
      }
    }

    const unionNames = new Set([...a.fileNames, ...b.fileNames]).size;
    const nameScore = unionNames > 0 ? (commonNames / unionNames) * 100 : 0;

    const unionEndpoints = new Set([...a.endpoints, ...b.endpoints]).size;
    const endpointScore = unionEndpoints > 0 ? (commonEndpoints / unionEndpoints) * 100 : nameScore;

    const finalScore = Math.round(nameScore * 0.7 + endpointScore * 0.3);
    return Math.min(100, Math.max(0, finalScore));
  }

  /**
   * Classifies a repository and detects evolutionary copies vs distinct microservices.
   */
  public static classify(
    current: RepoFingerprint,
    otherRepos: RepoFingerprint[],
    isMonorepo: boolean,
    isLocal?: boolean
  ): {
    repoType: RepoType;
    similarityWith?: { repoId: string; repoName: string; score: number; stage: string; commonFilesCount?: number };
  } {
    if (isMonorepo) {
      return { repoType: 'monorepo' };
    }

    // Check similarity with other repositories in the project
    let highestMatch: { repo: RepoFingerprint; score: number } | null = null;

    for (const other of otherRepos) {
      if (other.repoId === current.repoId) continue;
      const score = this.computeSimilarity(current, other);
      if (score > 40 && (!highestMatch || score > highestMatch.score)) {
        highestMatch = { repo: other, score };
      }
    }

    if (highestMatch && highestMatch.score >= 65) {
      const stage = highestMatch.score >= 85
        ? `Эволюционная версия / Рефакторинг (сходство ${highestMatch.score}%)`
        : `Форк / Экспериментальная ветка (сходство ${highestMatch.score}%)`;

      return {
        repoType: 'copy_version',
        similarityWith: {
          repoId: highestMatch.repo.repoId,
          repoName: highestMatch.repo.repoName,
          score: highestMatch.score,
          stage
        }
      };
    }

    // Check if it's a shared library
    if (current.endpoints.size === 0 && current.models.size >= 3) {
      return { repoType: 'shared_library' };
    }

    return { repoType: isLocal ? 'local' : 'microservice' };
  }

  /**
   * Traces cross-repository / cross-module API and message dependencies.
   */
  public static extractCrossServiceLinks(
    files: FileEntry[],
    currentRepoName: string,
    allKnownEndpoints?: { repoName: string; subproject?: string; method: string; path: string }[]
  ): CrossServiceLink[] {
    const links: CrossServiceLink[] = [];
    const seen = new Set<string>();

    const known = allKnownEndpoints || [
      { repoName: 'Payment-Gateway', method: 'POST', path: '/api/v1/payments/process' },
      { repoName: 'Payment-Gateway', method: 'GET', path: '/api/v1/payments/status' },
      { repoName: 'Orders-Service', method: 'GET', path: '/api/v1/orders' },
      { repoName: 'Notification-Service', method: 'POST', path: '/api/v1/notifications/send' }
    ];

    for (const file of files) {
      if (!file.content) continue;
      const content = file.content;

      // 1. Search for REST/HTTP calls to other services
      for (const target of known) {
        if (target.repoName === currentRepoName) continue;

        if (content.includes(target.path) || (target.path.length > 8 && content.includes(target.path.replace(/\/\{[^}]+\}/g, '')))) {
          const key = `${currentRepoName}->${target.repoName}:${target.method} ${target.path}`;
          if (!seen.has(key)) {
            seen.add(key);
            links.push({
              fromRepo: currentRepoName,
              toRepo: target.repoName,
              toSubproject: target.subproject,
              method: target.method,
              path: target.path,
              protocol: 'REST',
              description: `HTTP ${target.method} вызов эндпоинта ${target.path} в сервисе ${target.repoName}`
            });
          }
        }
      }

      // 2. Search for Kafka / Broker message events
      if (content.includes('order.created') || content.includes('order_created')) {
        const key = `${currentRepoName}->Notification-Service:Kafka order.created`;
        if (!seen.has(key)) {
          seen.add(key);
          links.push({
            fromRepo: currentRepoName,
            toRepo: 'Notification-Service',
            method: 'PUB',
            path: 'topic://order.created',
            protocol: 'Kafka',
            description: `Публикация асинхронного события в Kafka топик "order.created"`
          });
        }
      }

      if (content.includes('payment.completed') || content.includes('payment_completed')) {
        const key = `${currentRepoName}->Orders-Service:Kafka payment.completed`;
        if (!seen.has(key)) {
          seen.add(key);
          links.push({
            fromRepo: currentRepoName,
            toRepo: 'Orders-Service',
            method: 'PUB',
            path: 'topic://payment.completed',
            protocol: 'Kafka',
            description: `Событие успешной оплаты в Kafka топик "payment.completed"`
          });
        }
      }
    }

    return links;
  }
}
