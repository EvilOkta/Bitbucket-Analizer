import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import mermaid from 'mermaid';
import {
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  Code2,
  Layers,
  Sparkles,
  Image as ImageIcon,
  Move,
  FileCode,
  X,
  ChevronDown
} from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#070A13',
    primaryColor: '#3b82f6',
    primaryTextColor: '#f9fafb',
    primaryBorderColor: '#60a5fa',
    lineColor: '#93c5fd',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a'
  }
});

interface MermaidViewerProps {
  chart: string;
  plantUmlCode?: string;
  title?: string;
  className?: string;
}

// Wraps text by inserting delimiter (<br/> for Mermaid or \n for PlantUML) at the nearest space or bracket to the right, every 10 characters.
export function wrapDiagramText(text: string, interval = 10, delimiter = '<br/>'): string {
  if (!text || text.length <= interval) return text;

  // Clean existing delimiters if needed
  const clean = text.replace(/<br\s*\/?>/gi, ' ').replace(/\\n/g, ' ');
  const lines: string[] = [];
  let currentPos = 0;

  while (currentPos < clean.length) {
    if (currentPos + interval >= clean.length) {
      lines.push(clean.slice(currentPos));
      break;
    }

    // Look for the nearest space, bracket, or delimiter at or to the right of currentPos + interval
    let splitIdx = -1;
    for (let i = currentPos + interval; i < clean.length; i++) {
      const ch = clean[i];
      if (ch === ' ' || ch === '(' || ch === ')' || ch === '[' || ch === ']' || ch === '{' || ch === '}' || ch === ',' || ch === ':') {
        splitIdx = i;
        break;
      }
    }

    if (splitIdx === -1) {
      lines.push(clean.slice(currentPos));
      break;
    }

    if (clean[splitIdx] === ' ') {
      lines.push(clean.slice(currentPos, splitIdx));
      currentPos = splitIdx + 1;
    } else {
      lines.push(clean.slice(currentPos, splitIdx + 1));
      currentPos = splitIdx + 1;
    }
  }

  return lines.join(delimiter);
}

/**
 * Formats a Sequence Diagram string by wrapping message texts and participant labels
 */
