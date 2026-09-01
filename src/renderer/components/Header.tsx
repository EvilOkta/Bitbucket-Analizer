import React from 'react';
import { RepositoryItem, AnalysisRun, SubprojectItem } from '../../shared/types';
import { Play, RefreshCw, CheckCircle2, Boxes, FolderOpen } from 'lucide-react';

interface HeaderProps {
  currentRepo: RepositoryItem | null;
  selectedBranch: string;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  latestRun: AnalysisRun | null;
  subprojects?: SubprojectItem[];
  selectedSubproject?: string;
  onSelectSubproject?: (subproject: string) => void;
  onOpenLocalFolder?: () => void;
  onOpenCommandPalette?: () => void;
  activeTabLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentRepo,
  selectedBranch,
  isAnalyzing,
  onRunAnalysis,
  latestRun,
  subprojects,
  selectedSubproject = 'all',
  onSelectSubproject,
  onOpenLocalFolder,
  onOpenCommandPalette,
  activeTabLabel
}) => {
  return (
    <header className="h-12 bg-[#111318] border-b border-[#1E2330] px-4 flex items-center justify-between gap-3 select-none shrink-0 z-10">
      {/* Current Repo & Branch Breadcrumb */}
      <div className="flex items-center space-x-2 min-w-0">
        {currentRepo ? (
          <>
            <div className="flex items-center space-x-1.5 truncate">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-900/50 shrink-0 font-mono">
                {currentRepo.projectKey}
              </span>
              <span className="text-xs font-semibold text-slate-200 truncate font-mono">{currentRepo.name}</span>
            </div>
            <span className="text-slate-600 shrink-0">/</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161922] text-slate-300 border border-[#1E2330] shrink-0">
              {selectedBranch}
            </span>
            {activeTabLabel && (
              <>
                <span className="text-slate-600 shrink-0">/</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-950/30 text-blue-300 border border-blue-900/40 shrink-0 font-mono">
                  {activeTabLabel}
                </span>
              </>
            )}

            {/* Monorepo Subproject Selector */}
            {subprojects && subprojects.length > 0 && onSelectSubproject && (
              <div className="flex items-center space-x-1.5 bg-[#161922] border border-[#2E3748] rounded px-2 py-0.5 text-xs text-slate-300 shrink-0">
                <Boxes size={12} className="text-blue-400" />
                <span className="text-[10px] uppercase font-semibold text-slate-400">Модуль:</span>
                <select
                  value={selectedSubproject}
                  onChange={e => onSelectSubproject(e.target.value)}
                  className="bg-[#090A0F] text-slate-200 border border-[#1E2330] rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer font-mono"
                >
                  <option value="all">Весь монорепозиторий ({subprojects.length})</option>
                  {subprojects.map(sub => (
                    <option key={sub.id} value={sub.path}>
                      {sub.name} ({sub.path})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        ) : (
          <span className="text-xs text-slate-500 font-mono">Репозиторий не выбран</span>
        )}
      </div>

      {/* Center / Action Buttons */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Quick Switcher Trigger (Ctrl+K) */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center space-x-2 px-2.5 py-1 bg-[#161922] hover:bg-[#1E222D] border border-[#1E2330] hover:border-[#2E3748] rounded text-xs text-slate-400 hover:text-slate-200 transition group font-mono"
            title="Быстрый поиск по проекту (Ctrl+K)"
          >
            <span>Поиск по проекту</span>
            <kbd className="px-1.5 py-0.2 text-[9px] bg-[#090A0F] text-slate-400 border border-[#1E2330] rounded group-hover:border-blue-500/50 transition">
              Ctrl+K
            </kbd>
          </button>
        )}

        {onOpenLocalFolder && (
          <button
            onClick={onOpenLocalFolder}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#161922] hover:bg-[#1E222D] border border-[#1E2330] text-slate-300 text-xs font-medium transition"
            title="Открыть локальную папку проекта"
          >
            <FolderOpen size={13} className="text-blue-400" />
            <span>Папка</span>
          </button>
        )}

        {latestRun && (
          <div className="hidden lg:flex items-center space-x-1.5 text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-2 py-0.5 rounded font-mono">
            <CheckCircle2 size={12} />
            <span>{latestRun.stats.durationMs || 0}ms</span>
          </div>
        )}

        <button
          onClick={onRunAnalysis}
          disabled={!currentRepo || isAnalyzing}
          className="flex items-center space-x-1.5 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-[0.5px]"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              <span>Анализ...</span>
            </>
          ) : (
            <>
              <Play size={13} fill="currentColor" />
              <span>Запустить анализ</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};


