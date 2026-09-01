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
    <div className="h-full flex flex-col overflow-hidden bg-[#090A0F] text-[#F1F5F9] select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#1E2330] bg-[#111318] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-[#161922] border border-[#1E2330] text-blue-400">
            <Share2 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
              <span>Экспорт и Публикация отчетов в Confluence Server</span>
            </h2>
            <p className="text-xs text-slate-400">
              Экспорт документации, диаграмм связей, OpenAPI спецификаций и рекомендаций в корпоративную базу знаний
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-4xl bg-[#161922] border border-[#1E2330] rounded p-5 space-y-4">
          {/* Space Selection Mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Целевое пространство Confluence (Space)</label>
              <div className="flex items-center space-x-3 text-xs">
                <button
                  type="button"
                  onClick={() => setUseCustomKey(!useCustomKey)}
                  className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 transition font-mono text-[11px]"
                >
                  {useCustomKey ? <ListFilter size={13} /> : <Edit3 size={13} />}
                  <span>{useCustomKey ? 'Выбрать из списка' : 'Ввести ключ пространства вручную'}</span>
                </button>
                <button
                  type="button"
                  onClick={loadLiveSpaces}
                  disabled={loadingSpaces}
                  className="text-slate-400 hover:text-slate-200 flex items-center space-x-1 transition text-[11px]"
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
                  placeholder="Введите ключ пространства (например: ARCH, TEAM, DOCS, DEV)..."
                  className="w-full bg-[#0D0E14] border border-blue-500/80 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-400 font-mono uppercase"
                />
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Ключ пространства из URL Confluence (например: <code>https://confluence.corp.local/display/<b>MYSPACE</b></code>).
                </p>
              </div>
            ) : (
              <div>
                {spaces.length > 0 ? (
                  <select
                    value={selectedSpace}
                    onChange={e => setSelectedSpace(e.target.value)}
                    className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  >
                    {spaces.map(s => (
                      <option key={s.key} value={s.key}>
                        {s.name} ({s.key})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-[#0D0E14] border border-[#1E2330] rounded text-xs text-slate-400 flex items-center justify-between">
                    <span>Список пространств загружается или пуст.</span>
                    <button
                      onClick={() => setUseCustomKey(true)}
                      className="text-blue-400 hover:underline font-medium"
                    >
                      Ввести ключ вручную &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Заголовок страницы</label>
            <input
              type="text"
              value={pageTitle}
              onChange={e => setPageTitle(e.target.value)}
              className="w-full bg-[#0D0E14] border border-[#1E2330] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Included Sections */}
          <div className="space-y-2 pt-2 border-t border-[#1E2330]">
            <label className="block text-xs font-medium text-slate-300">Включаемые разделы документации</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={includeOverview} onChange={e => setIncludeOverview(e.target.checked)} className="rounded bg-[#0D0E14] border-[#1E2330]" />
                <span>Общие метрики репозитория и ветка</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={includeStack} onChange={e => setIncludeStack(e.target.checked)} className="rounded bg-[#0D0E14] border-[#1E2330]" />
                <span>Технологический стек и фреймворки</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={includeApi} onChange={e => setIncludeApi(e.target.checked)} className="rounded bg-[#0D0E14] border-[#1E2330]" />
                <span>Таблица API эндпоинтов и маршрутов</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={includeSequence} onChange={e => setIncludeSequence(e.target.checked)} className="rounded bg-[#0D0E14] border-[#1E2330]" />
                <span>Sequence-диаграммы (Call Graph)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={includeErd} onChange={e => setIncludeErd(e.target.checked)} className="rounded bg-[#0D0E14] border-[#1E2330]" />
                <span>ER-диаграмма PostgreSQL (DDL)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={includeRecs} onChange={e => setIncludeRecs(e.target.checked)} className="rounded bg-[#0D0E14] border-[#1E2330]" />
                <span>Архитектурные рекомендации & ИБ аудит</span>
              </label>
            </div>
          </div>

          {/* Publish Action */}
          <div className="pt-3 flex items-center justify-between border-t border-[#1E2330]">
            <div>
              {publishResult && (
                <div className={`flex items-center space-x-2 text-xs ${publishResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {publishResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
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
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition disabled:opacity-50"
            >
              {isPublishing && <RefreshCw size={13} className="animate-spin" />}
              <span>Опубликовать в Confluence ({activeSpaceKey || '...'})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
