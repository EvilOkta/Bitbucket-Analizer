import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FullAnalysisResult } from '../../engine/engineService';
import { NavTab } from './Sidebar';
import {
  Search,
  LayoutDashboard,
  Network,
  Code2,
  Database,
  ShieldCheck,
  Settings,
  Waypoints,
  FileCode2,
  GitPullRequest,
  Table,
  Tag,
  FlaskConical,
  Share2,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: FullAnalysisResult | null;
  onNavigate: (tab: NavTab, context?: any) => void;
}

interface SearchItem {
  id: string;
  category: 'Навигация' | 'API Эндпоинты' | 'Модель данных (ERD)' | 'Экранные формы' | 'Файлы проекта' | 'Действия';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  analysis,
  onNavigate
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Index all searchable entities from the analysis result
  const items: SearchItem[] = useMemo(() => {
    const list: SearchItem[] = [];

    // 1. Primary Hub Navigation
    list.push(
      {
        id: 'nav-overview',
        category: 'Навигация',
        title: 'Хаб: Обзор & Инсайты',
        subtitle: 'Панель управления, стек технологий и сводка проекта',
        icon: <LayoutDashboard size={14} className="text-blue-400" />,
        action: () => onNavigate('dashboard')
      },
      {
        id: 'nav-arch',
        category: 'Навигация',
        title: 'Хаб: Архитектура & Проекты',
        subtitle: 'D3 граф структуры репозиториев, монорепозиториев и версий',
        icon: <Network size={14} className="text-purple-400" />,
        action: () => onNavigate('architecture')
      },
      {
        id: 'nav-code-api',
        category: 'Навигация',
        title: 'Хаб: Код, API & Data Flows',
        subtitle: 'IDE-студия: Карта API, проводник кода и Sequence трассировка',
        icon: <Code2 size={14} className="text-emerald-400" />,
        action: () => onNavigate('code_api')
      },
      {
        id: 'nav-data',
        category: 'Навигация',
        title: 'Хаб: Модель данных & ERD',
        subtitle: 'Схема БД, таблицы, ENUM перечисления и связи FK',
        icon: <Database size={14} className="text-amber-400" />,
        action: () => onNavigate('data-model')
      },
      {
        id: 'nav-qa',
        category: 'Навигация',
        title: 'Хаб: Качество & Безопасность',
        subtitle: 'Автотесты, рекомендации архитектуры и журнал ИБ',
        icon: <ShieldCheck size={14} className="text-cyan-400" />,
        action: () => onNavigate('qa_security')
      },
      {
        id: 'nav-settings',
        category: 'Навигация',
        title: 'Хаб: Интеграции & Экспорт',
        subtitle: 'Подключения Bitbucket/Confluence/LLM и мастер публикации',
        icon: <Settings size={14} className="text-slate-400" />,
        action: () => onNavigate('settings_export')
      }
    );

    if (analysis) {
      // 2. API Endpoints
      (analysis.endpoints || []).forEach(ep => {
        list.push({
          id: `ep-${ep.id || ep.path}`,
          category: 'API Эндпоинты',
          title: `${ep.method.toUpperCase()} ${ep.path}`,
          subtitle: ep.description || ep.controller || ep.handler || 'REST API метод',
          icon: <Waypoints size={14} className="text-blue-400" />,
          badge: ep.method.toUpperCase(),
          action: () => onNavigate('code_api', { targetEndpointId: ep.id, subTab: 'api' })
        });
      });

      // 3. Database Entities (Tables & ENUMs)
      (analysis.dataModel?.entities || []).forEach(ent => {
        list.push({
          id: `db-${ent.id}`,
          category: 'Модель данных (ERD)',
          title: ent.name,
          subtitle: ent.isEnum ? `ENUM перечисление (${ent.enumValues?.length || 0} знач.)` : `Таблица БД (${ent.attributes?.length || 0} колонок)`,
          icon: ent.isEnum ? <Tag size={14} className="text-teal-400" /> : <Table size={14} className="text-amber-400" />,
          badge: ent.isEnum ? 'ENUM' : 'TABLE',
          action: () => onNavigate('data-model', { selectedEntityId: ent.id })
        });
      });

      // 4. UI Screen Forms
      (analysis.screenForms || []).forEach(form => {
        list.push({
          id: `form-${form.id}`,
          category: 'Экранные формы',
          title: form.name,
          subtitle: `Маршрут: ${form.route || '/'} (${form.elements?.length || 0} интерактивных элементов)`,
          icon: <GitPullRequest size={14} className="text-emerald-400" />,
          badge: 'UI FORM',
          action: () => onNavigate('code_api', { selectedFormId: form.id, subTab: 'flows' })
        });
      });
    }

    return list;
  }, [analysis, onNavigate]);

  // Filter items by query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items.slice(0, 15);
    const q = query.toLowerCase().trim();
    return items
      .filter(item => item.title.toLowerCase().includes(q) || (item.subtitle && item.subtitle.toLowerCase().includes(q)) || item.category.toLowerCase().includes(q))
      .slice(0, 25);
  }, [items, query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1 < filteredItems.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#111318] border border-[#1E2330] rounded shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-3.5 py-3 border-b border-[#1E2330] bg-[#161922]">
          <Search size={16} className="text-blue-400 mr-2.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Быстрый поиск: эндпоинты, таблицы БД, экранные формы, хабы (Ctrl+K)..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-[#0D0E14] border border-[#1E2330] rounded shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-transparent">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 font-mono">
              Ничего не найдено по запросу «{query}»
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2 rounded cursor-pointer transition flex items-center justify-between group ${
                    isSelected ? 'bg-blue-600/15 border border-blue-500/50 text-slate-100' : 'hover:bg-[#161922] text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 mr-2">
                    <div className="p-1.5 rounded bg-[#090A0F] border border-[#1E2330] shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold font-mono truncate">{item.title}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-[#090A0F] text-blue-400 border border-[#1E2330] rounded">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">{item.category}</span>
                    <ArrowRight size={12} className={`text-blue-400 transition-transform ${isSelected ? 'translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-3.5 py-2 border-t border-[#1E2330] bg-[#090A0F] text-[10px] text-slate-500 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-3">
            <span><kbd className="text-slate-400 font-bold">↑↓</kbd> Навигация</span>
            <span><kbd className="text-slate-400 font-bold">Enter</kbd> Выбрать</span>
            <span><kbd className="text-slate-400 font-bold">Esc</kbd> Закрыть</span>
          </div>
          <span className="text-blue-400">Precision Quick Switcher</span>
        </div>
      </div>
    </div>
  );
};
