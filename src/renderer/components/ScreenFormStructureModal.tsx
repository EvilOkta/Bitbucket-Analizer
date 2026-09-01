import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { UiScreenForm } from '../../shared/types';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileCode,
  ExternalLink,
  Code2,
  Info,
  Check,
  Copy,
  Layers3,
  Sparkles,
  Database,
  Braces,
  Server,
  ArrowRight
} from 'lucide-react';

interface ScreenFormStructureModalProps {
  form: UiScreenForm;
  onClose: () => void;
  onNavigateToSource?: (sourceFile: string, sourceLine?: number) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  category: 'form' | 'screen_load' | 'button' | 'form_submit' | 'select' | 'input' | 'action' | 'dto' | 'database';
  layer: number; // 0=Form, 1=Elements, 2=Action, 3=DTO, 4=Database
  description?: string;
  sourceFile?: string;
  sourceLine?: number;
  targetAction?: string;
  dtoModel?: string;
  codeSnippet?: string;
  payload?: Record<string, any>;
  radius: number;
  color: string;
  targetX?: number;
  targetY?: number;
  position?: any;
  attributes?: any;
  handlers?: any[];
  elementType?: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string;
}

const LAYER_DEFINITIONS: Record<number, { title: string; color: string }> = {
  0: { title: 'Экранная форма', color: 'text-emerald-400' },
  1: { title: 'Элементы & События', color: 'text-teal-400' },
  2: { title: 'Методы', color: 'text-purple-400' },
  3: { title: 'DTO Модели', color: 'text-indigo-400' },
  4: { title: 'База данных', color: 'text-cyan-400' }
};

