import React, { useState } from 'react';
import { Recommendation, RecommendationSeverity } from '../../shared/types';
import { Lightbulb, Sparkles, Shield, CheckCircle2, Filter } from 'lucide-react';

interface RecommendationsViewProps {
  recommendations: Recommendation[];
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({ recommendations }) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | RecommendationSeverity>('ALL');

  const filtered = recommendations.filter(
    r => severityFilter === 'ALL' || r.severity === severityFilter
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#090A0F] text-[#F1F5F9] select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#1E2330] bg-[#111318] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-[#161922] border border-[#1E2330] text-amber-400">
            <Lightbulb size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
              <span>Рекомендации по архитектуре и качеству</span>
              <span className="text-[10px] font-mono text-slate-400 bg-[#161922] px-1.5 py-0.2 rounded border border-[#1E2330]">
                {recommendations.length} правил
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Статический архитектурный аудит и рекомендации оптимизации структуры проекта
            </p>
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center bg-[#161922] border border-[#1E2330] rounded p-0.5 text-xs">
          <Filter size={13} className="text-slate-500 ml-1.5 mr-1" />
          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-2.5 py-1 rounded transition text-xs font-medium ${
              severityFilter === 'ALL' ? 'bg-[#1E222D] text-slate-100 border border-[#2E3748]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Все ({recommendations.length})
          </button>
          <button
            onClick={() => setSeverityFilter('high')}
            className={`px-2.5 py-1 rounded transition text-xs font-medium ${
              severityFilter === 'high' ? 'bg-rose-950/60 text-rose-300 border border-rose-900/60' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            High
          </button>
          <button
            onClick={() => setSeverityFilter('medium')}
            className={`px-2.5 py-1 rounded transition text-xs font-medium ${
              severityFilter === 'medium' ? 'bg-amber-950/60 text-amber-300 border border-amber-900/60' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Medium
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-3 max-w-5xl">
          {filtered.map(rec => (
            <div key={rec.id} className="bg-[#161922] border border-[#1E2330] hover:border-[#2E3748] transition rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                    rec.severity === 'high'
                      ? 'bg-rose-950/50 text-rose-400 border border-rose-900/50'
                      : 'bg-amber-950/50 text-amber-400 border border-amber-900/50'
                  }`}>
                    {rec.severity} severity
                  </span>
                  <h3 className="font-semibold text-xs text-slate-100">{rec.title}</h3>
                </div>

                <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#090A0F] text-slate-400 border border-[#1E2330]">
                  {rec.sourceType === 'qwen_ai' ? <Sparkles size={11} className="text-purple-400" /> : <Shield size={11} className="text-blue-400" />}
                  <span>{rec.sourceType === 'qwen_ai' ? 'Qwen AI' : 'Rule-Based'}</span>
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{rec.description}</p>

              <div className="p-3 bg-[#0D0E14] rounded text-xs space-y-1.5 border border-[#1E2330]">
                <div className="text-blue-400 font-semibold flex items-center space-x-1.5 text-[11px]">
                  <CheckCircle2 size={13} />
                  <span>Рекомендуемое действие:</span>
                </div>
                <p className="text-slate-300 pl-4 text-xs">{rec.suggestedAction}</p>

                {rec.targetStructureExample && (
                  <div className="mt-2 pt-2 border-t border-[#1E2330] pl-4">
                    <span className="text-[10px] uppercase font-mono text-slate-500">Целевая структура:</span>
                    <div className="font-mono text-emerald-400 text-xs mt-0.5">{rec.targetStructureExample}</div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                <span>Категория: <span className="text-slate-400 uppercase">{rec.category}</span></span>
                <span>Обоснование: <span className="text-slate-400 font-sans">{rec.rationale}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

