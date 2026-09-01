import React, { useState, useEffect, useRef } from 'react';
import { FileNode } from '../../shared/types';
import {
  Folder,
  FolderOpen,
  FileCode2,
  ChevronRight,
  ChevronDown,
  Layers,
  Database,
  ShieldAlert,
  Search,
  ArrowLeft,
  FileCode,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';

interface RepoExplorerViewProps {
  tree: FileNode | null;
  focusedSource?: { file: string; line?: number; returnTab?: string; returnLabel?: string } | null;
  onBackToPrevious?: () => void;
  onBackToApi?: () => void;
  backLabel?: string;
}

export const RepoExplorerView: React.FC<RepoExplorerViewProps> = ({
  tree,
  focusedSource,
  onBackToPrevious,
  onBackToApi,
  backLabel
}) => {
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ root: true });
  const [highlightLine, setHighlightLine] = useState<number | undefined>(focusedSource?.line);
  const [copiedCode, setCopiedCode] = useState(false);
  const codeLineRef = useRef<HTMLTableRowElement | null>(null);

  // Helper to extract all file nodes from the tree with ancestors
  const getAllFileNodes = (root: FileNode): { node: FileNode; ancestorIds: string[] }[] => {
    const list: { node: FileNode; ancestorIds: string[] }[] = [];
    const traverse = (n: FileNode, anc: string[]) => {
      if (n.type === 'file') {
        list.push({ node: n, ancestorIds: anc });
      }
      if (n.children) {
        for (const child of n.children) {
          traverse(child, [...anc, n.id]);
        }
      }
    };
    traverse(root, []);
    return list;
  };

  // Robust multi-tier node resolver with fuzzy matching and content inspection
  const resolveTargetNode = (
    root: FileNode,
    target: string,
    requestedLine?: number
  ): { targetNode: FileNode; ancestorIds: string[]; line?: number } | null => {
    if (!target) return null;
    const allFiles = getAllFileNodes(root);
    if (allFiles.length === 0) return null;

    const normTarget = target.replace(/\\/g, '/').toLowerCase().trim();
    const targetBase = normTarget.split('/').pop() || '';
    const targetStem = targetBase.replace(/\.[^.]+$/, '');
    const targetClean = targetStem.replace(/dto$/i, '').replace(/request$/i, '').replace(/response$/i, '').replace(/command$/i, '');

    let bestMatch: { node: FileNode; ancestorIds: string[]; score: number; line?: number } | null = null;

    for (const item of allFiles) {
      const node = item.node;
      const normNodePath = (node.path || '').replace(/\\/g, '/').toLowerCase();
      const nodeNameLower = node.name.toLowerCase();
      const nodeStem = nodeNameLower.replace(/\.[^.]+$/, '');
      let score = 0;
      let matchedLine: number | undefined = requestedLine;

      const isDocFile = /\.(md|markdown|txt|rst|doc|docx|adoc)$/i.test(normNodePath);
      const isConfigFile = /\.(json|yaml|yml|toml|ini|xml)$/i.test(normNodePath);
      const isCodeFile = /\.(ts|tsx|js|jsx|cs|py|java|go|cpp|hpp|h|rs|kt|php|rb|c|scala|swift|vue|svelte)$/i.test(normNodePath);
      const targetIsExplicitDoc = /\.(md|txt|doc)$/i.test(normTarget);

      // 1. Exact full path match
      if (normNodePath === normTarget) {
        score = 100;
      }
      // 2. Suffix / Subpath match
      else if (normNodePath.endsWith('/' + normTarget) || normTarget.endsWith('/' + normNodePath) || normNodePath.endsWith(normTarget)) {
        score = 90;
      }
      // 3. Exact filename match
      else if (nodeNameLower === targetBase) {
        score = 85;
      }
      // 4. Filename stem match (without extension) in code files
      else if (nodeStem === targetStem && !isDocFile) {
        score = 80;
      }
      // 5. Content search: does this CODE file declare the interface / class / type / method?
      else if (node.content && isCodeFile) {
        const lines = node.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i];
          const lLower = l.toLowerCase();

          // Search strictly for code declarations: interface, class, type, struct, record, enum, def, function
          const isDeclaration =
            lLower.includes(`interface ${targetStem}`) ||
            lLower.includes(`class ${targetStem}`) ||
            lLower.includes(`type ${targetStem}`) ||
            lLower.includes(`struct ${targetStem}`) ||
            lLower.includes(`record ${targetStem}`) ||
            lLower.includes(`enum ${targetStem}`) ||
            lLower.includes(`def ${targetStem}`) ||
            lLower.includes(`function ${targetStem}`) ||
            lLower.includes(`task<${targetStem}`) ||
            lLower.includes(`async task<${targetStem}`) ||
            (targetClean.length >= 4 && (lLower.includes(`interface ${targetClean}`) || lLower.includes(`class ${targetClean}`)));

          if (isDeclaration) {
            score = 75;
            if (!requestedLine || requestedLine === 1) {
              matchedLine = i + 1;
            }
            break;
          }
        }
      }

      // 6. Partial clean name match in code files (e.g. Transfer in TransferMoneyDTO vs TransferRequestDTO)
      if (score === 0 && targetClean.length >= 3 && isCodeFile) {
        if (nodeStem.includes(targetClean) || normNodePath.includes(targetClean)) {
          score = 60;
        }
      }

      // 7. General Model / DTO category fallback
      if (score === 0 && isCodeFile && (normTarget.includes('dto') || normTarget.includes('model'))) {
        if (node.category === 'dto' || node.category === 'model') {
          score = 30;
        }
      }

      // Penalize documentation/config files if target is not explicitly asking for doc
      if (!targetIsExplicitDoc) {
        if (isDocFile) score -= 60;
        if (isConfigFile) score -= 20;
        if (isCodeFile && score > 0) score += 15;
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { node, ancestorIds: item.ancestorIds, score, line: matchedLine };
        if (score >= 100) break;
      }
    }

    if (bestMatch) {
      return { targetNode: bestMatch.node, ancestorIds: bestMatch.ancestorIds, line: bestMatch.line };
    }

    return null;
  };

  // Handle focusedSource navigation or default initial file selection
  useEffect(() => {
    if (!tree) return;

    if (focusedSource?.file) {
      const match = resolveTargetNode(tree, focusedSource.file, focusedSource.line);
      if (match) {
        setSelectedNode(match.targetNode);
        setHighlightLine(match.line || focusedSource.line);
        const newExpanded: Record<string, boolean> = { root: true };
        match.ancestorIds.forEach(id => {
          newExpanded[id] = true;
        });
        setExpandedNodes(prev => ({ ...prev, ...newExpanded }));
        return;
      }
    }

    // Default to first file if none selected
    if (!selectedNode) {
      const allFiles = getAllFileNodes(tree);
      if (allFiles.length > 0) {
        setSelectedNode(allFiles[0].node);
        const newExpanded: Record<string, boolean> = { root: true };
        allFiles[0].ancestorIds.forEach(id => {
          newExpanded[id] = true;
        });
        setExpandedNodes(prev => ({ ...prev, ...newExpanded }));
      }
    }
  }, [tree, focusedSource]);

  // Scroll to focused line
  useEffect(() => {
    const timer = setTimeout(() => {
      if (codeLineRef.current) {
        try {
          codeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {
          // ignore
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedNode, highlightLine, focusedSource?.line]);

  if (!tree) {
    return (
      <div className="p-8 text-center text-gray-500 text-xs flex items-center justify-center h-full">
        Дерево проекта недоступно. Запустите анализ репозитория.
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'controller': return 'bg-purple-950/80 text-purple-300 border-purple-800/60';
      case 'service': return 'bg-blue-950/80 text-blue-300 border-blue-800/60';
      case 'repository': return 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60';
      case 'model': return 'bg-amber-950/80 text-amber-300 border-amber-800/60';
      case 'migration': return 'bg-orange-950/80 text-orange-300 border-orange-800/60';
      case 'test': return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60';
      case 'config': return 'bg-gray-800 text-gray-300 border-gray-700';
      case 'ci_cd': return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60';
      default: return 'bg-gray-900 text-gray-400 border-gray-800';
    }
  };

  const renderTree = (node: FileNode, depth = 0) => {
    const isExpanded = expandedNodes[node.id] ?? depth < 2;
    const isFile = node.type === 'file';
    const isSelected = selectedNode?.id === node.id;

    if (search && node.type === 'file' && !node.name.toLowerCase().includes(search.toLowerCase()) && !node.path.toLowerCase().includes(search.toLowerCase())) {
      return null;
    }

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => {
            if (!isFile) toggleExpand(node.id);
            setSelectedNode(node);
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`flex items-center justify-between py-1.5 pr-3 cursor-pointer text-xs transition ${
            isSelected
              ? 'bg-blue-600/25 text-blue-200 border-r-2 border-blue-500 font-medium'
              : 'text-gray-300 hover:bg-gray-900/60 hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2 truncate min-w-0">
            {!isFile && (
              <span className="text-gray-500 hover:text-gray-300 shrink-0">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
            <span className={`shrink-0 ${isFile ? 'text-blue-400' : 'text-amber-400'}`}>
              {isFile ? <FileCode2 size={14} /> : isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
            </span>
            <span className="font-mono text-[11.5px] truncate">{node.name || 'root'}</span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {node.category && node.category !== 'unknown' && (
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${getCategoryColor(node.category)}`}>
                {node.category}
              </span>
            )}
            {isFile && node.sizeBytes !== undefined && (
              <span className="text-[10px] text-gray-500 font-mono">
                {(node.sizeBytes / 1024).toFixed(1)} KB
              </span>
            )}
          </div>
        </div>

        {!isFile && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const fileLines = selectedNode?.content ? selectedNode.content.split('\n') : [];
  const targetLine = highlightLine || focusedSource?.line;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#090A0F] text-[#F1F5F9] select-none">
      {/* Left Tree Explorer */}
      <div className="w-80 lg:w-96 shrink-0 border-r border-[#1E2330] flex flex-col h-full bg-[#111318]">
        <div className="p-3 border-b border-[#1E2330] flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по файлам..."
              className="w-full bg-[#0D0E14] border border-[#1E2330] rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {renderTree(tree)}
        </div>
      </div>

      {/* Right Node Details & Code Viewer */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#090A0F]">
        {selectedNode ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header with File Info and Back to API Button */}
            <div className="p-3.5 border-b border-[#1E2330] bg-[#111318] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`p-2 rounded ${selectedNode.type === 'file' ? 'bg-[#161922] text-blue-400 border border-[#1E2330]' : 'bg-[#161922] text-amber-400 border border-[#1E2330]'}`}>
                  {selectedNode.type === 'file' ? <FileCode size={16} /> : <Folder size={16} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                      {selectedNode.type === 'file' ? 'Исходный код файла' : 'Каталог'}
                    </span>
                    {selectedNode.category && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${getCategoryColor(selectedNode.category)}`}>
                        {selectedNode.category}
                      </span>
                    )}
                    {targetLine && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 animate-pulse">
                        Строка {targetLine}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold text-slate-100 font-mono truncate" title={selectedNode.path}>
                    {selectedNode.path || '/'}
                  </h3>
                </div>
              </div>

              {/* Action Buttons: Back to API & Copy Code */}
              <div className="flex items-center space-x-2 shrink-0">
                {selectedNode.content && (
                  <button
                    onClick={() => handleCopyCode(selectedNode.content || '')}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#161922] hover:bg-[#1E222D] text-slate-300 rounded text-xs border border-[#1E2330] transition"
                    title="Скопировать весь исходный код"
                  >
                    {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedCode ? 'Скопировано' : 'Копировать'}</span>
                  </button>
                )}

                {(onBackToPrevious || onBackToApi) && (
                  <button
                    onClick={onBackToPrevious || onBackToApi}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition"
                    title={focusedSource?.returnLabel || backLabel || 'Вернуться назад'}
                  >
                    <ArrowLeft size={13} />
                    <span>{focusedSource?.returnLabel || backLabel || 'Назад'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Metadata Bar */}
            <div className="px-4 py-2 bg-[#111318] border-b border-[#1E2330] flex items-center space-x-4 text-[11px] font-mono text-slate-400 shrink-0">
              <div>Язык: <span className="text-slate-200">{selectedNode.language || 'Plain Text'}</span></div>
              <div>•</div>
              <div>Размер: <span className="text-slate-200">{(selectedNode.sizeBytes / 1024).toFixed(2)} KB</span></div>
              <div>•</div>
              <div>Строк: <span className="text-slate-200">{fileLines.length || selectedNode.linesCount || '—'}</span></div>
            </div>

            {/* Code Content View */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedNode.content ? (
                <div className="rounded border border-[#1E2330] bg-[#0D0E14] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs border-collapse">
                      <tbody>
                        {fileLines.map((line, idx) => {
                          const lineNum = idx + 1;
                          const isFocused = targetLine !== undefined && lineNum === targetLine;

                          return (
                            <tr
                              key={lineNum}
                              ref={isFocused ? codeLineRef : undefined}
                              className={`transition-colors ${
                                isFocused
                                  ? 'bg-amber-500/15 border-l-2 border-amber-400 text-amber-100 font-bold'
                                  : 'hover:bg-[#161922]/50 text-slate-300'
                              }`}
                            >
                              <td className={`py-0.5 px-3 text-right select-none w-12 border-r border-[#1E2330] ${
                                isFocused ? 'text-amber-400 font-bold bg-amber-950/30' : 'text-slate-600 bg-[#0E1015]'
                              }`}>
                                {lineNum}
                              </td>
                              <td className="py-0.5 px-4 whitespace-pre font-mono leading-relaxed text-[11.5px]">
                                {line || ' '}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : selectedNode.type === 'directory' ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono bg-[#111318] rounded border border-[#1E2330]">
                  Выбран каталог <strong className="text-slate-300">{selectedNode.name}</strong>. Выберите файл внутри для просмотра кода.
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs font-mono bg-[#111318] rounded border border-[#1E2330]">
                  Содержимое файла не предзагружено (бинарный или пустой файл).
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500 text-xs m-auto font-mono">
            Выберите узел в дереве для просмотра детальной информации и исходного кода
          </div>
        )}
      </div>
    </div>
  );
};

