import React, { useState, useMemo, useEffect } from 'react';
import { ApiEndpoint, DtoProperty, ApiParam } from '../../shared/types';
import {
  Waypoints,
  Search,
  Download,
  Code2,
  Copy,
  Check,
  FileCode,
  Layers,
  Braces,
  FolderKanban,
  Info,
  Route,
  CheckCircle2,
  AlertCircle,
  Tag,
  Hash,
  ExternalLink,
  ChevronRight,
  Filter,
  Server,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ArrowRight,
  Database,
  FileText
} from 'lucide-react';

interface ApiMapViewProps {
  endpoints: ApiEndpoint[];
  onNavigateToSource?: (sourceFile: string, sourceLine?: number) => void;
}

type InspectorTab = 'spec' | 'dto' | 'code';

export const ApiMapView: React.FC<ApiMapViewProps> = ({ endpoints, onNavigateToSource }) => {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [selectedController, setSelectedController] = useState('ALL');
  const [isControllersOpen, setIsControllersOpen] = useState(true);

  // Selected endpoint in 3-column layout
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(() => {
    return endpoints.length > 0 ? endpoints[0].id : '';
  });

  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTab>('spec');
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Group controllers with their endpoint counts
  const controllersWithCounts = useMemo(() => {
    const map = new Map<string, number>();
    endpoints.forEach(ep => {
      const ctrl = ep.controller || 'DefaultController';
      map.set(ctrl, (map.get(ctrl) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [endpoints]);

  // Filter endpoints
  const filteredEndpoints = useMemo(() => {
    const q = search.toLowerCase().trim();
    return endpoints.filter(ep => {
      const matchMethod = methodFilter === 'ALL' || ep.method === methodFilter;
      const matchController = selectedController === 'ALL' || (ep.controller || 'DefaultController') === selectedController;
      const textToSearch = `${ep.method} ${ep.fullPath || ep.path} ${ep.handler || ''} ${ep.operationId || ''} ${ep.controller || ''} ${ep.description || ''}`.toLowerCase();
      const matchSearch = !q || textToSearch.includes(q);
      return matchMethod && matchController && matchSearch;
    });
  }, [endpoints, search, methodFilter, selectedController]);

  // Keep selected endpoint valid if filtered list changes
  useEffect(() => {
    if (filteredEndpoints.length > 0) {
      const exists = filteredEndpoints.some(e => e.id === selectedEndpointId);
      if (!exists) {
        setSelectedEndpointId(filteredEndpoints[0].id);
      }
    }
  }, [filteredEndpoints, selectedEndpointId]);

  const selectedEndpoint = useMemo(() => {
    return endpoints.find(e => e.id === selectedEndpointId) || filteredEndpoints[0] || null;
  }, [endpoints, filteredEndpoints, selectedEndpointId]);

  // Counts by HTTP method
  const methodCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: endpoints.length, GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0 };
    endpoints.forEach(e => {
      if (counts[e.method] !== undefined) {
        counts[e.method]++;
      }
    });
    return counts;
  }, [endpoints]);

  const getMethodTheme = (m: string) => {
    switch (m) {
      case 'GET':
        return {
          badge: 'bg-blue-950/60 text-blue-400 border-blue-800/60',
          activeBg: 'bg-blue-950/30 border-blue-500/60 text-blue-200',
          text: 'text-blue-400'
        };
      case 'POST':
        return {
          badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
          activeBg: 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200',
          text: 'text-emerald-400'
        };
      case 'PUT':
        return {
          badge: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
          activeBg: 'bg-amber-950/30 border-amber-500/60 text-amber-200',
          text: 'text-amber-400'
        };
      case 'DELETE':
        return {
          badge: 'bg-rose-950/60 text-rose-400 border-rose-800/60',
          activeBg: 'bg-rose-950/30 border-rose-500/60 text-rose-200',
          text: 'text-rose-400'
        };
      case 'PATCH':
        return {
          badge: 'bg-purple-950/60 text-purple-400 border-purple-800/60',
          activeBg: 'bg-purple-950/30 border-purple-500/60 text-purple-200',
          text: 'text-purple-400'
        };
      default:
        return {
          badge: 'bg-[#090A0F] text-slate-300 border-[#1E2330]',
          activeBg: 'bg-[#161922] border-[#2E3748] text-slate-200',
          text: 'text-slate-300'
        };
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleCopyJson = (json: any) => {
    navigator.clipboard.writeText(typeof json === 'string' ? json : JSON.stringify(json, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleExportOpenApi = () => {
    const openapi = {
      openapi: '3.0.3',
      info: { title: 'Bitbucket Architecture Export', version: '1.0.0' },
      paths: {} as Record<string, any>
    };

    endpoints.forEach(ep => {
      const p = ep.path || '/';
      if (!openapi.paths[p]) openapi.paths[p] = {};
      openapi.paths[p][ep.method.toLowerCase()] = {
        summary: ep.description || ep.handler,
        operationId: ep.operationId || ep.id,
        tags: [ep.controller || 'default'],
        parameters: ep.requestParams?.map(param => ({
          name: param.name,
          in: param.in,
          required: param.required,
          schema: { type: param.type || 'string' }
        })),
        responses: {
          '200': {
            description: ep.responseDto ? `Returns ${ep.responseDto}` : 'Success',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };
    });

    const blob = new Blob([JSON.stringify(openapi, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openapi-spec.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#090A0F] text-[#F1F5F9] select-none overflow-hidden">
      {/* Top Filter Bar */}
      <div className="p-3 border-b border-[#1E2330] bg-[#111318] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsControllersOpen(prev => !prev)}
            className="p-1.5 rounded hover:bg-[#161922] border border-[#1E2330] text-slate-400 hover:text-slate-200 transition"
            title={isControllersOpen ? 'Скрыть контроллеры' : 'Показать контроллеры'}
          >
            {isControllersOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} className="text-blue-400" />}
          </button>

          {/* Search Box */}
          <div className="relative w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по методам, путям, DTO..."
              className="w-full bg-[#0D0E14] border border-[#1E2330] rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Method Filter Pills */}
          <div className="flex items-center space-x-1 bg-[#161922] p-0.5 rounded border border-[#1E2330] text-[11px] font-mono">
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => {
              const count = methodCounts[m] || 0;
              const isActive = methodFilter === m;
              return (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={`px-2 py-0.5 rounded transition ${
                    isActive ? 'bg-blue-600 text-white font-medium shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{m}</span>
                  <span className="ml-1 opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportOpenApi}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#161922] hover:bg-[#1E222D] border border-[#1E2330] rounded text-xs font-mono text-slate-300 transition"
          >
            <Download size={13} className="text-blue-400" />
            <span>OpenAPI Spec</span>
          </button>
        </div>
      </div>

      {/* 3-Column IDE Master-Detail Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Column 1: Controllers List (240px) */}
        {isControllersOpen && (
          <aside className="w-60 border-r border-[#1E2330] bg-[#111318] flex flex-col shrink-0 overflow-hidden">
            <div className="p-2.5 border-b border-[#1E2330] flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400">
              <span className="flex items-center space-x-1.5">
                <FolderKanban size={13} className="text-blue-400" />
                <span>Контроллеры ({controllersWithCounts.length})</span>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              <button
                onClick={() => setSelectedController('ALL')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono transition text-left ${
                  selectedController === 'ALL'
                    ? 'bg-blue-600/15 border border-blue-500/50 text-blue-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161922] border border-transparent'
                }`}
              >
                <span className="truncate">Все контроллеры</span>
                <span className="text-[10px] opacity-70">{endpoints.length}</span>
              </button>

              {controllersWithCounts.map(c => {
                const isSelected = selectedController === c.name;
                return (
                  <button
                    key={c.name}
                    onClick={() => setSelectedController(c.name)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono transition text-left ${
                      isSelected
                        ? 'bg-blue-600/15 border border-blue-500/50 text-blue-300 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#161922] border border-transparent'
                    }`}
                  >
                    <span className="truncate" title={c.name}>{c.name}</span>
                    <span className="text-[10px] opacity-70 ml-1.5 shrink-0 bg-[#0D0E14] px-1.5 py-0.2 rounded border border-[#1E2330]">
                      {c.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Column 2: Endpoints List (360px) */}
        <section className="w-96 border-r border-[#1E2330] bg-[#0E1015] flex flex-col shrink-0 overflow-hidden">
          <div className="p-2.5 border-b border-[#1E2330] bg-[#111318] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Waypoints size={13} className="text-blue-400" />
              <span>Эндпоинты ({filteredEndpoints.length})</span>
            </span>
            <span className="text-[10px] text-slate-500">
              {selectedController !== 'ALL' ? selectedController : 'Все'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {filteredEndpoints.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                Эндпоинты не найдены
              </div>
            ) : (
              filteredEndpoints.map(ep => {
                const isSelected = selectedEndpoint?.id === ep.id;
                const theme = getMethodTheme(ep.method);
                return (
                  <div
                    key={ep.id}
                    onClick={() => setSelectedEndpointId(ep.id)}
                    className={`p-2.5 rounded cursor-pointer transition border text-xs font-mono ${
                      isSelected
                        ? theme.activeBg
                        : 'bg-[#161922] border-[#1E2330] hover:border-[#2E3748] hover:bg-[#1E222D]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border uppercase shrink-0 ${theme.badge}`}>
                        {ep.method}
                      </span>
                      <span className={`font-semibold truncate text-[11px] ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                        {ep.path}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span className="truncate max-w-[200px]" title={ep.controller}>
                        {ep.controller || 'DefaultController'}
                      </span>
                      {ep.responseDto && (
                        <span className="text-emerald-400 bg-emerald-950/30 px-1.5 py-0.2 rounded border border-emerald-900/30 truncate max-w-[120px]">
                          {ep.responseDto}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Column 3: Permanent Endpoint Inspector (Flex-1) */}
        <main className="flex-1 bg-[#090A0F] flex flex-col overflow-hidden min-w-0">
          {selectedEndpoint ? (
            <>
              {/* Endpoint Header */}
              <div className="p-4 border-b border-[#1E2330] bg-[#111318] flex items-start justify-between gap-3 shrink-0">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border uppercase font-mono ${getMethodTheme(selectedEndpoint.method).badge}`}>
                      {selectedEndpoint.method}
                    </span>
                    <h3 className="text-sm font-semibold font-mono text-slate-100 truncate">
                      {selectedEndpoint.path}
                    </h3>
                    <button
                      onClick={() => handleCopyPath(selectedEndpoint.path)}
                      className="p-1 rounded bg-[#161922] hover:bg-[#1E222D] border border-[#1E2330] text-slate-400 hover:text-slate-200 transition"
                      title="Скопировать маршрут"
                    >
                      {copiedPath ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">
                    {selectedEndpoint.description || selectedEndpoint.handler || 'REST API эндпоинт контроллера'}
                  </p>

                  <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500 pt-0.5">
                    <span>Контроллер: <strong className="text-slate-300">{selectedEndpoint.controller || 'Default'}</strong></span>
                    <span>•</span>
                    <span>Обработчик: <strong className="text-slate-300">{selectedEndpoint.handler || 'anonymous'}</strong></span>
                  </div>
                </div>

                {/* Direct Source Jump */}
                {selectedEndpoint.sourceFile && onNavigateToSource && (
                  <button
                    onClick={() => onNavigateToSource(selectedEndpoint.sourceFile, selectedEndpoint.sourceLine || 1)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#161922] hover:bg-[#1E222D] border border-[#1E2330] hover:border-blue-500/50 rounded text-xs text-blue-400 transition font-mono shrink-0"
                  >
                    <Code2 size={13} />
                    <span>К коду ({selectedEndpoint.sourceLine || 1})</span>
                  </button>
                )}
              </div>

              {/* Inspector Subtabs Header */}
              <div className="px-4 pt-2.5 border-b border-[#1E2330] bg-[#111318] flex items-center space-x-2 font-mono text-xs shrink-0">
                <button
                  onClick={() => setActiveInspectorTab('spec')}
                  className={`pb-2 px-2 border-b-2 transition flex items-center space-x-1.5 ${
                    activeInspectorTab === 'spec'
                      ? 'border-blue-500 text-blue-400 font-medium'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText size={13} />
                  <span>Спецификация & Request Body</span>
                </button>

                <button
                  onClick={() => setActiveInspectorTab('dto')}
                  className={`pb-2 px-2 border-b-2 transition flex items-center space-x-1.5 ${
                    activeInspectorTab === 'dto'
                      ? 'border-blue-500 text-blue-400 font-medium'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database size={13} />
                  <span>Response DTO & Схемы</span>
                  {selectedEndpoint.responseDto && (
                    <span className="text-[9px] bg-blue-950 text-blue-300 px-1 py-0.2 rounded border border-blue-900">
                      {selectedEndpoint.responseDto}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveInspectorTab('code')}
                  className={`pb-2 px-2 border-b-2 transition flex items-center space-x-1.5 ${
                    activeInspectorTab === 'code'
                      ? 'border-blue-500 text-blue-400 font-medium'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode size={13} />
                  <span>Обработчик & AST</span>
                </button>
              </div>

              {/* Inspector Tab Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Tab 1: Spec & Request Body */}
                {activeInspectorTab === 'spec' && (
                  <div className="space-y-4">
                    {/* Parameters Table */}
                    <div className="bg-[#111318] border border-[#1E2330] rounded p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[#1E2330] pb-2">
                        <span className="text-xs font-semibold font-mono text-slate-200 flex items-center space-x-1.5">
                          <Tag size={13} className="text-blue-400" />
                          <span>Параметры запроса ({selectedEndpoint.requestParams?.length || 0})</span>
                        </span>
                      </div>

                      {!selectedEndpoint.requestParams || selectedEndpoint.requestParams.length === 0 ? (
                        <div className="text-xs text-slate-500 font-mono py-2">
                          У метода нет параметров URL / Query
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-mono">
                            <thead>
                              <tr className="border-b border-[#1E2330] text-[10px] text-slate-500 uppercase">
                                <th className="pb-1.5">Имя</th>
                                <th className="pb-1.5">Тип</th>
                                <th className="pb-1.5">In</th>
                                <th className="pb-1.5">Обязательный</th>
                                <th className="pb-1.5">Описание</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1E2330]">
                              {selectedEndpoint.requestParams.map((p: ApiParam, idx: number) => (
                                <tr key={idx} className="hover:bg-[#161922]/50">
                                  <td className="py-2 text-blue-300 font-semibold">{p.name}</td>
                                  <td className="py-2 text-slate-400">{p.type || 'string'}</td>
                                  <td className="py-2">
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#090A0F] border border-[#1E2330] text-slate-300">
                                      {p.in}
                                    </span>
                                  </td>
                                  <td className="py-2">
                                    {p.required ? (
                                      <span className="text-red-400 text-[10px]">Да</span>
                                    ) : (
                                      <span className="text-slate-500 text-[10px]">Нет</span>
                                    )}
                                  </td>
                                  <td className="py-2 text-slate-400">{p.description || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Request Body Specification */}
                    {selectedEndpoint.requestBody && (
                      <div className="bg-[#111318] border border-[#1E2330] rounded p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[#1E2330] pb-2">
                          <span className="text-xs font-semibold font-mono text-slate-200 flex items-center space-x-1.5">
                            <Braces size={13} className="text-emerald-400" />
                            <span>Тело запроса (Request Body): {selectedEndpoint.requestBody.modelName || 'Payload'}</span>
                          </span>
                          <button
                            onClick={() => handleCopyJson(selectedEndpoint.requestBody?.exampleJson || selectedEndpoint.requestBody)}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-mono"
                          >
                            <Copy size={12} />
                            <span>JSON</span>
                          </button>
                        </div>

                        {selectedEndpoint.requestBody.properties && selectedEndpoint.requestBody.properties.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs font-mono">
                              <thead>
                                <tr className="border-b border-[#1E2330] text-[10px] text-slate-500 uppercase">
                                  <th className="pb-1.5">Поле</th>
                                  <th className="pb-1.5">Тип</th>
                                  <th className="pb-1.5">Обязательное</th>
                                  <th className="pb-1.5">Описание</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#1E2330]">
                                {selectedEndpoint.requestBody.properties.map((prop: DtoProperty, idx: number) => (
                                  <tr key={idx} className="hover:bg-[#161922]/50">
                                    <td className="py-2 text-emerald-300 font-semibold">{prop.name}</td>
                                    <td className="py-2 text-slate-400">{prop.type}</td>
                                    <td className="py-2">
                                      {prop.required ? (
                                        <span className="text-red-400 text-[10px]">Да</span>
                                      ) : (
                                        <span className="text-slate-500 text-[10px]">Нет</span>
                                      )}
                                    </td>
                                    <td className="py-2 text-slate-400">{prop.description || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {selectedEndpoint.requestBody.exampleJson && (
                          <div className="pt-2 border-t border-[#1E2330]">
                            <div className="text-[10px] text-slate-500 font-mono mb-1">Пример полезной нагрузки:</div>
                            <pre className="p-2.5 rounded bg-[#0D0E14] border border-[#1E2330] text-xs font-mono text-emerald-300 overflow-x-auto">
                              {JSON.stringify(selectedEndpoint.requestBody.exampleJson, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Response DTO & Schemas */}
                {activeInspectorTab === 'dto' && (
                  <div className="space-y-4">
                    <div className="bg-[#111318] border border-[#1E2330] rounded p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[#1E2330] pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold font-mono text-slate-200">
                            Спецификация ответа (200 OK)
                          </span>
                          {selectedEndpoint.responseDto && (
                            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
                              {selectedEndpoint.responseDto}
                            </span>
                          )}
                        </div>
                        {selectedEndpoint.responseBody?.properties && (
                          <button
                            onClick={() => handleCopyJson(selectedEndpoint.responseBody?.properties)}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-mono"
                          >
                            <Copy size={12} />
                            <span>JSON DTO</span>
                          </button>
                        )}
                      </div>

                      {selectedEndpoint.responseBody?.properties && selectedEndpoint.responseBody.properties.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-mono">
                            <thead>
                              <tr className="border-b border-[#1E2330] text-[10px] text-slate-500 uppercase">
                                <th className="pb-1.5">Поле DTO</th>
                                <th className="pb-1.5">Тип данных</th>
                                <th className="pb-1.5">Обязательное</th>
                                <th className="pb-1.5">Описание</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1E2330]">
                              {selectedEndpoint.responseBody.properties.map((p: DtoProperty, idx: number) => (
                                <tr key={idx} className="hover:bg-[#161922]/50">
                                  <td className="py-2 text-blue-300 font-semibold">{p.name}</td>
                                  <td className="py-2 text-slate-400">{p.type}</td>
                                  <td className="py-2">
                                    {p.required ? (
                                      <span className="text-red-400 text-[10px]">Да</span>
                                    ) : (
                                      <span className="text-slate-500 text-[10px]">Нет</span>
                                    )}
                                  </td>
                                  <td className="py-2 text-slate-400">{p.description || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-3 bg-[#0D0E14] border border-[#1E2330] rounded text-xs font-mono text-slate-400">
                          {selectedEndpoint.responseDto
                            ? `Модель ответа: ${selectedEndpoint.responseDto}`
                            : 'Возвращается стандартный JSON или примитивный тип'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 3: Code & AST */}
                {activeInspectorTab === 'code' && (
                  <div className="space-y-4">
                    <div className="bg-[#111318] border border-[#1E2330] rounded p-3.5 space-y-3 font-mono">
                      <div className="flex items-center justify-between border-b border-[#1E2330] pb-2">
                        <span className="text-xs font-semibold text-slate-200">
                          Файл контроллера & Метод
                        </span>
                        {selectedEndpoint.sourceFile && onNavigateToSource && (
                          <button
                            onClick={() => onNavigateToSource(selectedEndpoint.sourceFile, selectedEndpoint.sourceLine || 1)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition flex items-center space-x-1"
                          >
                            <span>Открыть в редакторе</span>
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500 w-28">Путь к файлу:</span>
                          <span className="text-slate-200 bg-[#0D0E14] px-2 py-0.5 rounded border border-[#1E2330] truncate">
                            {selectedEndpoint.sourceFile || 'src/controllers/' + (selectedEndpoint.controller || 'index') + '.ts'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500 w-28">Строка кода:</span>
                          <span className="text-blue-400 bg-[#0D0E14] px-2 py-0.5 rounded border border-[#1E2330]">
                            {selectedEndpoint.sourceLine || 1}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500 w-28">Сигнатура:</span>
                          <span className="text-slate-300 bg-[#0D0E14] px-2 py-0.5 rounded border border-[#1E2330]">
                            {selectedEndpoint.handler || 'actionHandler'}()
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Waypoints size={32} className="text-slate-600 mb-2" />
              <div className="text-xs text-slate-400 font-mono">Выберите эндпоинт из списка для инспекции</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
