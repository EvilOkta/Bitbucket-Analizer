/**
 * Shared Type Definitions for Bitbucket Architecture Analyzer
 * Based on Technical Specification in ProjectMap.md
 */

export type AuthType = 'pat' | 'token' | 'basic';
export type ConnectionType = 'bitbucket' | 'confluence' | 'llm' | 'database';

export interface IntegrationCredential {
  id: string;
  type: ConnectionType;
  name: string;
  url: string;
  token?: string; // Stored securely/masked in UI
  username?: string;
  database?: string;
  port?: number;
  modelName?: string;
  temperature?: number;
  status: 'connected' | 'error' | 'untested';
  lastTestedAt?: string;
  errorMessage?: string;
}

export type RepoType = 'microservice' | 'monolith' | 'monorepo' | 'copy_version' | 'shared_library' | 'local';

export interface SubprojectItem {
  id: string;
  name: string;
  path: string;
  type: 'app' | 'service' | 'package';
  stack?: StackProfile[];
  endpointsCount?: number;
  description?: string;
}

export interface CrossServiceLink {
  fromRepo: string;
  toRepo: string;
  fromSubproject?: string;
  toSubproject?: string;
  method: string;
  path: string;
  protocol: 'REST' | 'gRPC' | 'Kafka' | 'RabbitMQ';
  description?: string;
}

export interface RepositoryItem {
  id: string;
  projectKey: string;
  projectName: string;
  slug: string;
  name: string;
  description?: string;
  cloneUrl: string;
  defaultBranch: string;
  lastSyncCommit?: string;
  lastSyncAt?: string;
  sizeBytes?: number;
  isLocal?: boolean;
  localPath?: string;
  isGitInitialized?: boolean;
  repoType?: RepoType;
  similarityWith?: {
    repoId: string;
    repoName: string;
    score: number; // 0-100
    stage: string; // e.g. "Эволюционная версия / Рефакторинг"
    commonFilesCount?: number;
  };
  subprojects?: SubprojectItem[];
}

export interface AnalysisRun {
  id: string;
  repositoryId: string;
  repositoryName: string;
  branch: string;
  commitHash: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  triggeredBy: string;
  stats: {
    totalFiles: number;
    totalLines: number;
    endpointsCount: number;
    flowsCount: number;
    entitiesCount: number;
    recommendationsCount: number;
    durationMs?: number;
  };
  errorMessage?: string;
}

export type FileCategory =
  | 'controller'
  | 'service'
  | 'repository'
  | 'model'
  | 'migration'
  | 'config'
  | 'test'
  | 'docs'
  | 'ci_cd'
  | 'ui'
  | 'dto'
  | 'unknown';

export interface FileNode {
  id: string;
  analysisRunId: string;
  path: string;
  name: string;
  type: 'file' | 'directory';
  language?: string;
  sizeBytes: number;
  linesCount?: number;
  category: FileCategory;
  importance: 'high' | 'medium' | 'low';
  issuesCount: number;
  content?: string;
  children?: FileNode[];
}