export const ScreenFormStructureModal: React.FC<ScreenFormStructureModalProps> = ({
  form,
  onClose,
  onNavigateToSource
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Build Graph Data from Screen Form with Strict Left-to-Right Layers
  const { nodes, links, activeLayerIds } = useMemo(() => {
    const nodeList: GraphNode[] = [];
    const linkList: GraphLink[] = [];
    const nodeMap = new Set<string>();

    const addNode = (node: GraphNode) => {
      if (!nodeMap.has(node.id)) {
        nodeMap.add(node.id);
        nodeList.push(node);
      }
    };

    // Layer 0: Root Screen Form (Far Left)
    const rootNode: GraphNode = {
      id: 'root-form',
      name: form.name.split('(')[0].trim(),
      category: 'form',
      layer: 0,
      description: `Корневая экранная форма: ${form.name}\nПуть к компоненту: ${form.componentPath}\nМаршрут: ${form.route}`,
      sourceFile: form.sourceFile || form.componentPath,
      sourceLine: form.sourceLine || 1,
      radius: 30,
      color: '#10b981' // emerald-500
    };
    addNode(rootNode);

    // Check if database operations / DTOs exist in this form
    const hasDatabase = form.elements.some(elem =>
      (elem.dtoModel && elem.dtoModel !== 'None') ||
      (elem.sequenceSteps && elem.sequenceSteps.some((s: any) => s.type === 'db_query' || (s.to && (s.to.toLowerCase().includes('database') || s.to.toLowerCase().includes('db') || s.to.toLowerCase().includes('postgres')))))
    );


    // Layer 4: Shared DB Node (Only if DB interaction is present)
    const dbNode: GraphNode = {
      id: 'node-postgres-db',
      name: 'PostgreSQL DB',
      category: 'database',
      layer: 4,
      description: 'Физическая база данных PostgreSQL (Таблицы сущностей, справочники и аудит)',
      radius: 26,
      color: '#06b6d4' // cyan-500
    };
    if (hasDatabase) {
      addNode(dbNode);
    }

    // Layer 1 (Elements & OnLoad), Layer 2 (Actions), Layer 3 (DTOs)
    form.elements.forEach((elem, idx) => {
      const elemNodeId = `elem-${elem.id || idx}`;
      const isLoad = elem.type === 'screen_load' || elem.type === 'lifecycle';

      // Layer 1: Form Elements / Lifecycle Events
      const elemNode: GraphNode = {
        id: elemNodeId,
        name: elem.name,
        category: isLoad ? 'screen_load' : elem.type === 'button' ? 'button' : elem.type === 'form_submit' ? 'form_submit' : elem.type === 'select' ? 'select' : elem.type === 'input' ? 'input' : 'button',
        layer: 1,
        description: isLoad
          ? `Событие инициализации формы (Mount / useEffect). Выполняет предзагрузку данных и кэширование справочников.`
          : `Интерактивный элемент интерфейса: ${elem.name}\nТип: ${elem.elementType || elem.type}`,
        sourceFile: elem.sourceFile || form.componentPath,
        sourceLine: elem.sourceLine || 1,
        targetAction: elem.targetAction,
        dtoModel: elem.dtoModel,
        codeSnippet: elem.codeSnippet,
        payload: elem.frontendPayload,
        position: elem.position,
        attributes: elem.attributes,
        handlers: elem.handlers,
        elementType: elem.elementType,
        radius: isLoad ? 24 : 20,
        color: isLoad ? '#14b8a6' : elem.type === 'form_submit' ? '#f59e0b' : elem.type === 'button' ? '#3b82f6' : '#8b5cf6'
      };
      addNode(elemNode);

      // Link: Form -> Element
      linkList.push({
        source: rootNode.id,
        target: elemNodeId,
        label: isLoad ? 'onMount' : 'contains'
      });

      // Layer 2: Action / Method Node
      if (elem.targetAction) {
        const actionNodeId = `action-${elem.targetAction.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        const actionNode: GraphNode = {
          id: actionNodeId,
          name: elem.targetAction,
          category: 'action',
          layer: 2,
          description: `Метод-обработчик / Функция: ${elem.targetAction}\nОбрабатывает вызов от элемента "${elem.name}"`,
          sourceFile: elem.targetSourceFile || elem.sourceFile || form.componentPath,
          sourceLine: elem.targetSourceLine || elem.sourceLine || 1,
          radius: 19,
          color: '#a855f7' // purple-500
        };
        addNode(actionNode);

        // Link: Element -> Action
        linkList.push({
          source: elemNodeId,
          target: actionNodeId,
          label: 'calls'
        });

        // Layer 3: DTO Model Node (Only if real DTO is defined)
        if (elem.dtoModel && elem.dtoModel !== 'None') {
          const dtoNodeId = `dto-${elem.dtoModel.replace(/[^a-zA-Z0-9_]/g, '_')}`;
          const dtoPath = elem.dtoSourceFile || `src/models/${elem.dtoModel}.ts`;
          const dtoNode: GraphNode = {
            id: dtoNodeId,
            name: elem.dtoModel,
            category: 'dto',
            layer: 3,
            description: `DTO Модель данных: ${elem.dtoModel}\nПередается в запросе/ответе`,
            sourceFile: dtoPath,
            sourceLine: 1,
            radius: 18,
            color: '#6366f1' // indigo-500
          };
          addNode(dtoNode);

          // Link: Action -> DTO
          linkList.push({
            source: actionNodeId,
            target: dtoNodeId,
            label: 'payload'
          });

          if (hasDatabase) {
            linkList.push({
              source: actionNodeId,
              target: dbNode.id,
              label: 'SQL / ORM'
            });
          }
        } else if (hasDatabase) {
          linkList.push({
            source: actionNodeId,
            target: dbNode.id,
            label: 'SQL / ORM'
          });
        }
      }
    });

    const activeLayers = Array.from(new Set(nodeList.map(n => n.layer))).sort((a, b) => a - b);
    return { nodes: nodeList, links: linkList, activeLayerIds: activeLayers };
  }, [form]);

  // Compute Active Layer Info for top header
  const activeLayersInfo = useMemo(() => {
    return activeLayerIds.map((lId, idx) => ({
      id: lId,
      title: LAYER_DEFINITIONS[lId]?.title || `Слой ${lId}`,
      color: LAYER_DEFINITIONS[lId]?.color || 'text-gray-400',
      displayIndex: idx + 1
    }));
  }, [activeLayerIds]);

  // Set default selected node
  useEffect(() => {
    if (nodes.length > 0 && !selectedNode) {
      setSelectedNode(nodes[0]);
    }
  }, [nodes, selectedNode]);

  // D3 Force Simulation Setup with Dynamic Left-to-Right Column Constraints
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 550;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Defs for glowing filters and arrow markers
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'structure-arrow-lr')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 24)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#6b7280');

    const g = svg.append('g');

    // Zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3.0])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Calculate Layer X Coordinates dynamically based on active columns
    const colMap: { [key: number]: number } = {};
    activeLayerIds.forEach((lId, idx) => {
      colMap[lId] = idx;
    });

    const totalCols = activeLayerIds.length;
    const layerPadding = Math.min(100, width * 0.12);
    const availableWidth = Math.max(width - layerPadding * 2, 400);

    const getLayerX = (layerId: number) => {
      if (totalCols <= 1) return width / 2;
      const colIdx = colMap[layerId] ?? 0;
      return layerPadding + (availableWidth * colIdx) / (totalCols - 1);
    };

    // Group nodes by layer to compute vertical spacing
    const nodesByLayer: { [key: number]: GraphNode[] } = {};
    activeLayerIds.forEach(lId => {
      nodesByLayer[lId] = [];
    });
    nodes.forEach(n => {
      if (nodesByLayer[n.layer]) {
        nodesByLayer[n.layer].push(n);
      }
    });

    // Assign initial positions
    Object.keys(nodesByLayer).forEach(lStr => {
      const l = Number(lStr);
      const layerNodes = nodesByLayer[l];
      const count = layerNodes.length;
      layerNodes.forEach((n, idx) => {
        n.targetX = getLayerX(l);
        n.targetY = (height / (count + 1)) * (idx + 1);
        if (n.x === undefined) n.x = n.targetX;
        if (n.y === undefined) n.y = n.targetY;
      });
    });

    // Force simulation with strong X-axis layer constraints
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(110).strength(0.3))
      .force('x', d3.forceX<GraphNode>(d => d.targetX || getLayerX(d.layer)).strength(0.85))
      .force('y', d3.forceY<GraphNode>(d => d.targetY || height / 2).strength(0.45))
      .force('collide', d3.forceCollide<GraphNode>().radius(d => d.radius + 14))
      .alphaDecay(0.04);

    // Draw Smooth Curved Bezier Links Left-to-Right
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('stroke', '#374151')
      .attr('stroke-width', 1.5)
      .attr('fill', 'none')
      .attr('stroke-dasharray', (d) => (d.label === 'onMount' ? '4 2' : 'none'))
      .attr('marker-end', 'url(#structure-arrow-lr)');

    // Link labels
    const linkText = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('font-size', '8px')
      .attr('fill', '#9ca3af')
      .attr('text-anchor', 'middle')
      .attr('font-family', 'monospace')
      .text(d => d.label || '');

    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
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
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
      });

    // Outer glow ring
    node.append('circle')
      .attr('r', d => d.radius + 3)
      .attr('fill', 'none')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.6);

    // Inner node body
    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', '#0f172a')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2);

    // Node icon / symbol
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', d => d.color)
      .attr('font-size', d => (d.category === 'form' ? '12px' : '10px'))
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text(d => {
        if (d.category === 'form') return 'UI';
        if (d.category === 'screen_load') return '⚡';
        if (d.category === 'button') return 'BTN';
        if (d.category === 'form_submit') return 'SUB';
        if (d.category === 'action') return 'fn()';
        if (d.category === 'dto') return 'DTO';
        if (d.category === 'database') return 'DB';
        return 'INP';
      });

    // Node title below
    node.append('text')
      .attr('y', d => d.radius + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '600')
      .text(d => (d.name.length > 20 ? d.name.substring(0, 18) + '...' : d.name));

    // Tick simulation
    simulation.on('tick', () => {
      link.attr('d', (d: any) => {
        const sx = d.source.x;
        const sy = d.source.y;
        const tx = d.target.x;
        const ty = d.target.y;
        const dx = tx - sx;
        const dy = ty - sy;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${sx},${sy}A${dr * 1.5},${dr * 1.5} 0 0,1 ${tx},${ty}`;
      });

      linkText
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 8);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, activeLayerIds]);

  const handleZoom = (factor: number) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(250).call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, factor);
  };

  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(350).call(d3.zoom<SVGSVGElement, unknown>().transform as any, d3.zoomIdentity);
  };

  const handleCopyPayload = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload || {}, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090A0F]/80 animate-in fade-in duration-150">
      <div
        className="w-full max-w-6xl h-[88vh] bg-[#111318] border border-[#1E2330] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-3 border-b border-[#1E2330] bg-[#161922] flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-1.5 rounded bg-[#111318] border border-[#1E2330] text-blue-400">
              <Layers3 size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-blue-400 font-semibold">
                  D3 Архитектурная структура формы
                </span>
                <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-[#111318] text-slate-300 border border-[#1E2330]">
                  {form.elements.length} элементов
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-100 font-mono truncate">
                {form.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center space-x-1 bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs">
              <button
                onClick={() => handleZoom(1.2)}
                className="p-1 hover:bg-gray-800 text-gray-300 rounded transition"
                title="Увеличить (Zoom In)"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => handleZoom(0.8)}
                className="p-1 hover:bg-gray-800 text-gray-300 rounded transition"
                title="Уменьшить (Zoom Out)"
              >
                <ZoomOut size={14} />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 hover:bg-gray-800 text-gray-300 rounded transition"
                title="Сбросить масштаб (100%)"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition"
              title="Закрыть (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Main Area: Graph Canvas (Left) + Node Inspector (Right) */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-[#070A13]">
          {/* D3 Graph Area */}
          <div ref={containerRef} className="flex-1 relative overflow-hidden flex items-center justify-center">
            <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Dynamic Left-to-Right Column Layer Headers corresponding strictly to active layers on the graph */}
            <div className="absolute top-3 inset-x-8 flex justify-between pointer-events-none text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 border-b border-gray-800/60 pb-1.5 px-4">
              {activeLayersInfo.map(lInfo => (
                <div key={lInfo.id} className={lInfo.color}>
                  {`${lInfo.displayIndex}. ${lInfo.title}`}
                </div>
              ))}
            </div>

            {/* Legend Overlay at bottom left */}
            <div className="absolute bottom-3 left-3 p-2 bg-gray-950/85 backdrop-blur-md rounded-xl border border-gray-800 text-[10px] font-mono flex flex-wrap gap-2.5 text-gray-300 select-none shadow-lg">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm" />
                <span>Форма</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block shadow-sm" />
                <span>Событие (onLoad)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm" />
                <span>Элементы UI</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shadow-sm" />
                <span>Методы</span>
              </div>
              {activeLayerIds.includes(3) && (
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block shadow-sm" />
                  <span>DTO Модель</span>
                </div>
              )}
              {activeLayerIds.includes(4) && (
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block shadow-sm" />
                  <span>База данных</span>
                </div>
              )}
            </div>
          </div>

          {/* Node Inspector Panel (Right) */}
          <div className="w-80 shrink-0 border-l border-gray-800 bg-gray-950/90 flex flex-col h-full overflow-hidden p-4 space-y-4 text-xs font-mono select-none">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <div className="flex items-center space-x-1.5 font-bold text-gray-200 uppercase tracking-wide text-[11px]">
                <Info size={14} className="text-emerald-400" />
                <span>Инспектор узла</span>
              </div>
              {selectedNode && (
                <span
                  className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border"
                  style={{ borderColor: selectedNode.color, color: selectedNode.color, backgroundColor: `${selectedNode.color}15` }}
                >
                  {selectedNode.category}
                </span>
              )}
            </div>

            {selectedNode ? (
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                {/* Node Name */}
                <div className="space-y-1">
                  <div className="text-[10px] text-gray-500 uppercase">Наименование:</div>
                  <div className="p-2 bg-gray-900 rounded-lg border border-gray-800 text-gray-100 font-bold text-xs break-words">
                    {selectedNode.name}
                  </div>
                </div>

                {/* Description */}
                {selectedNode.description && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-500 uppercase">Описание:</div>
                    <div className="p-2.5 bg-gray-900/60 rounded-lg border border-gray-800/80 text-gray-300 text-[11px] font-sans leading-relaxed whitespace-pre-line">
                      {selectedNode.description}
                    </div>
                  </div>
                )}

                {/* UI Section & JSX Path (Rules POS-1 & POS-2) */}
                {selectedNode.position?.jsxPath && (
                  <div className="space-y-1 p-2 bg-gray-900/90 rounded-lg border border-gray-800">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase">
                      <span>JSX Путь:</span>
                      {selectedNode.position.uiSection && selectedNode.position.uiSection !== 'content' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 uppercase font-bold">
                          {selectedNode.position.uiSection}
                        </span>
                      )}
                    </div>
                    <div className="text-teal-300 font-mono text-[10px] break-all">
                      {selectedNode.position.jsxPath}
                    </div>
                  </div>
                )}

                {/* Props & Attributes (Rule ATTR-1) */}
                {selectedNode.attributes && (selectedNode.attributes.icon || selectedNode.attributes.disabled || selectedNode.attributes.required || selectedNode.attributes.placeholder || selectedNode.attributes.type || selectedNode.attributes.checked) && (
                  <div className="space-y-1 p-2 bg-gray-900/70 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase">Атрибуты & Props:</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.attributes.icon && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-950/90 text-indigo-300 border border-indigo-800/80 font-mono">
                          🎨 {selectedNode.attributes.icon}
                        </span>
                      )}
                      {selectedNode.attributes.disabled && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-950/90 text-red-300 border border-red-800/80 font-mono">
                          disabled
                        </span>
                      )}
                      {selectedNode.attributes.required && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/90 text-amber-300 border border-amber-800/80 font-mono">
                          required
                        </span>
                      )}
                      {selectedNode.attributes.checked && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 font-mono">
                          checked
                        </span>
                      )}
                      {selectedNode.attributes.type && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-gray-800 text-gray-300 border border-gray-700 font-mono">
                          type: {selectedNode.attributes.type}
                        </span>
                      )}
                      {selectedNode.attributes.placeholder && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-gray-800 text-gray-300 border border-gray-700 font-mono truncate max-w-[200px]" title={selectedNode.attributes.placeholder}>
                          "{selectedNode.attributes.placeholder}"
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Handlers, Redux Actions & Side Effects (Rule HANDLERS) */}
                {selectedNode.handlers && selectedNode.handlers.some((h: any) => (h.reduxActions && h.reduxActions.length > 0) || (h.sideEffects && h.sideEffects.length > 0)) && (
                  <div className="space-y-1.5 p-2 bg-gray-900/80 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase">Redux Actions & Побочные эффекты:</div>
                    {selectedNode.handlers.map((h: any, hIdx: number) => (
                      <div key={hIdx} className="space-y-1 text-[10px]">
                        {h.reduxActions && h.reduxActions.length > 0 && (
                          <div>
                            <span className="text-purple-400 font-bold">⚛️ Redux: </span>
                            <span className="text-purple-200">{h.reduxActions.map((a: string) => `dispatch(${a})`).join(', ')}</span>
                          </div>
                        )}
                        {h.sideEffects && h.sideEffects.length > 0 && (
                          <div>
                            <span className="text-cyan-400 font-bold">🌐 Эффекты: </span>
                            <span className="text-cyan-200">{h.sideEffects.join(', ')}</span>
                          </div>
                        )}
                        {h.hasConditionals && (
                          <div className="text-amber-400/90 text-[9px]">
                            🔀 Содержит условную логику (if / switch / try)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Target Action */}
                {selectedNode.targetAction && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-500 uppercase">Обработчик / Метод:</div>
                    <div className="p-2 bg-gray-900 rounded-lg border border-gray-800 text-purple-300 font-semibold break-all text-[11px] font-mono">
                      {selectedNode.targetAction}
                    </div>
                  </div>
                )}

                {/* Code Declaration Snippet */}
                {selectedNode.codeSnippet && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-500 uppercase">Код объявления элемента:</div>
                    <pre className="p-2 bg-gray-900/90 rounded-lg border border-gray-800 text-cyan-300 font-mono text-[10px] whitespace-pre-wrap break-all leading-tight">
                      {selectedNode.codeSnippet}
                    </pre>
                  </div>
                )}

                {/* DTO Model */}
                {selectedNode.dtoModel && selectedNode.dtoModel !== 'None' && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-500 uppercase">DTO Модель:</div>
                    <div className="p-2 bg-gray-900 rounded-lg border border-gray-800 text-indigo-300 font-bold break-all text-[11px] font-mono">
                      {selectedNode.dtoModel}
                    </div>
                  </div>
                )}

                {/* Source File Location with Button (Direct to Model / Controller / Form) */}
                {selectedNode.sourceFile && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-gray-500 uppercase">
                      {selectedNode.category === 'dto'
                        ? 'Файл DTO модели в проекте:'
                        : selectedNode.category === 'action'
                        ? 'Файл контроллера / обработчика:'
                        : 'Место в исходном коде:'}
                    </div>
                    <button
                      onClick={() => {
                        onNavigateToSource?.(selectedNode.sourceFile!, selectedNode.sourceLine || 1);
                        onClose();
                      }}
                      className="w-full p-2 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 hover:text-blue-100 border border-blue-800/60 rounded-lg text-[11px] transition flex items-center justify-between group shadow-sm font-mono"
                      title={`Перейти к файлу ${selectedNode.sourceFile}:${selectedNode.sourceLine || 1} в дереве проекта`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <FileCode size={13} className="text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                        <span className="truncate">{selectedNode.sourceFile.split('/').pop()}:{selectedNode.sourceLine || 1}</span>
                      </div>
                      <span className="flex items-center space-x-1 text-[9px] bg-blue-900 px-1.5 py-0.2 rounded text-white shrink-0 ml-1">
                        <span>Открыть</span>
                        <ExternalLink size={9} />
                      </span>
                    </button>
                  </div>
                )}

                {/* Frontend Payload JSON preview (only if non-empty payload exists) */}
                {selectedNode.payload && Object.keys(selectedNode.payload).length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase">
                      <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                        <Code2 size={11} />
                        <span>Frontend Payload:</span>
                      </span>
                      <button
                        onClick={() => handleCopyPayload(selectedNode.payload)}
                        className="flex items-center space-x-1 px-1.5 py-0.5 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded text-[9px] border border-gray-800 transition"
                      >
                        {copiedPayload ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        <span>{copiedPayload ? 'Скопировано' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-2 bg-gray-950 rounded-lg text-[10px] font-mono text-emerald-300 border border-gray-900 overflow-x-auto max-h-[140px] leading-tight">
                      {JSON.stringify(selectedNode.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center text-gray-500 text-xs">
                Кликните на любой узел графа для просмотра детальных свойств
              </div>
            )}

            <div className="pt-2 border-t border-gray-800 text-[10px] text-gray-500 text-center">
              Связи ориентированы слева направо
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-gray-800 bg-gray-950 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-gray-500">
            Сгенерировано автоматически модулем архитектурной трассировки экранных форм
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-200 rounded-lg text-xs font-semibold border border-gray-800 transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
