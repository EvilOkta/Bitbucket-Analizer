import React from 'react';
import { StackProfile } from '../../shared/types';
import { Cpu, CheckCircle2 } from 'lucide-react';

interface StackOverviewViewProps {
  stack: StackProfile[];
}

export const StackOverviewView: React.FC<StackOverviewViewProps> = ({ stack }) => {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#090A0F] text-[#F1F5F9] select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#1E2330] bg-[#111318] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-[#161922] border border-[#1E2330] text-blue-400">
            <Cpu size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
              <span>Технологический стек проекта</span>
              <span className="text-[10px] font-mono text-slate-400 bg-[#161922] px-1.5 py-0.2 rounded border border-[#1E2330]">
                {stack.length} компонентов
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Языки программирования, фреймворки, драйверы баз данных и инструменты сборки с доказательной базой
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-6xl">
          {stack.map((item, idx) => (
            <div key={idx} className="bg-[#161922] border border-[#1E2330] hover:border-[#2E3748] transition rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-xs text-slate-100">{item.technology}</span>
                  {item.version && (
                    <span className="text-[10px] font-mono text-slate-400 bg-[#090A0F] px-1.5 py-0.5 rounded border border-[#1E2330]">
                      v{item.version}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
                  {Math.round(item.confidence * 100)}% точность
                </span>
              </div>

              <div className="text-xs text-slate-400">
                <span className="text-slate-500">Категория: </span>
                <span className="font-mono text-blue-400 text-[11px]">{item.category.replace('_', ' ')}</span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#1E2330]">
                <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">Доказательная база:</span>
                <ul className="space-y-1">
                  {item.evidence.map((ev, eIdx) => (
                    <li key={eIdx} className="text-xs text-slate-300 flex items-start space-x-1.5">
                      <CheckCircle2 size={13} className="text-blue-500 shrink-0 mt-0.5" />
                      <span className="font-mono text-[11px] text-slate-300">{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

