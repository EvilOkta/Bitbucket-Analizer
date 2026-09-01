import React from 'react';
import { StackProfile } from '../../shared/types';
import { Cpu, CheckCircle2, ShieldAlert } from 'lucide-react';

interface StackOverviewViewProps {
  stack: StackProfile[];
}

export const StackOverviewView: React.FC<StackOverviewViewProps> = ({ stack }) => {
  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-100 flex items-center space-x-2">
          <Cpu className="text-blue-400" size={22} />
          <span>Технологический стек проекта</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Автоматически распознанные языки программирования, фреймворки, драйверы баз данных и инструменты CI/CD с доказательствами (Evidence).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stack.map((item, idx) => (
          <div key={idx} className="glass-panel p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-gray-100">{item.technology}</span>
                {item.version && (
                  <span className="text-[10px] font-mono text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                    {item.version}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                {Math.round(item.confidence * 100)}% точность
              </span>
            </div>

            <div className="text-xs text-gray-400">
              <span className="text-gray-500">Категория: </span>
              <span className="font-mono text-blue-300 uppercase text-[11px]">{item.category.replace('_', ' ')}</span>
            </div>

            <div className="space-y-1 pt-2 border-t border-gray-800/80">
              <span className="text-[11px] text-gray-500 font-semibold">Доказательная база:</span>
              <ul className="space-y-1">
                {item.evidence.map((ev, eIdx) => (
                  <li key={eIdx} className="text-xs text-gray-300 flex items-start space-x-1.5">
                    <CheckCircle2 size={13} className="text-blue-400 shrink-0 mt-0.5" />
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
