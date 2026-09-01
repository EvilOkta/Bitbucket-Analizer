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
          badge: 'bg-blue-950/90 text-blue-400 border-blue-700/70',
          border: 'border-blue-800/60 hover:border-blue-500/80',
          activeBg: 'bg-blue-950/30 border-blue-500/80 shadow-md shadow-blue-950/40',
          headerBg: 'bg-blue-950/20 hover:bg-blue-950/40',
          text: 'text-blue-400'
        };
      case 'POST':
        return {
          badge: 'bg-emerald-950/90 text-emerald-400 border-emerald-700/70',
          border: 'border-emerald-800/60 hover:border-emerald-500/80',
          activeBg: 'bg-emerald-950/30 border-emerald-500/80 shadow-md shadow-emerald-950/40',
          headerBg: 'bg-emerald-950/20 hover:bg-emerald-950/40',
          text: 'text-emerald-400'
        };
      case 'PUT':
        return {
          badge: 'bg-amber-950/90 text-amber-400 border-amber-700/70',
          border: 'border-amber-800/60 hover:border-amber-500/80',
          activeBg: 'bg-amber-950/30 border-amber-500/80 shadow-md shadow-amber-950/40',
          headerBg: 'bg-amber-950/20 hover:bg-amber-950/40',
          text: 'text-amber-400'
        };
      case 'DELETE':
        return {
          badge: 'bg-red-950/90 text-red-400 border-red-700/70',
          border: 'border-red-800/60 hover:border-red-500/80',
          activeBg: 'bg-red-950/30 border-red-500/80 shadow-md shadow-red-950/40',
          headerBg: 'bg-red-950/20 hover:bg-red-950/40',
          text: 'text-red-400'
        };
      case 'PATCH':
        return {
          badge: 'bg-purple-950/90 text-purple-400 border-purple-700/70',
          border: 'border-purple-800/60 hover:border-purple-500/80',
          activeBg: 'bg-purple-950/30 border-purple-500/80 shadow-md shadow-purple-950/40',
          headerBg: 'bg-purple-950/20 hover:bg-purple-950/40',
          text: 'text-purple-400'
        };
      default:
        return {
          badge: 'bg-gray-900 text-gray-300 border-gray-700',
          border: 'border-gray-800 hover:border-gray-700',
          activeBg: 'bg-gray-900/60 border-gray-600',
          headerBg: 'bg-gray-900/40 hover:bg-gray-900/60',
          text: 'text-gray-300'
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
    <div className="flex h-full w-full overflow-hidden bg-[#0B0F19] relative">
      {/* ================= LEFT CONTROLLERS PANEL (COLLAPSIBLE) ================= */}
      {isControllersOpen ? (
        <div className="w-56 shrink-0 border-r border-gray-800 flex flex-col h-full bg-gray-950/70 transition-all duration-200 ease-in-out select-none">
          <div className="p-2.5 border-b border-gray-800 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-1.5 min-w-0">
              <Server size={13} className="text-purple-400 shrink-0" />
              <span className="text-xs font-bold text-gray-200 truncate uppercase tracking-wider">Контроллеры</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-800/60">
                {controllersWithCounts.length}
              </span>
              <button
                onClick={() => setIsControllersOpen(false)}
                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-gray-200 rounded transition"
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
              className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition border ${
                selectedController === 'ALL'
                  ? 'bg-purple-950/50 text-purple-200 border-purple-500/70 shadow-sm font-semibold'
                  : 'bg-gray-900/40 text-gray-300 border-gray-800/80 hover:bg-gray-900 hover:text-white'
              }`}
            >
              <span className="truncate text-[11px]">Все контроллеры</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-950 text-gray-400 border border-gray-800 shrink-0 ml-1">
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
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition border ${
                    isSelected
                      ? 'bg-purple-950/50 text-purple-200 border-purple-500/70 shadow-sm font-semibold'
                      : 'bg-gray-900/40 text-gray-300 border-gray-800/80 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 min-w-0 truncate">
                    <FolderKanban size={12} className={isSelected ? 'text-purple-400' : 'text-gray-500'} />
                    <span className="truncate font-mono text-[11px]">{c.name}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border shrink-0 ml-1.5 ${
                    isSelected
                      ? 'bg-purple-900/60 text-purple-300 border-purple-700/60'
                      : 'bg-gray-950 text-gray-400 border-gray-800'
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
        <div className="w-10 shrink-0 border-r border-gray-800 bg-gray-950/90 flex flex-col items-center py-2.5 space-y-2 select-none">
          <button
            onClick={() => setIsControllersOpen(true)}
            className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-purple-400 border border-gray-800 transition"
            title="Развернуть панель контроллеров"
          >
            <PanelLeftOpen size={14} />
          </button>
          <div className="w-4 h-[1px] bg-gray-800 my-1" />
          <span className="text-[10px] font-mono text-gray-500 [writing-mode:vertical-lr] tracking-widest uppercase rotate-180">
            Контроллеры ({controllersWithCounts.length})
          </span>
        </div>
      )}

      {/* ================= MAIN SWAGGER METHODS VIEW (INLINE SPOILERS / ACCORDION) ================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#070A13]">
        {/* Top Swagger Toolbar */}
        <div className="p-3 border-b border-gray-800 bg-gray-950/80 flex flex-wrap items-center justify-between gap-2.5 z-10 shrink-0">
          {/* Method Filter Pills */}
          <div className="flex flex-wrap items-center gap-1">
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => {
              const isActive = methodFilter === m;
              return (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition flex items-center space-x-1 border ${
                    isActive
                      ? m === 'ALL'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                        : m === 'GET'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : m === 'POST'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : m === 'PUT'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                        : m === 'DELETE'
                        ? 'bg-red-600 text-white border-red-500 shadow-sm'
                        : 'bg-purple-600 text-white border-purple-500 shadow-sm'
                      : 'bg-gray-900/60 text-gray-400 hover:text-gray-200 border-gray-800'
                  }`}
                >
                  <span>{m}</span>
                  <span className={`text-[9px] px-1 rounded ${isActive ? 'bg-black/30 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {getMethodCounts[m] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bulk Spoilers Controls + Search + Export */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Expand / Collapse All Spoilers */}
            <div className="flex items-center space-x-1 bg-gray-900 p-0.5 rounded-lg border border-gray-800 text-xs">
              <button
                onClick={handleExpandAll}
                className="px-2 py-0.5 hover:bg-gray-800 text-gray-300 rounded text-[11px] flex items-center space-x-1 transition"
                title="Развернуть все методы"
              >
                <ChevronsDown size={12} className="text-purple-400" />
                <span>Развернуть все</span>
              </button>
              <div className="w-[1px] h-3 bg-gray-800" />
              <button
                onClick={handleCollapseAll}
                className="px-2 py-0.5 hover:bg-gray-800 text-gray-300 rounded text-[11px] flex items-center space-x-1 transition"
                title="Свернуть все методы"
              >
                <ChevronsUp size={12} className="text-gray-400" />
                <span>Свернуть все</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-52">
              <Search size={11} className="absolute left-2.5 top-1.5 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск эндпоинта..."
                className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-7 pr-2.5 py-0.5 text-[11px] text-gray-200 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            {/* OpenAPI Export */}
            <button
              onClick={exportOpenApi}
              className="flex items-center space-x-1 px-2.5 py-1 bg-purple-950/70 hover:bg-purple-900/80 border border-purple-800/60 text-purple-200 rounded-lg text-[11px] transition shrink-0"
              title="Экспорт OpenAPI 3.0 спецификации в JSON"
            >
              <Download size={12} />
              <span>OpenAPI JSON</span>
            </button>
          </div>
        </div>

        {/* Selected Controller Filter Pill Bar (if filtered) */}
        {selectedController !== 'ALL' && (
          <div className="px-4 py-1.5 bg-purple-950/30 border-b border-purple-900/40 flex items-center justify-between text-xs font-mono shrink-0">
            <div className="flex items-center space-x-2 text-purple-300">
              <FolderKanban size={13} />
              <span>Фильтр по контроллеру: <strong className="text-purple-200">{selectedController}</strong></span>
              <span className="text-[10px] text-gray-400">({filteredEndpoints.length} методов)</span>
            </div>
            <button
              onClick={() => setSelectedController('ALL')}
              className="text-[10px] text-purple-400 hover:text-purple-200 underline"
            >
              Сбросить фильтр
            </button>
          </div>
        )}

        {/* ================= LIST OF SWAGGER METHOD ACCORDION SPOILERS ================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
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
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? `${theme.activeBg} ring-1 ring-purple-500/50`
                      : `bg-gray-900/40 ${theme.border}`
                  }`}
                >
                  {/* Method Card Header / Spoiler Clickable Area */}
                  <div
                    onClick={() => toggleEndpointExpand(ep.id)}
                    className={`p-2.5 cursor-pointer flex items-center justify-between gap-2.5 transition select-none ${theme.headerBg}`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 truncate">
                      {/* Expand / Collapse Chevron */}
                      <div className={`p-0.5 rounded transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-90 text-purple-400' : 'text-gray-500'}`}>
                        <ChevronRight size={15} />
                      </div>

                      {/* HTTP Method Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border uppercase shrink-0 ${theme.badge}`}>
                        {ep.method}
                      </span>

                      {/* Route Path */}
                      <span className="font-mono text-xs font-bold text-gray-100 truncate">
                        {displayPath}
                      </span>

                      {/* Handler Name */}
                      <span className="px-1.5 py-0.2 rounded bg-gray-950 border border-gray-800 text-[10px] font-mono text-blue-400 shrink-0">
                        {handlerName}()
                      </span>

                      {/* Description Preview */}
                      {ep.description && (
                        <span className="text-[11px] text-gray-400 truncate hidden lg:inline font-sans">
                          — {ep.description}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-900/60">
                        {ep.controller}
                      </span>

                      {ep.requestParams && ep.requestParams.length > 0 && (
                        <span className="text-[9px] font-mono text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                          {ep.requestParams.length} param
                        </span>
                      )}

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleCopy(displayPath, 'path', ep.id);
                        }}
                        className="p-1 hover:bg-gray-800 text-gray-400 hover:text-gray-200 rounded transition"
                        title="Скопировать маршрут"
                      >
                        {copiedPathId === ep.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* ================= EXPANDED SPOILER CONTENT (FULL METHOD BREAKDOWN) ================= */}
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-800/80 bg-gray-950/80 space-y-4 animate-in fade-in duration-200">
                      {/* Description & Operation ID info */}
                      <div className="p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <Info size={13} className="text-purple-400 shrink-0" />
                          <span className="text-gray-300 font-sans">{ep.description || 'Эндпоинт REST API контроллера'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] font-mono text-gray-400">
                          <span>Базовый путь: <strong className="text-gray-200">{ep.controllerBasePath || '/'}</strong></span>
                          <span>•</span>
                          <span>Операция: <strong className="text-blue-400">{handlerName}</strong></span>
                        </div>
                      </div>

                      {/* 2-Column Breakdown: Left (Parameters & Body) | Right (Responses & Code) */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {/* Left Column: Parameters & Request Body DTO */}
                        <div className="space-y-4">
                          {/* Parameters Table */}
                          <div className="glass-panel p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                              <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-200 uppercase tracking-wide">
                                <Filter size={13} className="text-blue-400" />
                                <span>Параметры запроса (Path / Query / Header)</span>
                              </div>
                              <span className="text-[10px] font-mono text-gray-400 bg-gray-950 px-1.5 py-0.2 rounded border border-gray-800">
                                {ep.requestParams?.length || 0} параметров
                              </span>
                            </div>

                            {ep.requestParams && ep.requestParams.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs font-mono">
                                  <thead className="bg-gray-950 text-gray-400 text-[10px] uppercase border-b border-gray-800">
                                    <tr>
                                      <th className="p-2">Имя</th>
                                      <th className="p-2">Тип</th>
                                      <th className="p-2">Расположение</th>
                                      <th className="p-2">Обязателен</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-800/60">
                                    {ep.requestParams.map((param, idx) => (
                                      <tr key={idx} className="hover:bg-gray-900/40">
                                        <td className="p-2 font-bold text-gray-200">{param.name}</td>
                                        <td className="p-2 text-purple-300">{param.type}</td>
                                        <td className="p-2">
                                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-gray-900 border border-gray-800 text-blue-300">
                                            {param.in || 'query'}
                                          </span>
                                        </td>
                                        <td className="p-2">
                                          {param.required ? (
                                            <span className="text-red-400 font-bold text-[10px]">REQUIRED</span>
                                          ) : (
                                            <span className="text-gray-500 text-[10px]">optional</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="p-3 text-center text-gray-500 text-xs font-mono">
                                У данного эндпоинта нет явных Path/Query параметров.
                              </div>
                            )}
                          </div>

                          {/* Request Body DTO Block */}
                          <div className="glass-panel p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                              <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-200 uppercase tracking-wide">
                                <Braces size={13} className="text-emerald-400" />
                                <span>Тело запроса (Request Body DTO & JSON)</span>
                              </div>
                              {(ep.requestBody?.exampleJson || ep.requestExample) && (
                                <button
                                  onClick={() => handleCopy(JSON.stringify(ep.requestBody?.exampleJson || JSON.parse(ep.requestExample || '{}'), null, 2), 'json', ep.id)}
                                  className="flex items-center space-x-1 px-2 py-0.5 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded text-[10px] border border-gray-800 transition"
                                >
                                  {copiedJsonId === ep.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                  <span>{copiedJsonId === ep.id ? 'Скопировано' : 'Copy JSON'}</span>
                                </button>
                              )}
                            </div>

                            {ep.requestBody || ep.requestSchema || ep.requestExample ? (
                              <div className="space-y-3 text-xs font-mono">
                                <div className="p-2 bg-gray-950 rounded-lg border border-gray-900 flex items-center justify-between">
                                  <span className="text-gray-400 text-[11px]">Модель запроса:</span>
                                  <span className="text-emerald-400 font-bold text-xs bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
                                    {ep.requestBody?.modelName || 'RequestDTO'}
                                  </span>
                                </div>

                                {/* Table of Request Body Fields if available */}
                                {ep.requestBody?.properties && ep.requestBody.properties.length > 0 && (
                                  <div className="overflow-x-auto border border-gray-900 rounded-lg bg-gray-950">
                                    <table className="w-full text-left text-xs font-mono">
                                      <thead className="bg-gray-900/80 text-gray-400 text-[10px] uppercase border-b border-gray-800">
                                        <tr>
                                          <th className="p-1.5">Поле</th>
                                          <th className="p-1.5">Тип</th>
                                          <th className="p-1.5">Описание</th>
                                          <th className="p-1.5">Обязательность</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-800/40 text-[11px]">
                                        {ep.requestBody.properties.map((prop, pIdx) => (
                                          <tr key={pIdx} className="hover:bg-gray-900/30">
                                            <td className="p-1.5 font-bold text-emerald-300">{prop.name}</td>
                                            <td className="p-1.5 text-purple-300">{prop.type}</td>
                                            <td className="p-1.5 text-gray-400">{prop.description || '—'}</td>
                                            <td className="p-1.5">
                                              {prop.required ? (
                                                <span className="text-red-400 text-[9px] font-bold">REQUIRED</span>
                                              ) : (
                                                <span className="text-gray-500 text-[9px]">optional</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Formatted JSON Sample */}
                                <pre className="p-3 bg-gray-950 rounded-lg text-[11px] font-mono text-emerald-300 border border-gray-900 overflow-x-auto max-h-[160px] leading-relaxed">
                                  {JSON.stringify(ep.requestBody?.exampleJson || (ep.requestExample ? JSON.parse(ep.requestExample) : { [ep.requestBody?.modelName || 'request']: 'data' }), null, 2)}
                                </pre>
                              </div>
                            ) : (
                              <div className="p-3 text-center text-gray-500 text-xs font-mono">
                                Тело запроса не требуется (GET / No Body).
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Column: Responses & Source Code */}
                        <div className="space-y-4">
                          {/* Response Codes and Models */}
                          <div className="glass-panel p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                              <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-200 uppercase tracking-wide">
                                <CheckCircle2 size={13} className="text-emerald-400" />
                                <span>Схема ответов (Responses & Status Codes)</span>
                              </div>
                              <span className="text-[10px] font-mono text-gray-400 bg-gray-950 px-1.5 py-0.2 rounded border border-gray-800">
                                {ep.responses?.length || ep.responseStatuses?.length || 1} статусов
                              </span>
                            </div>

                            {ep.responses && ep.responses.length > 0 ? (
                              <div className="space-y-2">
                                {ep.responses.map((resp, idx) => {
                                  const respDtoName = resp.modelName || (resp.statusCode >= 200 && resp.statusCode < 300 ? resolvedResponseDto : undefined);

                                  return (
                                    <div key={idx} className="p-2.5 bg-gray-950 rounded-lg border border-gray-900 space-y-1.5">
                                      <div className="flex items-center justify-between text-xs font-mono">
                                        <div className="flex items-center space-x-2">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            resp.statusCode >= 200 && resp.statusCode < 300
                                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                              : resp.statusCode >= 400 && resp.statusCode < 500
                                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                              : 'bg-red-950 text-red-400 border border-red-800'
                                          }`}>
                                            {resp.statusCode}
                                          </span>
                                          <span className="font-semibold text-gray-200">{resp.description}</span>
                                        </div>

                                        {respDtoName && (
                                          <button
                                            onClick={() => openResponseModal(ep, resp)}
                                            className="px-2 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-700/70 text-purple-300 text-[10px] font-bold flex items-center space-x-1 transition shadow-sm group"
                                            title="Кликните для просмотра детальной структуры DTO ответа"
                                          >
                                            <Braces size={11} className="text-purple-400 group-hover:rotate-12 transition-transform" />
                                            <span className="underline underline-offset-2">{respDtoName}</span>
                                          </button>
                                        )}
                                      </div>

                                      {resp.exampleJson && (
                                        <pre className="p-2 bg-gray-900/90 rounded text-[10px] font-mono text-blue-300 overflow-x-auto max-h-[100px]">
                                          {JSON.stringify(resp.exampleJson, null, 2)}
                                        </pre>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-3 bg-gray-950 rounded-lg border border-gray-900 space-y-2 text-xs font-mono">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2 text-emerald-400">
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 font-bold text-[10px]">200 OK</span>
                                    <span className="text-gray-300">Успешное выполнение</span>
                                  </div>
                                  
                                  <button
                                    onClick={() => openResponseModal(ep)}
                                    className="px-2 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-700/70 text-purple-300 text-[10px] font-bold flex items-center space-x-1 transition shadow-sm group"
                                    title="Кликните для просмотра детальной структуры DTO ответа"
                                  >
                                    <Braces size={11} className="text-purple-400 group-hover:rotate-12 transition-transform" />
                                    <span className="underline underline-offset-2">{resolvedResponseDto}</span>
                                  </button>
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  Возвращает DTO модель: <strong className="text-purple-300">{resolvedResponseDto}</strong> (нажмите для расшифровки полей)
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Source Code Context (Clickable with Focus) */}
                          <div
                            onClick={() => onNavigateToSource?.(ep.sourceFile, ep.sourceLine)}
                            className="glass-panel p-3.5 rounded-xl border border-gray-800 space-y-2.5 cursor-pointer hover:border-blue-500/80 hover:bg-blue-950/20 transition group"
                            title={`Перейти к исходному коду в дереве проекта (${ep.sourceFile}:${ep.sourceLine})`}
                          >
                            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                              <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-200 uppercase tracking-wide group-hover:text-blue-300 transition">
                                <FileCode size={13} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                <span>Исходный код метода</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-mono text-gray-400 truncate max-w-[180px]">
                                  {ep.sourceFile.split('/').pop()}:{ep.sourceLine}
                                </span>
                                <span className="flex items-center space-x-1 text-[10px] font-mono text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/80 group-hover:bg-blue-600 group-hover:text-white transition">
                                  <span>Дерево проекта</span>
                                  <ExternalLink size={10} />
                                </span>
                              </div>
                            </div>

                            <pre className="p-3 bg-gray-950 rounded-lg text-[11px] font-mono text-gray-300 border border-gray-900 overflow-x-auto max-h-[160px] leading-relaxed group-hover:border-blue-900 transition">
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
            <div className="p-12 text-center text-gray-500 text-xs font-mono glass-panel rounded-xl border border-gray-800">
              Эндпоинты по выбранным фильтрам не найдены.
            </div>
          )}
        </div>
      </div>

      {/* ================= RESPONSE DTO MODAL DIALOG ================= */}
      {activeDtoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-3xl max-h-[85vh] bg-gray-950 border border-purple-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-purple-950/40 via-gray-900 to-indigo-950/40 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-700/60 text-purple-300">
                  <Braces size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-purple-400 font-bold">
                      Структура DTO Ответа
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {activeDtoModal.statusCode || 200} OK
                    </span>
                    <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-gray-900 text-gray-300 border border-gray-800">
                      {activeDtoModal.isPrimitive
                        ? 'Скалярное значение (Scalar)'
                        : activeDtoModal.isArray
                        ? `Массив объектов (${activeDtoModal.itemType || 'Item'}[])`
                        : 'Объектная модель (Object)'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-100 font-mono truncate mt-0.5">
                    {activeDtoModal.modelName || activeDtoModal.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setActiveDtoModal(null)}
                className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition"
                title="Закрыть (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
              {/* Summary explanation */}
              <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-900/50 flex items-start space-x-2.5 font-sans">
                <Info size={16} className="text-purple-400 shrink-0 mt-0.5" />
                <div className="text-gray-300 space-y-1 text-xs">
                  <div>{activeDtoModal.description}</div>
                  {activeDtoModal.isPrimitive && (
                    <div className="text-purple-300 font-mono text-[11px]">
                      Примечание: Эндпоинт возвращает единичное скалярное значение типа <strong className="text-purple-200">{activeDtoModal.itemType || activeDtoModal.modelName}</strong>.
                    </div>
                  )}
                  {activeDtoModal.isArray && (
                    <div className="text-blue-300 font-mono text-[11px]">
                      Примечание: Возвращается коллекция элементов в формате массива JSON <strong className="text-blue-200">{activeDtoModal.itemType || 'Item'}[]</strong>.
                    </div>
                  )}
                </div>
              </div>

              {/* Table of Fields / Properties */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-gray-200 font-bold uppercase text-[11px] tracking-wide">
                  <div className="flex items-center space-x-1.5">
                    <Layers3 size={14} className="text-purple-400" />
                    <span>Поля и параметры схемы</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {activeDtoModal.properties?.length || 0} полей
                  </span>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden shadow-inner">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-gray-900 text-gray-400 text-[10px] uppercase border-b border-gray-800">
                      <tr>
                        <th className="p-2.5">Параметр / Поле</th>
                        <th className="p-2.5">Тип данных</th>
                        <th className="p-2.5">Описание</th>
                        <th className="p-2.5">Обязательность</th>
                        <th className="p-2.5">Пример</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 text-[11px]">
                      {activeDtoModal.properties && activeDtoModal.properties.length > 0 ? (
                        activeDtoModal.properties.map((prop, idx) => (
                          <tr key={idx} className="hover:bg-gray-900/40">
                            <td className="p-2.5 font-bold text-purple-300">{prop.name}</td>
                            <td className="p-2.5 text-blue-400">{prop.type}</td>
                            <td className="p-2.5 text-gray-300 font-sans">{prop.description || '—'}</td>
                            <td className="p-2.5">
                              {prop.required ? (
                                <span className="text-red-400 font-bold text-[9px] bg-red-950/80 px-1.5 py-0.2 rounded border border-red-800">
                                  REQUIRED
                                </span>
                              ) : (
                                <span className="text-gray-500 text-[9px]">optional</span>
                              )}
                            </td>
                            <td className="p-2.5 text-emerald-400 truncate max-w-[150px]">
                              {typeof prop.example === 'object' ? JSON.stringify(prop.example) : String(prop.example ?? '—')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-500">
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
                <div className="flex items-center justify-between text-gray-200 font-bold uppercase text-[11px] tracking-wide">
                  <div className="flex items-center space-x-1.5">
                    <Code2 size={14} className="text-emerald-400" />
                    <span>Пример JSON payload ответа</span>
                  </div>
                  <button
                    onClick={() => handleCopy(JSON.stringify(activeDtoModal.exampleJson || {}, null, 2), 'json', 'modal-json')}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded text-[10px] border border-gray-800 transition"
                  >
                    {copiedJsonId === 'modal-json' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copiedJsonId === 'modal-json' ? 'Скопировано' : 'Copy JSON'}</span>
                  </button>
                </div>

                <pre className="p-3.5 bg-gray-950 rounded-xl text-[11px] font-mono text-emerald-300 border border-gray-800 overflow-x-auto max-h-[180px] leading-relaxed">
                  {JSON.stringify(activeDtoModal.exampleJson || {}, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-gray-800 bg-gray-950 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-mono text-gray-500">
                Модель данных извлечена из OpenAPI / AST контроллера
              </span>
              <button
                onClick={() => setActiveDtoModal(null)}
                className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-200 rounded-lg text-xs font-semibold border border-gray-800 transition"
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