export interface StackProfile {
  id: string;
  analysisRunId: string;
  category: 'language' | 'backend_framework' | 'frontend_framework' | 'orm_db' | 'database' | 'build_tool' | 'ci_cd' | 'testing';
  technology: string;
  version?: string;
  confidence: number; // 0.0 - 1.0
  evidence: string[];
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'WS' | 'RPC';

export interface ApiParam {
  name: string;
  type: string;
  in: 'path' | 'query' | 'header' | 'cookie' | 'body';
  required: boolean;
  description?: string;
  example?: any;
}

export interface DtoProperty {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  example?: any;
}

export interface DtoStructure {
  modelName: string;
  isArray?: boolean;
  itemType?: string;
  isPrimitive?: boolean;
  description?: string;
  properties?: DtoProperty[];
  exampleJson?: any;
  rawSchema?: any;
  schema?: string;
}

export interface ApiResponseSchema {
  statusCode: number;
  description: string;
  modelName?: string;
  isArray?: boolean;
  itemType?: string;
  isPrimitive?: boolean;
  properties?: DtoProperty[];
  exampleJson?: any;
  schema?: string;
  example?: string;
}

export interface ApiEndpoint {
  id: string;
  analysisRunId: string;
  method: HttpMethod;
  path: string;
  fullPath?: string; // Complete combined route (e.g. /api/v1/payments/{id}/status)
  apiType: 'REST' | 'GraphQL' | 'gRPC' | 'WebSocket' | 'RPC';
  controller: string;
  controllerBasePath?: string;
  controllerDescription?: string;
  handler: string;
  operationId?: string;
  sourceFile: string;
  sourceLine: number;
  requestParams?: ApiParam[];
  requestBody?: DtoStructure;
  requestSchema?: string;
  requestExample?: string;
  responseDto?: string;
  responseBody?: DtoStructure;
  responseSchema?: string;
  responseStatuses?: ApiResponseSchema[];
  responses?: ApiResponseSchema[];
  authInfo?: string;
  tags: string[];
  description?: string;
  codeSnippet?: string;
  confidence: number;
  status: 'active' | 'deprecated' | 'candidate';
}

export interface FlowStep {
  order: number;
  from: string;
  to: string;
  call: string;
  payload?: string;
  response?: string;
  type: 'sync' | 'async' | 'db_query' | 'external_call';
  sourceFile?: string;
  sourceLine?: number;
}

export interface FlowTrace {
  id: string;
  analysisRunId: string;
  endpointId?: string;
  name: string;
  entryPoint: string;
  flowType: 'query' | 'command' | 'integration' | 'event' | 'auth';
  confidence: number;
  participants: string[];
  steps: FlowStep[];
  sequenceDiagramMermaid: string;
  sequenceDiagramPlantUml?: string;
  risks?: string[];
}

export type ElementTypeCategory =
  | 'screen_load'
  | 'lifecycle'
  | 'button'
  | 'button.action'
  | 'button.submit'
  | 'button.reset'
  | 'input'
  | 'text_input'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'toggle'
  | 'date_picker'
  | 'file_input'
  | 'link'
  | 'form'
  | 'form_submit'
  | 'modal'
  | 'unknown';

export interface UiElementAttributes {
  label?: string;
  text?: string;
  placeholder?: string;
  icon?: string;
  disabled?: boolean;
  required?: boolean;
  checked?: boolean;
  readOnly?: boolean;
  selected?: boolean;
  name?: string;
  type?: string;
  value?: string;
  customProps?: Record<string, string>;
}

export interface UiElementPosition {
  file: string;
  line: number;
  column?: number;
  jsxPath?: string;
  depth?: number;
  containers?: string[];
  uiSection?: 'modal' | 'sidebar' | 'header' | 'footer' | 'form' | 'toolbar' | 'table' | 'card' | 'content' | string;
  parentBlock?: string;
  siblingIndex?: number;
}

export interface UiHandlerAnalysis {
  handlerName: string;
  eventType: string; // onClick, onChange, onSubmit, onBlur, onFocus, etc.
  reduxActions?: string[];
  sideEffects?: string[]; // fetch, axios, localStorage, sessionStorage, navigate
  hasConditionals?: boolean;
  rawSnippet?: string;
}

export interface UiInteractableElement {
  id: string;
  name: string;
  type: ElementTypeCategory | 'screen_load' | 'lifecycle' | 'button' | 'input' | 'select' | 'form_submit' | 'checkbox' | 'link' | string;
  elementType?: string; // Classified fine-grained element type (e.g. button.action, select, toggle, modal)
  targetAction: string;
  handlerMethod?: string;
  codeSnippet?: string;
  frontendPayload?: Record<string, any>;
  dtoModel?: string;
  sequenceSteps: FlowStep[];
  sequenceDiagramMermaid: string;
  sequenceDiagramPlantUml?: string;
  sourceFile?: string;
  sourceLine?: number;
  targetSourceFile?: string;
  targetSourceLine?: number;
  dtoSourceFile?: string;
  dtoSourceLine?: number;