export function formatSequenceDiagram(code: string, isMermaid = true): string {
  if (!code) return '';
  // Skip sequence wrapping for ER diagrams, class diagrams, etc.
  if (code.includes('erDiagram') || code.includes('classDiagram') || code.includes('stateDiagram')) {
    return code;
  }
  const delimiter = isMermaid ? '<br/>' : '\\n';
  return code
    .split('\n')
    .map(line => {
      // Check for participant definition
      const participantMatch = /^(.*?(?:participant|actor|database)\s+(?:"[^"]+"|\S+)\s+as\s+)(.+)$/i.exec(line);
      if (participantMatch) {
        const prefix = participantMatch[1];
        const name = participantMatch[2].replace(/"/g, '');
        return `${prefix}${wrapDiagramText(name, 10, delimiter)}`;
      }

      // Check for arrow message: e.g. "User->>UI: Text" or "A -> B: Text"
      const arrowMatch = /^(.*?(?:->>|-->>|->|-->)\S*?:\s*)(.*)$/.exec(line);
      if (arrowMatch) {
        const prefix = arrowMatch[1];
        const msg = arrowMatch[2];
        return `${prefix}${wrapDiagramText(msg, 10, delimiter)}`;
      }
      return line;
    })
    .join('\n');
}

// PlantUML Dark Theme Skinparams
export const PLANTUML_DARK_SKINPARAMS = `skinparam backgroundColor #070A13
skinparam shadowing false
skinparam roundCorner 8
skinparam BoxPadding 10
skinparam ParticipantPadding 10
skinparam defaultFontName "Inter", "Segoe UI", system-ui, sans-serif
skinparam defaultFontSize 11
skinparam defaultFontColor #E2E8F0
skinparam SequenceGroupBodyBackgroundColor #0F172A
skinparam SequenceGroupBorderColor #334155
skinparam SequenceGroupHeaderFontColor #38BDF8
skinparam ArrowColor #38BDF8
skinparam ArrowFontColor #93C5FD
skinparam ArrowFontSize 10
skinparam ArrowThickness 1.2
skinparam ActorBorderColor #10B981
skinparam ActorBackgroundColor #064E3B
skinparam ActorFontColor #34D399
skinparam ActorFontSize 11
skinparam ActorFontStyle bold
skinparam ParticipantBorderColor #6366F1
skinparam ParticipantBackgroundColor #1E1B4B
skinparam ParticipantFontColor #A5B4FC
skinparam ParticipantFontSize 11
skinparam ParticipantFontStyle bold
skinparam DatabaseBorderColor #06B6D4
skinparam DatabaseBackgroundColor #083344
skinparam DatabaseFontColor #67E8F9
skinparam DatabaseFontSize 11
skinparam DatabaseFontStyle bold
skinparam LifeLineBorderColor #475569
skinparam LifeLineBackgroundColor #1E293B
skinparam NoteBorderColor #F59E0B
skinparam NoteBackgroundColor #451A03
skinparam NoteFontColor #FDE68A`;

export function ensurePlantUmlDarkTheme(code: string): string {
  let clean = (code || '').trim();
  if (!clean.startsWith('@startuml')) {
    clean = `@startuml\n${clean}`;
  }
  if (!clean.endsWith('@enduml')) {
    clean = `${clean}\n@enduml`;
  }

  // If already contains background styling, return clean
  if (clean.includes('skinparam backgroundColor') || clean.includes('!theme plain')) {
    return clean;
  }

  // Insert dark theme skinparams right after @startuml
  return clean.replace(/@startuml(\s*\n\s*autonumber)?/, (_m, auto) => {
    return `@startuml\n${auto ? 'autonumber\n' : 'autonumber\n'}${PLANTUML_DARK_SKINPARAMS}`;
  });
}

export function convertPlantUmlToMermaid(plantUmlCode: string): string {
  const lines = (plantUmlCode || '').split('\n');

  // 1. Check if this is an ER Diagram in PlantUML
  const isErDiagram = plantUmlCode.includes('entity ') || plantUmlCode.includes('enum ') || /\|\|--|\}o--|--o\{|--\|\{/.test(plantUmlCode);
  if (isErDiagram) {
    const mermaidLines: string[] = ['erDiagram'];
    let inBlock = false;
    let currentEntity = '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('@') || line.startsWith('skinparam') || line.startsWith('!') || line.startsWith("'")) {
        continue;
      }

      // Entity or Enum block start: entity "name" as alias { or enum "name" as alias {
      const entityMatch = /^(entity|enum)\s+(?:"([^"]+)"|(\S+))(?:\s+as\s+(\S+))?\s*\{/i.exec(line);
      if (entityMatch) {
        inBlock = true;
        const name = entityMatch[2] || entityMatch[3];
        currentEntity = entityMatch[4] || name.replace(/[^a-zA-Z0-9_]/g, '');
        mermaidLines.push(`    ${currentEntity} {`);
        continue;
      }

      if (inBlock) {
        if (line === '}') {
          mermaidLines.push('    }');
          inBlock = false;
          currentEntity = '';
          continue;
        }
        if (line === '--') continue;

        // Attr line: * id : UUID <<PK>> or name : VARCHAR(100)
        const attrMatch = /^\*?\s*([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_()]+)(?:\s+<<(PK|FK)>>)?/i.exec(line);
        if (attrMatch) {
          const colName = attrMatch[1];
          const colType = attrMatch[2].toLowerCase().replace(/[^a-z0-9]/g, '_');
          const keyTag = attrMatch[3] || '';
          mermaidLines.push(`        ${colType || 'varchar'} ${colName} ${keyTag}`.trimEnd());
        } else if (/^[a-zA-Z0-9_]+/.test(line)) {
          // Enum value
          const val = line.split(/\s/)[0];
          mermaidLines.push(`        enum ${val} "Значение"`);
        }
        continue;
      }

      // Relationship line: A ||--o{ B : "label"
      const relMatch = /^([a-zA-Z0-9_]+)\s*(\|\|--\|\||\|\|--o\{|\}o--\|\||\|\|--\|\{|--o\{|--\|\{|--)\s*([a-zA-Z0-9_]+)(?:\s*:\s*"([^"]+)")?/i.exec(line);
      if (relMatch) {
        const src = relMatch[1];
        let symbol = relMatch[2];
        if (symbol === '--') symbol = '||--o{';
        const tgt = relMatch[3];
        const label = relMatch[4] || 'rel';
        mermaidLines.push(`    ${src} ${symbol} ${tgt} : "${label}"`);
      }
    }

    return mermaidLines.join('\n');
  }

  // 2. Otherwise Sequence Diagram conversion:
  const mermaidLines: string[] = ['sequenceDiagram', 'autonumber'];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (
      !line ||
      line.startsWith('@startuml') ||
      line.startsWith('@enduml') ||
      line.startsWith('skinparam') ||
      line.startsWith('autonumber') ||
      line.startsWith('!')
    ) {
      continue;
    }

    // Comments: ' text -> %% text
    if (line.startsWith("'")) {
      mermaidLines.push(`%% ${line.substring(1).trim()}`);
      continue;
    }

    // Actor: actor "Name" as Alias or actor Alias
    const actorMatch = /^actor\s+(?:"([^"]+)"|(\S+))(?:\s+as\s+(\S+))?$/i.exec(line);
    if (actorMatch) {
      const name = actorMatch[1] || actorMatch[2];
      const alias = actorMatch[3] || name.replace(/[^a-zA-Z0-9_]/g, '_');
      mermaidLines.push(`actor ${alias} as ${name}`);
      continue;
    }

    // Database: database "Name" as Alias or database Alias
    const dbMatch = /^database\s+(?:"([^"]+)"|(\S+))(?:\s+as\s+(\S+))?$/i.exec(line);
    if (dbMatch) {
      const name = dbMatch[1] || dbMatch[2];
      const alias = dbMatch[3] || name.replace(/[^a-zA-Z0-9_]/g, '_');
      mermaidLines.push(`participant ${alias} as 🗄️ ${name}`);
      continue;
    }

    // Participant: participant "Name" as Alias or participant Alias
    const participantMatch = /^(?:participant|boundary|control|entity|collections)\s+(?:"([^"]+)"|(\S+))(?:\s+as\s+(\S+))?$/i.exec(line);
    if (participantMatch) {
      const name = participantMatch[1] || participantMatch[2];
      const alias = participantMatch[3] || name.replace(/[^a-zA-Z0-9_]/g, '_');
      mermaidLines.push(`participant ${alias} as ${name}`);
      continue;
    }

    // Activation: activate Alias / deactivate Alias
    const actMatch = /^(activate|deactivate)\s+(\S+)$/i.exec(line);
    if (actMatch) {
      mermaidLines.push(`${actMatch[1].toLowerCase()} ${actMatch[2]}`);
      continue;
    }

    // Note: note over A, B: text or note right of A: text
    const noteMatch = /^note\s+(?:over|right\s+of|left\s+of)\s+([^:]+):\s*(.*)$/i.exec(line);
    if (noteMatch) {
      mermaidLines.push(line);
      continue;
    }

    // Message arrows: e.g. A -> B: Message, A --> B: Message, A ->> B: Message, A -->> B: Message
    const arrowMatch = /^(\S+)\s*(->>|-->>|->|-->)\s*(\S+)\s*:\s*(.*)$/.exec(line);
    if (arrowMatch) {
      const from = arrowMatch[1];
      const arrowType = arrowMatch[2];
      const to = arrowMatch[3];
      const msg = arrowMatch[4] || '';
      const isDotted = arrowType.includes('--');
      mermaidLines.push(`${from}${isDotted ? '-->>' : '->>'}${to}: ${msg}`);
      continue;
    }
  }

  return mermaidLines.join('\n');
}

