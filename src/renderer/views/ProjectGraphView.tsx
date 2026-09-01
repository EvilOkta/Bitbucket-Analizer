import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { HierarchyNode, RepositoryItem } from '../../shared/types';
import {
  Network,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
  FolderKanban,
  FolderGit2,
  GitBranch,
  GitCommit,
  Play,
  Sparkles,
  ChevronRight,
  Boxes,
  Dna,
  Laptop,
  Layers
} from 'lucide-react';

interface ProjectGraphViewProps {
  onAnalyzeRepo?: (repo: RepositoryItem, branch: string) => void;
}

type GraphMode = 'global' | 'project' | 'repo' | 'branch_commits';

interface D3GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  level: number;
  type: 'root' | 'project' | 'repo' | 'branch' | 'commit' | 'subproject';
  updatedAt: string;
  timestamp: number;
  color: string;
  details?: HierarchyNode['details'];
  radius: number;
}

interface D3GraphLink extends d3.SimulationLinkDatum<D3GraphNode> {
  source: string | D3GraphNode;
  target: string | D3GraphNode;
  level: number;
  isEvolutionary?: boolean;
  similarityScore?: number;
}

// Fallback hierarchy generator if backend is unreachable or offline
const generateLocalFallbackHierarchy = (): HierarchyNode => {
  const now = Date.now();
  const day = 86400000;

  const makeCommits = (pKey: string, rSlug: string, bName: string, offset: number): HierarchyNode[] => [
    {
      id: `c-${pKey}-${rSlug}-${bName}-1`,
      name: `a8f1b2c: feat: update core logic & architecture`,
      level: 4,
      type: 'commit',
      updatedAt: new Date(now - offset * day).toISOString().split('T')[0],
      timestamp: now - offset * day,
      details: {
        projectKey: pKey,
        repoSlug: rSlug,
        branchName: bName,
        commitHash: 'a8f1b2c3d4',
        author: 'lead.dev',
        message: 'feat: update core logic and architecture models'
      }
    },
    {
      id: `c-${pKey}-${rSlug}-${bName}-2`,
      name: `3e4d5f6: fix: resolve stability & data pipeline`,
      level: 4,
      type: 'commit',
      updatedAt: new Date(now - (offset + 3) * day).toISOString().split('T')[0],
      timestamp: now - (offset + 3) * day,
      details: {
        projectKey: pKey,
        repoSlug: rSlug,
        branchName: bName,
        commitHash: '3e4d5f6a7b',
        author: 'senior.eng',
        message: 'fix: resolve stability and data pipeline issues'
      }
    }
  ];

  const makeBranches = (pKey: string, rSlug: string, offset: number): HierarchyNode[] => {
    const b1 = makeCommits(pKey, rSlug, 'main', offset);
    const b2 = makeCommits(pKey, rSlug, 'develop', offset + 2);
    return [
      {
        id: `b-${pKey}-${rSlug}-main`,
        name: 'main',
        level: 3,
        type: 'branch',
        updatedAt: b1[0].updatedAt,
        timestamp: b1[0].timestamp,
        details: { projectKey: pKey, repoSlug: rSlug, branchName: 'main' },
        children: b1
      },
      {
        id: `b-${pKey}-${rSlug}-develop`,
        name: 'develop',
        level: 3,
        type: 'branch',
        updatedAt: b2[0].updatedAt,
        timestamp: b2[0].timestamp,
        details: { projectKey: pKey, repoSlug: rSlug, branchName: 'develop' },
        children: b2
      }
    ];
  };

  const monorepoSubprojects = [
    'apps/web-client',
    'services/order-api',
    'services/notification-worker',
    'packages/shared-dtos'
  ];

  const monorepoSubNodes: HierarchyNode[] = monorepoSubprojects.map((sub, idx) => {
    const c = makeCommits('ENTERPRISE', 'enterprise-monorepo', 'main', idx + 1);
    return {
      id: `sub-ENTERPRISE-enterprise-monorepo-${sub.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
      name: sub,
      level: 3,
      type: 'subproject',
      updatedAt: c[0].updatedAt,
      timestamp: c[0].timestamp,
      details: {
        projectKey: 'ENTERPRISE',
        repoSlug: 'enterprise-monorepo',
        branchName: 'main',
        repoType: 'monorepo',
        subproject: sub
      },
      children: c
    };
  });

  const monorepoBranches = makeBranches('ENTERPRISE', 'enterprise-monorepo', 1);

  const enterpriseRepo: HierarchyNode = {
    id: 'r-ENTERPRISE-enterprise-monorepo',
    name: 'Enterprise Monorepo (React UI + .NET + FastAPI + Shared DTOs)',
    level: 2,
    type: 'repo',
    updatedAt: new Date(now - 1 * day).toISOString().split('T')[0],
    timestamp: now - 1 * day,
    details: {
      projectKey: 'ENTERPRISE',
      projectName: 'Enterprise Core Platform',
      repoSlug: 'enterprise-monorepo',
      repoName: 'Enterprise Monorepo',
      repoType: 'monorepo',
      subprojects: monorepoSubprojects,
      description: 'Монорепозиторий корпоративной платформы с фронтендом и 2 микросервисами'
    },
    children: [...monorepoSubNodes, ...monorepoBranches]
  };

  const v2Branches = makeBranches('CORE', 'banking-gateway-v2', 3);
  const v1Branches = makeBranches('CORE', 'banking-gateway-v1', 18);

  const coreRepos: HierarchyNode[] = [
    {
      id: 'r-CORE-banking-gateway-v2',
      name: 'Banking API Gateway v2.0 (.NET C# + EF Core)',
      level: 2,
      type: 'repo',
      updatedAt: v2Branches[0].updatedAt,
      timestamp: v2Branches[0].timestamp,
      details: {
        projectKey: 'CORE',
        projectName: 'Core Banking',
        repoSlug: 'banking-gateway-v2',
        repoName: 'Banking API Gateway v2.0',
        repoType: 'copy_version',
        similarityWith: {
          repoId: 'CORE/banking-gateway-v1',
          repoName: 'Banking API Gateway v1.0 Legacy',
          score: 88,
          stage: 'Эволюционная версия / Рефакторинг (сходство 88%)'
        },
        description: 'Текущая production-версия банковского шлюза (эволюция от v1)'
      },
      children: v2Branches
    },
    {
      id: 'r-CORE-banking-gateway-v1',
      name: 'Banking API Gateway v1.0 Legacy (.NET C#)',
      level: 2,
      type: 'repo',
      updatedAt: v1Branches[0].updatedAt,
      timestamp: v1Branches[0].timestamp,
      details: {
        projectKey: 'CORE',
        projectName: 'Core Banking',
        repoSlug: 'banking-gateway-v1',
        repoName: 'Banking API Gateway v1.0 Legacy',
        repoType: 'copy_version',
        description: 'Предыдущая редакция банковского шлюза на этапе миграции'
      },
      children: v1Branches
    }
  ];

  const projRepos: HierarchyNode[] = [
    {
      id: 'r-PROJ-order-service',
      name: 'Order Service (Python FastAPI + PostgreSQL)',
      level: 2,
      type: 'repo',
      updatedAt: new Date(now - 5 * day).toISOString().split('T')[0],
      timestamp: now - 5 * day,
      details: {
        projectKey: 'PROJ',
        projectName: 'Order Management Project',
        repoSlug: 'order-service',
        repoName: 'Order Service',
        repoType: 'microservice',
        description: 'Микросервис заказов (Consumer платежей и Producer событий Kafka)'
      },
      children: makeBranches('PROJ', 'order-service', 5)
    },
    {
      id: 'r-PROJ-payment-gateway',
      name: 'Payment Gateway (Node.js / Express + PostgreSQL)',
      level: 2,
      type: 'repo',
      updatedAt: new Date(now - 9 * day).toISOString().split('T')[0],
      timestamp: now - 9 * day,
      details: {
        projectKey: 'PROJ',
        projectName: 'Payment Systems',
        repoSlug: 'payment-gateway',
        repoName: 'Payment Gateway',
        repoType: 'microservice',
        description: 'Микросервис обработки карточных транзакций'
      },
      children: makeBranches('PROJ', 'payment-gateway', 9)
    }
  ];

  const highRepos: HierarchyNode[] = [
    {
      id: 'r-HIGH-trading-engine',
      name: 'Trading Engine (C++ / Oat++ Microservice)',
      level: 2,
      type: 'repo',
      updatedAt: new Date(now - 14 * day).toISOString().split('T')[0],
      timestamp: now - 14 * day,
      details: {
        projectKey: 'HIGH',
        projectName: 'High Frequency Systems',
        repoSlug: 'trading-engine',
        repoName: 'Trading Engine',
        repoType: 'microservice',
        description: 'Высокопроизводительный движок котировок'
      },
      children: makeBranches('HIGH', 'trading-engine', 14)
    }
  ];

  const projects: HierarchyNode[] = [
    {
      id: 'p-ENTERPRISE',
      name: 'ENTERPRISE (Enterprise Core Platform)',
      level: 1,
      type: 'project',
      updatedAt: enterpriseRepo.updatedAt,
      timestamp: enterpriseRepo.timestamp,
      details: { projectKey: 'ENTERPRISE', projectName: 'Enterprise Core Platform' },
      children: [enterpriseRepo]
    },
    {
      id: 'p-CORE',
      name: 'CORE (Core Banking)',
      level: 1,
      type: 'project',
      updatedAt: coreRepos[0].updatedAt,
      timestamp: coreRepos[0].timestamp,
      details: { projectKey: 'CORE', projectName: 'Core Banking' },
      children: coreRepos
    },
    {
      id: 'p-PROJ',
      name: 'PROJ (Order Management Project)',
      level: 1,
      type: 'project',
      updatedAt: projRepos[0].updatedAt,
      timestamp: projRepos[0].timestamp,
      details: { projectKey: 'PROJ', projectName: 'Order Management Project' },
      children: projRepos
    },
    {
      id: 'p-HIGH',
      name: 'HIGH (High Frequency Systems)',
      level: 1,
      type: 'project',
      updatedAt: highRepos[0].updatedAt,
      timestamp: highRepos[0].timestamp,
      details: { projectKey: 'HIGH', projectName: 'High Frequency Systems' },
      children: highRepos
    }
  ];

  return {
    id: 'root-bitbucket',
    name: 'Bitbucket Server & Repositories',
    level: 0,
    type: 'root',
    updatedAt: new Date(now - 1 * day).toISOString().split('T')[0],
    timestamp: now - 1 * day,
    children: projects
  };
};

export const ProjectGraphView: React.FC<ProjectGraphViewProps> = ({ onAnalyzeRepo }) => {
  const [hierarchyData, setHierarchyData] = useState<HierarchyNode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<D3GraphNode | null>(null);

  // 4 View Modes
  const [mode, setMode] = useState<GraphMode>('global');
  const [selectedProjectKey, setSelectedProjectKey] = useState<string>('');
  const [selectedRepoSlug, setSelectedRepoSlug] = useState<string>('');
  const [selectedBranchName, setSelectedBranchName] = useState<string>('');
  const [includeBranchesInProjectMode, setIncludeBranchesInProjectMode] = useState<boolean>(false);
  const [repoFilter, setRepoFilter] = useState<'all' | 'subprojects' | 'branches'>('all');

  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<D3GraphNode, D3GraphLink> | null>(null);

  const loadGraphData = async () => {
    setLoading(true);
    let loadedData: HierarchyNode | null = null;

    if ((window as any).electronApi) {
      try {
        loadedData = await (window as any).electronApi.getProjectGraph();
      } catch (err) {
        console.error('Failed to load project graph from backend:', err);
      }
    }

    if (!loadedData || !loadedData.children || loadedData.children.length === 0) {
      loadedData = generateLocalFallbackHierarchy();
    }

    setHierarchyData(loadedData);

    if (loadedData.children && loadedData.children.length > 0) {
      const firstProj = loadedData.children[0];
      const pKey = firstProj.details?.projectKey || firstProj.name;
      setSelectedProjectKey(pKey);

      if (firstProj.children && firstProj.children.length > 0) {
        const firstRepo = firstProj.children[0];
        const rSlug = firstRepo.details?.repoSlug || firstRepo.name;
        setSelectedRepoSlug(rSlug);

        if (firstRepo.children && firstRepo.children.length > 0) {
          setSelectedBranchName(firstRepo.children[0].name);
        }
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadGraphData();
  }, []);

  // Compute color gradient (Green = freshest, Red = oldest) for each level
  const computeGradientColor = (ratio: number): string => {
    if (ratio >= 0.5) {
      const t = (ratio - 0.5) * 2;
      const r = Math.round(234 * (1 - t) + 16 * t);
      const g = Math.round(179 * (1 - t) + 185 * t);
      const b = Math.round(8 * (1 - t) + 129 * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const t = ratio * 2;
      const r = Math.round(239 * (1 - t) + 234 * t);
      const g = Math.round(68 * (1 - t) + 179 * t);
      const b = Math.round(68 * (1 - t) + 8 * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Projects list for selectors
  const projectsList = useMemo(() => {
    return hierarchyData?.children || [];
  }, [hierarchyData]);

  // Current project node
  const currentProjectNode = useMemo(() => {
    if (!projectsList.length) return null;
    return projectsList.find(p => p.details?.projectKey === selectedProjectKey || p.name.includes(selectedProjectKey)) || projectsList[0] || null;
  }, [projectsList, selectedProjectKey]);

  // Current repos list for current project
  const reposList = useMemo(() => {
    return currentProjectNode?.children || [];
  }, [currentProjectNode]);

  // Current repo node
  const currentRepoNode = useMemo(() => {
    if (!reposList.length) return null;
    return reposList.find(r => r.details?.repoSlug === selectedRepoSlug || r.name === selectedRepoSlug) || reposList[0] || null;
  }, [reposList, selectedRepoSlug]);

  // Current branches/subprojects list for current repo
  const branchesList = useMemo(() => {
    return currentRepoNode?.children || [];
  }, [currentRepoNode]);

  // Current branch node
  const currentBranchNode = useMemo(() => {
    if (!branchesList.length) return null;
    return branchesList.find(b => b.name === selectedBranchName) || branchesList[0] || null;
  }, [branchesList, selectedBranchName]);

  // Build the isolated graph model according to current mode
  const graphElements = useMemo(() => {
    if (!hierarchyData) return { nodes: [], links: [] };

    const rawNodes: HierarchyNode[] = [];
    const links: D3GraphLink[] = [];

    if (mode === 'global') {
      // Representation 1: Root Server -> Project Keys
      rawNodes.push({
        id: hierarchyData.id,
        name: hierarchyData.name,
        level: 0,
        type: 'root',
        updatedAt: hierarchyData.updatedAt,
        timestamp: hierarchyData.timestamp
      });

      projectsList.forEach(p => {
        rawNodes.push({
          id: p.id,
          name: p.name,
          level: 1,
          type: 'project',
          updatedAt: p.updatedAt,
          timestamp: p.timestamp,
          details: p.details
        });
        links.push({ source: hierarchyData.id, target: p.id, level: 1 });
      });
    } else if (mode === 'project') {
      // Representation 2: Project Key -> Repositories (+ Monorepos / Versions + optionally Branches)
      if (currentProjectNode) {
        rawNodes.push({
          id: currentProjectNode.id,
          name: currentProjectNode.name,
          level: 1,
          type: 'project',
          updatedAt: currentProjectNode.updatedAt,
          timestamp: currentProjectNode.timestamp,
          details: currentProjectNode.details
        });

        const repoNodesInProject = currentProjectNode.children || [];

        repoNodesInProject.forEach(r => {
          rawNodes.push({
            id: r.id,
            name: r.name,
            level: 2,
            type: 'repo',
            updatedAt: r.updatedAt,
            timestamp: r.timestamp,
            details: r.details
          });
          links.push({ source: currentProjectNode.id, target: r.id, level: 2 });

          // Evolutionary similarity link between versioned repos
          if (r.details?.similarityWith?.repoId) {
            const targetRepoId = `r-${r.details.similarityWith.repoId.replace('/', '-')}`;
            const targetExists = repoNodesInProject.some(other => other.id === targetRepoId || other.details?.repoSlug === r.details?.similarityWith?.repoId?.split('/')[1]);
            if (targetExists) {
              links.push({
                source: r.id,
                target: targetRepoId,
                level: 2,
                isEvolutionary: true,
                similarityScore: r.details.similarityWith.score
              });
            }
          }

          if (includeBranchesInProjectMode && r.children) {
            r.children.forEach(b => {
              rawNodes.push({
                id: b.id,
                name: b.name,
                level: 3,
                type: b.type || 'branch',
                updatedAt: b.updatedAt,
                timestamp: b.timestamp,
                details: b.details
              });
              links.push({ source: r.id, target: b.id, level: 3 });
            });
          }
        });
      }
    } else if (mode === 'repo') {
      // Representation 3: Repository / Monorepo -> Subprojects & Branches
      if (currentRepoNode) {
        rawNodes.push({
          id: currentRepoNode.id,
          name: currentRepoNode.name,
          level: 2,
          type: 'repo',
          updatedAt: currentRepoNode.updatedAt,
          timestamp: currentRepoNode.timestamp,
          details: currentRepoNode.details
        });

        const allChildren = currentRepoNode.children || [];
        const filteredChildren = allChildren.filter(c => {
          if (repoFilter === 'subprojects') return c.type === 'subproject';
          if (repoFilter === 'branches') return c.type === 'branch';
          return true;
        });

        filteredChildren.forEach(b => {
          rawNodes.push({
            id: b.id,
            name: b.name,
            level: 3,
            type: b.type || 'branch',
            updatedAt: b.updatedAt,
            timestamp: b.timestamp,
            details: b.details
          });
          links.push({ source: currentRepoNode.id, target: b.id, level: 3 });
        });
      }
    } else if (mode === 'branch_commits') {
      // Representation 4: Branch / Subproject -> Commits
      if (currentBranchNode) {
        rawNodes.push({
          id: currentBranchNode.id,
          name: `${currentRepoNode?.name || 'repo'} / ${currentBranchNode.name}`,
          level: 3,
          type: currentBranchNode.type || 'branch',
          updatedAt: currentBranchNode.updatedAt,
          timestamp: currentBranchNode.timestamp,
          details: currentBranchNode.details
        });

        (currentBranchNode.children || []).forEach(c => {
          rawNodes.push({
            id: c.id,
            name: c.name,
            level: 4,
            type: 'commit',
            updatedAt: c.updatedAt,
            timestamp: c.timestamp,
            details: c.details
          });
          links.push({ source: currentBranchNode.id, target: c.id, level: 4 });
        });
      }
    }

    // Min / max timestamps calculation for color gradient
    const levelStats: Record<number, { min: number; max: number }> = {};
    for (let l = 1; l <= 4; l++) {
      const nodesAtLevel = rawNodes.filter(n => n.level === l);
      if (nodesAtLevel.length > 0) {
        const timestamps = nodesAtLevel.map(n => n.timestamp);
        levelStats[l] = {
          min: Math.min(...timestamps),
          max: Math.max(...timestamps)
        };
      }
    }

    const radiusMap: Record<number, number> = {
      0: 24,
      1: 18,
      2: 15,
      3: 11,
      4: 8
    };

    // Strict node color assignment based on role and timestamp freshness
    const d3Nodes: D3GraphNode[] = rawNodes.map(n => {
      let color = '#3b82f6';

      if (n.type === 'root') {
        color = '#3b82f6';
      } else if (n.type === 'project') {
        color = '#8b5cf6';
      } else if (n.type === 'subproject') {
        color = '#06b6d4';
      } else if (n.type === 'repo') {
        if (n.details?.repoType === 'monorepo') {
          color = '#a855f7';
        } else if (n.details?.repoType === 'copy_version') {
          color = '#f59e0b';
        } else if (n.details?.isLocal || n.details?.repoType === 'local') {
          color = '#10b981';
        } else {
          color = '#3b82f6';
        }
      } else if (n.type === 'branch') {
        color = '#eab308';
      } else if (n.type === 'commit') {
        if (levelStats[4]) {
          const { min, max } = levelStats[4];
          const ratio = max === min ? 1 : (n.timestamp - min) / (max - min);
          color = computeGradientColor(Math.max(0, Math.min(1, ratio)));
        } else {
          color = '#f43f5e';
        }
      }

      return {
        id: n.id,
        name: n.name,
        level: n.level,
        type: n.type,
        updatedAt: n.updatedAt,
        timestamp: n.timestamp,
        color,
        details: n.details,
        radius: radiusMap[n.level] || 10
      };
    });

    // Safety filter: keep only links where both source and target exist in d3Nodes
    const nodeIds = new Set(d3Nodes.map(n => n.id));
    const validLinks = links.filter(l => {
      const srcId = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const tgtId = typeof l.target === 'string' ? l.target : (l.target as any).id;
      return nodeIds.has(srcId) && nodeIds.has(tgtId);
    });

    return { nodes: d3Nodes, links: validLinks };
  }, [hierarchyData, mode, currentProjectNode, currentRepoNode, currentBranchNode, includeBranchesInProjectMode, projectsList, repoFilter]);

  // Render D3 Simulation
  useEffect(() => {
    if (!svgRef.current || graphElements.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 650;

    const container = svg.append('g').attr('class', 'zoom-container');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.95));

    const simulation = d3.forceSimulation<D3GraphNode>(graphElements.nodes)
      .force('link', d3.forceLink<D3GraphNode, D3GraphLink>(graphElements.links)
        .id(d => d.id)
        .distance(d => (d.level === 1 ? 160 : d.level === 2 ? 130 : d.level === 3 ? 85 : 55))
        .strength(0.8)
      )
      .force('charge', d3.forceManyBody().strength(d => {
        const n = d as D3GraphNode;
        return n.level === 0 ? -700 : n.level === 1 ? -450 : n.level === 2 ? -280 : -140;
      }))
      .force('collide', d3.forceCollide<D3GraphNode>().radius(d => d.radius + 24).iterations(2))
      .force('center', d3.forceCenter(0, 0));

    simulationRef.current = simulation;

    // Standard & Evolutionary Links
    const linkGroup = container.append('g').attr('class', 'links');

    const link = linkGroup
      .selectAll('line')
      .data(graphElements.links)
      .enter()
      .append('line')
      .attr('stroke', d => {
        if (d.isEvolutionary) return '#f59e0b';
        return d.level === 1 ? '#3b82f6' : d.level === 2 ? '#6366f1' : d.level === 3 ? '#8b5cf6' : '#64748b';
      })
      .attr('stroke-dasharray', d => (d.isEvolutionary ? '5,5' : 'none'))
      .attr('stroke-opacity', d => (d.isEvolutionary ? 0.85 : 0.5))
      .attr('stroke-width', d => (d.isEvolutionary ? 2.5 : Math.max(1.5, 4.5 - d.level)));

    // Nodes
    const nodeGroup = container.append('g').attr('class', 'nodes');

    const node = nodeGroup
      .selectAll('g')
      .data(graphElements.nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, D3GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (_, d) => {
        setSelectedNode(d);
      })
      .on('dblclick', (_, d) => {
        // Smooth Drill-down on double click
        if (d.type === 'project' && d.details?.projectKey) {
          setSelectedProjectKey(d.details.projectKey);
          setMode('project');
        } else if (d.type === 'repo' && d.details?.repoSlug) {
          setSelectedRepoSlug(d.details.repoSlug);
          if (d.details.projectKey) setSelectedProjectKey(d.details.projectKey);
          setMode('repo');
        } else if (d.type === 'branch' || d.type === 'subproject') {
          setSelectedBranchName(d.name);
          setMode('branch_commits');
        }
      });

    // Outer glow
    node.append('circle')
      .attr('r', d => d.radius + 6)
      .attr('fill', d => d.color)
      .attr('opacity', 0.22);

    // Main Circle
    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2.5);

    // Labels
    const label = node.append('g')
      .attr('transform', d => `translate(${d.radius + 8}, 4)`);

    label.append('text')
      .text(d => {
        const prefix = d.details?.repoType === 'monorepo' ? '🏗️ ' :
                       d.details?.repoType === 'copy_version' ? '🧬 ' :
                       d.type === 'subproject' ? '📦 ' : '';
        const baseName = `${prefix}${d.name.length > 32 ? d.name.slice(0, 30) + '...' : d.name}`;
        return `${baseName} (${d.updatedAt})`;
      })
      .attr('font-size', d => (d.level <= 1 ? '12px' : '10.5px'))
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-weight', d => (d.level <= 1 ? 'bold' : 'normal'))
      .attr('stroke', '#0b0f19')
      .attr('stroke-width', 3.5)
      .attr('fill', '#0b0f19');

    label.append('text')
      .text(d => {
        const prefix = d.details?.repoType === 'monorepo' ? '🏗️ ' :
                       d.details?.repoType === 'copy_version' ? '🧬 ' :
                       d.type === 'subproject' ? '📦 ' : '';
        const baseName = `${prefix}${d.name.length > 32 ? d.name.slice(0, 30) + '...' : d.name}`;
        return `${baseName} (${d.updatedAt})`;
      })
      .attr('font-size', d => (d.level <= 1 ? '12px' : '10.5px'))
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-weight', d => (d.level <= 1 ? 'bold' : 'normal'))
      .attr('fill', d => (d.level === 0 ? '#60a5fa' : '#f1f5f9'));

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3GraphNode).x || 0)
        .attr('y1', d => (d.source as D3GraphNode).y || 0)
        .attr('x2', d => (d.target as D3GraphNode).x || 0)
        .attr('y2', d => (d.target as D3GraphNode).y || 0);

      node.attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphElements]);

  const handleZoom = (factor: number) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, factor);
  };

  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 650;
    svg.transition().duration(400).call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.95)
    );
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0B0F19] relative">
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Navigation Bar for 4 Representations */}
        <div className="p-4 border-b border-gray-800 bg-gray-950/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-10">
          {/* Mode Switcher Buttons */}
          <div className="flex items-center space-x-1.5 bg-gray-900/90 p-1 rounded-xl border border-gray-800 text-xs">
            <button
              onClick={() => setMode('global')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
                mode === 'global' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Network size={13} />
              <span>1. Bitbucket &rarr; Проекты</span>
            </button>

            <button
              onClick={() => setMode('project')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
                mode === 'project' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FolderKanban size={13} />
              <span>2. Проект &rarr; Репозитории</span>
            </button>

            <button
              onClick={() => setMode('repo')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
                mode === 'repo' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FolderGit2 size={13} />
              <span>3. Репозиторий &rarr; Подпроекты / Ветки</span>
            </button>

            <button
              onClick={() => setMode('branch_commits')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
                mode === 'branch_commits' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <GitCommit size={13} />
              <span>4. Ветка &rarr; Коммиты</span>
            </button>
          </div>

          {/* Contextual Selectors based on Mode */}
          <div className="flex items-center space-x-2 text-xs">
            {mode === 'project' && (
              <>
                <select
                  value={selectedProjectKey}
                  onChange={e => {
                    setSelectedProjectKey(e.target.value);
                    const proj = projectsList.find(p => p.details?.projectKey === e.target.value);
                    if (proj?.children && proj.children.length > 0) {
                      setSelectedRepoSlug(proj.children[0].details?.repoSlug || proj.children[0].name);
                    }
                  }}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-gray-200 focus:outline-none font-mono"
                >
                  {projectsList.map(p => (
                    <option key={p.id} value={p.details?.projectKey || p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <label className="flex items-center space-x-1.5 text-gray-300 text-[11px] cursor-pointer bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-800">
                  <input
                    type="checkbox"
                    checked={includeBranchesInProjectMode}
                    onChange={e => setIncludeBranchesInProjectMode(e.target.checked)}
                    className="rounded"
                  />
                  <span>Показать ветки</span>
                </label>
              </>
            )}

            {mode === 'repo' && (
              <div className="flex items-center space-x-2">
                <select
                  value={selectedProjectKey}
                  onChange={e => {
                    setSelectedProjectKey(e.target.value);
                    const proj = projectsList.find(p => p.details?.projectKey === e.target.value);
                    if (proj?.children && proj.children.length > 0) {
                      const firstRepo = proj.children[0];
                      setSelectedRepoSlug(firstRepo.details?.repoSlug || firstRepo.name);
                      if (firstRepo.children && firstRepo.children.length > 0) {
                        setSelectedBranchName(firstRepo.children[0].name);
                      }
                    }
                  }}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 font-mono"
                >
                  {projectsList.map(p => (
                    <option key={p.id} value={p.details?.projectKey || p.name}>
                      {p.details?.projectKey || p.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedRepoSlug}
                  onChange={e => {
                    setSelectedRepoSlug(e.target.value);
                    const repo = reposList.find(r => r.details?.repoSlug === e.target.value || r.name === e.target.value);
                    if (repo?.children && repo.children.length > 0) {
                      setSelectedBranchName(repo.children[0].name);
                    }
                  }}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 font-mono"
                >
                  {reposList.map(r => (
                    <option key={r.id} value={r.details?.repoSlug || r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>

                {currentRepoNode?.details?.repoType === 'monorepo' && (
                  <div className="flex items-center bg-gray-900 rounded-lg p-0.5 border border-gray-800 text-[11px]">
                    <button
                      onClick={() => setRepoFilter('all')}
                      className={`px-2 py-0.5 rounded ${repoFilter === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}
                    >
                      Все
                    </button>
                    <button
                      onClick={() => setRepoFilter('subprojects')}
                      className={`px-2 py-0.5 rounded ${repoFilter === 'subprojects' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}
                    >
                      Подпроекты
                    </button>
                    <button
                      onClick={() => setRepoFilter('branches')}
                      className={`px-2 py-0.5 rounded ${repoFilter === 'branches' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}
                    >
                      Ветки
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === 'branch_commits' && (
              <div className="flex items-center space-x-2">
                <select
                  value={selectedProjectKey}
                  onChange={e => {
                    setSelectedProjectKey(e.target.value);
                    const proj = projectsList.find(p => p.details?.projectKey === e.target.value);
                    if (proj?.children && proj.children.length > 0) {
                      const firstRepo = proj.children[0];
                      setSelectedRepoSlug(firstRepo.details?.repoSlug || firstRepo.name);
                      if (firstRepo.children && firstRepo.children.length > 0) {
                        setSelectedBranchName(firstRepo.children[0].name);
                      }
                    }
                  }}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 font-mono"
                >
                  {projectsList.map(p => (
                    <option key={p.id} value={p.details?.projectKey || p.name}>
                      {p.details?.projectKey || p.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedRepoSlug}
                  onChange={e => {
                    setSelectedRepoSlug(e.target.value);
                    const repo = reposList.find(r => r.details?.repoSlug === e.target.value || r.name === e.target.value);
                    if (repo?.children && repo.children.length > 0) {
                      setSelectedBranchName(repo.children[0].name);
                    }
                  }}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 font-mono"
                >
                  {reposList.map(r => (
                    <option key={r.id} value={r.details?.repoSlug || r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedBranchName}
                  onChange={e => setSelectedBranchName(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 font-mono"
                >
                  {branchesList.map(b => (
                    <option key={b.id} value={b.name}>
                      {b.type === 'subproject' ? `📦 ${b.name}` : `🌿 ${b.name}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleZoom(1.3)}
              className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-lg transition"
              title="Увеличить масштаб"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => handleZoom(0.7)}
              className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-lg transition"
              title="Уменьшить масштаб"
            >
              <ZoomOut size={13} />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-lg transition"
              title="Сбросить масштаб"
            >
              <Maximize2 size={13} />
            </button>
            <button
              onClick={loadGraphData}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-lg text-xs transition"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Обновить</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 glass-panel p-3 rounded-xl border border-gray-800/90 text-[11px] space-y-1.5 shadow-xl max-w-xs select-none">
          <div className="font-semibold text-gray-200 flex items-center space-x-1.5">
            <Sparkles size={13} className="text-emerald-400" />
            <span>Категории и типы узлов:</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px] text-gray-300">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
              <span>Монорепозиторий</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>Версия / Копия</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
              <span>Подпроект</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Локальный репо</span>
            </span>
          </div>
          <div className="flex items-center space-x-2 pt-1 border-t border-gray-800/60">
            <span className="text-[10px] text-emerald-400 font-semibold">Свежие</span>
            <div className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 border border-gray-700/60" />
            <span className="text-[10px] text-rose-400 font-semibold">Ранние</span>
          </div>
          <div className="text-[10px] text-gray-400 pt-0.5">
            Подсказка: Двойной клик по ноде раскрывает её детали на следующем представлении.
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-[#0B0F19]/80 z-20">
              <RefreshCw size={28} className="animate-spin text-blue-400" />
              <span className="text-xs text-gray-300 font-medium">Построение D3-графа структуры...</span>
            </div>
          ) : (
            <svg ref={svgRef} className="w-full h-full block" />
          )}
        </div>
      </div>

      {/* Details Side Drawer */}
      {selectedNode && (
        <div className="w-80 border-l border-gray-800 bg-gray-950/90 p-5 flex flex-col justify-between overflow-y-auto z-20 glass-panel">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-2">
                {selectedNode.level === 0 && <Network size={16} className="text-blue-400" />}
                {selectedNode.level === 1 && <FolderKanban size={16} className="text-purple-400" />}
                {selectedNode.level === 2 && selectedNode.details?.repoType === 'monorepo' && <Boxes size={16} className="text-purple-400" />}
                {selectedNode.level === 2 && selectedNode.details?.repoType === 'copy_version' && <Dna size={16} className="text-amber-400" />}
                {selectedNode.level === 2 && selectedNode.details?.isLocal && <Laptop size={16} className="text-emerald-400" />}
                {selectedNode.level === 2 && !selectedNode.details?.repoType && <FolderGit2 size={16} className="text-emerald-400" />}
                {selectedNode.type === 'subproject' && <Layers size={16} className="text-cyan-400" />}
                {selectedNode.type === 'branch' && <GitBranch size={16} className="text-amber-400" />}
                {selectedNode.type === 'commit' && <GitCommit size={16} className="text-rose-400" />}
                <span className="text-xs font-bold text-gray-200 uppercase tracking-wide">
                  {selectedNode.type === 'subproject' ? 'ПОДПРОЕКТ' : `${selectedNode.type} (Уровень ${selectedNode.level})`}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="text-[11px] text-gray-500">Название / Идентификатор</div>
              <h3 className="text-sm font-semibold text-gray-100 break-words font-mono mt-0.5">
                {selectedNode.name}
              </h3>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedNode.details?.repoType === 'monorepo' && (
                <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/60 font-semibold">
                  <Boxes size={11} />
                  <span>Монорепозиторий</span>
                </span>
              )}

              {selectedNode.details?.repoType === 'copy_version' && (
                <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 font-semibold">
                  <Dna size={11} />
                  <span>Версия / Копия</span>
                </span>
              )}

              {selectedNode.details?.isLocal && (
                <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                  <Laptop size={11} />
                  <span>Локальный проект</span>
                </span>
              )}

              {selectedNode.type === 'subproject' && (
                <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-semibold">
                  <Layers size={11} />
                  <span>Подпроект Workspaces</span>
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="glass-panel p-3 rounded-lg space-y-1">
                <span className="text-gray-500 text-[11px] flex items-center space-x-1">
                  <Calendar size={12} className="text-blue-400" />
                  <span>Дата последнего обновления:</span>
                </span>
                <div className="font-mono text-gray-200 font-semibold">{selectedNode.updatedAt}</div>
              </div>

              {selectedNode.details?.description && (
                <div className="glass-panel p-2.5 rounded-lg space-y-0.5">
                  <span className="text-gray-500 text-[10px]">Описание</span>
                  <div className="text-gray-300 text-[11px]">{selectedNode.details.description}</div>
                </div>
              )}

              {selectedNode.details?.similarityWith && (
                <div className="glass-panel p-2.5 rounded-lg space-y-1 bg-amber-950/20 border border-amber-800/40">
                  <span className="text-amber-400 text-[10px] font-semibold flex items-center space-x-1">
                    <Dna size={11} />
                    <span>Сходство с базовой версией:</span>
                  </span>
                  <div className="text-gray-200 font-mono text-[11px]">
                    {selectedNode.details.similarityWith.repoName} ({selectedNode.details.similarityWith.score}%)
                  </div>
                  <div className="text-gray-400 text-[10px]">
                    {selectedNode.details.similarityWith.stage}
                  </div>
                </div>
              )}

              {selectedNode.details?.subprojects && selectedNode.details.subprojects.length > 0 && (
                <div className="glass-panel p-2.5 rounded-lg space-y-1 bg-purple-950/20 border border-purple-800/40">
                  <span className="text-purple-300 text-[10px] font-semibold flex items-center space-x-1">
                    <Boxes size={11} />
                    <span>Подпроекты ({selectedNode.details.subprojects.length}):</span>
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto pt-1">
                    {selectedNode.details.subprojects.map((sub, idx) => (
                      <div key={idx} className="text-[11px] font-mono text-gray-300 bg-gray-900/60 px-2 py-0.5 rounded border border-gray-800">
                        📦 {sub}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.details?.localPath && (
                <div className="glass-panel p-2.5 rounded-lg space-y-0.5">
                  <span className="text-gray-500 text-[10px]">Локальный путь</span>
                  <div className="font-mono text-emerald-400 text-[11px] break-all">{selectedNode.details.localPath}</div>
                </div>
              )}

              {selectedNode.details?.projectKey && (
                <div className="glass-panel p-2.5 rounded-lg space-y-0.5">
                  <span className="text-gray-500 text-[10px]">Ключ проекта</span>
                  <div className="font-mono text-blue-400 font-semibold">{selectedNode.details.projectKey}</div>
                </div>
              )}

              {selectedNode.details?.repoSlug && (
                <div className="glass-panel p-2.5 rounded-lg space-y-0.5">
                  <span className="text-gray-500 text-[10px]">Слаг репозитория</span>
                  <div className="font-mono text-emerald-400">{selectedNode.details.repoSlug}</div>
                </div>
              )}

              {selectedNode.details?.branchName && (
                <div className="glass-panel p-2.5 rounded-lg space-y-0.5">
                  <span className="text-gray-500 text-[10px]">Ветка</span>
                  <div className="font-mono text-amber-400">{selectedNode.details.branchName}</div>
                </div>
              )}

              {selectedNode.details?.commitHash && (
                <div className="glass-panel p-2.5 rounded-lg space-y-1">
                  <span className="text-gray-500 text-[10px]">Хеш коммита</span>
                  <div className="font-mono text-rose-300 text-[11px] break-all">{selectedNode.details.commitHash}</div>
                  {selectedNode.details.author && (
                    <div className="text-gray-400 text-[10px]">Автор: {selectedNode.details.author}</div>
                  )}
                  {selectedNode.details.message && (
                    <div className="text-gray-300 text-[11px] pt-1 italic font-sans">
                      «{selectedNode.details.message}»
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drill-down button in sidebar */}
            {selectedNode.type === 'project' && selectedNode.details?.projectKey && (
              <button
                onClick={() => {
                  setSelectedProjectKey(selectedNode.details!.projectKey!);
                  setMode('project');
                }}
                className="w-full flex items-center justify-center space-x-1.5 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-purple-300 rounded-xl text-xs font-semibold transition"
              >
                <span>Перейти к репозиториям проекта</span>
                <ChevronRight size={13} />
              </button>
            )}

            {selectedNode.type === 'repo' && selectedNode.details?.repoSlug && (
              <button
                onClick={() => {
                  setSelectedRepoSlug(selectedNode.details!.repoSlug!);
                  if (selectedNode.details?.projectKey) setSelectedProjectKey(selectedNode.details.projectKey);
                  setMode('repo');
                }}
                className="w-full flex items-center justify-center space-x-1.5 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-emerald-300 rounded-xl text-xs font-semibold transition"
              >
                <span>Перейти к веткам и подпроектам</span>
                <ChevronRight size={13} />
              </button>
            )}

            {(selectedNode.type === 'branch' || selectedNode.type === 'subproject') && (
              <button
                onClick={() => {
                  setSelectedBranchName(selectedNode.name);
                  setMode('branch_commits');
                }}
                className="w-full flex items-center justify-center space-x-1.5 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-amber-300 rounded-xl text-xs font-semibold transition"
              >
                <span>Перейти к коммитам</span>
                <ChevronRight size={13} />
              </button>
            )}
          </div>

          {/* Analyze Repo Action */}
          {selectedNode.level >= 2 && onAnalyzeRepo && selectedNode.details?.projectKey && selectedNode.details?.repoSlug && (
            <button
              onClick={() => {
                const targetRepo: RepositoryItem = {
                  id: `${selectedNode.details?.projectKey}/${selectedNode.details?.repoSlug}`,
                  projectKey: selectedNode.details?.projectKey || 'GLOBAL',
                  projectName: selectedNode.details?.projectName || selectedNode.details?.projectKey || 'Project',
                  slug: selectedNode.details?.repoSlug || '',
                  name: selectedNode.details?.repoName || selectedNode.details?.repoSlug || '',
                  cloneUrl: '',
                  defaultBranch: selectedNode.details?.branchName || 'main',
                  repoType: selectedNode.details?.repoType,
                  isLocal: selectedNode.details?.isLocal,
                  localPath: selectedNode.details?.localPath
                };
                onAnalyzeRepo(targetRepo, selectedNode.details?.branchName || 'main');
              }}
              className="mt-4 w-full flex items-center justify-center space-x-1.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-600/20"
            >
              <Play size={13} fill="currentColor" />
              <span>Анализировать репозиторий</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
