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
  ChevronLeft,
  ChevronRight
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
    { section: 'ОБЗОР', id: 'dashboard', label: 'Панель управления', icon: <LayoutDashboard size={18} /> },
    { id: 'repositories', label: 'Репозитории', icon: <FolderGit2 size={18} /> },
    { id: 'project-graph', label: 'D3-Граф проектов', icon: <Network size={18} /> },
    
    { section: 'АРХИТЕКТУРА & КОД', id: 'explorer', label: 'Дерево проекта', icon: <FolderTree size={18} /> },
    { id: 'stack', label: 'Стек технологий', icon: <Cpu size={18} /> },
    { id: 'api-map', label: 'Карта API', icon: <Waypoints size={18} /> },
    { id: 'data-flows', label: 'Data Flows & Sequence', icon: <GitPullRequest size={18} /> },
    { id: 'data-model', label: 'Модель данных (ERD)', icon: <Database size={18} /> },
    { id: 'recommendations', label: 'Рекомендации', icon: <Lightbulb size={18} /> },

    { section: 'ИНТЕГРАЦИИ & БЕЗОПАСНОСТЬ', id: 'confluence', label: 'Confluence публикация', icon: <Share2 size={18} /> },
    { id: 'connections', label: 'Подключения & PAT', icon: <KeyRound size={18} /> },
    { id: 'audit', label: 'ИБ & Журнал аудита', icon: <ShieldCheck size={18} /> }
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-60'
      } bg-gray-950/90 border-r border-gray-800 flex flex-col h-full select-none transition-all duration-300 ease-in-out shrink-0 z-20`}
    >
      {/* Brand Header & Toggle Button */}
      <div className="p-3 border-b border-gray-800 flex items-center justify-between min-h-[56px] relative">
        <div className="flex items-center space-x-2.5 min-w-0 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <FolderGit2 className="text-white" size={17} />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 truncate">
              <h1 className="font-bold text-xs text-gray-100 tracking-tight leading-tight truncate">Bitbucket Analyzer</h1>
              <span className="text-[10px] text-blue-400 font-mono">Portable Win v1.8</span>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button */}
        <button
          onClick={toggleCollapse}
          className={`p-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-800 transition ${
            isCollapsed ? 'mx-auto mt-0' : ''
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
              <div className={`px-2.5 pt-2.5 pb-1 text-[9px] font-bold tracking-wider text-gray-500 uppercase truncate ${idx > 0 ? 'mt-1.5' : ''}`}>
                {item.section}
              </div>
            )}
            {item.section && isCollapsed && idx > 0 && (
              <div className="my-1.5 border-t border-gray-800/80 mx-2" />
            )}

            <button
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-0 py-2' : 'justify-start px-2.5 py-1.5'
              } rounded-lg text-xs font-medium transition-all group relative ${
                activeTab === item.id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/70 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className={`shrink-0 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-blue-400' : 'text-gray-400'}`}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="truncate text-[11px]">{item.label}</span>}
              </div>
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Security & System Info Footer */}
      <div className={`p-2 border-t border-gray-800/80 bg-gray-950/40 text-[10px] text-gray-500 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center space-x-1.5" title="Локальный изолированный контур">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          {!isCollapsed && <span className="truncate">Локальный контур</span>}
        </div>
        {!isCollapsed && <span className="font-mono text-[9px] text-gray-500">Air-Gap</span>}
      </div>
    </aside>
  );
};

