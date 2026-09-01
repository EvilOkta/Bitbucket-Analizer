import React from 'react';
import { FullAnalysisResult } from '../../engine/engineService';
import { NavTab } from '../components/Sidebar';
import {
  FileCode2,
  Waypoints,
  GitPullRequest,
  Database,
  Lightbulb,
  ShieldCheck,
  ArrowUpRight,
  Cpu,
  Clock,
  Layout,
  Layers,
  ExternalLink,
  MousePointerClick
} from 'lucide-react';

interface DashboardViewProps {
  analysis: FullAnalysisResult | null;
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ analysis, onNavigate }) => {
  if (!analysis) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-lg">
          <FileCode2 size={32} />
        </div>
        <h2 className="text-lg font-semibold text-gray-100">Анализ репозитория не выполнен</h2>
        <p className="text-xs text-gray-400 max-w-md mt-1 mb-6">
          Выберите репозиторий из Bitbucket Server или запустите демонстрационный анализ, чтобы построить карту архитектуры, API, Sequence-диаграммы и ERD.
        </p>
        <button
          onClick={() => onNavigate('repositories')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shadow-lg shadow-blue-500/20"
        >
          Перейти к выбору репозитория
        </button>
      </div>
    );
  }

  const { run, stack, endpoints, flows, screenForms = [], dataModel, recommendations } = analysis;

  const statCards = [
    { label: 'Файлов в репозитории', value: run.stats.totalFiles, sub: `${run.stats.totalLines.toLocaleString()} строк кода`, icon: <FileCode2 className="text-blue-400" size={20} />, tab: 'explorer' as NavTab },
    { label: 'Экранных форм UI', value: screenForms.length, sub: `${screenForms.reduce((acc, f) => acc + (f.elements?.length || 0), 0)} UI элементов`, icon: <Layout className="text-teal-400" size={20} />, tab: 'data-flows' as NavTab },
    { label: 'API Эндпоинтов', value: endpoints.length, sub: 'REST / RPC методы', icon: <Waypoints className="text-purple-400" size={20} />, tab: 'api-map' as NavTab },
    { label: 'Data Flows & Sequences', value: flows.length, sub: 'Цепочки вызовов', icon: <GitPullRequest className="text-emerald-400" size={20} />, tab: 'data-flows' as NavTab },
    { label: 'Сущностей БД (PostgreSQL)', value: dataModel.entities.length, sub: `${dataModel.relationships.length} связей (FK)`, icon: <Database className="text-amber-400" size={20} />, tab: 'data-model' as NavTab },
    { label: 'Рекомендаций по коду', value: recommendations.length, sub: 'Архитектура & ИБ', icon: <Lightbulb className="text-cyan-400" size={20} />, tab: 'recommendations' as NavTab }
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-gray-100">{run.repositoryName}</h2>
            <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 text-xs font-mono border border-blue-800/40">
              {run.branch}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 flex items-center space-x-2">
            <span>Commit: <span className="font-mono text-gray-300">{run.commitHash}</span></span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Clock size={12} />
              <span>Длительность анализа: {run.stats.durationMs}ms</span>
            </span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('confluence')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium transition"
          >
            <span>Опубликовать в Confluence</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((c, i) => (
          <div
            key={i}
            onClick={() => onNavigate(c.tab)}
            className="glass-card p-3 rounded-xl cursor-pointer hover:border-blue-500/40 transition group min-w-0"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-gray-400 truncate">{c.label}</span>
              <div className="p-1.5 rounded-lg bg-gray-900/80 group-hover:scale-110 transition">{c.icon}</div>
            </div>
            <div className="text-xl font-bold text-gray-100">{c.value}</div>
            <div className="text-[10px] text-gray-500 mt-0.5 truncate">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Main Highlights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Detected Tech Stack */}
        <div className="glass-panel p-4 rounded-xl col-span-1 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-gray-200">
              <Cpu size={15} className="text-blue-400" />
              <span>Стек технологий</span>
            </div>
            <button onClick={() => onNavigate('stack')} className="text-[11px] text-blue-400 hover:underline">
              Все
            </button>
          </div>
          <div className="space-y-1.5">
            {stack.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-900/60 border border-gray-800 text-xs min-w-0">
                <div className="min-w-0 truncate mr-2">
                  <span className="font-semibold text-gray-200 text-[11px] truncate block">{s.technology}</span>
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider">{s.category.replace('_', ' ')}</div>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40 shrink-0">
                  {Math.round(s.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Recommendations */}
        <div className="glass-panel p-4 rounded-xl lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-gray-200">
              <Lightbulb size={15} className="text-amber-400" />
              <span>Ключевые рекомендации архитектуры & ИБ</span>
            </div>
            <button onClick={() => onNavigate('recommendations')} className="text-[11px] text-blue-400 hover:underline">
              Подробнее
            </button>
          </div>
          <div className="space-y-2">
            {recommendations.slice(0, 3).map((r, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-200 text-[11px] truncate">{r.title}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase shrink-0 ${
                    r.severity === 'high' ? 'bg-red-950 text-red-400 border border-red-800/50' : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                  }`}>
                    {r.severity}
                  </span>
                </div>
                <p className="text-gray-400 text-[11px] break-words">{r.description}</p>
                <div className="text-[10px] text-blue-400 font-mono pt-0.5 break-words">Действие: {r.suggestedAction}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Screen Forms Overview Section */}
      {screenForms.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
            <div className="flex items-center space-x-2 text-xs font-semibold text-gray-200">
              <Layout size={16} className="text-teal-400" />
              <span>Экранные формы и элементы интерфейса ({screenForms.length})</span>
            </div>
            <button
              onClick={() => onNavigate('data-flows')}
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center space-x-1 transition font-medium"
            >
              <span>Открыть в Data Flows & Sequence</span>
              <ExternalLink size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {screenForms.map((form) => (
              <div
                key={form.id}
                onClick={() => onNavigate('data-flows')}
                className="p-3 bg-gray-900/60 hover:bg-gray-900 border border-gray-800 hover:border-teal-500/40 rounded-xl cursor-pointer transition space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-100 text-xs font-mono truncate group-hover:text-teal-300 transition">
                    {form.name}
                  </span>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-950/70 px-1.5 py-0.2 rounded border border-teal-800/50 shrink-0">
                    {form.elements?.length || 0} эл.
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 truncate flex items-center space-x-1 font-mono">
                  <span className="text-gray-500">Маршрут:</span>
                  <span className="text-gray-300">{form.route}</span>
                </div>
                {form.elements && form.elements.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-800/60">
                    {form.elements.slice(0, 3).map((el) => (
                      <span
                        key={el.id}
                        className="text-[9px] font-mono bg-gray-950 text-gray-300 px-1.5 py-0.5 rounded border border-gray-800 truncate max-w-[140px]"
                        title={el.name}
                      >
                        {el.name}
                      </span>
                    ))}
                    {form.elements.length > 3 && (
                      <span className="text-[9px] font-mono text-gray-500 px-1 py-0.5">
                        +{form.elements.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


