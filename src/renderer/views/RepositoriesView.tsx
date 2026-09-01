import React, { useState, useMemo, useEffect } from 'react';
import { RepositoryItem } from '../../shared/types';
import {
  FolderGit2,
  GitBranch,
  Play,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Search,
  CheckCircle2,
  Layers,
  ChevronDownSquare,
  ChevronUpSquare,
  FolderOpen,
  AlertTriangle,
  Boxes,
  Layers3,
  Dna,
  Laptop
} from 'lucide-react';

interface RepositoriesViewProps {
  repos: RepositoryItem[];
  currentRepo: RepositoryItem | null;
  setCurrentRepo: (repo: RepositoryItem) => void;
  selectedBranch: string;
  setSelectedBranch: (b: string) => void;
  onRunAnalysis: (repo?: RepositoryItem, branch?: string) => void;
  isAnalyzing: boolean;
  onRefreshRepos: () => void;
  onOpenLocalFolder?: () => void;
}

export const RepositoriesView: React.FC<RepositoriesViewProps> = ({
  repos,
  currentRepo,
  setCurrentRepo,
  selectedBranch,
  setSelectedBranch,
  onRunAnalysis,
  isAnalyzing,
  onRefreshRepos,
  onOpenLocalFolder
}) => {
  const [filter, setFilter] = useState('');
  // Map of projectKey -> boolean (true = expanded, false = collapsed). Default all collapsed.
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  
  // Real branches per repository: repoId -> string[]
  const [repoBranches, setRepoBranches] = useState<Record<string, string[]>>({});
  // Selected branch per repository: repoId -> string
  const [repoSelectedBranch, setRepoSelectedBranch] = useState<Record<string, string>>({});

  // Group repos by Project Key
  const groupedRepos = useMemo(() => {
    const map = new Map<string, { projectKey: string; projectName: string; items: RepositoryItem[] }>();

    for (const r of repos) {
      const pKey = r.projectKey || 'GLOBAL';
      const pName = r.projectName || pKey;
      if (!map.has(pKey)) {
        map.set(pKey, { projectKey: pKey, projectName: pName, items: [] });
      }
      map.get(pKey)!.items.push(r);
    }

    return Array.from(map.values());
  }, [repos]);

  // Load real branches when expanding a project or selecting a repo
  const loadBranchesForRepo = async (repo: RepositoryItem) => {
    if (repoBranches[repo.id]) return; // already loaded

    if ((window as any).electronApi) {
      try {
        const branches = await (window as any).electronApi.getBranches('cred-bitbucket', repo.projectKey, repo.slug);
        if (branches && branches.length > 0) {
          setRepoBranches(prev => ({ ...prev, [repo.id]: branches }));
          if (!repoSelectedBranch[repo.id]) {
            setRepoSelectedBranch(prev => ({ ...prev, [repo.id]: branches[0] }));
          }
        }
      } catch (e) {
        console.warn(`Could not load branches for ${repo.name}:`, e);
      }
    }
  };

  const toggleProject = (projectKey: string, groupItems: RepositoryItem[]) => {
    const isNowExpanded = !expandedProjects[projectKey];
    setExpandedProjects(prev => ({
      ...prev,
      [projectKey]: isNowExpanded
    }));

    if (isNowExpanded) {
      // Lazy load branches for all repos in this project group
      groupItems.forEach(repo => loadBranchesForRepo(repo));
    }
  };

  const expandAll = () => {
    const allExp: Record<string, boolean> = {};
    groupedRepos.forEach(g => {
      allExp[g.projectKey] = true;
      g.items.forEach(r => loadBranchesForRepo(r));
    });
    setExpandedProjects(allExp);
  };

  const collapseAll = () => {
    setExpandedProjects({});
  };

  // Filter grouped repos
  const filteredGroups = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return groupedRepos;

    return groupedRepos
      .map(group => {
        const matchesProject = group.projectKey.toLowerCase().includes(q) || group.projectName.toLowerCase().includes(q);
        if (matchesProject) return group;

        const matchingItems = group.items.filter(
          item => item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
        );
        return { ...group, items: matchingItems };
      })
      .filter(group => group.items.length > 0);
  }, [groupedRepos, filter]);

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center space-x-2">
            <FolderGit2 className="text-blue-400" size={22} />
            <span>Репозитории и источники проектов</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Поддержка Bitbucket Server, локальных Git-папок, монорепозиториев и классификатора эволюционных копий.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {onOpenLocalFolder && (
            <button
              onClick={onOpenLocalFolder}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 transition"
              title="Выбрать локальную папку с исходным кодом или Git-репозиторий"
            >
              <FolderOpen size={14} />
              <span>📂 Открыть локальную папку...</span>
            </button>
          )}

          <button
            onClick={expandAll}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-gray-200 rounded-lg text-xs transition"
          >
            <ChevronDownSquare size={13} />
            <span>Развернуть все</span>
          </button>
          <button
            onClick={collapseAll}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-gray-200 rounded-lg text-xs transition"
          >
            <ChevronUpSquare size={13} />
            <span>Свернуть все</span>
          </button>
          <button
            onClick={onRefreshRepos}
            disabled={isAnalyzing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-xs transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Analysis Active Banner */}
      {isAnalyzing && (
        <div className="p-4 rounded-xl bg-blue-950/70 border border-blue-500/60 text-xs text-blue-200 flex items-center space-x-3 shadow-lg shadow-blue-900/30 animate-pulse">
          <RefreshCw size={18} className="animate-spin text-blue-400 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-white">Выполняется анализ репозитория...</div>
            <div className="text-[11px] text-blue-300 mt-0.5">
              Скачивание реальных файлов по PAT из Bitbucket Server, извлечение API и построение Sequence/ERD диаграмм.
            </div>
          </div>
        </div>
      )}

      {/* Search Filter */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-3 text-gray-500" />
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Поиск по ключу проекта (PROJ, CORE, LOCAL) или названию репозитория..."
          className="w-full bg-gray-900/80 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-sans"
        />
      </div>

      {/* Grouped Projects & Repositories List */}
      <div className="space-y-4">
        {filteredGroups.length > 0 ? (
          filteredGroups.map(group => {
            // Project is expanded only if explicitly marked true or if active search filter
            const isExpanded = filter.trim().length > 0 || !!expandedProjects[group.projectKey];

            return (
              <div
                key={group.projectKey}
                className="glass-panel rounded-xl overflow-hidden border border-gray-800/80"
              >
                {/* Level 1: Project Header (Spoiler) */}
                <div
                  onClick={() => toggleProject(group.projectKey, group.items)}
                  className="p-4 bg-gray-950/80 hover:bg-gray-900/70 cursor-pointer flex items-center justify-between border-b border-gray-800/60 transition select-none"
                >
                  <div className="flex items-center space-x-3">
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-blue-400" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-500" />
                    )}
                    <div className="flex items-center space-x-2">
                      <FolderKanban size={16} className="text-blue-400" />
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/50">
                        {group.projectKey}
                      </span>
                      <span className="font-semibold text-sm text-gray-200">{group.projectName}</span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-gray-400 bg-gray-900 px-2.5 py-0.5 rounded-full border border-gray-800">
                    {group.items.length} {group.items.length === 1 ? 'репозиторий' : 'репозиториев'}
                  </span>
                </div>

                {/* Level 2: Repositories in this Project */}
                {isExpanded && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/20">
                    {group.items.map(repo => {
                      const isSelected = currentRepo?.id === repo.id;
                      const availableBranches = repoBranches[repo.id] || (repo.defaultBranch ? [repo.defaultBranch] : ['master', 'main']);
                      const currentBranch = repoSelectedBranch[repo.id] || repo.defaultBranch || availableBranches[0] || 'master';

                      return (
                        <div
                          key={repo.id}
                          onClick={() => {
                            setCurrentRepo(repo);
                            setSelectedBranch(currentBranch);
                            loadBranchesForRepo(repo);
                          }}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[180px] overflow-hidden ${
                            isSelected
                              ? 'bg-blue-950/30 border-blue-500 shadow-lg shadow-blue-500/10'
                              : 'glass-card hover:border-gray-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <span className="font-semibold text-sm text-gray-100 truncate block">{repo.name}</span>
                                
                                {/* Repo Classifier / Origin Badges */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  {repo.isLocal && (
                                    <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                                      <Laptop size={11} />
                                      <span>Локальный</span>
                                    </span>
                                  )}

                                  {repo.isLocal && repo.isGitInitialized === false && (
                                    <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60">
                                      <AlertTriangle size={11} />
                                      <span>Без .git</span>
                                    </span>
                                  )}

                                  {repo.repoType === 'monorepo' && (
                                    <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/60 font-semibold">
                                      <Boxes size={11} />
                                      <span>Монорепозиторий</span>
                                    </span>
                                  )}

                                  {repo.repoType === 'copy_version' && repo.similarityWith && (
                                    <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 font-semibold" title={`Сходство ${repo.similarityWith.score}% с ${repo.similarityWith.repoName}`}>
                                      <Dna size={11} />
                                      <span>{repo.similarityWith.score}% сходства с v1</span>
                                    </span>
                                  )}

                                  {repo.repoType === 'microservice' && (
                                    <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
                                      <Layers3 size={11} />
                                      <span>Микросервис</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isSelected && (
                                <span className="text-[10px] text-blue-400 font-medium px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 shrink-0">
                                  Выбран
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                              {repo.description || 'Репозиторий готов к анализу структуры, API эндпоинтов и потоков данных.'}
                            </p>
                          </div>

                          {/* Card Footer with Dynamic Branches */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-800/80 text-xs mt-auto">
                            <div className="flex items-center space-x-2 text-gray-400 font-mono text-[11px] shrink-0">
                              <GitBranch size={13} className="text-gray-500" />
                              <span>Ветка:</span>
                              <select
                                value={currentBranch}
                                onFocus={() => loadBranchesForRepo(repo)}
                                onChange={e => {
                                  const val = e.target.value;
                                  setRepoSelectedBranch(prev => ({ ...prev, [repo.id]: val }));
                                  if (isSelected) setSelectedBranch(val);
                                }}
                                onClick={e => e.stopPropagation()}
                                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-200 focus:outline-none cursor-pointer max-w-[160px] truncate"
                              >
                                {availableBranches.map(b => (
                                  <option key={b} value={b}>
                                    {b}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setCurrentRepo(repo);
                                setSelectedBranch(currentBranch);
                                onRunAnalysis(repo, currentBranch);
                              }}
                              disabled={isAnalyzing}
                              title={`Запустить глубокий анализ ветки ${currentBranch}`}
                              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 shrink-0 shadow-sm"
                            >
                              {isAnalyzing && isSelected ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Play size={12} fill="currentColor" />
                              )}
                              <span>Анализировать</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-500 text-xs py-8">
            Репозитории не найдены. Проверьте строку поиска или подключение к Bitbucket Server.
          </div>
        )}
      </div>
    </div>
  );
};
