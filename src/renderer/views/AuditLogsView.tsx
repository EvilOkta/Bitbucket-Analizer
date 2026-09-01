import React, { useState, useEffect } from 'react';
import { AuditLogItem } from '../../shared/types';
import { ShieldCheck, Download, Search, CheckCircle2 } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    if ((window as any).electronApi) {
      const data = await (window as any).electronApi.getAuditLogs();
      setLogs(data);
    } else {
      // Fallback
      setLogs([
        {
          id: 'log-1',
          timestamp: new Date().toISOString(),
          action: 'Запуск статического анализа',
          targetType: 'Repository',
          targetId: 'PROJ/order-service',
          details: 'Просканировано 7 файлов, извлечено 3 API эндпоинта',
          status: 'success'
        },
        {
          id: 'log-2',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          action: 'Проверка PAT токена',
          targetType: 'Bitbucket Server',
          targetId: 'cred-bitbucket',
          details: 'Соединение с https://bitbucket.corp.local подтверждено',
          status: 'success'
        }
      ]);
    }
  };

  const filtered = logs.filter(
    l => l.action.toLowerCase().includes(search.toLowerCase()) || l.details.toLowerCase().includes(search.toLowerCase())
  );

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#090A0F] text-[#F1F5F9] select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#1E2330] bg-[#111318] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-[#161922] border border-[#1E2330] text-emerald-400">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
              <span>Информационная безопасность и Журнал аудита</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-900/50">
                Air-Gap Compliant
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Реестр доступа к репозиториям, проверки токенов, запусков анализа и локальных вызовов Qwen
            </p>
          </div>
        </div>

        <button
          onClick={exportLogs}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#161922] hover:bg-[#1E222D] border border-[#1E2330] text-slate-200 rounded text-xs transition"
        >
          <Download size={13} />
          <span>Экспорт JSON</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {/* Search */}
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по журналу безопасности..."
            className="w-full bg-[#111318] border border-[#1E2330] rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        {/* Table */}
        <div className="bg-[#111318] border border-[#1E2330] rounded overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161922] text-slate-400 font-mono text-[11px] uppercase border-b border-[#1E2330]">
              <tr>
                <th className="p-3">Время (UTC)</th>
                <th className="p-3">Действие</th>
                <th className="p-3">Объект</th>
                <th className="p-3">Детали</th>
                <th className="p-3">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2330] font-mono text-xs">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-[#161922]/60 transition">
                  <td className="p-3 text-slate-400 text-[11px]">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-3 font-semibold text-slate-200">{log.action}</td>
                  <td className="p-3 text-blue-400">{log.targetType} ({log.targetId})</td>
                  <td className="p-3 text-slate-300 font-sans text-xs">{log.details}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 text-[10px]">
                      <CheckCircle2 size={11} />
                      <span>{log.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

