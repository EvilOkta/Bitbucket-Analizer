import React, { useState, useEffect } from 'react';
import { IntegrationCredential } from '../../shared/types';
import {
  KeyRound,
  Shield,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Share2,
  Sparkles,
  Database,
  Send,
  Terminal,
  Activity,
  SlidersHorizontal
} from 'lucide-react';

export const ConnectionsView: React.FC = () => {
  const [credentials, setCredentials] = useState<IntegrationCredential[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Form states
  const [bbUrl, setBbUrl] = useState('https://bitbucket.corp.local');
  const [bbToken, setBbToken] = useState('');

  const [confUrl, setConfUrl] = useState('https://confluence.corp.local');
  const [confToken, setConfToken] = useState('');

  // LiteLLM proxy states
  const [qwenUrl, setQwenUrl] = useState('http://localhost:4000/v1');
  const [qwenToken, setQwenToken] = useState('');
  const [qwenModel, setQwenModel] = useState('');
  const [showAdvancedModel, setShowAdvancedModel] = useState(false);

  // PostgreSQL Direct DB settings
  const [pgHost, setPgHost] = useState('localhost');
  const [pgPort, setPgPort] = useState(5432);
  const [pgDatabase, setPgDatabase] = useState('app_db');
  const [pgUser, setPgUser] = useState('postgres');
  const [pgPassword, setPgPassword] = useState('');

  // Interactive Qwen Probe test
  const [qwenPrompt, setQwenPrompt] = useState('Сделай краткое резюме об архитектурных преимуществах микросервисов и CQRS на русском языке (2-3 предложения).');
  const [qwenResponse, setQwenResponse] = useState<string | null>(null);
  const [qwenLatency, setQwenLatency] = useState<number | null>(null);
  const [isPromptTesting, setIsPromptTesting] = useState(false);

  useEffect(() => {
    loadCreds();
  }, []);

  const loadCreds = async () => {
    if ((window as any).electronApi) {
      const creds = await (window as any).electronApi.getCredentials();
      setCredentials(creds);

      const bb = creds.find((c: IntegrationCredential) => c.type === 'bitbucket');
      if (bb) {
        setBbUrl(bb.url);
        setBbToken(bb.token || '');
      }

      const conf = creds.find((c: IntegrationCredential) => c.type === 'confluence');
      if (conf) {
        setConfUrl(conf.url);
        setConfToken(conf.token || '');
      }

      const llm = creds.find((c: IntegrationCredential) => c.type === 'llm');
      if (llm) {
        setQwenUrl(llm.url);
        setQwenToken(llm.token || '');
        if (llm.modelName) setQwenModel(llm.modelName);
      }

      const db = creds.find((c: IntegrationCredential) => c.type === 'database');
      if (db) {
        setPgHost(db.url || 'localhost');
        if (db.port) setPgPort(db.port);
        if (db.database) setPgDatabase(db.database);
        if (db.username) setPgUser(db.username);
        setPgPassword(db.token || '');
      }
    }
  };

  const handleSaveAndTest = async (type: 'bitbucket' | 'confluence' | 'llm' | 'database') => {
    setTestingId(type);
    setTestResult(null);

    let cred: IntegrationCredential;
    if (type === 'bitbucket') {
      cred = {
        id: 'cred-bitbucket',
        type: 'bitbucket',
        name: 'Bitbucket Server',
        url: bbUrl,
        token: bbToken,
        status: 'untested'
      };
    } else if (type === 'confluence') {
      cred = {
        id: 'cred-confluence',
        type: 'confluence',
        name: 'Confluence Server',
        url: confUrl,
        token: confToken,
        status: 'untested'
      };
    } else if (type === 'llm') {
      cred = {
        id: 'cred-llm',
        type: 'llm',
        name: 'LiteLLM / Qwen Proxy',
        url: qwenUrl,
        token: qwenToken,
        modelName: qwenModel || undefined,
        status: 'untested'
      };
    } else {
      cred = {
        id: 'cred-postgres',
        type: 'database',
        name: 'PostgreSQL Database',
        url: pgHost,
        port: pgPort,
        database: pgDatabase,
        username: pgUser,
        token: pgPassword,
        status: 'untested'
      };
    }

    if ((window as any).electronApi) {
      await (window as any).electronApi.saveCredential(cred);
      const res = await (window as any).electronApi.testConnection(cred);
      setTestResult({ id: type, success: res.success, message: res.message });
      loadCreds();
    } else {
      setTimeout(() => {
        setTestResult({ id: type, success: true, message: 'Тестовое подключение успешно проверено' });
      }, 600);
    }
    setTestingId(null);
  };

  const handleTestQwenPrompt = async () => {
    setIsPromptTesting(true);
    setQwenResponse(null);
    setQwenLatency(null);

    if ((window as any).electronApi) {
      await (window as any).electronApi.saveCredential({
        id: 'cred-llm',
        type: 'llm',
        name: 'LiteLLM / Qwen Proxy',
        url: qwenUrl,
        token: qwenToken,
        modelName: qwenModel || undefined
      });

      const res = await (window as any).electronApi.testQwenPrompt(qwenPrompt);
      setQwenResponse(res.responseText);
      if (res.latencyMs) setQwenLatency(res.latencyMs);
    } else {
      setTimeout(() => {
        setQwenResponse('Архитектура микросервисов в сочетании с CQRS позволяет изолировать транзакционные нагрузки и масштабировать запросы на чтение независимо от записи.');
        setQwenLatency(280);
      }, 800);
    }
    setIsPromptTesting(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#090A0F] text-[#F1F5F9] select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#1E2330] bg-[#111318] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-[#161922] border border-[#1E2330] text-blue-400">
            <KeyRound size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
              <span>Подключения и Учетные записи (PAT & LiteLLM & PostgreSQL)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Настройка и интерактивное тестирование подключения к Bitbucket, Confluence, PostgreSQL и LiteLLM / Qwen
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-4xl space-y-4">
          {/* 1. Bitbucket Server */}
          <div className="bg-[#161922] border border-[#1E2330] rounded p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                <Server size={16} className="text-blue-400" />
                <span>Bitbucket Server / Data Center</span>
              </div>
              <span className="text-[10px] font-mono bg-[#090A0F] text-slate-400 px-2 py-0.5 rounded border border-[#1E2330]">
                Personal Access Token (PAT)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-mono">URL сервера Bitbucket</label>
                <input
                  type="text"
                  value={bbUrl}
                  onChange={e => setBbUrl(e.target.value)}
                  placeholder="https://bitbucket.corp.local"
                  className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-mono">Personal Access Token (PAT)</label>
                <input
                  type="password"
                  value={bbToken}
                  onChange={e => setBbToken(e.target.value)}
                  placeholder="Вставьте PAT токен Bitbucket"
                  className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-mono">
                {testResult?.id === 'bitbucket' && (
                  <div className={`flex items-center space-x-1.5 ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {testResult.success ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleSaveAndTest('bitbucket')}
                disabled={testingId === 'bitbucket'}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition disabled:opacity-50"
              >
                {testingId === 'bitbucket' && <RefreshCw size={13} className="animate-spin" />}
                <span>Сохранить и проверить связь</span>
              </button>
            </div>
          </div>

          {/* 2. Confluence Server */}
          <div className="bg-[#161922] border border-[#1E2330] rounded p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                <Share2 size={16} className="text-sky-400" />
                <span>Confluence Server / Data Center</span>
              </div>
              <span className="text-[10px] font-mono bg-[#090A0F] text-slate-400 px-2 py-0.5 rounded border border-[#1E2330]">
                PAT Авторизация
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-mono">URL сервера Confluence</label>
                <input
                  type="text"
                  value={confUrl}
                  onChange={e => setConfUrl(e.target.value)}
                  placeholder="https://confluence.corp.local"
                  className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-mono">Personal Access Token (PAT)</label>
                <input
                  type="password"
                  value={confToken}
                  onChange={e => setConfToken(e.target.value)}
                  placeholder="Вставьте PAT токен Confluence"
                  className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-mono">
                {testResult?.id === 'confluence' && (
                  <div className={`flex items-center space-x-1.5 ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {testResult.success ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleSaveAndTest('confluence')}
                disabled={testingId === 'confluence'}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition disabled:opacity-50"
              >
                {testingId === 'confluence' && <RefreshCw size={13} className="animate-spin" />}
                <span>Сохранить и проверить связь</span>
              </button>
            </div>
          </div>

          {/* 3. PostgreSQL Direct Database Connection */}
          <div className="bg-[#161922] border border-[#1E2330] rounded p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                <Database size={16} className="text-amber-400" />
                <span>База данных PostgreSQL (Direct Read-Only Connection)</span>
              </div>
              <span className="text-[10px] font-mono bg-[#090A0F] text-slate-400 px-2 py-0.5 rounded border border-[#1E2330]">
                Read-Only Schema Inspector
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-mono">Хост (Host)</label>
                <input
                  type="text"
                  value={pgHost}
                  onChange={e => setPgHost(e.target.value)}
                  placeholder="localhost / pg.corp.local"
                  className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-mono">Порт (Port)</label>
                <input
                  type="number"
                  value={pgPort}
                  onChange={e => setPgPort(Number(e.target.value))}
                  placeholder="5432"
                  className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-mono">Имя базы данных</label>
                <input
                  type="text"
                  value={pgDatabase}
                  onChange={e => setPgDatabase(e.target.value)}
                  placeholder="app_db"
                  className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-mono">Пользователь (Username)</label>
                <input
                  type="text"
                  value={pgUser}
                  onChange={e => setPgUser(e.target.value)}
                  placeholder="postgres / readonly_user"
                  className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-mono">Пароль (Шифруется AES-256)</label>
                <input
                  type="password"
                  value={pgPassword}
                  onChange={e => setPgPassword(e.target.value)}
                  placeholder="Пароль пользователя БД"
                  className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-mono">
                {testResult?.id === 'database' && (
                  <div className={`flex items-center space-x-1.5 ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {testResult.success ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleSaveAndTest('database')}
                disabled={testingId === 'database'}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#1E222D] hover:bg-[#2E3748] border border-[#1E2330] text-slate-200 rounded text-xs font-medium transition disabled:opacity-50"
              >
                {testingId === 'database' && <RefreshCw size={13} className="animate-spin" />}
                <span>Сохранить и проверить PostgreSQL</span>
              </button>
            </div>
          </div>

          {/* 4. LiteLLM Proxy / Qwen */}
          <div className="bg-[#161922] border border-[#1E2330] rounded p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                <Sparkles size={16} className="text-purple-400" />
                <span>Локальная нейросеть / LiteLLM Proxy (Qwen / OpenAI-compatible)</span>
              </div>
              <span className="text-[10px] font-mono bg-[#090A0F] text-slate-400 px-2 py-0.5 rounded border border-[#1E2330]">
                LiteLLM Server & API Key
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-mono">URL сервера LiteLLM</label>
                <input
                  type="text"
                  value={qwenUrl}
                  onChange={e => setQwenUrl(e.target.value)}
                  placeholder="http://localhost:4000/v1"
                  className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-mono">API Key / Токен LiteLLM</label>
                <input
                  type="password"
                  value={qwenToken}
                  onChange={e => setQwenToken(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <button
                onClick={() => setShowAdvancedModel(!showAdvancedModel)}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1 font-mono"
              >
                <SlidersHorizontal size={11} />
                <span>{showAdvancedModel ? 'Скрыть имя модели' : 'Дополнительно: указать специфическое имя модели'}</span>
              </button>
              {showAdvancedModel && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={qwenModel}
                    onChange={e => setQwenModel(e.target.value)}
                    placeholder="qwen2.5-coder"
                    className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-mono">
                {testResult?.id === 'llm' && (
                  <div className={`flex items-center space-x-1.5 ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {testResult.success ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleSaveAndTest('llm')}
                disabled={testingId === 'llm'}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition disabled:opacity-50"
              >
                {testingId === 'llm' && <RefreshCw size={13} className="animate-spin" />}
                <span>Сохранить и проверить связь</span>
              </button>
            </div>

            {/* Interactive Test Prompt */}
            <div className="p-3.5 bg-[#0D0E14] border border-[#1E2330] rounded space-y-2.5 mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center space-x-1.5 text-[11px]">
                  <Terminal size={13} className="text-blue-400" />
                  <span>Интерактивный тест LiteLLM / Qwen (Пробный запрос)</span>
                </span>
                {qwenLatency && (
                  <span className="font-mono text-[10px] text-slate-400 flex items-center space-x-1">
                    <Activity size={11} className="text-blue-400" />
                    <span>{qwenLatency}ms</span>
                  </span>
                )}
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={qwenPrompt}
                  onChange={e => setQwenPrompt(e.target.value)}
                  placeholder="Введите тестовый вопрос для LiteLLM..."
                  className="flex-1 bg-[#111318] border border-[#1E2330] rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  onClick={handleTestQwenPrompt}
                  disabled={isPromptTesting}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#1E222D] hover:bg-[#2E3748] border border-[#1E2330] text-slate-200 rounded text-xs font-medium transition disabled:opacity-50 shrink-0"
                >
                  {isPromptTesting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Спросить LiteLLM</span>
                </button>
              </div>

              {qwenResponse && (
                <div className="p-3 bg-[#111318] rounded border border-[#1E2330] text-xs font-mono text-slate-300 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase block font-mono font-semibold">Ответ сервера LiteLLM:</span>
                  <p className="leading-relaxed whitespace-pre-wrap">{qwenResponse}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
