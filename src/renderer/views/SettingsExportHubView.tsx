import React, { useState } from 'react';
import { FullAnalysisResult } from '../../engine/engineService';
import { ConnectionsView } from './ConnectionsView';
import { ConfluencePublishView } from './ConfluencePublishView';
import {
  Settings,
  KeyRound,
  Share2,
  Database,
  Bot
} from 'lucide-react';

export type SettingsExportSubTab = 'connections' | 'confluence';

interface SettingsExportHubViewProps {
  analysis: FullAnalysisResult | null;
  initialSubTab?: SettingsExportSubTab;
}

export const SettingsExportHubView: React.FC<SettingsExportHubViewProps> = ({
  analysis,
  initialSubTab = 'connections'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SettingsExportSubTab>(initialSubTab);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#090A0F] text-[#F1F5F9] select-none">
      {/* Hub Header & Subtab Switcher */}
      <div className="p-3 border-b border-[#1E2330] bg-[#111318] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#161922] border border-[#1E2330] rounded text-blue-400">
            <Settings size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Интеграции & Экспорт (Settings & Export Hub)
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Подключения Bitbucket Server, Confluence, Qwen LLM, PostgreSQL и мастер публикации документации
            </p>
          </div>
        </div>

        {/* Subtabs Selector */}
        <div className="flex items-center space-x-1 bg-[#161922] p-0.5 rounded border border-[#1E2330] text-xs font-mono">
          <button
            onClick={() => setActiveSubTab('connections')}
            className={`px-3 py-1 rounded transition flex items-center space-x-1.5 ${
              activeSubTab === 'connections'
                ? 'bg-blue-600 text-white font-medium shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound size={13} />
            <span>Подключения & PAT</span>
          </button>

          <button
            onClick={() => setActiveSubTab('confluence')}
            className={`px-3 py-1 rounded transition flex items-center space-x-1.5 ${
              activeSubTab === 'confluence'
                ? 'bg-blue-600 text-white font-medium shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 size={13} />
            <span>Публикация в Confluence</span>
          </button>
        </div>
      </div>

      {/* Subtab Content Area */}
      <div className="flex-1 overflow-hidden min-h-0 relative">
        {activeSubTab === 'connections' && (
          <ConnectionsView />
        )}

        {activeSubTab === 'confluence' && (
          <ConfluencePublishView analysis={analysis} />
        )}
      </div>
    </div>
  );
};
