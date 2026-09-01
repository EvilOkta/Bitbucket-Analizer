import {
  AnalysisRun,
  ApiEndpoint,
  CrossServiceLink,
  DataModel,
  FileCategory,
  FileNode,
  FlowTrace,
  Recommendation,
  RepoType,
  StackProfile,
  SubprojectItem,
  TestAnalysisResult,
  UiScreenForm
} from '../shared/types';
import { FileEntry, StackDetector } from './stack/stackDetector';
import { ApiExtractor } from './api/apiExtractor';
import { FlowTracer } from './flow/flowTracer';
import { PostgresParser } from './datamodel/postgresParser';
import { RuleEngine } from './rules/ruleEngine';
import { QwenAdapter, QwenConfig } from './llm/qwenAdapter';
import { MonorepoDetector } from './monorepo/monorepoDetector';
import { RepoClassifier, RepoFingerprint } from './classifier/repoClassifier';
import { TestExtractor } from './tests/testExtractor';

export interface FullAnalysisResult {
  run: AnalysisRun;
  tree: FileNode;
  stack: StackProfile[];
  endpoints: ApiEndpoint[];
  flows: FlowTrace[];
  screenForms: UiScreenForm[];
  dataModel: DataModel;
  recommendations: Recommendation[];
  testAnalysis?: TestAnalysisResult;
  isMonorepo?: boolean;
  subprojects?: SubprojectItem[];
  selectedSubproject?: string;
  crossServiceLinks?: CrossServiceLink[];
  repoType?: RepoType;
  similarityInfo?: {
    repoId: string;
    repoName: string;
    score: number;
    stage: string;
  };
}

export class EngineService {
  public static async analyzeRepository(
    repositoryId: string,
    repositoryName: string,
    branch: string,
    files: FileEntry[],
    qwenConfig?: QwenConfig,
    subprojectPath?: string,
    otherRepoFingerprints: RepoFingerprint[] = []
  ): Promise<FullAnalysisResult> {
    const startTime = Date.now();
    const runId = `run-${Date.now()}`;

    // 0. Detect Monorepo & Subprojects
    const { isMonorepo, subprojects } = MonorepoDetector.detect(files);

    // If subproject filter requested, scope the files
    const activeFiles = subprojectPath && subprojectPath !== 'all'
      ? MonorepoDetector.filterFiles(files, subprojectPath)
      : files;

    // 1. Build File Hierarchy Tree
    const tree = this.buildFileTree(activeFiles, runId);

    // 2. Detect Technology Stack
    const stack = StackDetector.detect(activeFiles, runId);

    // 3. Extract API Map
    const endpoints = ApiExtractor.extract(activeFiles, runId);

    // 4. Trace Data Flow & Sequence Diagrams
    const flows = FlowTracer.trace(endpoints, activeFiles, runId);

    // 4.1 Extract UI Screen Forms & Interactable Elements Sequence Traces
    const screenForms = FlowTracer.extractScreenForms(activeFiles, endpoints);

    // 5. Build Logical Data Model & ERD
    const dataModel = PostgresParser.parse(activeFiles, runId, endpoints);

    // 6. Generate Rule-Based Recommendations
    let recommendations = RuleEngine.analyze(activeFiles, stack, endpoints, runId);

    // 6.1 Classification & Cross-Service Dependencies
    const currentFingerprint = RepoClassifier.generateFingerprint(repositoryId, repositoryName, activeFiles, endpoints);
    const classification = RepoClassifier.classify(currentFingerprint, otherRepoFingerprints, isMonorepo, repositoryId.startsWith('local-'));
    const crossServiceLinks = RepoClassifier.extractCrossServiceLinks(activeFiles, repositoryName);

    // 7. Enrich with Local Qwen LLM if configured
    if (qwenConfig && qwenConfig.baseUrl) {
      recommendations = await QwenAdapter.enrichRecommendations(
        qwenConfig,
        stack,
        endpoints,
        recommendations,
        runId
      );
    }

    const durationMs = Date.now() - startTime;
    const totalLines = activeFiles.reduce((acc, f) => acc + (f.content?.split('\n').length || 0), 0);

    const run: AnalysisRun = {
      id: runId,
      repositoryId,
      repositoryName,
      branch,
      commitHash: 'HEAD-' + Math.random().toString(16).substring(2, 10),
      status: 'completed',
      startedAt: new Date(startTime).toISOString(),
      finishedAt: new Date().toISOString(),
      triggeredBy: 'Manual Analysis',
      stats: {
        totalFiles: activeFiles.length,
        totalLines,
        endpointsCount: endpoints.length,
        flowsCount: flows.length,
        entitiesCount: dataModel.entities.length,
        recommendationsCount: recommendations.length,
        durationMs
      }
    };

    // 8. Analyze Tests and Test Coverage
    const testAnalysis = TestExtractor.analyze(activeFiles, endpoints, screenForms, dataModel.entities);

    return {
      run,
      tree,
      stack,
      endpoints,
      flows,
      screenForms,
      dataModel,
      recommendations,
      testAnalysis,
      isMonorepo,
      subprojects: isMonorepo ? subprojects : undefined,
      selectedSubproject: subprojectPath || (isMonorepo ? 'all' : undefined),
      crossServiceLinks,
      repoType: classification.repoType,
      similarityInfo: classification.similarityWith
    };
  }

