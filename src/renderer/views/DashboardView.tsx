import React from 'react';
import { FullAnalysisResult } from '../../engine/engineService';
import { NavTab } from '../components/Sidebar';
import {
  FileCode2,
  Waypoints,
  GitPullRequest,
  Database,
  Lightbulb,
  ArrowUpRight,
  Cpu,
  Clock,
  Layout,
  ExternalLink
} from 'lucide-react';

interface DashboardViewProps {
  analysis: FullAnalysisResult | null;
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ analysis, onNavigate }) => {
  if (!analysis) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center">
        <div className="w-12 h-12 rounded bg-[#161922] border border-[#1E2330] flex items-center justify-center text-blue-400 mb-3">
          <FileCode2 size={24} />
        </div>
        <h2 className="text-base font-semibold text-slate-100">Анализ репозитория не выполнен</h2>
        <p className="text-xs text-slate-400 max-w-md mt-1 mb-5">
          Выберите репозиторий из Bitbucket Server или запустите демонстрационный анализ, чтобы построить карту архитектуры, API, Sequence-диаграммы и ERD.
        </p>
        <button
          onClick={() => onNavigate('repositories')}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition active:translate-y-[0.5px]"
        >
          Перейти к выбору репозитория
        </button>
      </div>
    );
  }

  const { run, stack, endpoints, flows, screenForms = [], dataModel, recommendations } = analysis;

  const statCards = [
    { label: 'Файлов в репозитории', value: run.stats.totalFiles, sub: `${run.stats.totalLines.toLocaleString()} строк кода`, icon: <FileCode2 className="text-blue-400" size={16} />, tab: 'explorer' as NavTab },
    { label: 'Экранных форм UI', value: screenForms.length, sub: `${screenForms.reduce((acc, f) => acc + (f.elements?.length || 0), 0)} UI элементов`, icon: <Layout className="text-blue-400" size={16} />, tab: 'data-flows' as NavTab },
    { label: 'API Эндпоинтов', value: endpoints.length, sub: 'REST / RPC методы', icon: <Waypoints className="text-blue-400" size={16} />, tab: 'api-map' as NavTab },
    { label: 'Data Flows & Sequences', value: flows.length, sub: 'Цепочки вызовов', icon: <GitPullRequest className="text-blue-400" size={16} />, tab: 'data-flows' as NavTab },
    { label: 'Сущностей БД (PostgreSQL)', value: dataModel.entities.length, sub: `${dataModel.relationships.length} связей (FK)`, icon: <Database className="text-blue-400" size={16} />, tab: 'data-model' as NavTab },
    { label: 'Рекомендаций по коду', value: recommendations.length, sub: 'Архитектура & ИБ', icon: <Lightbulb className="text-blue-400" size={16} />, tab: 'recommendations' as NavTab }
  ];

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      {/* Top Banner */}
      <div className="bg-[#111318] border border-[#1E2330] p-4 rounded flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-semibold text-slate-100">{run.repositoryName}</h2>
            <span className="px-2 py-0.5 rounded bg-[#161922] text-blue-400 text-xs font-mono border border-[#1E2330]">
              {run.branch}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
            <span>Commit: <span className="font-mono text-slate-300">{run.commitHash}</span></span>
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
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#161922] hover:bg-[#1E222D] text-slate-200 border border-[#1E2330] rounded text-xs font-medium transition"
          >
            <span>Опубликовать в Confluence</span>
            <ArrowUpRight size={13} className="text-blue-400" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {statCards.map((c, i) => (
          <div
            key={i}
            onClick={() => onNavigate(c.tab)}
            className="bg-[#161922] border border-[#1E2330] hover:border-[#2E3748] hover:bg-[#1E222D] p-3 rounded cursor-pointer transition min-w-0"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-400 truncate">{c.label}</span>
              <div className="p-1 rounded bg-[#111318] text-slate-400">{c.icon}</div>
            </div>
            <div className="text-xl font-semibold font-mono text-slate-100">{c.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate font-mono">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Main Highlights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Detected Tech Stack */}
        <div className="bg-[#111318] border border-[#1E2330] p-3.5 rounded col-span-1 space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#1E2330] pb-2">
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-200">
              <Cpu size={14} className="text-blue-400" />
              <span>Стек технологий</span>
            </div>
            <button onClick={() => onNavigate('stack')} className="text-[11px] text-blue-400 hover:underline">
              Все ({stack.length})
            </button>
          </div>
          <div className="space-y-1">
            {stack.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded bg-[#161922] border border-[#1E2330] text-xs min-w-0">
                <div className="min-w-0 truncate mr-2">
                  <span className="font-medium text-slate-200 text-xs truncate block">{s.technology}</span>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider">{s.category.replace('_', ' ')}</div>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/40 shrink-0">
                  {Math.round(s.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Recommendations */}
        <div className="bg-[#111318] border border-[#1E2330] p-3.5 rounded lg:col-span-2 space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#1E2330] pb-2">
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-200">
              <Lightbulb size={14} className="text-amber-400" />
              <span>Рекомендации архитектуры & ИБ</span>
            </div>
            <button onClick={() => onNavigate('recommendations')} className="text-[11px] text-blue-400 hover:underline">
              Все ({recommendations.length})
            </button>
          </div>
          <div className="space-y-1.5">
            {recommendations.slice(0, 3).map((r, idx) => (
              <div key={idx} className="p-2.5 rounded bg-[#161922] border border-[#1E2330] text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-200 text-xs truncate">{r.title}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase shrink-0 ${
                    r.severity === 'high' ? 'bg-red-950/50 text-red-400 border border-red-900/50' : 'bg-amber-950/50 text-amber-400 border border-amber-900/50'
                  }`}>
                    {r.severity}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] break-words">{r.description}</p>
                <div className="text-[10px] text-blue-400 font-mono pt-0.5 break-words">Действие: {r.suggestedAction}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Screen Forms Overview Section */}
      {screenForms.length > 0 && (
        <div className="bg-[#111318] border border-[#1E2330] p-3.5 rounded space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#1E2330] pb-2">
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-200">
              <Layout size={14} className="text-blue-400" />
              <span>Экранные формы и элементы интерфейса ({screenForms.length})</span>
            </div>
            <button
              onClick={() => onNavigate('data-flows')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition font-medium"
            >
              <span>В Data Flows & Sequence</span>
              <ExternalLink size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {screenForms.map((form) => (
              <div
                key={form.id}
                onClick={() => onNavigate('data-flows')}
                className="p-2.5 bg-[#161922] hover:bg-[#1E222D] border border-[#1E2330] hover:border-[#2E3748] rounded cursor-pointer transition space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-100 text-xs font-mono truncate group-hover:text-blue-300 transition">
                    {form.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-[#090A0F] px-1.5 py-0.2 rounded border border-[#1E2330] shrink-0">
                    {form.elements?.length || 0} эл.
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate flex items-center space-x-1 font-mono">
                  <span className="text-slate-500">Маршрут:</span>
                  <span className="text-slate-300">{form.route}</span>
                </div>
                {form.elements && form.elements.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-[#1E2330]">
                    {form.elements.slice(0, 3).map((el) => (
                      <span
                        key={el.id}
                        className="text-[9px] font-mono bg-[#090A0F] text-slate-300 px-1.5 py-0.5 rounded border border-[#1E2330] truncate max-w-[140px]"
                        title={el.name}
                      >
                        {el.name}
                      </span>
                    ))}
                    {form.elements.length > 3 && (
                      <span className="text-[9px] font-mono text-slate-500 px-1 py-0.5">
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



