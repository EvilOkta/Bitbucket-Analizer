import React, { useState } from 'react';
import { Recommendation, RecommendationSeverity } from '../../shared/types';
import { Lightbulb, Sparkles, Shield, AlertTriangle, CheckCircle, Filter } from 'lucide-react';

interface RecommendationsViewProps {
  recommendations: Recommendation[];
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({ recommendations }) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | RecommendationSeverity>('ALL');

  const filtered = recommendations.filter(
    r => severityFilter === 'ALL' || r.severity === severityFilter
  );

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center space-x-2">
            <Lightbulb className="text-amber-400" size={22} />
            <span>Рекомендации по архитектуре, качеству и ИБ</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Детерминированные правила статического анализа, дополненные локальной нейросетью Qwen.
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-2 bg-gray-900 border border-gray-800 rounded-lg p-1 text-xs">
          <Filter size={13} className="text-gray-500 ml-1.5" />
          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-2.5 py-1 rounded-md transition ${severityFilter === 'ALL' ? 'bg-gray-800 text-white' : 'text-gray-400'}`}
          >
            Все ({recommendations.length})
          </button>
          <button
            onClick={() => setSeverityFilter('high')}
            className={`px-2.5 py-1 rounded-md transition ${severityFilter === 'high' ? 'bg-red-950 text-red-300 border border-red-800' : 'text-gray-400'}`}
          >
            High
          </button>
          <button
            onClick={() => setSeverityFilter('medium')}
            className={`px-2.5 py-1 rounded-md transition ${severityFilter === 'medium' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'text-gray-400'}`}
          >
            Medium
          </button>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filtered.map(rec => (
          <div key={rec.id} className="glass-panel p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                  rec.severity === 'high'
                    ? 'bg-red-950 text-red-400 border border-red-800'
                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}>
                  {rec.severity} severity
                </span>
                <h3 className="font-bold text-sm text-gray-100">{rec.title}</h3>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  rec.sourceType === 'qwen_ai'
                    ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                    : 'bg-blue-950/80 text-blue-300 border-blue-800'
                }`}>
                  {rec.sourceType === 'qwen_ai' ? <Sparkles size={11} /> : <Shield size={11} />}
                  <span>{rec.sourceType === 'qwen_ai' ? 'Qwen AI' : 'Rule-Based'}</span>
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-300">{rec.description}</p>

            <div className="p-3 bg-gray-950/80 rounded-lg text-xs space-y-1.5 border border-gray-800">
              <div className="text-blue-400 font-semibold flex items-center space-x-1.5">
                <CheckCircle size={13} />
                <span>Рекомендуемое действие:</span>
              </div>
              <p className="text-gray-300 pl-4">{rec.suggestedAction}</p>

              {rec.targetStructureExample && (
                <div className="mt-2 pt-2 border-t border-gray-900 pl-4">
                  <span className="text-[11px] text-gray-500 font-mono">Целевая структура:</span>
                  <div className="font-mono text-emerald-400 text-[11px] mt-0.5">{rec.targetStructureExample}</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
              <span>Категория: <span className="text-gray-400 uppercase font-mono">{rec.category}</span></span>
              <span>Обоснование: <span className="text-gray-400">{rec.rationale}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
