import React, { useState, useMemo, useEffect } from 'react';
import { ApiEndpoint, DtoProperty } from '../../shared/types';
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
  ChevronDown,
  Filter,
  Server,
  ChevronsUpDown,
  ChevronsDown,
  ChevronsUp,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Sparkles,
  ArrowRight,
  Layers3
} from 'lucide-react';

interface ApiMapViewProps {
  endpoints: ApiEndpoint[];
  onNavigateToSource?: (sourceFile: string, sourceLine?: number) => void;
}

interface ModalDtoData {
  title: string;
  statusCode?: number;
  description?: string;
  modelName?: string;
  isArray?: boolean;
  isPrimitive?: boolean;
  itemType?: string;
  properties?: DtoProperty[];
  exampleJson?: any;
  schema?: string;
}

export const ApiMapView: React.FC<ApiMapViewProps> = ({ endpoints, onNavigateToSource }) => {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [selectedController, setSelectedController] = useState('ALL');
  
  // Track set of expanded method IDs for inline accordion spoilers
  const [expandedEndpointIds, setExpandedEndpointIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (endpoints.length > 0) {
      initial.add(endpoints[0].id);
    }
    return initial;
  });

  // Track collapsed controller sidebar on the left
  const [isControllersOpen, setIsControllersOpen] = useState(true);

  const [copiedPathId, setCopiedPathId] = useState<string | null>(null);
  const [copiedJsonId, setCopiedJsonId] = useState<string | null>(null);

  // Response DTO Modal State
  const [activeDtoModal, setActiveDtoModal] = useState<ModalDtoData | null>(null);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDtoModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Group controllers with their endpoint counts ONLY (no nested method lists)
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

  // Counts by HTTP method
  const getMethodCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: endpoints.length, GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0 };
    endpoints.forEach(e => {
      if (counts[e.method] !== undefined) {
        counts[e.method]++;
      }
    });
    return counts;
  }, [endpoints]);

  const toggleEndpointExpand = (id: string) => {
    setExpandedEndpointIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allIds = new Set(filteredEndpoints.map(e => e.id));
    setExpandedEndpointIds(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedEndpointIds(new Set());
  };

  const getMethodTheme = (m: string) => {
    switch (m) {
      case 'GET':
        return {
          badge: 'bg-blue-950/60 text-blue-400 border-blue-800/60',
          border: 'border-[#1E2330] hover:border-blue-500/60',
          activeBg: 'bg-[#111318] border-blue-500/80 shadow-md',
          headerBg: 'bg-[#161922] hover:bg-[#1E222D]',
          text: 'text-blue-400'
        };
      case 'POST':
        return {
          badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
          border: 'border-[#1E2330] hover:border-emerald-500/60',
          activeBg: 'bg-[#111318] border-emerald-500/80 shadow-md',
          headerBg: 'bg-[#161922] hover:bg-[#1E222D]',
          text: 'text-emerald-400'
        };
      case 'PUT':
        return {
          badge: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
          border: 'border-[#1E2330] hover:border-amber-500/60',
          activeBg: 'bg-[#111318] border-amber-500/80 shadow-md',
          headerBg: 'bg-[#161922] hover:bg-[#1E222D]',
          text: 'text-amber-400'
        };
      case 'DELETE':
        return {
          badge: 'bg-rose-950/60 text-rose-400 border-rose-800/60',
          border: 'border-[#1E2330] hover:border-rose-500/60',
          activeBg: 'bg-[#111318] border-rose-500/80 shadow-md',
          headerBg: 'bg-[#161922] hover:bg-[#1E222D]',
          text: 'text-rose-400'
        };
      case 'PATCH':
        return {
          badge: 'bg-purple-950/60 text-purple-400 border-purple-800/60',
          border: 'border-[#1E2330] hover:border-purple-500/60',
          activeBg: 'bg-[#111318] border-purple-500/80 shadow-md',
          headerBg: 'bg-[#161922] hover:bg-[#1E222D]',
          text: 'text-purple-400'
        };
      default:
        return {
          badge: 'bg-[#090A0F] text-slate-300 border-[#1E2330]',
          border: 'border-[#1E2330] hover:border-[#2E3748]',
          activeBg: 'bg-[#111318] border-[#2E3748]',
          headerBg: 'bg-[#161922] hover:bg-[#1E222D]',
          text: 'text-slate-300'
        };
    }
  };

  const handleCopy = (text: string, type: string, id: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'path') {
      setCopiedPathId(id);
      setTimeout(() => setCopiedPathId(null), 2000);
    } else {
      setCopiedJsonId(id);
      setTimeout(() => setCopiedJsonId(null), 2000);
    }
  };

  const openResponseModal = (ep: ApiEndpoint, resp?: any) => {
    const rawDto = resp?.modelName || ep.responseDto || ep.responseBody?.modelName || 'ApiResponseDTO';
    const isArr = resp?.isArray !== undefined
      ? resp.isArray
      : (rawDto.includes('[]') || rawDto.startsWith('List') || Boolean(ep.responseBody?.isArray));
    const itemModel = resp?.itemType || ep.responseBody?.itemType || rawDto.replace(/\[\]|List<|>/g, '');
    const isPrim = resp?.isPrimitive !== undefined
      ? resp.isPrimitive
      : (['int', 'integer', 'long', 'string', 'boolean', 'float', 'double', 'uuid', 'number'].includes(itemModel.toLowerCase()) || Boolean(ep.responseBody?.isPrimitive));
    
    const props = resp?.properties || ep.responseBody?.properties || (isPrim ? [
      { name: 'value', type: itemModel, description: `Значение типа ${itemModel}`, required: true, example: isPrim && itemModel.includes('int') ? 42 : isPrim && itemModel.includes('bool') ? true : 'example' }
    ] : [
      { name: 'id', type: 'UUID', description: 'Уникальный идентификатор сущности', required: true, example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
      { name: 'name', type: 'string', description: 'Наименование / заголовок', required: true, example: `${itemModel} sample` },
      { name: 'createdAt', type: 'DateTime', description: 'Дата создания', required: false, example: new Date().toISOString() }
    ]);

    const sampleJson = resp?.exampleJson || ep.responseBody?.exampleJson || (isArr ? (isPrim ? [42, 100] : [{ id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', name: `${itemModel} 1` }]) : (isPrim ? 42 : { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', name: `${itemModel} sample` }));

    setActiveDtoModal({
      title: rawDto,
      modelName: rawDto,
      statusCode: resp?.statusCode || 200,
      description: resp?.description || (resp?.statusCode === 200 ? 'Успешный ответ сервера' : 'Схема ответа API'),
      isArray: isArr,
      isPrimitive: isPrim,
      itemType: itemModel,
      properties: props,
      exampleJson: sampleJson,
      schema: resp?.schema || ep.responseSchema
    });
  };

  const exportOpenApi = () => {
    const openApiDoc = {
      openapi: '3.0.3',
      info: {
        title: 'Bitbucket Repo Extracted API',
        version: '1.0.0',
        description: 'Сгенерировано автоматически модулем архитектурного анализа Bitbucket'
      },
      paths: {} as Record<string, any>
    };

    endpoints.forEach(ep => {
      const fullPath = ep.fullPath || ep.path;
      if (!openApiDoc.paths[fullPath]) {
        openApiDoc.paths[fullPath] = {};
      }

      openApiDoc.paths[fullPath][ep.method.toLowerCase()] = {
        summary: ep.description || `${ep.method} ${fullPath}`,
        operationId: ep.operationId || ep.handler,
        tags: [ep.controller || 'Default'],
        parameters: ep.requestParams?.map(p => ({
          name: p.name,
          in: p.in || 'query',
          required: p.required || false,
          schema: { type: p.type.toLowerCase() }
        })) || [],
        responses: {
          '200': {
            description: 'Success',
            content: (ep.responseDto || ep.responseBody) ? {
              'application/json': {
                schema: { $ref: `#/components/schemas/${ep.responseDto || ep.responseBody?.modelName}` }
              }
            } : undefined
          }
        }
      };
    });

    const blob = new Blob([JSON.stringify(openApiDoc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openapi-spec.json';
    a.click();
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#090A0F] text-[#F1F5F9] relative select-none">
      {/* ================= LEFT CONTROLLERS PANEL (COLLAPSIBLE) ================= */}
      {isControllersOpen ? (
        <div className="w-56 shrink-0 border-r border-[#1E2330] flex flex-col h-full bg-[#111318] transition-all duration-150 ease-in-out select-none">
          <div className="p-2.5 border-b border-[#1E2330] flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-1.5 min-w-0">
              <Server size={13} className="text-blue-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-200 truncate uppercase tracking-wider">Контроллеры</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[10px] font-mono text-blue-400 bg-[#090A0F] px-1.5 py-0.2 rounded border border-[#1E2330]">
                {controllersWithCounts.length}
              </span>
              <button
                onClick={() => setIsControllersOpen(false)}
                className="p-1 hover:bg-[#1E222D] text-slate-400 hover:text-slate-200 rounded transition"
                title="Свернуть панель контроллеров"
              >
                <PanelLeftClose size={13} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {/* ALL Controllers Filter Button */}
            <button
              onClick={() => setSelectedController('ALL')}
              className={`w-full flex items-center justify-between p-2 rounded text-xs transition border ${
                selectedController === 'ALL'
                  ? 'bg-blue-600/15 text-blue-200 border-blue-500/70 shadow-sm font-semibold'
                  : 'bg-[#161922] text-slate-300 border-[#1E2330] hover:bg-[#1E222D] hover:text-white'
              }`}
            >
              <span className="truncate text-[11px]">Все контроллеры</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#090A0F] text-slate-400 border border-[#1E2330] shrink-0 ml-1">
                {endpoints.length}
              </span>
            </button>

            {/* Controllers list */}
            {controllersWithCounts.map(c => {
              const isSelected = selectedController === c.name;
              return (
                <button
                  key={c.name}
                  onClick={() => setSelectedController(c.name)}
                  className={`w-full flex items-center justify-between p-2 rounded text-xs transition border ${
                    isSelected
                      ? 'bg-blue-600/15 text-blue-200 border-blue-500/70 shadow-sm font-semibold'
                      : 'bg-[#161922] text-slate-300 border-[#1E2330] hover:bg-[#1E222D] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 min-w-0 truncate">
                    <FolderKanban size={12} className={isSelected ? 'text-blue-400' : 'text-slate-500'} />
                    <span className="truncate font-mono text-[11px]">{c.name}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border shrink-0 ml-1.5 ${
                    isSelected
                      ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                      : 'bg-[#090A0F] text-slate-400 border-[#1E2330]'
                  }`}>
                    {c.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Collapsed Icon Bar for Controllers */
        <div className="w-10 shrink-0 border-r border-[#1E2330] bg-[#111318] flex flex-col items-center py-2.5 space-y-2 select-none">
          <button
            onClick={() => setIsControllersOpen(true)}
            className="p-1.5 rounded bg-[#161922] hover:bg-[#1E222D] text-blue-400 border border-[#1E2330] transition"
            title="Развернуть панель контроллеров"
          >
            <PanelLeftOpen size={14} />
          </button>
          <div className="w-4 h-[1px] bg-[#1E2330] my-1" />
          <span className="text-[10px] font-mono text-slate-500 [writing-mode:vertical-lr] tracking-widest uppercase rotate-180">
            Контроллеры ({controllersWithCounts.length})
          </span>
        </div>
      )}

      {/* ================= MAIN SWAGGER METHODS VIEW (INLINE SPOILERS / ACCORDION) ================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#090A0F]">
        {/* Top Swagger Toolbar */}
        <div className="p-3 border-b border-[#1E2330] bg-[#111318] flex flex-wrap items-center justify-between gap-2.5 z-10 shrink-0">
          {/* Method Filter Pills */}
          <div className="flex flex-wrap items-center gap-1">
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => {
              const isActive = methodFilter === m;
              return (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition flex items-center space-x-1 border ${
                    isActive
                      ? m === 'ALL'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : m === 'GET'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : m === 'POST'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : m === 'PUT'
                        ? 'bg-amber-600 text-white border-amber-500'
                        : m === 'DELETE'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-purple-600 text-white border-purple-500'
                      : 'bg-[#161922] text-slate-400 hover:text-slate-200 border-[#1E2330]'
                  }`}
                >
                  <span>{m}</span>
                  <span className={`text-[9px] px-1 rounded ${isActive ? 'bg-black/30 text-white' : 'bg-[#090A0F] text-slate-400'}`}>
                    {getMethodCounts[m] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bulk Spoilers Controls + Search + Export */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Expand / Collapse All Spoilers */}
            <div className="flex items-center space-x-1 bg-[#161922] p-0.5 rounded border border-[#1E2330] text-xs">
              <button
                onClick={handleExpandAll}
                className="px-2 py-0.5 hover:bg-[#1E222D] text-slate-300 rounded text-[11px] flex items-center space-x-1 transition"
                title="Развернуть все методы"
              >
                <ChevronsDown size={12} className="text-blue-400" />
                <span>Развернуть все</span>
              </button>
              <div className="w-[1px] h-3 bg-[#1E2330]" />
              <button
                onClick={handleCollapseAll}
                className="px-2 py-0.5 hover:bg-[#1E222D] text-slate-300 rounded text-[11px] flex items-center space-x-1 transition"
                title="Свернуть все методы"
              >
                <ChevronsUp size={12} className="text-slate-400" />
                <span>Свернуть все</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-52">
              <Search size={11} className="absolute left-2.5 top-1.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск эндпоинта..."
                className="w-full bg-[#0D0E14] border border-[#1E2330] rounded pl-7 pr-2.5 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* OpenAPI Export */}
            <button
              onClick={exportOpenApi}
              className="flex items-center space-x-1 px-2.5 py-1 bg-[#161922] hover:bg-[#1E222D] border border-[#1E2330] text-slate-300 rounded text-[11px] transition shrink-0"
              title="Экспорт OpenAPI 3.0 спецификации в JSON"
            >
              <Download size={12} />
              <span>OpenAPI JSON</span>
            </button>
          </div>
        </div>

        {/* Selected Controller Filter Pill Bar (if filtered) */}
        {selectedController !== 'ALL' && (
          <div className="px-4 py-1.5 bg-[#111318] border-b border-[#1E2330] flex items-center justify-between text-xs font-mono shrink-0">
            <div className="flex items-center space-x-2 text-blue-300">
              <FolderKanban size={13} />
              <span>Фильтр по контроллеру: <strong className="text-slate-200">{selectedController}</strong></span>
              <span className="text-[10px] text-slate-400">({filteredEndpoints.length} методов)</span>
            </div>
            <button
              onClick={() => setSelectedController('ALL')}
              className="text-[10px] text-blue-400 hover:text-blue-200 underline"
            >
              Сбросить фильтр
            </button>
          </div>
        )}

        {/* ================= LIST OF SWAGGER METHOD ACCORDION SPOILERS ================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredEndpoints.length > 0 ? (
            filteredEndpoints.map(ep => {
              const isExpanded = expandedEndpointIds.has(ep.id);
              const theme = getMethodTheme(ep.method);
              const displayPath = ep.fullPath || ep.path;
              const handlerName = ep.handler || ep.operationId || 'handler';
              const resolvedResponseDto = ep.responseDto || ep.responseBody?.modelName || 'ApiResponseDTO';

              return (
                <div
                  key={ep.id}
                  className={`rounded border transition-all duration-150 overflow-hidden ${
                    isExpanded
                      ? `${theme.activeBg} ring-1 ring-blue-500/40`
                      : `bg-[#111318] ${theme.border}`
                  }`}
                >
                  {/* Method Card Header */}
                  <div
                    onClick={() => toggleEndpointExpand(ep.id)}
                    className={`p-2.5 cursor-pointer flex items-center justify-between gap-2.5 transition select-none ${theme.headerBg}`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 truncate">
                      <div className={`p-0.5 rounded transition-transform duration-150 shrink-0 ${isExpanded ? 'rotate-90 text-blue-400' : 'text-slate-500'}`}>
                        <ChevronRight size={14} />
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border uppercase shrink-0 ${theme.badge}`}>
                        {ep.method}
                      </span>

                      <span className="font-mono text-xs font-semibold text-slate-100 truncate">
                        {displayPath}
                      </span>

                      <span className="px-1.5 py-0.2 rounded bg-[#090A0F] border border-[#1E2330] text-[10px] font-mono text-blue-400 shrink-0">
                        {handlerName}()
                      </span>

                      {ep.description && (
                        <span className="text-[11px] text-slate-400 truncate hidden lg:inline font-sans">
                          — {ep.description}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-300 bg-[#090A0F] px-1.5 py-0.5 rounded border border-[#1E2330]">
                        {ep.controller}
                      </span>

                      {ep.requestParams && ep.requestParams.length > 0 && (
                        <span className="text-[9px] font-mono text-slate-400 bg-[#090A0F] px-1.5 py-0.5 rounded border border-[#1E2330]">
                          {ep.requestParams.length} param
                        </span>
                      )}

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleCopy(displayPath, 'path', ep.id);
                        }}
                        className="p-1 hover:bg-[#1E222D] text-slate-400 hover:text-slate-200 rounded transition"
                        title="Скопировать маршрут"
                      >
                        {copiedPathId === ep.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Spoiler Content */}
                  {isExpanded && (
                    <div className="p-4 border-t border-[#1E2330] bg-[#111318] space-y-4">
                      {/* Description & Operation ID info */}
                      <div className="p-2.5 bg-[#161922] rounded border border-[#1E2330] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <Info size={13} className="text-blue-400 shrink-0" />
                          <span className="text-slate-300 font-sans">{ep.description || 'Эндпоинт REST API контроллера'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                          <span>Базовый путь: <strong className="text-slate-200">{ep.controllerBasePath || '/'}</strong></span>
                          <span>•</span>
                          <span>Операция: <strong className="text-blue-400">{handlerName}</strong></span>
                        </div>
                      </div>

                      {/* 2-Column Breakdown */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {/* Left Column */}
                        <div className="space-y-3">
                          {/* Parameters Table */}
                          <div className="bg-[#161922] p-3.5 rounded border border-[#1E2330] space-y-2.5">
                            <div className="flex items-center justify-between border-b border-[#1E2330] pb-2">
                              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200 uppercase tracking-wide">
                                <Filter size={13} className="text-blue-400" />
                                <span>Параметры запроса (Path / Query / Header)</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 bg-[#090A0F] px-1.5 py-0.2 rounded border border-[#1E2330]">
                                {ep.requestParams?.length || 0} параметров
                              </span>
                            </div>

                            {ep.requestParams && ep.requestParams.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs font-mono">
                                  <thead className="bg-[#090A0F] text-slate-400 text-[10px] uppercase border-b border-[#1E2330]">
                                    <tr>
                                      <th className="p-2">Имя</th>
                                      <th className="p-2">Тип</th>
                                      <th className="p-2">Расположение</th>
                                      <th className="p-2">Обязателен</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#1E2330]">
                                    {ep.requestParams.map((param, idx) => (
                                      <tr key={idx} className="hover:bg-[#1E222D]/40">
                                        <td className="p-2 font-semibold text-slate-200">{param.name}</td>
                                        <td className="p-2 text-blue-300">{param.type}</td>
                                        <td className="p-2">
                                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#090A0F] border border-[#1E2330] text-blue-300">
                                            {param.in || 'query'}
                                          </span>
                                        </td>
                                        <td className="p-2">
                                          {param.required ? (
                                            <span className="text-rose-400 font-bold text-[10px]">REQUIRED</span>
                                          ) : (
                                            <span className="text-slate-500 text-[10px]">optional</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="p-3 text-center text-slate-500 text-xs font-mono">
                                У данного эндпоинта нет явных Path/Query параметров.
                              </div>
                            )}
                          </div>

                          {/* Request Body DTO Block */}
                          <div className="bg-[#161922] p-3.5 rounded border border-[#1E2330] space-y-2.5">
                            <div className="flex items-center justify-between border-b border-[#1E2330] pb-2">
                              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200 uppercase tracking-wide">
                                <Braces size={13} className="text-emerald-400" />
                                <span>Тело запроса (Request Body DTO)</span>
                              </div>
                              {(ep.requestBody?.exampleJson || ep.requestExample) && (
                                <button
                                  onClick={() => handleCopy(JSON.stringify(ep.requestBody?.exampleJson || JSON.parse(ep.requestExample || '{}'), null, 2), 'json', ep.id)}
                                  className="flex items-center space-x-1 px-2 py-0.5 bg-[#090A0F] hover:bg-[#1E222D] text-slate-300 rounded text-[10px] border border-[#1E2330] transition"
                                >
                                  {copiedJsonId === ep.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                  <span>{copiedJsonId === ep.id ? 'Скопировано' : 'Copy JSON'}</span>
                                </button>
                              )}
                            </div>

                            {ep.requestBody || ep.requestSchema || ep.requestExample ? (
                              <div className="space-y-2.5 text-xs font-mono">
                                <div className="p-2 bg-[#0D0E14] rounded border border-[#1E2330] flex items-center justify-between">
                                  <span className="text-slate-400 text-[11px]">Модель запроса:</span>
                                  <span className="text-emerald-400 font-bold text-xs bg-emerald-950/60 border border-emerald-900/60 px-2 py-0.5 rounded">
                                    {ep.requestBody?.modelName || 'RequestDTO'}
                                  </span>
                                </div>

                                {/* Table of Request Body Fields */}
                                {ep.requestBody?.properties && ep.requestBody.properties.length > 0 && (
                                  <div className="overflow-x-auto border border-[#1E2330] rounded bg-[#0D0E14]">
                                    <table className="w-full text-left text-xs font-mono">
                                      <thead className="bg-[#090A0F] text-slate-400 text-[10px] uppercase border-b border-[#1E2330]">
                                        <tr>
                                          <th className="p-1.5">Поле</th>
                                          <th className="p-1.5">Тип</th>
                                          <th className="p-1.5">Описание</th>
                                          <th className="p-1.5">Обязательность</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#1E2330] text-[11px]">
                                        {ep.requestBody.properties.map((prop, pIdx) => (
                                          <tr key={pIdx} className="hover:bg-[#1E222D]/30">
                                            <td className="p-1.5 font-semibold text-emerald-300">{prop.name}</td>
                                            <td className="p-1.5 text-blue-300">{prop.type}</td>
                                            <td className="p-1.5 text-slate-400">{prop.description || '—'}</td>
                                            <td className="p-1.5">
                                              {prop.required ? (
                                                <span className="text-rose-400 text-[9px] font-bold">REQUIRED</span>
                                              ) : (
                                                <span className="text-slate-500 text-[9px]">optional</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Formatted JSON Sample */}
                                <pre className="p-3 bg-[#0D0E14] rounded text-[11px] font-mono text-slate-300 border border-[#1E2330] overflow-x-auto max-h-[160px] leading-relaxed">
                                  {JSON.stringify(ep.requestBody?.exampleJson || (ep.requestExample ? JSON.parse(ep.requestExample) : { [ep.requestBody?.modelName || 'request']: 'data' }), null, 2)}
                                </pre>
                              </div>
                            ) : (
                              <div className="p-3 text-center text-slate-500 text-xs font-mono">
                                Тело запроса не требуется (GET / No Body).
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Column: Responses & Source Code */}
                        <div className="space-y-3">
                          {/* Response Codes and Models */}
                          <div className="bg-[#161922] p-3.5 rounded border border-[#1E2330] space-y-2.5">
                            <div className="flex items-center justify-between border-b border-[#1E2330] pb-2">
                              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200 uppercase tracking-wide">
                                <CheckCircle2 size={13} className="text-emerald-400" />
                                <span>Схема ответов (Responses)</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 bg-[#090A0F] px-1.5 py-0.2 rounded border border-[#1E2330]">
                                {ep.responses?.length || ep.responseStatuses?.length || 1} статусов
                              </span>
                            </div>

                            {ep.responses && ep.responses.length > 0 ? (
                              <div className="space-y-2">
                                {ep.responses.map((resp, idx) => {
                                  const respDtoName = resp.modelName || (resp.statusCode >= 200 && resp.statusCode < 300 ? resolvedResponseDto : undefined);

                                  return (
                                    <div key={idx} className="p-2.5 bg-[#0D0E14] rounded border border-[#1E2330] space-y-1.5">
                                      <div className="flex items-center justify-between text-xs font-mono">
                                        <div className="flex items-center space-x-2">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            resp.statusCode >= 200 && resp.statusCode < 300
                                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60'
                                              : resp.statusCode >= 400 && resp.statusCode < 500
                                              ? 'bg-amber-950/60 text-amber-400 border border-amber-900/60'
                                              : 'bg-rose-950/60 text-rose-400 border border-rose-900/60'
                                          }`}>
                                            {resp.statusCode}
                                          </span>
                                          <span className="font-semibold text-slate-200">{resp.description}</span>
                                        </div>

                                        {respDtoName && (
                                          <button
                                            onClick={() => openResponseModal(ep, resp)}
                                            className="px-2 py-0.5 rounded bg-[#161922] hover:bg-[#1E222D] border border-[#1E2330] text-blue-300 text-[10px] font-bold flex items-center space-x-1 transition shadow-sm group"
                                            title="Кликните для просмотра детальной структуры DTO ответа"
                                          >
                                            <Braces size={11} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                                            <span className="underline underline-offset-2">{respDtoName}</span>
                                          </button>
                                        )}
                                      </div>

                                      {resp.exampleJson && (
                                        <pre className="p-2 bg-[#111318] rounded text-[10px] font-mono text-slate-300 overflow-x-auto max-h-[100px] border border-[#1E2330]">
                                          {JSON.stringify(resp.exampleJson, null, 2)}
                                        </pre>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-3 bg-[#0D0E14] rounded border border-[#1E2330] space-y-2 text-xs font-mono">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2 text-emerald-400">
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-900/60 font-bold text-[10px]">200 OK</span>
                                    <span className="text-slate-300">Успешное выполнение</span>
                                  </div>
                                  
                                  <button
                                    onClick={() => openResponseModal(ep)}
                                    className="px-2 py-0.5 rounded bg-[#161922] hover:bg-[#1E222D] border border-[#1E2330] text-blue-300 text-[10px] font-bold flex items-center space-x-1 transition shadow-sm group"
                                    title="Кликните для просмотра детальной структуры DTO ответа"
                                  >
                                    <Braces size={11} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                                    <span className="underline underline-offset-2">{resolvedResponseDto}</span>
                                  </button>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Возвращает DTO модель: <strong className="text-blue-300">{resolvedResponseDto}</strong>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Source Code Context */}
                          <div
                            onClick={() => onNavigateToSource?.(ep.sourceFile, ep.sourceLine)}
                            className="bg-[#161922] p-3.5 rounded border border-[#1E2330] space-y-2.5 cursor-pointer hover:border-blue-500/80 transition group"
                            title={`Перейти к исходному коду в дереве проекта (${ep.sourceFile}:${ep.sourceLine})`}
                          >
                            <div className="flex items-center justify-between border-b border-[#1E2330] pb-2">
                              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200 uppercase tracking-wide group-hover:text-blue-300 transition">
                                <FileCode size={13} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                <span>Исходный код метода</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[180px]">
                                  {ep.sourceFile.split('/').pop()}:{ep.sourceLine}
                                </span>
                                <span className="flex items-center space-x-1 text-[10px] font-mono text-blue-400 bg-[#090A0F] px-2 py-0.5 rounded border border-[#1E2330] group-hover:bg-blue-600 group-hover:text-white transition">
                                  <span>Дерево</span>
                                  <ExternalLink size={10} />
                                </span>
                              </div>
                            </div>

                            <pre className="p-3 bg-[#0D0E14] rounded text-[11px] font-mono text-slate-300 border border-[#1E2330] overflow-x-auto max-h-[160px] leading-relaxed group-hover:border-blue-900 transition">
                              {ep.codeSnippet || `// ${ep.sourceFile}:${ep.sourceLine}\n${ep.method} ${ep.fullPath || ep.path}\n${ep.handler || ep.operationId}()`}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs font-mono bg-[#111318] rounded border border-[#1E2330]">
              Эндпоинты по выбранным фильтрам не найдены.
            </div>
          )}
        </div>
      </div>

      {/* ================= RESPONSE DTO MODAL DIALOG ================= */}
      {activeDtoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className="w-full max-w-3xl max-h-[85vh] bg-[#111318] border border-[#1E2330] rounded shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-[#1E2330] bg-[#161922] flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2 rounded bg-[#090A0F] border border-[#1E2330] text-blue-400">
                  <Braces size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
                      Структура DTO Ответа
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-900/60">
                      {activeDtoModal.statusCode || 200} OK
                    </span>
                    <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-[#090A0F] text-slate-300 border border-[#1E2330]">
                      {activeDtoModal.isPrimitive
                        ? 'Скалярное значение (Scalar)'
                        : activeDtoModal.isArray
                        ? `Массив объектов (${activeDtoModal.itemType || 'Item'}[])`
                        : 'Объектная модель (Object)'}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100 font-mono truncate mt-0.5">
                    {activeDtoModal.modelName || activeDtoModal.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setActiveDtoModal(null)}
                className="p-1.5 hover:bg-[#1E222D] text-slate-400 hover:text-white rounded transition"
                title="Закрыть (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs font-mono">
              <div className="p-3 bg-[#161922] rounded border border-[#1E2330] flex items-start space-x-2.5 font-sans">
                <Info size={15} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="text-slate-300 space-y-1 text-xs">
                  <div>{activeDtoModal.description}</div>
                  {activeDtoModal.isPrimitive && (
                    <div className="text-blue-300 font-mono text-[11px]">
                      Примечание: Эндпоинт возвращает единичное скалярное значение типа <strong className="text-blue-200">{activeDtoModal.itemType || activeDtoModal.modelName}</strong>.
                    </div>
                  )}
                  {activeDtoModal.isArray && (
                    <div className="text-blue-300 font-mono text-[11px]">
                      Примечание: Возвращается коллекция элементов в формате массива JSON <strong className="text-blue-200">{activeDtoModal.itemType || 'Item'}[]</strong>.
                    </div>
                  )}
                </div>
              </div>

              {/* Table of Fields */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-200 font-semibold uppercase text-[11px] tracking-wide">
                  <div className="flex items-center space-x-1.5">
                    <Layers3 size={13} className="text-blue-400" />
                    <span>Поля и параметры схемы</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {activeDtoModal.properties?.length || 0} полей
                  </span>
                </div>

                <div className="rounded border border-[#1E2330] bg-[#0D0E14] overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#090A0F] text-slate-400 text-[10px] uppercase border-b border-[#1E2330]">
                      <tr>
                        <th className="p-2">Параметр / Поле</th>
                        <th className="p-2">Тип данных</th>
                        <th className="p-2">Описание</th>
                        <th className="p-2">Обязательность</th>
                        <th className="p-2">Пример</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E2330] text-[11px]">
                      {activeDtoModal.properties && activeDtoModal.properties.length > 0 ? (
                        activeDtoModal.properties.map((prop, idx) => (
                          <tr key={idx} className="hover:bg-[#1E222D]/40">
                            <td className="p-2 font-semibold text-blue-300">{prop.name}</td>
                            <td className="p-2 text-slate-300">{prop.type}</td>
                            <td className="p-2 text-slate-400 font-sans">{prop.description || '—'}</td>
                            <td className="p-2">
                              {prop.required ? (
                                <span className="text-rose-400 font-bold text-[9px] bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-900/60">
                                  REQUIRED
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[9px]">optional</span>
                              )}
                            </td>
                            <td className="p-2 text-emerald-400 truncate max-w-[150px]">
                              {typeof prop.example === 'object' ? JSON.stringify(prop.example) : String(prop.example ?? '—')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-500">
                            Структура скалярного значения без дополнительных свойств
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* JSON Example */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-200 font-semibold uppercase text-[11px] tracking-wide">
                  <div className="flex items-center space-x-1.5">
                    <Code2 size={13} className="text-emerald-400" />
                    <span>Пример JSON payload ответа</span>
                  </div>
                  <button
                    onClick={() => handleCopy(JSON.stringify(activeDtoModal.exampleJson || {}, null, 2), 'json', 'modal-json')}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-[#161922] hover:bg-[#1E222D] text-slate-300 rounded text-[10px] border border-[#1E2330] transition"
                  >
                    {copiedJsonId === 'modal-json' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copiedJsonId === 'modal-json' ? 'Скопировано' : 'Copy JSON'}</span>
                  </button>
                </div>

                <pre className="p-3 bg-[#0D0E14] rounded text-[11px] font-mono text-slate-300 border border-[#1E2330] overflow-x-auto max-h-[180px] leading-relaxed">
                  {JSON.stringify(activeDtoModal.exampleJson || {}, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-[#1E2330] bg-[#161922] flex items-center justify-between shrink-0">
              <span className="text-[11px] font-mono text-slate-500">
                Модель данных извлечена из OpenAPI / AST контроллера
              </span>
              <button
                onClick={() => setActiveDtoModal(null)}
                className="px-3.5 py-1.5 bg-[#090A0F] hover:bg-[#1E222D] text-slate-200 rounded text-xs font-medium border border-[#1E2330] transition"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

