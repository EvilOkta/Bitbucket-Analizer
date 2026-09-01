import React, { useState, useEffect } from 'react';
import { AuditLogItem } from '../../shared/types';
import { ShieldCheck, Download, Search, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

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
    <div className="p-8 space-y-6 overflow-y-auto h-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center space-x-2">
            <ShieldCheck className="text-emerald-400" size={22} />
            <span>Информационная безопасность и Журнал аудита</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Реестр всех операций доступа к репозиториям, проверки токенов, запусков анализа и обращений к локальной LLM.
          </p>
        </div>
        <button
          onClick={exportLogs}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 rounded-lg text-xs transition"
        >
          <Download size={13} />
          <span>Экспорт журнала</span>
        </button>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden space-y-3 p-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по журналу безопасности..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-950 text-gray-400 font-mono text-[11px] uppercase border-b border-gray-800">
              <tr>
                <th className="p-2.5">Время (UTC)</th>
                <th className="p-2.5">Действие</th>
                <th className="p-2.5">Объект</th>
                <th className="p-2.5">Детали</th>
                <th className="p-2.5">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 font-mono">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-900/40">
                  <td className="p-2.5 text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-2.5 font-semibold text-gray-200">{log.action}</td>
                  <td className="p-2.5 text-blue-400">{log.targetType} ({log.targetId})</td>
                  <td className="p-2.5 text-gray-300 font-sans text-xs">{log.details}</td>
                  <td className="p-2.5">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                      <CheckCircle2 size={10} />
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