  private static buildFileTree(files: FileEntry[], runId: string): FileNode {
    const root: FileNode = {
      id: 'root',
      analysisRunId: runId,
      path: '',
      name: 'root',
      type: 'directory',
      sizeBytes: 0,
      category: 'unknown',
      importance: 'high',
      issuesCount: 0,
      children: []
    };

    for (const file of files) {
      const parts = file.path.replace(/\\/g, '/').split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        let child = current.children?.find(c => c.name === part);
        if (!child) {
          const category = this.categorizePath(currentPath, isFile);
          child = {
            id: `node-${currentPath}`,
            analysisRunId: runId,
            path: currentPath,
            name: part,
            type: isFile ? 'file' : 'directory',
            language: isFile ? this.detectLanguage(part) : undefined,
            sizeBytes: isFile ? file.size : 0,
            linesCount: isFile && file.content ? file.content.split('\n').length : undefined,
            category,
            importance: category === 'controller' || category === 'model' || category === 'service' ? 'high' : 'medium',
            issuesCount: 0,
            content: isFile ? file.content : undefined,
            children: isFile ? undefined : []
          };
          current.children = current.children || [];
          current.children.push(child);
        }

        if (isFile) {
          child.sizeBytes = file.size;
        } else {
          child.sizeBytes += file.size;
        }

        current = child;
      }
    }

    return root;
  }

  private static categorizePath(path: string, isFile: boolean): FileCategory {
    const p = path.toLowerCase();
    if (p.includes('controller') || p.includes('route') || p.includes('handler') || p.includes('views.py')) return 'controller';
    if (p.includes('service') || p.includes('usecase') || p.includes('manager')) return 'service';
    if (p.includes('repository') || p.includes('dao') || p.includes('dbcontext')) return 'repository';
    if (p.includes('model') || p.includes('entity') || p.includes('schema') || p.endsWith('.sql')) return 'model';
    if (p.includes('migration') || p.includes('alembic') || p.includes('flyway')) return 'migration';
    if (p.includes('test') || p.includes('spec')) return 'test';
    if (p.includes('dto') || p.includes('payload') || p.includes('types')) return 'dto';
    if (p.includes('config') || p.includes('settings') || p.endsWith('.json') || p.endsWith('.yml')) return 'config';
    if (p.endsWith('.md') || p.includes('doc')) return 'docs';
    if (p.includes('pipeline') || p.includes('docker') || p.includes('ci')) return 'ci_cd';
    if (p.includes('components') || p.includes('views') || p.includes('ui') || p.endsWith('.tsx') || p.endsWith('.jsx')) return 'ui';
    return 'unknown';
  }

  private static detectLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'TypeScript';
      case 'js':
      case 'jsx':
        return 'JavaScript';
      case 'py':
        return 'Python';
      case 'cs':
        return 'C#';
      case 'cpp':
      case 'cxx':
      case 'hpp':
      case 'h':
        return 'C / C++';
      case 'sql':
        return 'SQL (PostgreSQL)';
      case 'json':
        return 'JSON';
      case 'yml':
      case 'yaml':
        return 'YAML';
      case 'md':
        return 'Markdown';
      default:
        return 'Text';
    }
  }
}
