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
    <div className="p-8 max-w-4xl mx-auto space-y-8 overflow-y-auto h-full">
      <div>
        <h2 className="text-xl font-bold text-gray-100 flex items-center space-x-2">
          <KeyRound className="text-blue-400" size={22} />
          <span>Подключения и Учетные записи (PAT & LiteLLM & PostgreSQL)</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Настройте и интерактивно протестируйте подключение к внутренним сервисам Bitbucket, Confluence, базе данных PostgreSQL и локальной нейросети LiteLLM / Qwen.
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. Bitbucket Server */}
        <div className="glass-panel p-6 rounded-xl space-y-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
              <Server size={18} className="text-blue-400" />
              <span>Bitbucket Server / Data Center</span>
            </div>
            <span className="text-[10px] font-mono bg-blue-950/60 text-blue-400 px-2 py-0.5 rounded border border-blue-800/40">
              Personal Access Token (PAT)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">URL сервера Bitbucket</label>
              <input
                type="text"
                value={bbUrl}
                onChange={e => setBbUrl(e.target.value)}
                placeholder="https://bitbucket.corp.local"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Personal Access Token (PAT)</label>
              <input
                type="password"
                value={bbToken}
                onChange={e => setBbToken(e.target.value)}
                placeholder="Вставьте PAT токен Bitbucket"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs">
              {testResult?.id === 'bitbucket' && (
                <div className={`flex items-center space-x-1.5 ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {testResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => handleSaveAndTest('bitbucket')}
              disabled={testingId === 'bitbucket'}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
            >
              {testingId === 'bitbucket' && <RefreshCw size={13} className="animate-spin" />}
              <span>Сохранить и проверить связь</span>
            </button>
          </div>
        </div>

        {/* 2. Confluence Server */}
        <div className="glass-panel p-6 rounded-xl space-y-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
              <Share2 size={18} className="text-purple-400" />
              <span>Confluence Server / Data Center</span>
            </div>
            <span className="text-[10px] font-mono bg-purple-950/60 text-purple-400 px-2 py-0.5 rounded border border-purple-800/40">
              PAT Авторизация (Только редактируемые пространства)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">URL сервера Confluence</label>
              <input
                type="text"
                value={confUrl}
                onChange={e => setConfUrl(e.target.value)}
                placeholder="https://confluence.corp.local"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Personal Access Token (PAT)</label>
              <input
                type="password"
                value={confToken}
                onChange={e => setConfToken(e.target.value)}
                placeholder="Вставьте PAT токен Confluence"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs">
              {testResult?.id === 'confluence' && (
                <div className={`flex items-center space-x-1.5 ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {testResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => handleSaveAndTest('confluence')}
              disabled={testingId === 'confluence'}
              className="flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
            >
              {testingId === 'confluence' && <RefreshCw size={13} className="animate-spin" />}
              <span>Сохранить и проверить связь</span>
            </button>
          </div>
        </div>

        {/* 3. PostgreSQL Direct Database Connection */}
        <div className="glass-panel p-6 rounded-xl space-y-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
              <Database size={18} className="text-amber-400" />
              <span>База данных PostgreSQL (Direct Read-Only Connection)</span>
            </div>
            <span className="text-[10px] font-mono bg-amber-950/60 text-amber-400 px-2 py-0.5 rounded border border-amber-800/40">
              Read-Only Schema Inspector
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Хост (Host)</label>
              <input
                type="text"
                value={pgHost}
                onChange={e => setPgHost(e.target.value)}
                placeholder="localhost / pg.corp.local"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Порт (Port)</label>
              <input
                type="number"
                value={pgPort}
                onChange={e => setPgPort(Number(e.target.value))}
                placeholder="5432"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Имя базы данных</label>
              <input
                type="text"
                value={pgDatabase}
                onChange={e => setPgDatabase(e.target.value)}
                placeholder="app_db"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Пользователь (Username)</label>
              <input
                type="text"
                value={pgUser}
                onChange={e => setPgUser(e.target.value)}
                placeholder="postgres / readonly_user"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Пароль (Шифруется AES-256)</label>
              <input
                type="password"
                value={pgPassword}
                onChange={e => setPgPassword(e.target.value)}
                placeholder="Пароль пользователя БД"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs">
              {testResult?.id === 'database' && (
                <div className={`flex items-center space-x-1.5 ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {testResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => handleSaveAndTest('database')}
              disabled={testingId === 'database'}
              className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
            >
              {testingId === 'database' && <RefreshCw size={13} className="animate-spin" />}
              <span>Сохранить и проверить PostgreSQL</span>
            </button>
          </div>
        </div>

        {/* 4. LiteLLM Proxy / Qwen */}
        <div className="glass-panel p-6 rounded-xl space-y-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
              <Sparkles size={18} className="text-emerald-400" />
              <span>Локальная нейросеть / LiteLLM Proxy (Qwen / OpenAI-compatible)</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/40">
              LiteLLM Server & API Key
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">URL сервера LiteLLM</label>
              <input
                type="text"
                value={qwenUrl}
                onChange={e => setQwenUrl(e.target.value)}
                placeholder="http://localhost:4000/v1 или http://litellm.corp.local:4000"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">API Key / Токен авторизации LiteLLM</label>
              <input
                type="password"
                value={qwenToken}
                onChange={e => setQwenToken(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Optional Model override */}
          <div>
            <button
              onClick={() => setShowAdvancedModel(!showAdvancedModel)}
              className="text-[11px] text-gray-400 hover:text-gray-200 flex items-center space-x-1"
            >
              <SlidersHorizontal size={11} />
              <span>{showAdvancedModel ? 'Скрыть дополнительное имя модели' : 'Дополнительно: указать специфическое имя модели (опционально)'}</span>
            </button>
            {showAdvancedModel && (
              <div className="mt-2">
                <input
                  type="text"
                  value={qwenModel}
                  onChange={e => setQwenModel(e.target.value)}
                  placeholder="Оставьте пустым для авто-роутинга LiteLLM или укажите qwen2.5-coder"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-xs">
              {testResult?.id === 'llm' && (
                <div className={`flex items-center space-x-1.5 ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {testResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => handleSaveAndTest('llm')}
              disabled={testingId === 'llm'}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
            >
              {testingId === 'llm' && <RefreshCw size={13} className="animate-spin" />}
              <span>Сохранить и проверить связь</span>
            </button>
          </div>

          {/* Interactive Test Prompt to Live LiteLLM Model */}
          <div className="p-4 bg-gray-950/70 border border-emerald-900/40 rounded-xl space-y-3 mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                <Terminal size={14} />
                <span>Интерактивный тест LiteLLM / Qwen (Пробный запрос)</span>
              </span>
              {qwenLatency && (
                <span className="font-mono text-[11px] text-gray-400 flex items-center space-x-1">
                  <Activity size={12} className="text-emerald-400" />
                  <span>Задержка: {qwenLatency} мс</span>
                </span>
              )}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={qwenPrompt}
                onChange={e => setQwenPrompt(e.target.value)}
                placeholder="Введите тестовый вопрос для LiteLLM..."
                className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                onClick={handleTestQwenPrompt}
                disabled={isPromptTesting}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 shrink-0"
              >
                {isPromptTesting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Спросить LiteLLM</span>
              </button>
            </div>

            {qwenResponse && (
              <div className="p-3 bg-gray-900/90 rounded-lg border border-emerald-800/50 text-xs font-mono text-emerald-300 space-y-1">
                <span className="text-[10px] text-gray-500 uppercase block font-sans font-semibold">Ответ сервера LiteLLM:</span>
                <p className="leading-relaxed whitespace-pre-wrap">{qwenResponse}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
