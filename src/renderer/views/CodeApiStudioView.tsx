import React, { useState } from 'react';
import { FullAnalysisResult } from '../../engine/engineService';
import { ApiMapView } from './ApiMapView';
import { RepoExplorerView } from './RepoExplorerView';
import { DataFlowsView } from './DataFlowsView';
import {
  Code2,
  Waypoints,
  FolderTree,
  GitPullRequest,
  FileCode2,
  Braces
} from 'lucide-react';

export type CodeApiStudioSubTab = 'api' | 'explorer' | 'flows';

interface CodeApiStudioViewProps {
  analysis: FullAnalysisResult | null;
  focusedSource?: { file: string; line: number } | null;
  onNavigateToSource?: (file: string, line: number, returnTab?: string, returnTitle?: string) => void;
  onBackToPrevious?: () => void;
  initialSubTab?: CodeApiStudioSubTab;
}

export const CodeApiStudioView: React.FC<CodeApiStudioViewProps> = ({
  analysis,
  focusedSource,
  onNavigateToSource,
  onBackToPrevious,
  initialSubTab = 'api'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<CodeApiStudioSubTab>(initialSubTab);

  const endpointsCount = analysis?.endpoints?.length || 0;
  const flowsCount = analysis?.flows?.length || 0;
  const formsCount = analysis?.screenForms?.length || 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#090A0F] text-[#F1F5F9] select-none">
      {/* Hub Header & Subtab Switcher */}
      <div className="p-3 border-b border-[#1E2330] bg-[#111318] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#161922] border border-[#1E2330] rounded text-emerald-400">
            <Braces size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Код, API & Data Flows Studio
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Интерактивная IDE-студия: Карта API контрактов, дерево исходного кода и Sequence-трассировка вызовов
            </p>
          </div>
        </div>

        {/* Subtabs Selector */}
        <div className="flex items-center space-x-1 bg-[#161922] p-0.5 rounded border border-[#1E2330] text-xs font-mono">
          <button
            onClick={() => setActiveSubTab('api')}
            className={`px-3 py-1 rounded transition flex items-center space-x-1.5 ${
              activeSubTab === 'api'
                ? 'bg-blue-600 text-white font-medium shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Waypoints size={13} />
            <span>Карта API ({endpointsCount})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('explorer')}
            className={`px-3 py-1 rounded transition flex items-center space-x-1.5 ${
              activeSubTab === 'explorer'
                ? 'bg-blue-600 text-white font-medium shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree size={13} />
            <span>Дерево проекта & Код</span>
          </button>

          <button
            onClick={() => setActiveSubTab('flows')}
            className={`px-3 py-1 rounded transition flex items-center space-x-1.5 ${
              activeSubTab === 'flows'
                ? 'bg-blue-600 text-white font-medium shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitPullRequest size={13} />
            <span>Data Flows & Экранные формы ({formsCount > 0 ? formsCount : flowsCount})</span>
          </button>
        </div>
      </div>

      {/* Subtab Content Area */}
      <div className="flex-1 overflow-hidden min-h-0 relative">
        {activeSubTab === 'api' && (
          <ApiMapView
            endpoints={analysis?.endpoints || []}
            onNavigateToSource={(file, line) => {
              if (onNavigateToSource) {
                onNavigateToSource(file, line || 1, 'code_api', 'Назад к Карте API');
              }
              setActiveSubTab('explorer');
            }}
          />
        )}

        {activeSubTab === 'explorer' && (
          <RepoExplorerView
            tree={analysis?.tree || null}
            focusedSource={focusedSource}
            onBackToPrevious={focusedSource ? () => {
              if (onBackToPrevious) onBackToPrevious();
              setActiveSubTab('api');
            } : undefined}
          />
        )}

        {activeSubTab === 'flows' && (
          <DataFlowsView
            flows={analysis?.flows || []}
            screenForms={analysis?.screenForms || []}
            onNavigateToSource={(file, line) => {
              if (onNavigateToSource) {
                onNavigateToSource(file, line || 1, 'code_api', 'Назад к экранным формам');
              }
              setActiveSubTab('explorer');
            }}
          />
        )}
      </div>
    </div>
  );
};