  // Rich metadata from IA-1, POS-1, POS-2, ATTR-1, and Handler analysis
  position?: UiElementPosition;
  attributes?: UiElementAttributes;
  handlers?: UiHandlerAnalysis[];
}

export interface UiScreenForm {
  id: string;
  name: string;
  componentPath: string;
  route: string;
  description: string;
  elements: UiInteractableElement[];
  sourceFile?: string;
  sourceLine?: number;
}

export interface EntityAttribute {
  id: string;
  name: string;
  physicalColumn: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTarget?: string; // Table.Column
  isNullable: boolean;
  description?: string;
  sourceFile?: string;
  sourceLine?: number;
  isEnum?: boolean;
  enumValues?: string[];
}

export interface EntityRelationship {
  id: string;
  sourceEntityId: string;
  sourceEntityName: string;
  targetEntityId: string;
  targetEntityName: string;
  type: '1:1' | '1:N' | 'N:M';
  foreignKeyName?: string;
  confidence: number;
}

export interface EntityModel {
  id: string;
  dataModelId: string;
  name: string;
  physicalTable: string;
  domain: string;
  description: string;
  attributes: EntityAttribute[];
  rowCountEstimate?: number;
  sourceFile?: string;
  sourceLine?: number;
  sourceType?: 'sql_ddl' | 'prisma' | 'python_orm' | 'dotnet_ef' | 'ts_interface' | 'js_structure' | 'api_dto' | 'enum' | 'system_type';
  sourceLabel?: string;
  isEnum?: boolean;
  enumValues?: string[];
  isSystemType?: boolean;
}

export interface DataModel {
  id: string;
  analysisRunId: string;
  source: 'postgresql_ddl' | 'migrations' | 'orm_entities' | 'prisma_schema' | 'python_orm' | 'dotnet_ef_core' | 'typescript_entities' | 'javascript_structures' | 'api_dtos' | 'direct_connection' | 'none';
  version: string;
  entities: EntityModel[];
  relationships: EntityRelationship[];
  erDiagramMermaid: string;
  erDiagramPlantUml?: string;
}

export type RecommendationSeverity = 'high' | 'medium' | 'low';
export type RecommendationCategory =
  | 'architecture'
  | 'layering'
  | 'modularity'
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'testing';

export interface Recommendation {
  id: string;
  analysisRunId: string;
  title: string;
  description: string;
  severity: RecommendationSeverity;
  category: RecommendationCategory;
  sourceType: 'rule_based' | 'qwen_ai' | 'hybrid';
  relatedFiles: string[];
  suggestedAction: string;
  targetStructureExample?: string;
  rationale: string;
  confidence: number;
  status: 'open' | 'accepted' | 'ignored';
}

export interface ConfluencePublishRequest {
  spaceKey: string;
  parentPageId?: string;
  pageTitle: string;
  analysisRunId: string;
  includeSections: {
    overview: boolean;
    stack: boolean;
    apiMap: boolean;
    sequenceDiagrams: boolean;
    dataModel: boolean;
    recommendations: boolean;
  };
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  status: 'success' | 'warning' | 'error';
}

export interface HierarchyNode {
  id: string;
  name: string;
  level: number; // 0: root server, 1: project, 2: repo, 3: branch / subproject, 4: commit
  type: 'root' | 'project' | 'repo' | 'branch' | 'commit' | 'subproject';
  updatedAt: string; // ISO String or readable date
  timestamp: number; // unix timestamp in ms for gradient calculation
  color?: string;
  details?: {
    projectKey?: string;
    projectName?: string;
    repoSlug?: string;
    repoName?: string;
    branchName?: string;
    commitHash?: string;
    author?: string;
    message?: string;
    repoType?: RepoType;
    subprojects?: string[];
    similarityWith?: {
      repoId: string;
      repoName: string;
      score: number;
      stage: string;
    };
    isLocal?: boolean;
    localPath?: string;
    isGitInitialized?: boolean;
    description?: string;
    [key: string]: any;
  };
  children?: HierarchyNode[];
}

// -------------------------------------------------------------
// Autotests Module & Diagnostic Test Runner
// -------------------------------------------------------------
export type TestFramework = 'pytest' | 'vitest' | 'jest' | 'junit' | 'xunit' | 'nunit' | 'playwright' | 'cypress' | 'gtest' | 'unknown';
export type TestCaseType = 'unit' | 'integration' | 'e2e' | 'form' | 'api';

export interface TestCaseItem {
  id: string;
  name: string;
  suiteName: string;
  type: TestCaseType;
  file: string;
  line: number;
  framework: TestFramework;
  targetComponent?: string;
  assertionsCount?: number;
  status?: 'passed' | 'failed' | 'skipped' | 'pending';
  durationMs?: number;
}

export interface TestSuiteItem {
  id: string;
  name: string;
  file: string;
  framework: TestFramework;
  testCount: number;
  tests: TestCaseItem[];
}

export interface TestCoverageMetrics {
  totalEndpoints: number;
  testedEndpoints: number;
  endpointsCoveragePercent: number;
  totalScreenForms: number;
  testedScreenForms: number;
  screenFormsCoveragePercent: number;
  totalEntities: number;
  testedEntities: number;
  entitiesCoveragePercent: number;
}

export interface TestAnalysisResult {
  suites: TestSuiteItem[];
  totalTests: number;
  frameworks: TestFramework[];
  coverage: TestCoverageMetrics;
}

export interface DiagnosticTestResult {
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  details?: string;
}

export interface DiagnosticRunReport {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: DiagnosticTestResult[];
}

export interface GeneratedTestCode {
  framework: TestFramework;
  language: 'typescript' | 'python' | 'csharp';
  targetType: 'endpoint' | 'screen_form';
  targetName: string;
  filename: string;
  code: string;
}


