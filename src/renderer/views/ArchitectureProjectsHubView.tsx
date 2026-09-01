import React, { useState } from 'react';
import { ProjectGraphView } from './ProjectGraphView';
import { RepositoriesView } from './RepositoriesView';
import { RepositoryItem } from '../../shared/types';
import {
  Network,
  FolderGit2
} from 'lucide-react';

export type ArchitectureSubTab = 'graph' | 'repositories';

interface ArchitectureProjectsHubViewProps {
  repos?: RepositoryItem[];
  currentRepo?: RepositoryItem | null;
  setCurrentRepo?: (repo: RepositoryItem) => void;
  selectedBranch?: string;
  setSelectedBranch?: (b: string) => void;
  onRunAnalysis?: (repo?: RepositoryItem, branch?: string) => void;
  isAnalyzing?: boolean;
  onRefreshRepos?: () => void;
  onOpenLocalFolder?: () => void;
  initialSubTab?: ArchitectureSubTab;
}

export const ArchitectureProjectsHubView: React.FC<ArchitectureProjectsHubViewProps> = ({
  repos = [],
  currentRepo = null,
  setCurrentRepo = () => {},
  selectedBranch = 'main',
  setSelectedBranch = () => {},
  onRunAnalysis = () => {},
  isAnalyzing = false,
  onRefreshRepos = () => {},
  onOpenLocalFolder,
  initialSubTab = 'graph'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ArchitectureSubTab>(initialSubTab);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#090A0F] text-[#F1F5F9] select-none">
      {/* Hub Header & Subtab Switcher */}
      <div className="p-3 border-b border-[#1E2330] bg-[#111318] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#161922] border border-[#1E2330] rounded text-purple-400">
            <Network size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Архитектура & Проекты (Architecture Canvas)
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Интерактивный D3-граф структуры проектов, монорепозитории, эволюционные версии и реестр репозиториев
            </p>
          </div>
        </div>

        {/* Subtabs Selector */}
        <div className="flex items-center space-x-1 bg-[#161922] p-0.5 rounded border border-[#1E2330] text-xs font-mono">
          <button
            onClick={() => setActiveSubTab('graph')}
            className={`px-3 py-1 rounded transition flex items-center space-x-1.5 ${
              activeSubTab === 'graph'
                ? 'bg-blue-600 text-white font-medium shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network size={13} />
            <span>D3-Граф проектов</span>
          </button>

          <button
            onClick={() => setActiveSubTab('repositories')}
            className={`px-3 py-1 rounded transition flex items-center space-x-1.5 ${
              activeSubTab === 'repositories'
                ? 'bg-blue-600 text-white font-medium shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderGit2 size={13} />
            <span>Репозитории & Ветки</span>
          </button>
        </div>
      </div>

      {/* Subtab Content Area */}
      <div className="flex-1 overflow-hidden min-h-0 relative">
        {activeSubTab === 'graph' && (
          <ProjectGraphView onAnalyzeRepo={(r, b) => onRunAnalysis(r, b)} />
        )}

        {activeSubTab === 'repositories' && (
          <RepositoriesView
            repos={repos}
            currentRepo={currentRepo}
            setCurrentRepo={setCurrentRepo}
            selectedBranch={selectedBranch}
            setSelectedBranch={setSelectedBranch}
            onRunAnalysis={onRunAnalysis}
            isAnalyzing={isAnalyzing}
            onRefreshRepos={onRefreshRepos}
            onOpenLocalFolder={onOpenLocalFolder}
          />
        )}
      </div>
    </div>
  );
};