export function convertMermaidToPlantUml(mermaidCode: string): string {
  const lines = (mermaidCode || '').split('\n');

  // 1. Check if this is an ER Diagram
  if (mermaidCode.includes('erDiagram')) {
    const plantLines: string[] = [
      '@startuml',
      '!theme plain',
      'skinparam backgroundColor #070A13',
      'skinparam roundcorner 8',
      'skinparam entity {',
      '  BackgroundColor #0F172A',
      '  ArrowColor #3B82F6',
      '  BorderColor #334155',
      '  FontColor #F9FAFB',
      '  FontSize 11',
      '  FontName Consolas',
      '}',
      'skinparam enum {',
      '  BackgroundColor #0D2818',
      '  ArrowColor #10B981',
      '  BorderColor #059669',
      '  FontColor #ECFDF5',
      '  FontSize 11',
      '  FontName Consolas',
      '}'
    ];

    let inBlock = false;
    let currentEntity = '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('erDiagram') || line.startsWith('%%')) continue;

      if (line.endsWith('{')) {
        currentEntity = line.replace(/\{$/, '').trim();
        inBlock = true;
        plantLines.push(`entity "${currentEntity}" as ${currentEntity} {`);
        continue;
      }

      if (inBlock) {
        if (line === '}') {
          plantLines.push('}');
          inBlock = false;
          currentEntity = '';
          continue;
        }
        if (line.startsWith('enum ')) {
          const val = line.replace(/^enum\s+/, '').split(/\s/)[0].replace(/"/g, '');
          plantLines.push(`  ${val}`);
          continue;
        }
        // attr line: type name PK "comment"
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const type = parts[0];
          const name = parts[1];
          const isPk = line.includes(' PK');
          const isFk = line.includes(' FK');
          const keyTag = isPk ? ' <<PK>>' : isFk ? ' <<FK>>' : '';
          const prefix = isPk ? '* ' : '';
          plantLines.push(`  ${prefix}${name} : ${type.toUpperCase()}${keyTag}`);
        }
        continue;
      }

      // Relationship line: A ||--o{ B : "label"
      const relMatch = /^([a-zA-Z0-9_]+)\s*(\|\|--\|\||\|\|--o\{|\}o--\|\||\|\|--\|\{|--o\{|--\|\{|--)\s*([a-zA-Z0-9_]+)(?:\s*:\s*"([^"]+)")?/i.exec(line);
      if (relMatch) {
        const src = relMatch[1];
        let symbol = relMatch[2];
        const tgt = relMatch[3];
        const label = relMatch[4] || 'rel';
        plantLines.push(`${src} ${symbol} ${tgt} : "${label}"`);
      }
    }

    plantLines.push('@enduml');
    return plantLines.join('\n');
  }

  // 2. Otherwise Sequence Diagram conversion:
  const plantLines: string[] = [
    '@startuml',
    'autonumber',
    PLANTUML_DARK_SKINPARAMS
  ];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('sequenceDiagram') || line.startsWith('autonumber')) {
      continue;
    }

    // actor / participant
    const actorMatch = /^(?:actor|participant)\s+([a-zA-Z0-9_]+)(?:\s+as\s+(.*))?$/i.exec(line);
    if (actorMatch) {
      const alias = actorMatch[1];
      const name = (actorMatch[2] || alias).replace(/"/g, '').trim();
      if (line.startsWith('actor') || name.toLowerCase().includes('user') || name.toLowerCase().includes('пользователь')) {
        plantLines.push(`actor "${name}" as ${alias}`);
      } else if (name.toLowerCase().includes('db') || name.toLowerCase().includes('база') || name.toLowerCase().includes('database')) {
        plantLines.push(`database "${name}" as ${alias}`);
      } else {
        plantLines.push(`participant "${name}" as ${alias}`);
      }
      continue;
    }

    // arrows: A->>B: Text or A-->>B: Text
    const arrowMatch = /^([a-zA-Z0-9_]+)\s*(->>|-->>|->|-->)\s*(\+|-)?([a-zA-Z0-9_]+)\s*:\s*(.*)$/.exec(line);
    if (arrowMatch) {
      const from = arrowMatch[1];
      const arrowType = arrowMatch[2];
      const to = arrowMatch[4];
      const msg = (arrowMatch[5] || '').replace(/"/g, "'").trim();
      const isAsync = arrowType.includes('--');
      
      if (isAsync) {
        plantLines.push(`${from} --> ${to}: ${msg}`);
      } else {
        plantLines.push(`${from} -> ${to}: ${msg}`);
      }
      continue;
    }

    if (line.startsWith('%%')) {
      plantLines.push(`' ${line.substring(2)}`);
    }
  }

  plantLines.push('@enduml');
  return plantLines.join('\n');
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({
  chart,
  plantUmlCode,
  title = 'Interactive Sequence Diagram',
  className = ''
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [plantUmlSvgContent, setPlantUmlSvgContent] = useState<string>('');
  const [plantUmlLoading, setPlantUmlLoading] = useState(false);
  const [plantUmlError, setPlantUmlError] = useState<string | null>(null);

  const [copiedMermaid, setCopiedMermaid] = useState(false);
  const [copiedPlantUml, setCopiedPlantUml] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mermaid' | 'plantuml-visual' | 'plantuml-code' | 'mermaid-code'>('mermaid');
  const [error, setError] = useState<string | null>(null);

  // Apply automatic 10-char space/bracket wrapping for Mermaid
  const formattedChart = useMemo(() => {
    return formatSequenceDiagram(chart, true);
  }, [chart]);

  // Safe PlantUML code with Dark Theme Skinparams
  const effectivePlantUml = useMemo(() => {
    if (plantUmlCode && plantUmlCode.trim()) {
      return ensurePlantUmlDarkTheme(plantUmlCode);
    }
    if (chart && chart.trim()) {
      return convertMermaidToPlantUml(chart);
    }
    return ensurePlantUmlDarkTheme('@startuml\n@enduml');
  }, [plantUmlCode, chart]);

  // PlantUML Local Vector SVG Render (100% Offline, Zero External Network Dependency)
  useEffect(() => {
    if (activeTab !== 'plantuml-visual') return;

    let isMounted = true;
    const renderPlantUmlLocal = async () => {
      try {
        setPlantUmlLoading(true);
        setPlantUmlError(null);

        // Convert PlantUML to local sequence SVG
        const localMermaidEquivalent = convertPlantUmlToMermaid(effectivePlantUml);
        const formatted = formatSequenceDiagram(localMermaidEquivalent, true);
        const id = `plantuml-local-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, formatted);
        if (isMounted) {
          setPlantUmlSvgContent(svg);
          setPlantUmlLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          try {
            // Fallback to formattedChart
            const fallbackId = `plantuml-fallback-${Math.random().toString(36).substr(2, 9)}`;
            const { svg } = await mermaid.render(fallbackId, formattedChart);
            if (isMounted) {
              setPlantUmlSvgContent(svg);
              setPlantUmlLoading(false);
            }
          } catch (fallbackErr: any) {
            if (isMounted) {
              setPlantUmlError(err.message || 'Ошибка рендеринга');
              setPlantUmlLoading(false);
            }
          }
        }
      }
    };

    renderPlantUmlLocal();
    return () => {
      isMounted = false;
    };
  }, [activeTab, effectivePlantUml, formattedChart]);

  // Mermaid Render
  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!formattedChart || !formattedChart.trim()) {
        if (isMounted) setSvgContent('');
        return;
      }
      try {
        setError(null);
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, formattedChart);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Ошибка отрисовки диаграммы Mermaid');
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [formattedChart]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Mouse Drag & Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTab === 'mermaid' || activeTab === 'plantuml-visual') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (activeTab === 'mermaid' || activeTab === 'plantuml-visual') {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      setZoom(z => Math.min(5.0, Math.max(0.1, Number((z * zoomFactor).toFixed(2)))));
    }
  };

  const handleReset = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const copyCode = (type: 'mermaid' | 'plantuml') => {
    const textToCopy = type === 'mermaid' ? chart : effectivePlantUml;
    navigator.clipboard.writeText(textToCopy);
    if (type === 'mermaid') {
      setCopiedMermaid(true);
      setTimeout(() => setCopiedMermaid(false), 2000);
    } else {
      setCopiedPlantUml(true);
      setTimeout(() => setCopiedPlantUml(false), 2000);
    }
  };

  const downloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sequence-diagram.svg';
    a.click();
  };

  // Viewer JSX Content
  const renderViewerContent = (inPortal: boolean) => (
    <div
      className={
        inPortal
          ? 'fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[999999] bg-[#070A13] flex flex-col p-4 m-0 select-none overflow-hidden'
          : `relative flex flex-col bg-gray-900/90 border border-gray-800 rounded-xl overflow-hidden select-none h-full min-h-[420px] ${className}`
      }
    >
      {/* Top Two-Row Toolbar */}
      <div className="flex flex-col bg-gray-950/95 border-b border-gray-800 text-xs text-gray-400 gap-1.5 p-2 px-3 shrink-0 select-none">
        {/* Row 1: Title + Format Dropdown Select + Fullscreen */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="font-bold text-gray-100 text-xs truncate max-w-[320px]">{title}</span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="relative flex items-center shrink-0">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="bg-gray-900 hover:bg-gray-850 text-gray-200 border border-gray-800 rounded-lg pl-2.5 pr-7 py-1 text-[11px] font-medium appearance-none focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm transition"
                title="Выбрать режим визуализации или исходного кода диаграммы"
              >
                <option value="mermaid">📊 Mermaid Canvas (Диаграмма)</option>
                <option value="plantuml-visual">🖼️ PlantUML Визуализация</option>
                <option value="plantuml-code">📄 PlantUML Исходный код</option>
                <option value="mermaid-code">📄 Mermaid Исходный код</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 text-gray-400 pointer-events-none" />
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] transition border font-semibold ${
                isFullScreen
                  ? 'bg-red-950/90 hover:bg-red-900 border-red-700 text-red-200 shadow-md'
                  : 'bg-blue-950/80 hover:bg-blue-900/80 text-blue-200 border-blue-800'
              }`}
              title={isFullScreen ? 'Выйти из полноэкранного режима (ESC)' : 'Развернуть на весь экран'}
            >
              {isFullScreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              <span>{isFullScreen ? 'Свернуть' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Zoom Controls (Left) + Copy Code & Actions (Right) */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-800/60 gap-2 min-w-0">
          {(activeTab === 'mermaid' || activeTab === 'plantuml-visual') ? (
            <div className="flex items-center bg-gray-900 p-0.5 rounded-lg border border-gray-800 text-[10px]">
              <button
                onClick={() => setZoom(z => Math.max(0.1, Number((z - 0.15).toFixed(2))))}
                className="p-1 hover:bg-gray-800 rounded text-gray-300 hover:text-white transition flex items-center space-x-0.5"
                title="Уменьшить (Zoom Out)"
              >
                <ZoomOut size={12} />
              </button>
              <span className="font-mono text-gray-300 px-1.5 min-w-[38px] text-center text-[10px]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(5.0, Number((z + 0.15).toFixed(2))))}
                className="p-1 hover:bg-gray-800 rounded text-gray-300 hover:text-white transition flex items-center space-x-0.5"
                title="Увеличить (Zoom In)"
              >
                <ZoomIn size={12} />
              </button>
              <div className="w-[1px] h-3 bg-gray-800 mx-0.5" />
              <button
                onClick={handleReset}
                className="px-1.5 py-0.5 hover:bg-gray-800 rounded text-gray-300 hover:text-white transition flex items-center space-x-1"
                title="Сбросить масштаб и положение (100%)"
              >
                <RotateCcw size={11} />
                <span>100%</span>
              </button>
              <button
                onClick={downloadSvg}
                className="px-1.5 py-0.5 hover:bg-gray-800 rounded text-gray-300 hover:text-white transition flex items-center space-x-1"
                title="Скачать диаграмму в формате SVG"
              >
                <Download size={11} />
                <span>SVG</span>
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-gray-500 font-mono">Просмотр исходного текста диаграммы</span>
          )}

          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-gray-500 font-mono hidden md:inline">
              Панорамирование мышью • Zoom колесиком
            </span>
            {activeTab === 'plantuml-code' || activeTab === 'plantuml-visual' ? (
              <button
                onClick={() => copyCode('plantuml')}
                className="flex items-center space-x-1 px-2.5 py-1 bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 rounded-lg text-[10px] transition border border-purple-800"
                title="Скопировать исходный код PlantUML"
              >
                {copiedPlantUml ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copiedPlantUml ? 'Скопировано' : 'Copy PlantUML'}</span>
              </button>
            ) : (
              <button
                onClick={() => copyCode('mermaid')}
                className="flex items-center space-x-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-[10px] transition border border-gray-700"
                title="Скопировать исходный код Mermaid"
              >
                {copiedMermaid ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copiedMermaid ? 'Скопировано' : 'Copy Mermaid'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Render / Interactive Canvas Area with Pan & Wheel Zoom */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`flex-1 overflow-hidden relative flex items-center justify-center bg-[#070A13] ${
          activeTab === 'mermaid' || activeTab === 'plantuml-visual'
            ? isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-default'
        }`}
      >
        {/* Mermaid Canvas */}
        {activeTab === 'mermaid' && (
          error ? (
            <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-lg text-red-300 text-xs font-mono max-w-lg">
              <p className="font-semibold mb-1 text-red-200">Ошибка генерации диаграммы Mermaid:</p>
              {error}
            </div>
          ) : (
            <div
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.05s ease-out'
              }}
              className="w-full flex justify-center items-center py-6 pointer-events-none"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          )
        )}

        {/* PlantUML Visual Render (100% Offline & Local Vector SVG) */}
        {activeTab === 'plantuml-visual' && (
          <div
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.05s ease-out'
            }}
            className="w-full flex flex-col justify-center items-center py-6 pointer-events-none"
          >
            {plantUmlSvgContent ? (
              <div
                className="w-full flex justify-center items-center"
                dangerouslySetInnerHTML={{ __html: plantUmlSvgContent }}
              />
            ) : plantUmlLoading ? (
              <div className="flex items-center space-x-2.5 text-purple-400 text-xs font-mono py-12">
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span>Отрисовка PlantUML Sequence диаграммы...</span>
              </div>
            ) : (
              <div className="text-center text-gray-500 text-xs font-mono">
                Диаграмма PlantUML пуста или не задана
              </div>
            )}

            {plantUmlError && (
              <div className="mt-4 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs font-mono text-center pointer-events-auto max-w-md">
                <p className="font-semibold mb-1">Ошибка отображения диаграммы</p>
                <p className="text-[11px] text-gray-400 mb-2">{plantUmlError}</p>
                <button
                  onClick={() => setActiveTab('plantuml-code')}
                  className="px-3 py-1 bg-purple-950 hover:bg-purple-900 border border-purple-800 text-purple-300 rounded text-xs transition"
                >
                  Открыть исходный код PlantUML
                </button>
              </div>
            )}
          </div>
        )}

        {/* PlantUML Code Tab */}
        {activeTab === 'plantuml-code' && (
          <div className="w-full h-full p-4 overflow-auto font-mono text-xs text-purple-300 bg-gray-950 rounded-xl border border-gray-800/80 leading-relaxed">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
              <span className="text-gray-400 font-sans font-semibold">PlantUML Sequence Diagram Source:</span>
              <span className="text-[10px] text-gray-500">Готово для PlantUML Server, IntelliJ IDEA, VS Code</span>
            </div>
            <pre className="overflow-x-auto whitespace-pre font-mono selection:bg-purple-900">
              {effectivePlantUml}
            </pre>
          </div>
        )}

        {/* Mermaid Code Tab */}
        {activeTab === 'mermaid-code' && (
          <div className="w-full h-full p-4 overflow-auto font-mono text-xs text-blue-300 bg-gray-950 rounded-xl border border-gray-800/80 leading-relaxed">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
              <span className="text-gray-400 font-sans font-semibold">Mermaid Sequence Diagram Source:</span>
              <span className="text-[10px] text-gray-500">Готово для GitHub Markdown, Notion, Confluence</span>
            </div>
            <pre className="overflow-x-auto whitespace-pre font-mono selection:bg-blue-900">
              {chart}
            </pre>
          </div>
        )}

        {/* Canvas Navigation Hint Overlay */}
        {(activeTab === 'mermaid' || activeTab === 'plantuml-visual') && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-gray-950/90 border border-gray-800 rounded-md text-[10px] font-mono text-gray-400 pointer-events-none flex items-center space-x-1.5 shadow-lg">
            <Move size={11} className="text-purple-400" />
            <span>Зажмите мышь для панорамирования • Колесико для зума</span>
          </div>
        )}
      </div>
    </div>
  );

  if (isFullScreen) {
    return createPortal(renderViewerContent(true), document.body);
  }

  return renderViewerContent(false);
};
