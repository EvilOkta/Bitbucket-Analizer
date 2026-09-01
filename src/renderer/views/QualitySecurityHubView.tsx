import React, { useState } from 'react';
import { FullAnalysisResult } from '../../engine/engineService';
import { AutoTestsView } from './AutoTestsView';
import { RecommendationsView } from './RecommendationsView';
import { AuditLogsView } from './AuditLogsView';
import {
  FlaskConical,
  Lightbulb,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode2
} from 'lucide-react';

export type QualitySecuritySubTab = 'tests' | 'recommendations' | 'audit';

interface QualitySecurityHubViewProps {
  analysis: FullAnalysisResult | null;
  initialSubTab?: QualitySecuritySubTab;
}

export const QualitySecurityHubView: React.FC<QualitySecurityHubViewProps> = ({
  analysis,
  initialSubTab = 'tests'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<QualitySecuritySubTab>(initialSubTab);

  const testAnalysis = analysis?.testAnalysis;
  const recommendations = analysis?.recommendations || [];
  const criticalCount = recommendations.filter(r => r.severity === 'high').length;
  const totalTests = testAnalysis?.totalTests || 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#090A0F] text-[#F1F5F9] select-none">
      {/* Hub Header & Subtab Switcher */}
      <div className="p-3 border-b border-[#1E2330] bg-[#111318] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#161922] border border-[#1E2330] rounded text-cyan-400">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-slate-100">
                Качество & Безопасность (QA & Security Hub)
              </h2>
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] bg-red-950/60 text-red-300 border border-red-800/50 rounded font-mono font-medium flex items-center space-x-1">
                  <AlertTriangle size={10} />
                  <span>{criticalCount} критических</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Автотесты, архитектурный аудит, матрица покрытия и журнал событий безопасности
            </p>
          </div>
        </div>

        {/* Subtabs Selector */}
        <div className="flex items-center space-x-1 bg-[#161922] p-0.5 rounded border border-[#1E2330] text-xs font-mono">
          <button
            onClick={() => setActiveSubTab('tests')}
            className={`px-3 py-1 rounded transition flex items-center space-x-1.5 ${
              activeSubTab === 'tests'
                ? 'bg-blue-600 text-white font-medium shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FlaskConical size={13} />
            <span>Автотесты & Runner ({totalTests})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('recommendations')}
            className={`px-3 py-1 rounded transition flex items-center space-x-1.5 ${
              activeSubTab === 'recommendations'
                ? 'bg-blue-600 text-white font-medium shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lightbulb size={13} />
            <span>Рекомендации ({recommendations.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1 rounded transition flex items-center space-x-1.5 ${
              activeSubTab === 'audit'
                ? 'bg-blue-600 text-white font-medium shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck size={13} />
            <span>Журнал аудита ИБ</span>
          </button>
        </div>
      </div>

      {/* Subtab Content Area */}
      <div className="flex-1 overflow-hidden min-h-0 relative">
        {activeSubTab === 'tests' && (
          <AutoTestsView
            testAnalysis={analysis?.testAnalysis}
            endpoints={analysis?.endpoints}
            screenForms={analysis?.screenForms}
          />
        )}

        {activeSubTab === 'recommendations' && (
          <RecommendationsView recommendations={recommendations} />
        )}

        {activeSubTab === 'audit' && (
          <AuditLogsView />
        )}
      </div>
    </div>
  );
};
