import React from 'react';
import { RepositoryItem, AnalysisRun, SubprojectItem } from '../../shared/types';
import { Play, RefreshCw, CheckCircle2, Boxes, FolderOpen, Laptop } from 'lucide-react';

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
  onOpenLocalFolder
}) => {
  return (
    <header className="h-14 bg-gray-950/80 border-b border-gray-800 px-6 flex items-center justify-between gap-4">
      {/* Current Repo & Branch */}
      <div className="flex items-center space-x-3 min-w-0">
        {currentRepo ? (
          <>
            <div className="flex items-center space-x-2 truncate">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/50 shrink-0">
                {currentRepo.projectKey}
              </span>
              <span className="text-sm font-medium text-gray-200 truncate">{currentRepo.name}</span>
            </div>
            <span className="text-gray-600 shrink-0">/</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-900 text-gray-300 border border-gray-800 shrink-0">
              git: {selectedBranch}
            </span>

            {/* Monorepo Subproject Selector */}
            {subprojects && subprojects.length > 0 && onSelectSubproject && (
              <div className="flex items-center space-x-1.5 bg-purple-950/60 border border-purple-800/60 rounded-lg px-2 py-0.5 text-xs text-purple-300 shrink-0">
                <Boxes size={13} className="text-purple-400" />
                <span className="text-[10px] uppercase font-semibold">Модуль:</span>
                <select
                  value={selectedSubproject}
                  onChange={e => onSelectSubproject(e.target.value)}
                  className="bg-purple-900/80 text-purple-100 border border-purple-700/80 rounded px-1.5 py-0.5 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">Весь монорепозиторий ({subprojects.length} подпроектов)</option>
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
          <span className="text-xs text-gray-500">Репозиторий не выбран (выберите во вкладке «Репозитории»)</span>
        )}
      </div>

      {/* Action Buttons & Status */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {onOpenLocalFolder && (
          <button
            onClick={onOpenLocalFolder}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium transition"
            title="Открыть локальную папку проекта"
          >
            <FolderOpen size={13} className="text-blue-400" />
            <span>Папка</span>
          </button>
        )}

        {latestRun && (
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-md">
            <CheckCircle2 size={13} />
            <span>Анализ ({latestRun.stats.durationMs || 0}ms)</span>
          </div>
        )}

        <button
          onClick={onRunAnalysis}
          disabled={!currentRepo || isAnalyzing}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Анализируем код...</span>
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              <span>Запустить анализ</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

