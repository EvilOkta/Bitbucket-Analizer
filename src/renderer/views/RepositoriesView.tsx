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
    <div className="h-full flex flex-col overflow-hidden bg-[#090A0F] text-[#F1F5F9] select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#1E2330] bg-[#111318] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-[#161922] border border-[#1E2330] text-blue-400">
            <FolderGit2 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
              <span>Репозитории и Источники проектов</span>
              <span className="text-[10px] font-mono text-slate-400 bg-[#161922] px-1.5 py-0.2 rounded border border-[#1E2330]">
                {repos.length} репозиториев
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Bitbucket Server, локальные папки, монорепозитории и эволюционные копии
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {onOpenLocalFolder && (
            <button
              onClick={onOpenLocalFolder}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition"
              title="Выбрать локальную папку с исходным кодом или Git-репозиторий"
            >
              <FolderOpen size={13} />
              <span>Открыть папку...</span>
            </button>
          )}

          <button
            onClick={expandAll}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#161922] hover:bg-[#1E222D] border border-[#1E2330] text-slate-300 rounded text-xs transition"
          >
            <ChevronDownSquare size={13} />
            <span>Развернуть все</span>
          </button>
          <button
            onClick={collapseAll}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#161922] hover:bg-[#1E222D] border border-[#1E2330] text-slate-300 rounded text-xs transition"
          >
            <ChevronUpSquare size={13} />
            <span>Свернуть все</span>
          </button>
          <button
            onClick={onRefreshRepos}
            disabled={isAnalyzing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#161922] hover:bg-[#1E222D] border border-[#1E2330] text-slate-300 rounded text-xs transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Analysis Active Banner */}
      {isAnalyzing && (
        <div className="p-3 bg-[#111318] border-b border-blue-500/40 text-xs text-blue-200 flex items-center space-x-3 shrink-0">
          <RefreshCw size={15} className="animate-spin text-blue-400 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold text-slate-100">Выполняется анализ репозитория...</span>
            <span className="text-[11px] text-slate-400 ml-2">
              Скачивание файлов, извлечение API и построение Sequence/ERD диаграмм.
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {/* Search Filter */}
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Поиск по ключу проекта (PROJ, CORE) или репозиторию..."
            className="w-full bg-[#111318] border border-[#1E2330] rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        {/* Grouped Projects & Repositories List */}
        <div className="space-y-3">
          {filteredGroups.length > 0 ? (
            filteredGroups.map(group => {
              const isExpanded = filter.trim().length > 0 || !!expandedProjects[group.projectKey];

              return (
                <div
                  key={group.projectKey}
                  className="bg-[#111318] rounded border border-[#1E2330] overflow-hidden"
                >
                  {/* Project Header */}
                  <div
                    onClick={() => toggleProject(group.projectKey, group.items)}
                    className="p-3 bg-[#161922] hover:bg-[#1E222D] cursor-pointer flex items-center justify-between border-b border-[#1E2330] transition select-none"
                  >
                    <div className="flex items-center space-x-2.5">
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={14} className="text-slate-500" />
                      )}
                      <FolderKanban size={15} className="text-blue-400" />
                      <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-[#090A0F] text-blue-400 border border-[#1E2330]">
                        {group.projectKey}
                      </span>
                      <span className="font-semibold text-xs text-slate-200">{group.projectName}</span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 bg-[#090A0F] px-2 py-0.5 rounded border border-[#1E2330]">
                      {group.items.length} {group.items.length === 1 ? 'репозиторий' : 'репозиториев'}
                    </span>
                  </div>

                  {/* Repositories in this Project */}
                  {isExpanded && (
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#111318]">
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
                            className={`p-3.5 rounded border transition-all cursor-pointer flex flex-col justify-between min-h-[160px] overflow-hidden ${
                              isSelected
                                ? 'bg-[#161922] border-blue-500'
                                : 'bg-[#161922] border-[#1E2330] hover:border-[#2E3748]'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="min-w-0">
                                  <span className="font-semibold text-xs text-slate-100 truncate block">{repo.name}</span>
                                  
                                  {/* Badges */}
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {repo.isLocal && (
                                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-900/50">
                                        <Laptop size={10} />
                                        <span>Локальный</span>
                                      </span>
                                    )}

                                    {repo.isLocal && repo.isGitInitialized === false && (
                                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/50 text-amber-400 border border-amber-900/50">
                                        <AlertTriangle size={10} />
                                        <span>Без .git</span>
                                      </span>
                                    )}

                                    {repo.repoType === 'monorepo' && (
                                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950/50 text-blue-400 border border-blue-900/50 font-medium">
                                        <Boxes size={10} />
                                        <span>Монорепозиторий</span>
                                      </span>
                                    )}

                                    {repo.repoType === 'copy_version' && repo.similarityWith && (
                                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/50 text-amber-400 border border-amber-900/50 font-medium" title={`Сходство ${repo.similarityWith.score}% с ${repo.similarityWith.repoName}`}>
                                        <Dna size={10} />
                                        <span>{repo.similarityWith.score}% сходства</span>
                                      </span>
                                    )}

                                    {repo.repoType === 'microservice' && (
                                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#090A0F] text-slate-400 border border-[#1E2330]">
                                        <Layers3 size={10} />
                                        <span>Микросервис</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {isSelected && (
                                  <span className="text-[10px] text-blue-400 font-mono px-1.5 py-0.2 rounded bg-blue-950/50 border border-blue-900/50 shrink-0">
                                    Выбран
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                                {repo.description || 'Репозиторий готов к анализу структуры, API эндпоинтов и потоков данных.'}
                              </p>
                            </div>

                            {/* Card Footer */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#1E2330] text-xs mt-auto">
                              <div className="flex items-center space-x-2 text-slate-400 font-mono text-[11px] shrink-0">
                                <GitBranch size={12} className="text-slate-500" />
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
                                  className="bg-[#0D0E14] border border-[#1E2330] rounded px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none cursor-pointer max-w-[150px] truncate"
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
                                className="flex items-center space-x-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition disabled:opacity-50 shrink-0"
                              >
                                {isAnalyzing && isSelected ? (
                                  <RefreshCw size={11} className="animate-spin" />
                                ) : (
                                  <Play size={11} fill="currentColor" />
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
            <div className="text-center text-slate-500 text-xs py-8 font-mono">
              Репозитории не найдены. Проверьте строку поиска или подключение к Bitbucket Server.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

