import React, { useState, useEffect } from 'react';
import { FullAnalysisResult } from '../../engine/engineService';
import { Share2, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Info, Edit3, ListFilter } from 'lucide-react';

interface ConfluencePublishViewProps {
  analysis: FullAnalysisResult | null;
}

export const ConfluencePublishView: React.FC<ConfluencePublishViewProps> = ({ analysis }) => {
  const [spaces, setSpaces] = useState<{ key: string; name: string }[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [customSpaceKey, setCustomSpaceKey] = useState('');
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [pageTitle, setPageTitle] = useState('Отчет по архитектуре репозитория');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string; pageUrl?: string } | null>(null);

  // Sections toggle
  const [includeOverview, setIncludeOverview] = useState(true);
  const [includeStack, setIncludeStack] = useState(true);
  const [includeApi, setIncludeApi] = useState(true);
  const [includeSequence, setIncludeSequence] = useState(true);
  const [includeErd, setIncludeErd] = useState(true);
  const [includeRecs, setIncludeRecs] = useState(true);

  useEffect(() => {
    loadLiveSpaces();
    if (analysis) {
      setPageTitle(`Архитектурный анализ: ${analysis.run.repositoryName} (${analysis.run.branch})`);
    }
  }, [analysis]);

  const loadLiveSpaces = async () => {
    setLoadingSpaces(true);
    if ((window as any).electronApi) {
      try {
        const liveSpaces = await (window as any).electronApi.getConfluenceSpaces();
        setSpaces(liveSpaces || []);
        if (liveSpaces && liveSpaces.length > 0) {
          setSelectedSpace(liveSpaces[0].key);
        }
      } catch (err) {
        console.error('Failed to load Confluence spaces:', err);
      }
    }
    setLoadingSpaces(false);
  };

  const activeSpaceKey = useCustomKey ? customSpaceKey.trim().toUpperCase() : selectedSpace;

  const handlePublish = async () => {
    if (!analysis || !activeSpaceKey) return;
    setIsPublishing(true);
    setPublishResult(null);

    // Build rich HTML report content for Confluence Storage Format
    const htmlReport = `
<h2>1. Общие сведения о репозитории</h2>
<p><strong>Репозиторий:</strong> ${analysis.run.repositoryName}</p>
<p><strong>Ветка:</strong> ${analysis.run.branch} (Commit: ${analysis.run.commitHash})</p>
<p><strong>Файлов:</strong> ${analysis.run.stats.totalFiles} | <strong>Строк кода:</strong> ${analysis.run.stats.totalLines}</p>

<h2>2. Технологический стек</h2>
<ul>
${analysis.stack.map(s => `<li><strong>${s.technology}</strong> (${s.category}): точность ${Math.round(s.confidence * 100)}%</li>`).join('')}
</ul>

<h2>3. Реестр API эндпоинтов (${analysis.endpoints.length})</h2>
<table>
  <thead>
    <tr><th>Метод</th><th>Маршрут</th><th>Контроллер</th><th>Файл</th></tr>
  </thead>
  <tbody>
    ${analysis.endpoints.map(e => `<tr><td>${e.method}</td><td>${e.path}</td><td>${e.controller}</td><td>${e.sourceFile}</td></tr>`).join('')}
  </tbody>
</table>

<h2>4. Модель данных (PostgreSQL)</h2>
<p>Таблиц: ${analysis.dataModel.entities.length}, Связей: ${analysis.dataModel.relationships.length}</p>
<ac:structured-macro ac:name="mermaid">
  <ac:plain-text-body><![CDATA[${analysis.dataModel.erDiagramMermaid}]]></ac:plain-text-body>
</ac:structured-macro>

<h2>5. Архитектурные рекомендации и аудит</h2>
<ul>
${analysis.recommendations.map(r => `<li><strong>[${r.severity.toUpperCase()}] ${r.title}</strong>: ${r.description}</li>`).join('')}
</ul>
`;

    if ((window as any).electronApi) {
      const res = await (window as any).electronApi.publishToConfluence('cred-confluence', {
        id: `pub-${Date.now()}`,
        spaceKey: activeSpaceKey,
        pageTitle
      }, htmlReport);

      setPublishResult(res);
    } else {
      setTimeout(() => {
        setPublishResult({
          success: true,
          pageUrl: `https://confluence.corp.local/display/${activeSpaceKey}/Report-Demo`,
          message: `Страница успешно создана в пространстве ${activeSpaceKey} (демо-режим)`
        });
      }, 1000);
    }

    setIsPublishing(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
      <div>
        <h2 className="text-xl font-bold text-gray-100 flex items-center space-x-2">
          <Share2 className="text-purple-400" size={22} />
          <span>Публикация отчета в Confluence Server</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Экспорт сформированной документации, диаграмм связей, OpenAPI спецификаций и рекомендаций в корпоративную базу знаний.
        </p>
      </div>

      <div className="glass-panel p-6 rounded-xl space-y-5">
        {/* Space Selection Mode */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-300">Целевое пространство Confluence (Space)</label>
            <div className="flex items-center space-x-3 text-xs">
              <button
                type="button"
                onClick={() => setUseCustomKey(!useCustomKey)}
                className="text-purple-400 hover:text-purple-300 flex items-center space-x-1 transition"
              >
                {useCustomKey ? <ListFilter size={13} /> : <Edit3 size={13} />}
                <span>{useCustomKey ? 'Выбрать из списка' : 'Ввести ключ пространства вручную'}</span>
              </button>
              <button
                type="button"
                onClick={loadLiveSpaces}
                disabled={loadingSpaces}
                className="text-gray-400 hover:text-gray-200 flex items-center space-x-1 transition"
              >
                <RefreshCw size={12} className={loadingSpaces ? 'animate-spin' : ''} />
                <span>Обновить</span>
              </button>
            </div>
          </div>

          {useCustomKey ? (
            <div>
              <input
                type="text"
                value={customSpaceKey}
                onChange={e => setCustomSpaceKey(e.target.value)}
                placeholder="Введите точный ключ пространства (например: ARCH, TEAM, DOCS, DEV)..."
                className="w-full bg-gray-900 border border-purple-500/80 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-400 font-mono uppercase"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Ключ пространства из URL Confluence (например: <code>https://confluence.corp.local/display/<b>MYSPACE</b></code>).
              </p>
            </div>
          ) : (
            <div>
              {spaces.length > 0 ? (
                <select
                  value={selectedSpace}
                  onChange={e => setSelectedSpace(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500 font-mono"
                >
                  {spaces.map(s => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-300 flex items-center justify-between">
                  <span>Список пространств загружается или пуст.</span>
                  <button
                    onClick={() => setUseCustomKey(true)}
                    className="text-purple-400 hover:underline font-semibold"
                  >
                    Ввести ключ вручную &rarr;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">Заголовок страницы</label>
          <input
            type="text"
            value={pageTitle}
            onChange={e => setPageTitle(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500 font-mono"
          />
        </div>

        {/* Included Sections */}
        <div className="space-y-2 pt-2 border-t border-gray-800">
          <label className="block text-xs font-semibold text-gray-300">Включаемые разделы документации</label>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={includeOverview} onChange={e => setIncludeOverview(e.target.checked)} className="rounded" />
              <span>Общие метрики репозитория и ветка</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={includeStack} onChange={e => setIncludeStack(e.target.checked)} className="rounded" />
              <span>Технологический стек и фреймворки</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={includeApi} onChange={e => setIncludeApi(e.target.checked)} className="rounded" />
              <span>Таблица API эндпоинтов и маршрутов</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={includeSequence} onChange={e => setIncludeSequence(e.target.checked)} className="rounded" />
              <span>Sequence-диаграммы (Call Graph)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={includeErd} onChange={e => setIncludeErd(e.target.checked)} className="rounded" />
              <span>ER-диаграмма PostgreSQL (DDL)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={includeRecs} onChange={e => setIncludeRecs(e.target.checked)} className="rounded" />
              <span>Архитектурные рекомендации & ИБ аудит</span>
            </label>
          </div>
        </div>

        {/* Publish Action */}
        <div className="pt-4 flex items-center justify-between">
          <div>
            {publishResult && (
              <div className={`flex items-center space-x-2 text-xs ${publishResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {publishResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{publishResult.message}</span>
                {publishResult.pageUrl && (
                  <a
                    href={publishResult.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline flex items-center space-x-1 text-blue-400 ml-2"
                  >
                    <span>Открыть страницу</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handlePublish}
            disabled={isPublishing || !analysis || !activeSpaceKey}
            className="flex items-center space-x-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 shadow-lg shadow-purple-600/20"
          >
            {isPublishing && <RefreshCw size={13} className="animate-spin" />}
            <span>Опубликовать в Confluence ({activeSpaceKey || '...'})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
