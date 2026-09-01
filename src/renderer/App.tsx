import React, { useState, useEffect } from 'react';
import { NavTab, Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CommandPaletteModal } from './components/CommandPaletteModal';

// Views and Hubs
import { DashboardView } from './views/DashboardView';
import { ArchitectureProjectsHubView } from './views/ArchitectureProjectsHubView';
import { CodeApiStudioView } from './views/CodeApiStudioView';
import { DataModelView } from './views/DataModelView';
import { QualitySecurityHubView } from './views/QualitySecurityHubView';
import { SettingsExportHubView } from './views/SettingsExportHubView';

import { FullAnalysisResult } from '../engine/engineService';
import { RepositoryItem } from '../shared/types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [repos, setRepos] = useState<RepositoryItem[]>([]);
  const [currentRepo, setCurrentRepo] = useState<RepositoryItem | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSubproject, setSelectedSubproject] = useState<string>('all');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Deep linking and context navigation state
  const [focusedSource, setFocusedSource] = useState<{ file: string; line: number; returnTab?: string; returnTitle?: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadInitialData = async () => {
    if ((window as any).electronApi) {
      try {
        const repoList = await (window as any).electronApi.fetchBitbucketRepos('cred-bitbucket');
        setRepos(repoList);
        if (repoList.length > 0) {
          setCurrentRepo(repoList[0]);
        }

        const latest = await (window as any).electronApi.getLatestAnalysisResult();
        if (latest) {
          setAnalysisResult(latest);
          if (latest.selectedSubproject) {
            setSelectedSubproject(latest.selectedSubproject);
          }
        } else if (repoList.length > 0) {
          // Trigger first analysis automatically for instant rich experience
          runAnalysisForRepo(repoList[0], 'main');
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }
  };

  const runAnalysisForRepo = async (repo: RepositoryItem, branch: string, subproject?: string, customFiles?: any[]) => {
    setIsAnalyzing(true);
    try {
      if ((window as any).electronApi) {
        const result = await (window as any).electronApi.runAnalysis(repo, branch, customFiles, subproject || selectedSubproject);
        setAnalysisResult(result);
        return result;
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunAnalysis = () => {
    if (currentRepo) {
      runAnalysisForRepo(currentRepo, selectedBranch, selectedSubproject);
    }
  };

  const handleSelectSubproject = (subprojectPath: string) => {
    setSelectedSubproject(subprojectPath);
    if (currentRepo) {
      runAnalysisForRepo(currentRepo, selectedBranch, subprojectPath);
    }
  };

  const handleOpenLocalFolder = async () => {
    if ((window as any).electronApi) {
      try {
        const localRepo = await (window as any).electronApi.openLocalFolderDialog();
        if (localRepo) {
          setCurrentRepo(localRepo);
          setSelectedBranch(localRepo.defaultBranch || 'main');
          setSelectedSubproject('all');
          runAnalysisForRepo(localRepo, localRepo.defaultBranch || 'main');
        }
      } catch (err) {
        console.error('Failed to open local folder:', err);
      }
    }
  };

  const handleNavigateToSource = (file: string, line: number, returnTab?: string, returnTitle?: string) => {
    setFocusedSource({ file, line, returnTab, returnTitle });
    setActiveTab('code_api');
  };

  const handleBackToPrevious = () => {
    const returnTab = (focusedSource?.returnTab as NavTab) || 'code_api';
    setFocusedSource(null);
    setActiveTab(returnTab);
  };

  const handleNavigateWithContext = (tab: NavTab, context?: any) => {
    setActiveTab(tab);
    if (context?.file) {
      setFocusedSource({ file: context.file, line: context.line || 1 });
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#090A0F] text-[#F1F5F9] overflow-hidden select-none">
      {/* 6-Hubs Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={{
          endpoints: analysisResult?.endpoints.length || 0,
          flows: analysisResult?.flows.length || 0,
          entities: analysisResult?.dataModel.entities.length || 0,
          recs: analysisResult?.recommendations.length || 0
        }}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Universal Header with Breadcrumbs and Quick Search */}
        <Header
          currentRepo={currentRepo}
          selectedBranch={selectedBranch}
          isAnalyzing={isAnalyzing}
          onRunAnalysis={handleRunAnalysis}
          latestRun={analysisResult?.run || null}
          subprojects={analysisResult?.subprojects}
          selectedSubproject={selectedSubproject}
          onSelectSubproject={handleSelectSubproject}
          onOpenLocalFolder={handleOpenLocalFolder}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Primary Hub Views Routing */}
        <main className="flex-1 overflow-hidden relative">
          {/* Hub 1: Обзор & Инсайты */}
          {(activeTab === 'dashboard' || activeTab === 'stack') && (
            <DashboardView analysis={analysisResult} onNavigate={setActiveTab} />
          )}

          {/* Hub 2: Архитектура & Проекты (D3 Canvas + Repositories) */}
          {(activeTab === 'architecture' || activeTab === 'project-graph' || activeTab === 'repositories') && (
            <ArchitectureProjectsHubView
              repos={repos}
              currentRepo={currentRepo}
              setCurrentRepo={repo => {
                setCurrentRepo(repo);
                setSelectedBranch(repo.defaultBranch || 'main');
                setSelectedSubproject('all');
              }}
              selectedBranch={selectedBranch}
              setSelectedBranch={setSelectedBranch}
              onRunAnalysis={handleRunAnalysis}
              isAnalyzing={isAnalyzing}
              onRefreshRepos={loadInitialData}
              onOpenLocalFolder={handleOpenLocalFolder}
              initialSubTab={activeTab === 'repositories' ? 'repositories' : 'graph'}
            />
          )}

          {/* Hub 3: Код, API & Data Flows Studio (Master-Detail IDE) */}
          {(activeTab === 'code_api' || activeTab === 'api-map' || activeTab === 'explorer' || activeTab === 'data-flows') && (
            <CodeApiStudioView
              analysis={analysisResult}
              focusedSource={focusedSource}
              onNavigateToSource={handleNavigateToSource}
              onBackToPrevious={focusedSource ? handleBackToPrevious : undefined}
              initialSubTab={
                activeTab === 'explorer' ? 'explorer' : activeTab === 'data-flows' ? 'flows' : 'api'
              }
            />
          )}

          {/* Hub 4: Модель данных & ERD (Split Graph + Schema) */}
          {activeTab === 'data-model' && (
            <DataModelView
              dataModel={analysisResult?.dataModel || null}
              onNavigateToSource={(file, line) => handleNavigateToSource(file, line, 'data-model', 'Назад к ER диаграмме')}
            />
          )}

          {/* Hub 5: Качество & Безопасность (Autotests, Recommendations, Audit) */}
          {(activeTab === 'qa_security' || activeTab === 'tests' || activeTab === 'recommendations' || activeTab === 'audit') && (
            <QualitySecurityHubView
              analysis={analysisResult}
              initialSubTab={
                activeTab === 'recommendations' ? 'recommendations' : activeTab === 'audit' ? 'audit' : 'tests'
              }
            />
          )}

          {/* Hub 6: Интеграции & Экспорт (Connections + Confluence) */}
          {(activeTab === 'settings_export' || activeTab === 'connections' || activeTab === 'confluence') && (
            <SettingsExportHubView
              analysis={analysisResult}
              initialSubTab={activeTab === 'confluence' ? 'confluence' : 'connections'}
            />
          )}
        </main>
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        analysis={analysisResult}
        onNavigate={handleNavigateWithContext}
      />
    </div>
  );
};
