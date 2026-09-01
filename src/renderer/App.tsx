import React, { useState, useEffect } from 'react';
import { NavTab, Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { ConnectionsView } from './views/ConnectionsView';
import { RepositoriesView } from './views/RepositoriesView';
import { RepoExplorerView } from './views/RepoExplorerView';
import { StackOverviewView } from './views/StackOverviewView';
import { ApiMapView } from './views/ApiMapView';
import { DataFlowsView } from './views/DataFlowsView';
import { DataModelView } from './views/DataModelView';
import { RecommendationsView } from './views/RecommendationsView';
import { ConfluencePublishView } from './views/ConfluencePublishView';
import { AuditLogsView } from './views/AuditLogsView';
import { ProjectGraphView } from './views/ProjectGraphView';
import { FullAnalysisResult } from '../engine/engineService';
import { RepositoryItem } from '../shared/types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [repos, setRepos] = useState<RepositoryItem[]>([]);
  const [currentRepo, setCurrentRepo] = useState<RepositoryItem | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const [selectedSubproject, setSelectedSubproject] = useState<string>('all');

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
    return null;
  };

  const handleRunAnalysis = async (targetRepo?: RepositoryItem, targetBranch?: string, subproject?: string) => {
    const repoToAnalyze = targetRepo || currentRepo;
    const branchToAnalyze = targetBranch || selectedBranch || repoToAnalyze?.defaultBranch || 'main';

    if (repoToAnalyze) {
      setCurrentRepo(repoToAnalyze);
      setSelectedBranch(branchToAnalyze);
      const res = await runAnalysisForRepo(repoToAnalyze, branchToAnalyze, subproject);
      if (res) {
        setActiveTab('dashboard');
      }
    }
  };

  const handleSelectSubproject = async (subproject: string) => {
    setSelectedSubproject(subproject);
    if (currentRepo) {
      await runAnalysisForRepo(currentRepo, selectedBranch, subproject);
    }
  };

  const handleOpenLocalFolder = async () => {
    if ((window as any).electronApi) {
      try {
        const folderPath = await (window as any).electronApi.openLocalRepoDialog();
        if (!folderPath) return;

        const scanRes = await (window as any).electronApi.scanLocalRepository(folderPath);
        if (scanRes && scanRes.repo) {
          setRepos(prev => [scanRes.repo, ...prev.filter(r => r.id !== scanRes.repo.id)]);
          setCurrentRepo(scanRes.repo);
          setSelectedBranch(scanRes.repo.defaultBranch || 'main');
          setSelectedSubproject('all');
          
          const result = await runAnalysisForRepo(scanRes.repo, scanRes.repo.defaultBranch || 'main', 'all', scanRes.files);
          if (result) {
            setActiveTab('dashboard');
          }
        }
      } catch (err) {
        console.error('Failed to open local folder:', err);
      }
    }
  };

  const [focusedSource, setFocusedSource] = useState<{ file: string; line?: number; returnTab?: string; returnLabel?: string } | null>(null);

  const handleNavigateToSource = (
    sourceFile: string,
    sourceLine?: number,
    returnTab: NavTab = 'api-map',
    returnLabel: string = 'Назад к API'
  ) => {
    setFocusedSource({ file: sourceFile, line: sourceLine, returnTab, returnLabel });
    setActiveTab('explorer');
  };

  const handleBackToPrevious = () => {
    const targetTab = (focusedSource?.returnTab || 'api-map') as NavTab;
    setFocusedSource(null);
    setActiveTab(targetTab);
  };


  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090A0F] text-[#F1F5F9]">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'explorer') {
            setFocusedSource(null);
          }
          setActiveTab(tab);
        }}
        stats={{
          endpoints: analysisResult?.endpoints.length || 0,
          flows: analysisResult?.flows.length || 0,
          entities: analysisResult?.dataModel.entities.length || 0,
          recs: analysisResult?.recommendations.length || 0
        }}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
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
        />

        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'dashboard' && <DashboardView analysis={analysisResult} onNavigate={setActiveTab} />}
          {activeTab === 'connections' && <ConnectionsView />}
          {activeTab === 'repositories' && (
            <RepositoriesView
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
            />
          )}
          {activeTab === 'project-graph' && (
            <ProjectGraphView onAnalyzeRepo={handleRunAnalysis} />
          )}
          {activeTab === 'explorer' && (
            <RepoExplorerView
              tree={analysisResult?.tree || null}
              focusedSource={focusedSource}
              onBackToPrevious={focusedSource ? handleBackToPrevious : undefined}
            />
          )}
          {activeTab === 'stack' && <StackOverviewView stack={analysisResult?.stack || []} />}
          {activeTab === 'api-map' && (
            <ApiMapView
              endpoints={analysisResult?.endpoints || []}
              onNavigateToSource={(file, line) => handleNavigateToSource(file, line, 'api-map', 'Назад к API')}
            />
          )}
          {activeTab === 'data-flows' && (
            <DataFlowsView
              flows={analysisResult?.flows || []}
              screenForms={analysisResult?.screenForms || []}
              onNavigateToSource={(file, line) => handleNavigateToSource(file, line, 'data-flows', 'Назад к экранным формам')}
            />
          )}
          {activeTab === 'data-model' && (
            <DataModelView
              dataModel={analysisResult?.dataModel || null}
              onNavigateToSource={(file, line) => handleNavigateToSource(file, line, 'data-model', 'Назад к ER диаграмме')}
            />
          )}
          {activeTab === 'recommendations' && (
            <RecommendationsView recommendations={analysisResult?.recommendations || []} />
          )}
          {activeTab === 'confluence' && <ConfluencePublishView analysis={analysisResult} />}
          {activeTab === 'audit' && <AuditLogsView />}
        </main>
      </div>
    </div>
  );
};
