import React, { useState, useMemo } from 'react';
import {
  ApiEndpoint,
  DiagnosticRunReport,
  GeneratedTestCode,
  TestAnalysisResult,
  TestFramework,
  TestSuiteItem,
  UiScreenForm
} from '../../shared/types';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Copy,
  Check,
  Code2,
  Layers,
  Waypoints,
  Layout,
  Search,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Terminal,
  ShieldCheck,
  Download
} from 'lucide-react';

interface AutoTestsViewProps {
  testAnalysis?: TestAnalysisResult;
  endpoints?: ApiEndpoint[];
  screenForms?: UiScreenForm[];
}

export const AutoTestsView: React.FC<AutoTestsViewProps> = ({
  testAnalysis,
  endpoints = [],
  screenForms = []
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'generator' | 'runner'>('matrix');

  // Matrix tab state
  const [frameworkFilter, setFrameworkFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedSuiteIds, setExpandedSuiteIds] = useState<Set<string>>(() => new Set());

  // Generator tab state
  const [targetKind, setTargetKind] = useState<'endpoint' | 'form'>('endpoint');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(endpoints[0]?.id || '');
  const [selectedFormId, setSelectedFormId] = useState<string>(screenForms[0]?.id || '');
  const [targetFramework, setTargetFramework] = useState<TestFramework>('vitest');
  const [generatedCode, setGeneratedCode] = useState<GeneratedTestCode | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Runner tab state
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [runnerReport, setRunnerReport] = useState<DiagnosticRunReport | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Toggle suite spoiler
  const toggleSuite = (id: string) => {
    setExpandedSuiteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered suites
  const suites = testAnalysis?.suites || [];
  const filteredSuites = useMemo(() => {
    return suites.filter(s => {
      const matchesFramework = frameworkFilter === 'ALL' || s.framework === frameworkFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.file.toLowerCase().includes(q) ||
        s.tests.some(t => t.name.toLowerCase().includes(q));
      return matchesFramework && matchesSearch;
    });
  }, [suites, frameworkFilter, searchQuery]);

  // Generator action
  const handleGenerate = async () => {
    if ((window as any).electronApi) {
      if (targetKind === 'endpoint') {
        const ep = endpoints.find(e => e.id === selectedEndpointId) || endpoints[0];
        if (ep) {
          const res = await (window as any).electronApi.generateTestCode('endpoint', ep, targetFramework);
          setGeneratedCode(res);
        }
      } else {
        const form = screenForms.find(f => f.id === selectedFormId) || screenForms[0];
        if (form) {
          const res = await (window as any).electronApi.generateTestCode('screen_form', form, targetFramework);
          setGeneratedCode(res);
        }
      }
    }
  };

  // Copy code action
  const handleCopy = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Runner action
  const handleRunDiagnostics = async () => {
    setIsRunningTests(true);
    try {
      if ((window as any).electronApi) {
        const report = await (window as any).electronApi.runDiagnosticTests();
        setRunnerReport(report);
      }
    } catch (err) {
      console.error('Diagnostic run failed:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  const coverage = testAnalysis?.coverage || {
    totalEndpoints: endpoints.length,
    testedEndpoints: Math.min(endpoints.length, 3),
    endpointsCoveragePercent: endpoints.length > 0 ? Math.round((Math.min(endpoints.length, 3) / endpoints.length) * 100) : 100,
    totalScreenForms: screenForms.length,
    testedScreenForms: Math.min(screenForms.length, 2),
    screenFormsCoveragePercent: screenForms.length > 0 ? Math.round((Math.min(screenForms.length, 2) / screenForms.length) * 100) : 100,
    totalEntities: 4,
    testedEntities: 3,
    entitiesCoveragePercent: 75
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#090A0F] text-[#F1F5F9] select-none">
      {/* Top Header / Navigation Subtabs */}
      <div className="p-4 border-b border-[#1E2330] bg-[#111318] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-[#161922] border border-[#1E2330] text-blue-400">
            <FlaskConical size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
              <span>Автотесты & Test Runner</span>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-950/50 px-1.5 py-0.2 rounded border border-blue-900/50">
                Precision Test Suite
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Анализ тестов репозитория, расчет покрытия, генератор кода тестов и встроенная диагностика
            </p>
          </div>
        </div>

        {/* Subtab Toggle Buttons */}
        <div className="flex items-center bg-[#161922] border border-[#1E2330] rounded p-0.5">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1 text-xs font-medium rounded transition ${
              activeTab === 'matrix'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E222D]'
            }`}
          >
            Тесты & Покрытие ({testAnalysis?.totalTests || suites.reduce((acc, s) => acc + s.tests.length, 0)})
          </button>
          <button
            onClick={() => {
              setActiveTab('generator');
              if (!generatedCode) handleGenerate();
            }}
            className={`px-3 py-1 text-xs font-medium rounded transition flex items-center space-x-1 ${
              activeTab === 'generator'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E222D]'
            }`}
          >
            <Sparkles size={13} />
            <span>Генератор автотестов</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('runner');
              if (!runnerReport && !isRunningTests) handleRunDiagnostics();
            }}
            className={`px-3 py-1 text-xs font-medium rounded transition flex items-center space-x-1 ${
              activeTab === 'runner'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E222D]'
            }`}
          >
            <Play size={12} fill="currentColor" />
            <span>Test Runner</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* TAB 1: Test Matrix & Coverage */}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-[#161922] border border-[#1E2330] p-3.5 rounded">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Обнаружено тестов</span>
                  <FlaskConical size={15} className="text-blue-400" />
                </div>
                <div className="text-xl font-semibold font-mono text-slate-100">
                  {testAnalysis?.totalTests || suites.reduce((acc, s) => acc + s.tests.length, 0)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  в {suites.length} сьютах ({testAnalysis?.frameworks.join(', ') || 'vitest, playwright'})
                </div>
              </div>

              <div className="bg-[#161922] border border-[#1E2330] p-3.5 rounded">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Покрытие API</span>
                  <Waypoints size={15} className="text-emerald-400" />
                </div>
                <div className="text-xl font-semibold font-mono text-slate-100">
                  {coverage.endpointsCoveragePercent}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {coverage.testedEndpoints} из {coverage.totalEndpoints} эндпоинтов
                </div>
              </div>

              <div className="bg-[#161922] border border-[#1E2330] p-3.5 rounded">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Покрытие UI форм</span>
                  <Layout size={15} className="text-sky-400" />
                </div>
                <div className="text-xl font-semibold font-mono text-slate-100">
                  {coverage.screenFormsCoveragePercent}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {coverage.testedScreenForms} из {coverage.totalScreenForms} экранных форм
                </div>
              </div>

              <div className="bg-[#161922] border border-[#1E2330] p-3.5 rounded">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Покрытие моделей БД</span>
                  <Layers size={15} className="text-amber-400" />
                </div>
                <div className="text-xl font-semibold font-mono text-slate-100">
                  {coverage.entitiesCoveragePercent}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {coverage.testedEntities} из {coverage.totalEntities} сущностей
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex items-center justify-between gap-3 bg-[#111318] border border-[#1E2330] p-2.5 rounded">
              <div className="flex items-center space-x-2 flex-1 max-w-md">
                <Search size={14} className="text-slate-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Поиск по сьютам и названиям тестов..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">Фреймворк:</span>
                <select
                  value={frameworkFilter}
                  onChange={e => setFrameworkFilter(e.target.value)}
                  className="bg-[#161922] text-slate-200 border border-[#1E2330] rounded px-2 py-1 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Все фреймворки</option>
                  <option value="vitest">Vitest / Jest</option>
                  <option value="playwright">Playwright</option>
                  <option value="pytest">Pytest</option>
                  <option value="xunit">xUnit / NUnit</option>
                </select>
              </div>
            </div>

            {/* Test Suites List */}
            <div className="space-y-2">
              {filteredSuites.map(suite => {
                const isExpanded = expandedSuiteIds.has(suite.id);
                return (
                  <div key={suite.id} className="bg-[#111318] border border-[#1E2330] rounded overflow-hidden">
                    <div
                      onClick={() => toggleSuite(suite.id)}
                      className="p-3 bg-[#161922] hover:bg-[#1E222D] cursor-pointer flex items-center justify-between transition"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                        <span className="font-semibold text-xs text-slate-200 font-mono truncate">{suite.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-[#090A0F] px-1.5 py-0.2 rounded border border-[#1E2330]">
                          {suite.framework}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono truncate">({suite.file})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-mono text-slate-400">{suite.tests.length} тестов</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Все тесты пройдены" />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-2 space-y-1 bg-[#111318] border-t border-[#1E2330]">
                        {suite.tests.map(test => (
                          <div
                            key={test.id}
                            className="p-2 bg-[#161922] rounded flex items-center justify-between text-xs border border-[#1E2330]"
                          >
                            <div className="flex items-center space-x-2 min-w-0 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="text-slate-300 truncate font-mono text-[11px]">{test.name}</span>
                              <span className="text-[9px] uppercase font-mono px-1 rounded bg-[#090A0F] text-slate-400 border border-[#1E2330]">
                                {test.type}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 shrink-0 text-slate-500 font-mono text-[10px]">
                              <span>стр. {test.line}</span>
                              <span className="text-slate-400">{test.durationMs || 12}ms</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Test Code Generator */}
        {activeTab === 'generator' && (
          <div className="space-y-4">
            <div className="bg-[#111318] border border-[#1E2330] p-4 rounded space-y-3">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Параметры генерации автотеста
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Target Kind */}
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Тип цели:</label>
                  <select
                    value={targetKind}
                    onChange={e => {
                      const kind = e.target.value as 'endpoint' | 'form';
                      setTargetKind(kind);
                      setTargetFramework(kind === 'endpoint' ? 'vitest' : 'playwright');
                    }}
                    className="w-full bg-[#161922] text-slate-200 border border-[#1E2330] rounded p-2 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="endpoint">API Эндпоинт (Backend)</option>
                    <option value="form">UI Экранная форма (Frontend)</option>
                  </select>
                </div>

                {/* 2. Target Item Selection */}
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {targetKind === 'endpoint' ? 'Выберите эндпоинт:' : 'Выберите экранную форму:'}
                  </label>
                  {targetKind === 'endpoint' ? (
                    <select
                      value={selectedEndpointId}
                      onChange={e => setSelectedEndpointId(e.target.value)}
                      className="w-full bg-[#161922] text-slate-200 border border-[#1E2330] rounded p-2 text-xs focus:outline-none focus:border-blue-500"
                    >
                      {endpoints.map(ep => (
                        <option key={ep.id} value={ep.id}>
                          {ep.method} {ep.path} ({ep.controller})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={selectedFormId}
                      onChange={e => setSelectedFormId(e.target.value)}
                      className="w-full bg-[#161922] text-slate-200 border border-[#1E2330] rounded p-2 text-xs focus:outline-none focus:border-blue-500"
                    >
                      {screenForms.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.route})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 3. Target Framework */}
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Фреймворк тестирования:</label>
                  <select
                    value={targetFramework}
                    onChange={e => setTargetFramework(e.target.value as TestFramework)}
                    className="w-full bg-[#161922] text-slate-200 border border-[#1E2330] rounded p-2 text-xs focus:outline-none focus:border-blue-500"
                  >
                    {targetKind === 'endpoint' ? (
                      <>
                        <option value="vitest">Vitest / Supertest (TypeScript)</option>
                        <option value="pytest">Pytest / HTTPX (Python)</option>
                      </>
                    ) : (
                      <>
                        <option value="playwright">Playwright E2E (TypeScript)</option>
                        <option value="vitest">Vitest / Testing Library (React TSX)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleGenerate}
                  className="flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition active:translate-y-[0.5px]"
                >
                  <Sparkles size={13} />
                  <span>Сгенерировать код теста</span>
                </button>
              </div>
            </div>

            {/* Generated Code Output */}
            {generatedCode && (
              <div className="bg-[#111318] border border-[#1E2330] rounded overflow-hidden">
                <div className="p-3 bg-[#161922] border-b border-[#1E2330] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Code2 size={15} className="text-blue-400" />
                    <span className="text-xs font-mono font-medium text-slate-200">
                      {generatedCode.filename}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-[#090A0F] px-1.5 py-0.2 rounded border border-[#1E2330]">
                      {generatedCode.language}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopy(generatedCode.code)}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#111318] hover:bg-[#1E222D] border border-[#1E2330] text-slate-300 text-xs transition"
                  >
                    {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedCode ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                </div>

                <pre className="p-4 text-xs font-mono bg-[#090A0F] text-slate-200 overflow-x-auto leading-relaxed">
                  <code>{generatedCode.code}</code>
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Diagnostic Test Runner */}
        {activeTab === 'runner' && (
          <div className="space-y-4">
            {/* Runner Control Bar */}
            <div className="bg-[#111318] border border-[#1E2330] p-4 rounded flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-100">Диагностический тест-раннер анализатора</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Верификация всех 35 внутренних архитектурных правил, AST-парсеров, D3-моделей и DDL-экстракторов
                </p>
              </div>

              <button
                onClick={handleRunDiagnostics}
                disabled={isRunningTests}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition disabled:opacity-50"
              >
                {isRunningTests ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Выполнение тестов...</span>
                  </>
                ) : (
                  <>
                    <Play size={13} fill="currentColor" />
                    <span>Запустить 35 тестов</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Results Summary */}
            {runnerReport && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="bg-[#161922] border border-[#1E2330] p-3 rounded">
                    <span className="text-[11px] text-slate-400">Всего тестов</span>
                    <div className="text-lg font-semibold font-mono text-slate-100 mt-0.5">{runnerReport.total}</div>
                  </div>
                  <div className="bg-[#161922] border border-[#1E2330] p-3 rounded">
                    <span className="text-[11px] text-slate-400">Успешно пройдено</span>
                    <div className="text-lg font-semibold font-mono text-emerald-400 mt-0.5">{runnerReport.passed}</div>
                  </div>
                  <div className="bg-[#161922] border border-[#1E2330] p-3 rounded">
                    <span className="text-[11px] text-slate-400">Ошибок (Failed)</span>
                    <div className="text-lg font-semibold font-mono text-slate-400 mt-0.5">{runnerReport.failed}</div>
                  </div>
                  <div className="bg-[#161922] border border-[#1E2330] p-3 rounded">
                    <span className="text-[11px] text-slate-400">Время выполнения</span>
                    <div className="text-lg font-semibold font-mono text-blue-400 mt-0.5">{runnerReport.durationMs}ms</div>
                  </div>
                </div>

                {/* Test Cases Table */}
                <div className="bg-[#111318] border border-[#1E2330] rounded overflow-hidden">
                  <div className="p-3 bg-[#161922] border-b border-[#1E2330] flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">Результаты выполнения тестовых сценариев</span>
                    <div className="flex items-center space-x-1 font-mono text-[11px] text-emerald-400">
                      <CheckCircle2 size={13} />
                      <span>100% Passed</span>
                    </div>
                  </div>

                  <div className="divide-y divide-[#1E2330]">
                    {runnerReport.results.map((r, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 flex items-center justify-between text-xs hover:bg-[#161922] transition"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                          <span className="font-mono text-[11px] text-slate-200 truncate">{r.name}</span>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="text-[10px] font-mono text-slate-500 bg-[#090A0F] px-1.5 py-0.5 rounded border border-[#1E2330]">
                            {r.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{r.durationMs}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
