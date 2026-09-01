import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  Network,
  FolderTree,
  Cpu,
  Waypoints,
  GitPullRequest,
  Database,
  Lightbulb,
  Share2,
  KeyRound,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  FlaskConical
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'connections'
  | 'repositories'
  | 'project-graph'
  | 'explorer'
  | 'stack'
  | 'api-map'
  | 'data-flows'
  | 'data-model'
  | 'recommendations'
  | 'tests'
  | 'confluence'
  | 'audit';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  stats?: {
    endpoints: number;
    flows: number;
    entities: number;
    recs: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const menuItems: { id: NavTab; label: string; icon: React.ReactNode; section?: string }[] = [
    { section: 'ОБЗОР', id: 'dashboard', label: 'Панель управления', icon: <LayoutDashboard size={16} /> },
    { id: 'repositories', label: 'Репозитории', icon: <FolderGit2 size={16} /> },
    { id: 'project-graph', label: 'D3-Граф проектов', icon: <Network size={16} /> },
    
    { section: 'АРХИТЕКТУРА & КОД', id: 'explorer', label: 'Дерево проекта', icon: <FolderTree size={16} /> },
    { id: 'stack', label: 'Стек технологий', icon: <Cpu size={16} /> },
    { id: 'api-map', label: 'Карта API', icon: <Waypoints size={16} /> },
    { id: 'data-flows', label: 'Data Flows & Sequence', icon: <GitPullRequest size={16} /> },
    { id: 'data-model', label: 'Модель данных (ERD)', icon: <Database size={16} /> },
    { id: 'recommendations', label: 'Рекомендации', icon: <Lightbulb size={16} /> },
    { id: 'tests', label: 'Автотесты & Runner', icon: <FlaskConical size={16} /> },

    { section: 'ИНТЕГРАЦИИ & БЕЗОПАСНОСТЬ', id: 'confluence', label: 'Confluence публикация', icon: <Share2 size={16} /> },
    { id: 'connections', label: 'Подключения & PAT', icon: <KeyRound size={16} /> },
    { id: 'audit', label: 'ИБ & Журнал аудита', icon: <ShieldCheck size={16} /> }
  ];


  return (
    <aside
      className={`${
        isCollapsed ? 'w-14' : 'w-56'
      } bg-[#0E1015] border-r border-[#1E2330] flex flex-col h-full select-none transition-all duration-200 ease-in-out shrink-0 z-20`}
    >
      {/* Brand Header & Toggle Button */}
      <div className="p-3 border-b border-[#1E2330] flex items-center justify-between min-h-[52px] relative bg-[#111318]">
        <div className="flex items-center space-x-2.5 min-w-0 overflow-hidden">
          <div className="w-7 h-7 rounded bg-[#1E2330] border border-[#2E3748] flex items-center justify-center text-blue-400 shrink-0">
            <FolderGit2 size={15} />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 truncate">
              <h1 className="font-semibold text-xs text-slate-100 tracking-tight leading-tight truncate">Bitbucket Analyzer</h1>
              <span className="text-[10px] text-slate-500 font-mono">Precision v1.8</span>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button */}
        <button
          onClick={toggleCollapse}
          className={`p-1.5 rounded hover:bg-[#1E2330] text-slate-400 hover:text-slate-200 transition ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? 'Развернуть меню (Ctrl+B)' : 'Свернуть меню'}
        >
          {isCollapsed ? <PanelLeftOpen size={14} className="text-blue-400" /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5 overflow-x-hidden">
        {menuItems.map((item, idx) => (
          <React.Fragment key={item.id}>
            {item.section && !isCollapsed && (
              <div className={`px-2.5 pt-2 pb-1 text-[9px] font-semibold tracking-wider text-slate-500 uppercase truncate ${idx > 0 ? 'mt-1.5' : ''}`}>
                {item.section}
              </div>
            )}
            {item.section && isCollapsed && idx > 0 && (
              <div className="my-1.5 border-t border-[#1E2330] mx-2" />
            )}

            <button
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-0 py-2' : 'justify-start px-2.5 py-1.5'
              } text-xs font-medium transition-all group relative rounded ${
                activeTab === item.id
                  ? 'bg-blue-600/10 text-blue-300 border-l-2 border-blue-500 rounded-l-none'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161922] border-l-2 border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className={`shrink-0 transition-colors ${activeTab === item.id ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="truncate text-[11px]">{item.label}</span>}
              </div>
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Security & System Info Footer */}
      <div className={`p-2.5 border-t border-[#1E2330] bg-[#090A0F] text-[10px] text-slate-500 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center space-x-1.5" title="Локальный изолированный контур">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
          {!isCollapsed && <span className="truncate text-slate-400">Локальный контур</span>}
        </div>
        {!isCollapsed && <span className="font-mono text-[9px] text-slate-500">Air-Gap</span>}
      </div>
    </aside>
  );
};


