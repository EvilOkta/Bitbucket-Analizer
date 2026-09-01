import { ApiEndpoint, FlowStep, FlowTrace, UiScreenForm, UiInteractableElement, UiElementAttributes, UiHandlerAnalysis } from '../../shared/types';
import { FileEntry } from '../stack/stackDetector';

export const INTERACTIVE_COMPONENTS: Record<string, boolean> = {
  // Consta UI
  'Button': true,
  'Checkbox': true,
  'Switch': true,
  'RadioGroup': true,
  'Radio': true,
  'RadioButton': true,
  'Select': true,
  'Combobox': true,
  'TextField': true,
  'Textarea': true,
  'Chip': true,
  'Tabs': true,
  'Collapse': true,
  'SlideBar': true,
  'SlideBlock': true,

  // Native HTML
  'input': true,
  'button': true,
  'select': true,
  'textarea': true,
  'a': true,
  'form': true,

  // React Hook Form / UI libraries
  'Controller': true,
  'ControllerField': true,
  'Input': true,
  'Modal': true,
  'Dialog': true,
  'Drawer': true,
  'Popover': true,
  'ConfirmationModal': true,
  'DatePicker': true,
  'Calendar': true,
  'FileInput': true,
  'AutoComplete': true,
  'Autocomplete': true,
  'Toggle': true,
  'Dropdown': true,
  'IconButton': true,
  'ActionBtn': true,
  'Link': true,
  'NavLink': true,
  'el-button': true,
  'a-button': true,
  'v-btn': true,
  'el-select': true,
  'v-select': true,
  'el-input': true
};

export const INTERACTIVE_PROP_NAMES = new Set([
  'onClick', '@click', 'v-on:click', '(click)',
  'onChange', '@change', 'v-model',
  'onBlur', '@blur',
  'onFocus', '@focus',
  'onSubmit', '@submit',
  'onReset',
  'onKeyDown', 'onKeyUp', 'onKeyPress',
  'onMouseDown', 'onMouseUp',
  'onTouchStart', 'onTouchEnd',
  'disabled', 'readOnly', 'checked', 'selected',
  'value', 'defaultValue', 'placeholder',
  'type', 'icon', 'iconLeft', 'iconRight', 'label', 'title', 'name'
]);

export const UI_SECTIONS: Record<string, string[]> = {
  'modal': ['Modal', 'Dialog', 'Drawer', 'Popover', 'ConfirmationModal', 'SlideBlock'],
  'sidebar': ['SlideBlock', 'Sidebar', 'SideBar', 'Aside'],
  'header': ['Header', 'AppBar', 'Toolbar', 'TopBar', 'Navbar'],
  'footer': ['Footer', 'BottomBar', 'div.footer', 'footer'],
  'form': ['Form', 'form', 'FormContainer', 'FormGroup'],
  'toolbar': ['Toolbar', 'ActionBar', 'ButtonGroup', 'ToolBar'],
  'table': ['Table', 'DataGrid', 'TableBody', 'TableRow'],
  'card': ['Card', 'Panel', 'Collapse']
};

export class FlowTracer {
  public static trace(
    endpoints: ApiEndpoint[],
    files: FileEntry[],
    analysisRunId: string
  ): FlowTrace[] {
    const traces: FlowTrace[] = [];

    for (const ep of endpoints) {
      const steps: FlowStep[] = [];
      const participants = new Set<string>(['Client', ep.controller]);

      // 1. Step 1: Client to Controller
      steps.push({
        order: 1,
        from: 'Client',
        to: ep.controller,
        call: `${ep.method} ${ep.fullPath || ep.path}`,
        payload: ep.requestSchema || 'RequestPayload',
        type: 'sync',
        sourceFile: ep.sourceFile,
        sourceLine: ep.sourceLine
      });

      // 2. Trace internal service or repository calls from the source file content
      const sourceFileObj = files.find(f => f.path.replace(/\\/g, '/') === ep.sourceFile);
      const content = sourceFileObj?.content || '';

      // Infer service layer
      let serviceName = `${ep.controller.replace('Controller', '')}Service`;
      let repoName = `${ep.controller.replace('Controller', '')}Repository`;
      const dbName = 'PostgreSQL';

      // Check if code contains service mentions
      const serviceMatch = /([a-zA-Z0-9_]+(Service|Handler|UseCase|Manager))/i.exec(content);
      if (serviceMatch && serviceMatch[1] !== ep.controller) {
        serviceName = serviceMatch[1];
      }

      participants.add(serviceName);
      steps.push({
        order: 2,
        from: ep.controller,
        to: serviceName,
        call: `${ep.handler}Execute()`,
        type: 'sync'
      });

      // Check if code or repository mentions DB / Repository / ORM
      const repoMatch = /([a-zA-Z0-9_]+(Repository|Dao|DbContext|Model))/i.exec(content);
      if (repoMatch) {
        repoName = repoMatch[1];
      }
      participants.add(repoName);
      participants.add(dbName);

      steps.push({
        order: 3,
        from: serviceName,
        to: repoName,
        call: ep.method === 'GET' ? 'findData()' : 'saveData(entity)',
        type: 'sync'
      });

      steps.push({
        order: 4,
        from: repoName,
        to: dbName,
        call: ep.method === 'GET' ? 'SELECT * FROM ...' : 'INSERT / UPDATE ...',
        type: 'db_query'
      });

      steps.push({
        order: 5,
        from: dbName,
        to: repoName,
        call: 'QueryResult',
        type: 'sync'
      });

      steps.push({
        order: 6,
        from: repoName,
        to: serviceName,
        call: 'EntityDTO',
        type: 'sync'
      });

      steps.push({
        order: 7,
        from: serviceName,
        to: ep.controller,
        call: 'ServiceResult',
        type: 'sync'
      });

      steps.push({
        order: 8,
        from: ep.controller,
        to: 'Client',
        call: 'HTTP 200 / JSON Response',
        response: ep.responseSchema || 'ResponsePayload',
        type: 'sync'
      });

      const mermaid = this.generateMermaid(steps, Array.from(participants));
      const plantUml = this.generatePlantUml(steps, Array.from(participants));

      traces.push({
        id: `flow-${traces.length + 1}`,
        analysisRunId,
        endpointId: ep.id,
        name: `Сквозной сценарий: ${ep.method} ${ep.fullPath || ep.path}`,
        entryPoint: `${ep.controller}.${ep.handler}`,
        flowType: ep.method === 'GET' ? 'query' : 'command',
        confidence: 0.95,
        participants: Array.from(participants),
        steps,
        sequenceDiagramMermaid: mermaid,
        sequenceDiagramPlantUml: plantUml
      });
    }

    return traces;
  }

  /**
   * Extract screen forms and interactable UI components linked to end-to-end Sequence Diagrams
   */
  public static extractScreenForms(files: FileEntry[], endpoints: ApiEndpoint[]): UiScreenForm[] {
    const screenForms: UiScreenForm[] = [];

    // Search for frontend UI components in repository across all popular web/desktop formats
    const uiFiles = files.filter(f => {
      const p = f.path.toLowerCase().replace(/\\/g, '/');
      const isUiExt = p.endsWith('.tsx') || p.endsWith('.jsx') || p.endsWith('.vue') ||
                      p.endsWith('.html') || p.endsWith('.xaml') || p.endsWith('.svelte') ||
                      p.endsWith('.razor') || p.endsWith('.jsp') || p.endsWith('.blade.php') ||
                      (p.endsWith('.ts') && (p.includes('component') || p.includes('view') || p.includes('screen') || p.includes('form')));
      const isTestOrDoc = p.includes('test') || p.includes('spec') || p.includes('node_modules') || p.includes('.d.ts');
      return isUiExt && !isTestOrDoc;
    });

    if (uiFiles.length === 0) {
      return this.generateDefaultScreenForms(endpoints, files);
    }

    for (const file of uiFiles) {
      const fileName = file.path.split('/').pop() || file.path;
      const formName = fileName.replace(/\.[^/.]+$/, '');
      const content = file.content || '';
      const elements = this.parseInteractiveElementsFromComponent(content, file.path, formName, endpoints, files);

      if (elements.length > 0) {
        screenForms.push({
          id: `form-${screenForms.length + 1}`,
          name: `${formName} (${fileName})`,
          componentPath: file.path,
          sourceFile: file.path,
          sourceLine: 1,
          route: `/${formName.toLowerCase().replace('form', '').replace('view', '').replace('page', '').replace('component', '')}`,
          description: `Экранная форма пользовательского интерфейса ${formName}`,
          elements
        });
      }
    }

    if (screenForms.length === 0) {
      return this.generateDefaultScreenForms(endpoints, files);
    }

    return screenForms;
  }

  /**
   * Rule IA-1 & IA-2 & POS-1 & POS-2 & ATTR-1:
   * Parse JSX/TSX/Vue/HTML component and discover all interactive elements with container positioning,
   * element classification, props/attributes extraction, and handler/Redux side-effect analysis.
   */
  public static parseInteractiveElementsFromComponent(
    content: string,
    filePath: string,
    formName: string,
    endpoints: ApiEndpoint[],
    files?: FileEntry[]
  ): UiInteractableElement[] {
    const elements: UiInteractableElement[] = [];
    const seenSignatures = new Set<string>();

    const getLineNumber = (index: number): number => {
      return content.substring(0, index).split('\n').length;
    };

    const getColumnNumber = (index: number): number => {
      const lastNl = content.lastIndexOf('\n', index);
      return lastNl === -1 ? index + 1 : index - lastNl;
    };

    const extractCodeSnippet = (startIdx: number, rawSnippet?: string): string => {
      if (rawSnippet) {
        const clean = rawSnippet.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
        return clean.length > 130 ? clean.substring(0, 127) + '...' : clean;
      }
      const slice = content.substring(startIdx, Math.min(content.length, startIdx + 130));
      const clean = slice.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      return clean.length > 130 ? clean.substring(0, 127) + '...' : clean;
    };

    // 0. Screen Lifecycle / OnLoad event (useEffect, componentDidMount, onMounted, mounted, created, OnInit)
    const effectRegex = /(?:useEffect\s*\(\s*(?:\(\s*\)\s*=>|\bfunction\b[^{]*)\s*\{([\s\S]*?)\}|componentDidMount\s*\(\s*\)[^{]*\{([\s\S]*?)\}|onMounted\s*\(\s*(?:\(\s*\)\s*=>|\bfunction\b[^{]*)\s*\{([\s\S]*?)\}|mounted\s*\(\s*\)\s*\{([\s\S]*?)\}|ngOnInit\s*\(\s*\)[^{]*\{([\s\S]*?)\})/gi;
    let effectMatch: RegExpExecArray | null;
    while ((effectMatch = effectRegex.exec(content)) !== null) {
      const matchIdx = effectMatch.index;
      const lineNum = getLineNumber(matchIdx);
      const effectBody = effectMatch[1] || effectMatch[2] || effectMatch[3] || effectMatch[4] || effectMatch[5] || '';
      
      // Extract what function/method is invoked inside the lifecycle hook
      let calledHandler = '';
      const callMatch = /([a-zA-Z0-9_]+)\s*\(/g;
      let fnMatch;
      while ((fnMatch = callMatch.exec(effectBody)) !== null) {
        const fnName = fnMatch[1];
        if (!['console', 'log', 'setState', 'setLoading', 'dispatch', 'useEffect', 'fetch', 'axios', 'if', 'catch'].includes(fnName)) {
          calledHandler = fnName;
          break;
        }
      }

      const handlerName = calledHandler ? `${calledHandler}()` : 'useEffect(onMount)';
      const snippet = extractCodeSnippet(matchIdx, effectMatch[0].split('{')[0] + '{ ... }');
      const loadElement = this.buildScreenLoadElement(formName, filePath, lineNum, handlerName, snippet, endpoints, files);
      elements.push(loadElement);
      break; // Only first primary lifecycle hook for form root
    }

    // 1. Tag parser with Container and Sibling Path Tracking
    // Matches JSX tags: <TagName ...props...> ...children... </TagName> or <TagName ...props... />
    const tagRegex = /<([a-zA-Z0-9_.-]+)\b([^>]*?)(?:\/?>|>([\s\S]*?)<\/\1>)/gi;
    let match: RegExpExecArray | null;

    // Track sibling indices per container
    const siblingCounters: Record<string, number> = {};

    while ((match = tagRegex.exec(content)) !== null) {
      const rawTag = match[1];
      const attrsStr = match[2] || '';
      const innerText = (match[3] || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const matchIdx = match.index;
      const lineNum = getLineNumber(matchIdx);
      const colNum = getColumnNumber(matchIdx);
      const precedingText = content.substring(Math.max(0, matchIdx - 120), matchIdx);

      // Parse Attributes Map
      const attrsMap = this.parsePropsMap(attrsStr);

      // RULE IA-1: Check interactivity
      const isInteractive = this.checkIsInteractiveElement(rawTag, attrsMap, attrsStr);
      if (!isInteractive) {
        continue;
      }

      // RULE IA-2: Classify Element Type
      const classifiedType = this.classifyElementType(rawTag, attrsMap);

      // RULE POS-1 & POS-2: Build JSX Path, Container Hierarchy, and UI Section
      const precedingContent = content.substring(0, matchIdx);
      const containers = this.extractContainersFromContext(precedingContent, rawTag, attrsMap);
      const parentContainer = containers.length > 0 ? containers[containers.length - 1] : formName;
      
      const containerKey = containers.join('/');
      siblingCounters[containerKey] = (siblingCounters[containerKey] || 0) + 1;
      const siblingIndex = siblingCounters[containerKey];

      const jsxPath = `/${containers.join('/')}/${rawTag}[${siblingIndex - 1}]`.replace(/\/+/g, '/');
      const depth = (jsxPath.match(/\//g) || []).length;
      const uiSection = this.detectUISection(containers);

      // RULE ATTR-1: Extract Attributes & Props
      const attributes = this.extractAttributesFromJSX(attrsStr, innerText, rawTag);

      // Meta for naming (prioritizing Description / Label -> ClassName)
      const meta = this.extractElementMetadata(attrsStr, attributes.label || innerText || attributes.placeholder || '', rawTag, precedingText);
      const displayName = meta.displayName;

      // Extract Event Handlers & analyze side effects (Redux actions, fetch, localStorage)
      const { primaryHandler, handlersList } = this.extractAndAnalyzeHandlers(attrsStr, content, formName, rawTag);

      const snippet = extractCodeSnippet(matchIdx, match[0]);
      const sig = `${rawTag}:${displayName}:${lineNum}:${colNum}`;

      if (!seenSignatures.has(sig) && displayName.length < 150) {
        seenSignatures.add(sig);

        // Map classifiedType to UiInteractableElement.type
        let baseType: 'button' | 'input' | 'select' | 'form_submit' | 'checkbox' | 'link' | 'screen_load' = 'button';
        if (classifiedType === 'button.submit') baseType = 'form_submit';
        else if (classifiedType.startsWith('button')) baseType = 'button';
        else if (classifiedType === 'checkbox') baseType = 'checkbox';
        else if (classifiedType === 'select') baseType = 'select';
        else if (classifiedType === 'link') baseType = 'link';
        else if (classifiedType === 'text_input' || classifiedType === 'textarea') baseType = 'input';
        else if (classifiedType === 'form') baseType = 'form_submit';

        const elem = this.buildInteractableElement(
          displayName,
          baseType,
          formName,
          filePath,
          lineNum,
          primaryHandler || `${formName}.${rawTag.toLowerCase()}Action`,
          snippet,
          endpoints,
          files
        );

        // Enrich with IA-1, POS-1, POS-2, ATTR-1, and Handler metadata
        elem.elementType = classifiedType;
        elem.position = {
          file: filePath,
          line: lineNum,
          column: colNum,
          jsxPath,
          depth,
          containers,
          uiSection,
          parentBlock: parentContainer,
          siblingIndex: siblingIndex - 1
        };
        elem.attributes = attributes;
        elem.handlers = handlersList;

        // If handler has Redux action or side effects, enrich sequence diagram steps!
        if (handlersList.length > 0) {
          this.enrichSequenceWithHandlerAnalysis(elem, handlersList, formName, filePath, lineNum);
        }

        elements.push(elem);
      }
    }

    return elements;
  }

  /**
   * RULE IA-1: Check if element is interactable
   */
  public static checkIsInteractiveElement(tag: string, attrs: Map<string, string>, rawAttrsStr: string): boolean {
    const lowerTag = tag.toLowerCase();

    // Condition A: Native HTML input tag
    if (['input', 'select', 'textarea', 'button', 'a', 'form'].includes(lowerTag)) {
      if (lowerTag === 'input' && attrs.get('type') === 'hidden') return false;
      return true;
    }

    // Condition B: Component from known interactive libraries
    if (INTERACTIVE_COMPONENTS[tag] || INTERACTIVE_COMPONENTS[tag.charAt(0).toUpperCase() + tag.slice(1)]) {
      return true;
    }

    // Condition C: Tag contains interactive props (onClick, onChange, etc.)
    for (const propName of INTERACTIVE_PROP_NAMES) {
      if (attrs.has(propName) || new RegExp(`\\b${propName}\\b\\s*=`, 'i').test(rawAttrsStr)) {
        return true;
      }
    }

    return false;
  }

  /**
   * RULE IA-2: Classify element type
   */
  public static classifyElementType(name: string, attrs: Map<string, string>): string {
    const lowerName = name.toLowerCase();
    const typeAttr = (attrs.get('type') || '').toLowerCase();

    // 1. Button detection
    if (/^(button|iconbutton|actionbtn|el-button|a-button|v-btn)$/i.test(name)) {
      if (typeAttr === 'submit') return 'button.submit';
      if (typeAttr === 'reset') return 'button.reset';
      return 'button.action';
    }

    // 2. Specific type attribute detection
    if (typeAttr === 'checkbox') return 'checkbox';
    if (typeAttr === 'radio') return 'radio';
    if (typeAttr === 'submit') return 'button.submit';
    if (typeAttr === 'file') return 'file_input';
    if (typeAttr === 'date') return 'date_picker';

    // 3. Component name patterns
    const componentPatterns: Record<string, string> = {
      'checkbox': 'checkbox',
      'switch': 'toggle',
      'toggle': 'toggle',
      'radiogroup': 'radio',
      'radio': 'radio',
      'radiobutton': 'radio',
      'select': 'select',
      'combobox': 'select',
      'autocomplete': 'select',
      'dropdown': 'select',
      'textfield': 'text_input',
      'input': 'text_input',
      'el-input': 'text_input',
      'textarea': 'textarea',
      'datepicker': 'date_picker',
      'calendar': 'date_picker',
      'fileinput': 'file_input',
      'modal': 'modal',
      'dialog': 'modal',
      'drawer': 'modal',
      'confirmationmodal': 'modal',
      'slideblock': 'modal',
      'slidebar': 'toggle',
      'chip': 'toggle',
      'tabs': 'toggle',
      'collapse': 'toggle',
      'popover': 'modal',
      'form': 'form',
      'link': 'link',
      'navlink': 'link',
      'a': 'link',
      'controller': 'text_input',
      'controllerfield': 'text_input'
    };

    return componentPatterns[lowerName] || 'unknown';
  }

  /**
   * Parse JSX attribute string into key-value map
   */
  public static parsePropsMap(attrsStr: string): Map<string, string> {
    const map = new Map<string, string>();
    const propRegex = /([a-zA-Z0-9_:@()-]+)(?:\s*=\s*(?:\{([^}]*)\}|"([^"]*)"|'([^']*)'))?/g;
    let m;
    while ((m = propRegex.exec(attrsStr)) !== null) {
      const key = m[1];
      const val = m[2] !== undefined ? m[2].trim() : (m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : 'true'));
      map.set(key, val);
    }
    return map;
  }

  /**
   * RULE POS-1 & POS-2: Extract container hierarchy from preceding JSX context
   */
  public static extractContainersFromContext(precedingText: string, currentTag: string, attrs: Map<string, string>): string[] {
    const containers: string[] = [];
    const containerTags = [
      'SlideBlock', 'Modal', 'Dialog', 'Drawer', 'ConfirmationModal', 'Popover',
      'Sidebar', 'SideBar', 'Header', 'Footer', 'Toolbar', 'Table', 'Form', 'Card', 'Panel',
      'Collapse', 'ButtonGroup', 'ActionBar', 'Container', 'div'
    ];

    const tagStackRegex = /<([A-Za-z0-9_]+)([^>]*?)(\/?>|<\/([A-Za-z0-9_]+)>)/g;
    let m;
    const stack: { tag: string; className: string }[] = [];

    while ((m = tagStackRegex.exec(precedingText)) !== null) {
      const openTag = m[1];
      const tagAttrs = m[2] || '';
      const isSelfClosing = m[3].startsWith('/>');
      const closeTag = m[4];

      if (closeTag) {
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].tag === closeTag) {
            stack.splice(i, 1);
            break;
          }
        }
      } else if (!isSelfClosing && openTag) {
        const classMatch = /(?:className|class)\s*=\s*(?:\{["'`]?([^"'`{}]+)["'`]?\}|["']([^"']+)["'])/i.exec(tagAttrs);
        const className = classMatch ? (classMatch[1] || classMatch[2] || '').trim() : '';
        stack.push({ tag: openTag, className });
      }
    }

    for (const item of stack) {
      // Meaningful container logic: keep custom components or divs with semantic className
      if (item.tag !== 'div' && item.tag !== 'span' && item.tag !== 'section') {
        containers.push(item.tag);
      } else if (item.className) {
        // e.g. div.footer, div.header, div.root
        const firstClass = item.className.split(' ')[0].replace(/[^a-zA-Z0-9_-]/g, '');
        if (firstClass) {
          containers.push(`${item.tag}.${firstClass}`);
        }
      }
    }

    return containers.length > 0 ? containers : ['FormContainer'];
  }

  /**
   * RULE POS-2: Detect UI Section from container names
   */
  public static detectUISection(containers: string[]): string {
    for (const [sectionType, patterns] of Object.entries(UI_SECTIONS)) {
      for (const container of containers) {
        for (const pattern of patterns) {
          if (container.toLowerCase().includes(pattern.toLowerCase())) {
            return sectionType;
          }
        }
      }
    }
    return 'content';
  }

  /**
   * RULE ATTR-1: Extract Attributes and Props from JSX
   */
  public static extractAttributesFromJSX(attrsStr: string, innerText: string, tagName: string): UiElementAttributes {
    const attrsMap = this.parsePropsMap(attrsStr);
    const attrs: UiElementAttributes = {};

    // 1. Label / Text / Placeholder / Name / Value
    const labelVal = attrsMap.get('label') || attrsMap.get('title') || attrsMap.get('aria-label');
    if (labelVal) attrs.label = labelVal.replace(/['"`]/g, '');
    if (innerText) attrs.text = innerText;

    const phVal = attrsMap.get('placeholder');
    if (phVal) attrs.placeholder = phVal.replace(/['"`]/g, '');

    const nameVal = attrsMap.get('name');
    if (nameVal) attrs.name = nameVal.replace(/['"`]/g, '');

    const typeVal = attrsMap.get('type');
    if (typeVal) attrs.type = typeVal.replace(/['"`]/g, '');

    const valVal = attrsMap.get('value') || attrsMap.get('defaultValue');
    if (valVal) attrs.value = valVal.replace(/['"`]/g, '');

    // 2. Icon (iconRight, iconLeft, icon, or JSX icon)
    const iconRight = attrsMap.get('iconRight') || attrsMap.get('iconLeft') || attrsMap.get('icon');
    if (iconRight) {
      attrs.icon = iconRight.replace(/[{}]/g, '').trim();
    } else {
      const iconChildMatch = /<([A-Z][a-zA-Z0-9_]*(?:Icon|Check|Close|Plus|Trash|Edit|Search|Save|Download|Arrow))\b/i.exec(attrsStr);
      if (iconChildMatch) {
        attrs.icon = iconChildMatch[1];
      }
    }

    // 3. Boolean props
    if (attrsMap.has('disabled') && attrsMap.get('disabled') !== 'false') attrs.disabled = true;
    if (attrsMap.has('required') && attrsMap.get('required') !== 'false') attrs.required = true;
    if (attrsMap.has('checked') && attrsMap.get('checked') !== 'false') attrs.checked = true;
    if (attrsMap.has('readOnly') && attrsMap.get('readOnly') !== 'false') attrs.readOnly = true;
    if (attrsMap.has('selected') && attrsMap.get('selected') !== 'false') attrs.selected = true;

    return attrs;
  }

  /**
   * RULE HANDLERS: Find event handlers and analyze Redux actions, side effects, and conditions
   */
  public static extractAndAnalyzeHandlers(
    attrsStr: string,
    fileContent: string,
    formName: string,
    tagName: string
  ): { primaryHandler: string; handlersList: UiHandlerAnalysis[] } {
    const handlersList: UiHandlerAnalysis[] = [];
    const eventRegex = /(onClick|@click|onChange|@change|v-model|onSubmit|@submit|onBlur|onFocus|onKeyDown)\s*=\s*(?:\{(?:\([^)]*\)\s*=>\s*)?([a-zA-Z0-9_.]+)|["']([a-zA-Z0-9_.]+))/gi;
    let m;
    let primaryHandler = '';

    while ((m = eventRegex.exec(attrsStr)) !== null) {
      const eventType = m[1];
      const handlerName = m[2] || m[3] || '';
      if (!handlerName) continue;

      if (!primaryHandler) primaryHandler = handlerName;

      const analysis = this.analyzeHandlerFunction(handlerName, fileContent, eventType);
      handlersList.push(analysis);
    }

    // Check for inline handlers e.g. onClick={() => { dispatch(resolveConflict()); }}
    if (handlersList.length === 0) {
      const inlineMatch = /(onClick|onChange|onSubmit)\s*=\s*\{(?:\([^)]*\)\s*=>\s*)?\{?([^}]+)\}?\}/i.exec(attrsStr);
      if (inlineMatch) {
        const eventType = inlineMatch[1];
        const inlineCode = inlineMatch[2].trim();
        const analysis = this.analyzeHandlerCodeSnippet('inlineHandler', inlineCode, eventType);
        handlersList.push(analysis);
        primaryHandler = 'inlineHandler';
      }
    }

    return { primaryHandler, handlersList };
  }

  /**
   * Analyze handler function implementation inside the source file
   */
  public static analyzeHandlerFunction(handlerName: string, fileContent: string, eventType: string): UiHandlerAnalysis {
    // Find function definition in content
    const cleanFnName = handlerName.replace(/^[a-zA-Z0-9_]+\./, ''); // remove this. or props.
    const fnRegex = new RegExp(`(?:const|let|var|function|async function)\\s+${cleanFnName}\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>\\s*\\{([\\s\\S]*?)\\n\\s*\\}|function\\s+${cleanFnName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\}|${cleanFnName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, 'i');
    const fnMatch = fnRegex.exec(fileContent);
    const fnBody = fnMatch ? (fnMatch[1] || fnMatch[2] || fnMatch[3] || '') : '';

    return this.analyzeHandlerCodeSnippet(handlerName, fnBody, eventType);
  }

  /**
   * Analyze code snippet for Redux actions, API side effects, and conditions
   */
  public static analyzeHandlerCodeSnippet(handlerName: string, code: string, eventType: string): UiHandlerAnalysis {
    const reduxActions: string[] = [];
    const sideEffects: string[] = [];

    // Redux Actions: dispatch(actionName(...)) or dispatch({ type: '...' })
    const reduxRegex = /dispatch\s*\(\s*(?:([a-zA-Z0-9_]+)\s*\(|{\s*type:\s*['"`]([^'"`]+)['"`])/g;
    let rm;
    while ((rm = reduxRegex.exec(code)) !== null) {
      const action = rm[1] || rm[2];
      if (action && !reduxActions.includes(action)) {
        reduxActions.push(action);
      }
    }

    // Side Effects: fetch, axios, localStorage, sessionStorage, navigate, history
    const effectPatterns: [RegExp, string][] = [
      [/(?:fetch|axios\.(?:get|post|put|delete|patch)|apiService\.[a-zA-Z0-9_]+)\s*\(([^)]*)\)/gi, 'API Вызов'],
      [/localStorage\.(?:setItem|getItem|removeItem)\s*\(([^)]*)\)/gi, 'localStorage'],
      [/sessionStorage\.(?:setItem|getItem|removeItem)\s*\(([^)]*)\)/gi, 'sessionStorage'],
      [/(?:navigate|history\.push|router\.push)\s*\(([^)]*)\)/gi, 'Навигация (navigate)']
    ];

    for (const [re, label] of effectPatterns) {
      let em;
      while ((em = re.exec(code)) !== null) {
        const fullCall = em[0].substring(0, 45);
        if (!sideEffects.includes(fullCall)) {
          sideEffects.push(fullCall);
        }
      }
    }

    const hasConditionals = /\b(if|switch|try|catch)\b/.test(code);

    return {
      handlerName,
      eventType,
      reduxActions: reduxActions.length > 0 ? reduxActions : undefined,
      sideEffects: sideEffects.length > 0 ? sideEffects : undefined,
      hasConditionals,
      rawSnippet: code.trim().substring(0, 150)
    };
  }

  /**
   * Enrich Sequence Diagram with detected Redux actions and Side Effects
   */
  private static enrichSequenceWithHandlerAnalysis(
    elem: UiInteractableElement,
    handlers: UiHandlerAnalysis[],
    formName: string,
    sourceFile: string,
    sourceLine: number
  ): void {
    const participants = new Set<string>(elem.sequenceSteps.map(s => s.from).concat(elem.sequenceSteps.map(s => s.to)));
    const newSteps: FlowStep[] = [...elem.sequenceSteps];

    for (const h of handlers) {
      if (h.reduxActions && h.reduxActions.length > 0) {
        participants.add('Redux Store / State');
        for (const act of h.reduxActions) {
          newSteps.splice(newSteps.length - 1, 0, {
            order: newSteps.length,
            from: `${formName} (Handler)`,
            to: 'Redux Store / State',
            call: `dispatch(${act})`,
            type: 'sync',
            sourceFile,
            sourceLine
          });
        }
      }

      if (h.sideEffects && h.sideEffects.length > 0) {
        for (const eff of h.sideEffects) {
          if (eff.includes('localStorage') || eff.includes('sessionStorage')) {
            participants.add('Browser Storage');
            newSteps.splice(newSteps.length - 1, 0, {
              order: newSteps.length,
              from: `${formName} (Handler)`,
              to: 'Browser Storage',
              call: eff,
              type: 'sync',
              sourceFile,
              sourceLine
            });
          }
        }
      }
    }

    // Re-order step numbers
    newSteps.forEach((s, idx) => { s.order = idx + 1; });
    elem.sequenceSteps = newSteps;
    elem.sequenceDiagramMermaid = this.generateMermaid(newSteps, Array.from(participants));
    elem.sequenceDiagramPlantUml = this.generatePlantUml(newSteps, Array.from(participants));
  }

  /**
   * Build initial screen loading and dictionary prefetching lifecycle element
   */
  private static buildScreenLoadElement(
    formName: string,
    componentPath: string,
    sourceLine: number,
    handlerName: string,
    codeSnippet: string,
    endpoints?: ApiEndpoint[],
    files?: FileEntry[]
  ): UiInteractableElement {
    const ep = endpoints?.find(e => e.method === 'GET');
    const steps: FlowStep[] = [
      { order: 1, from: 'Пользователь (User)', to: formName, call: 'Переход на маршрут и открытие экрана', type: 'sync', sourceFile: componentPath, sourceLine },
      { order: 2, from: formName, to: 'Frontend State / Hook', call: `${handlerName} -> инициализация данных компонента`, type: 'sync', sourceFile: componentPath, sourceLine }
    ];

    const participants = ['Пользователь (User)', formName, 'Frontend State / Hook'];

    if (ep) {
      participants.push(ep.controller);
      steps.push(
        { order: 3, from: 'Frontend State / Hook', to: ep.controller, call: `GET ${ep.fullPath || ep.path}`, type: 'sync', sourceFile: ep.sourceFile, sourceLine: ep.sourceLine },
        { order: 4, from: ep.controller, to: formName, call: 'HTTP 200 OK (Данные экрана)', type: 'sync' }
      );
    }

    steps.push({ order: steps.length + 1, from: formName, to: 'Пользователь (User)', call: 'Отрисовка готового интерфейса экранной формы', type: 'sync' });

    const mermaid = this.generateMermaid(steps, participants);
    const plantUml = this.generatePlantUml(steps, participants);

    return {
      id: `elem-load-${formName.toLowerCase()}`,
      name: `Событие: Инициализация и предзагрузка данных (${formName})`,
      type: 'screen_load',
      targetAction: handlerName,
      handlerMethod: handlerName,
      codeSnippet,
      sequenceSteps: steps,
      sequenceDiagramMermaid: mermaid,
      sequenceDiagramPlantUml: plantUml,
      sourceFile: componentPath,
      sourceLine,
      targetSourceFile: componentPath,
      targetSourceLine: sourceLine
    };
  }

  /**
   * Extracts description (title, aria-label, label, placeholder, comment) and className
   * and formats a composite name: "Описание (имяКласса)" or "Описание" or "Кнопка (имяКласса)"
   */
  private static extractElementMetadata(
    attrs: string,
    innerText: string,
    defaultTag: string,
    precedingText: string = ''
  ): { displayName: string; description: string; className: string } {
    // 1. Extract title, aria-label, label, placeholder, tooltip, description
    const titleMatch = /(?:title|aria-label|label|placeholder|tooltip|description)\s*=\s*(?:\{["'`]?([^"'`{}]+)["'`]?\}|["']([^"']+)["'])/i.exec(attrs);
    let description = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';

    // 2. If no attribute description, check for preceding comment on previous line e.g. // Уменьшить масштаб
    if (!description && precedingText) {
      const commentMatch = /(?:\/\/\s*([^\r\n]+)|\/\*\s*([^*]+)\*\/)/i.exec(precedingText);
      if (commentMatch) {
        const comment = (commentMatch[1] || commentMatch[2] || '').trim();
        if (comment.length > 2 && comment.length < 80 && !comment.startsWith('eslint') && !comment.startsWith('@ts') && !comment.startsWith('TODO')) {
          description = comment;
        }
      }
    }

    // 3. Extract className or class
    const classMatch = /(?:className|class)\s*=\s*(?:\{["'`]?([^"'`{}]+)["'`]?\}|["']([^"']+)["'])/i.exec(attrs);
    let className = classMatch ? (classMatch[1] || classMatch[2] || '').trim() : '';

    // 4. Clean inner text if available
    const cleanInnerText = innerText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // 5. Format display name: [Описание / Text] ([Имя класса])
    const mainLabel = description || cleanInnerText;

    let displayName = '';
    if (mainLabel && className) {
      const shortClass = className.length > 40 ? className.substring(0, 37) + '...' : className;
      displayName = `${mainLabel} (${shortClass})`;
    } else if (mainLabel) {
      displayName = mainLabel;
    } else if (className) {
      const shortClass = className.length > 40 ? className.substring(0, 37) + '...' : className;
      displayName = `${defaultTag} (${shortClass})`;
    } else {
      displayName = defaultTag;
    }

    return { displayName, description, className };
  }

  private static buildInteractableElement(
    name: string,
    type: 'screen_load' | 'lifecycle' | 'button' | 'input' | 'select' | 'form_submit' | 'checkbox' | 'link',
    formName: string,
    componentPath: string,
    sourceLine: number,
    handlerName: string,
    codeSnippet: string,
    endpoints?: ApiEndpoint[],
    files?: FileEntry[]
  ): UiInteractableElement {
    // Determine if element triggers a matching endpoint
    const matchedEp = type === 'button' || type === 'form_submit'
      ? endpoints?.find(e => e.method === 'POST' || e.method === 'PUT')
      : endpoints?.find(e => e.method === 'GET');

    const steps: FlowStep[] = [
      { order: 1, from: 'Пользователь (User)', to: formName, call: `${type === 'button' ? 'Клик' : type === 'link' ? 'Переход' : 'Ввод'}: "${name}"`, type: 'sync', sourceFile: componentPath, sourceLine },
      { order: 2, from: formName, to: `${formName} (Handler)`, call: `Вызов метода: ${handlerName}()`, type: 'sync', sourceFile: componentPath, sourceLine }
    ];

    const participants = ['Пользователь (User)', formName, `${formName} (Handler)`];

    if (matchedEp) {
      participants.push(matchedEp.controller);
      steps.push(
        { order: 3, from: `${formName} (Handler)`, to: matchedEp.controller, call: `${matchedEp.method} ${matchedEp.fullPath || matchedEp.path}`, type: 'sync', sourceFile: matchedEp.sourceFile, sourceLine: matchedEp.sourceLine },
        { order: 4, from: matchedEp.controller, to: formName, call: 'HTTP 200 OK (Ответ операции)', type: 'sync' }
      );
    }

    steps.push({ order: steps.length + 1, from: formName, to: 'Пользователь (User)', call: 'Обновление интерфейса экранной формы', type: 'sync' });

    const mermaid = this.generateMermaid(steps, participants);
    const plantUml = this.generatePlantUml(steps, participants);

    return {
      id: `elem-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
      name,
      type,
      targetAction: handlerName,
      handlerMethod: handlerName,
      codeSnippet,
      sequenceSteps: steps,
      sequenceDiagramMermaid: mermaid,
      sequenceDiagramPlantUml: plantUml,
      sourceFile: componentPath,
      sourceLine,
      targetSourceFile: componentPath,
      targetSourceLine: sourceLine
    };
  }

  private static generateDefaultScreenForms(endpoints: ApiEndpoint[], files?: FileEntry[]): UiScreenForm[] {
    const form1Path = 'src/client/views/TransferMoneyForm.tsx';
    const form2Path = 'src/client/views/AccountHistoryView.vue';
    const form3Path = 'src/client/components/OtpConfirmModal.tsx';

    return [
      {
        id: 'form-1',
        name: 'Форма перевода средств (TransferMoneyForm.tsx)',
        componentPath: form1Path,
        sourceFile: form1Path,
        sourceLine: 1,
        route: '/transfers/new',
        description: 'Экранная форма оформления платежей и переводов клиентам',
        elements: [
          this.buildScreenLoadElement('TransferMoneyForm', form1Path, 12, 'useEffect(fetchAccounts)', '<useEffect(() => { fetchAccounts(); }, [])>', endpoints, files),
          this.buildInteractableElement('Кнопка "Оформить перевод"', 'button', 'TransferMoneyForm', form1Path, 45, 'handleTransferSubmit', '<Button onClick={handleTransferSubmit}>Оформить перевод</Button>', endpoints, files),
          this.buildInteractableElement('Поле "Счет получателя (destinationAccount)"', 'input', 'TransferMoneyForm', form1Path, 28, 'setDestinationAccount', '<Input name="destinationAccount" onChange={e => setDestinationAccount(e.target.value)} />', endpoints, files),
          this.buildInteractableElement('Поле "Сумма перевода (amount)"', 'input', 'TransferMoneyForm', form1Path, 34, 'setAmount', '<Input name="amount" type="number" onChange={e => setAmount(e.target.value)} />', endpoints, files),
          this.buildInteractableElement('Селект "Валюта операции (currency)"', 'select', 'TransferMoneyForm', form1Path, 40, 'setCurrency', '<Select name="currency" onChange={val => setCurrency(val)} />', endpoints, files)
        ]
      },
      {
        id: 'form-2',
        name: 'Панель выписки и истории операций (AccountHistoryView.vue)',
        componentPath: form2Path,
        sourceFile: form2Path,
        sourceLine: 1,
        route: '/accounts/history',
        description: 'Экранная форма просмотра истории транзакций и фильтрации выписки',
        elements: [
          this.buildScreenLoadElement('AccountHistoryView', form2Path, 15, 'onMounted(loadHistory)', '<onMounted(() => loadHistory())>', endpoints, files),
          this.buildInteractableElement('Кнопка "Применить фильтры периода"', 'button', 'AccountHistoryView', form2Path, 32, 'applyDateFilter', '<button @click="applyDateFilter">Применить фильтры</button>', endpoints, files),
          this.buildInteractableElement('Поле "Поиск по номеру транзакции"', 'input', 'AccountHistoryView', form2Path, 26, 'searchQuery', '<input v-model="searchQuery" placeholder="Поиск..." />', endpoints, files),
          this.buildInteractableElement('Кнопка "Экспорт выписки в Excel/PDF"', 'button', 'AccountHistoryView', form2Path, 48, 'exportStatement', '<button @click="exportStatement">Экспорт</button>', endpoints, files)
        ]
      },
      {
        id: 'form-3',
        name: 'Модальное окно подтверждения 3D-Secure (OtpConfirmModal.tsx)',
        componentPath: form3Path,
        sourceFile: form3Path,
        sourceLine: 1,
        route: '/auth/otp-verify',
        description: 'Диалоговое окно ввода одноразового SMS/Push кода подтверждения',
        elements: [
          this.buildScreenLoadElement('OtpConfirmModal', form3Path, 10, 'useEffect(startTimer)', '<useEffect(() => startTimer(), [])>', endpoints, files),
          this.buildInteractableElement('Поле "СМС-код (otpCode)"', 'input', 'OtpConfirmModal', form3Path, 22, 'setOtpCode', '<Input name="otpCode" onChange={e => setOtpCode(e.target.value)} />', endpoints, files),
          this.buildInteractableElement('Кнопка "Подтвердить код (Submit OTP)"', 'button', 'OtpConfirmModal', form3Path, 30, 'handleConfirmOtp', '<Button onClick={handleConfirmOtp}>Подтвердить код</Button>', endpoints, files),
          this.buildInteractableElement('Кнопка "Отправить код повторно"', 'button', 'OtpConfirmModal', form3Path, 38, 'resendCode', '<button onClick={resendCode}>Отправить повторно</button>', endpoints, files)
        ]
      }
    ];
  }

  /**
   * Wraps text by inserting delimiter (<br/> for Mermaid or \n for PlantUML) at the nearest space or bracket to the right, every 10 characters.
   */
  public static wrapDiagramText(text: string, interval = 10, delimiter = '\\n'): string {
    if (!text || text.length <= interval) return text;

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

  public static generateMermaid(steps: FlowStep[], participants: string[]): string {
    const lines: string[] = ['sequenceDiagram', 'autonumber'];

    // Define participant aliases to avoid spaces in Mermaid identifiers
    const aliasMap = new Map<string, string>();
    participants.forEach((p, idx) => {
      const alias = `P${idx + 1}`;
      aliasMap.set(p, alias);
      const wrappedName = this.wrapDiagramText(p, 10, '<br/>');
      lines.push(`    participant ${alias} as ${wrappedName}`);
    });

    for (const step of steps) {
      const fromAlias = aliasMap.get(step.from) || step.from.replace(/[^a-zA-Z0-9]/g, '_');
      const toAlias = aliasMap.get(step.to) || step.to.replace(/[^a-zA-Z0-9]/g, '_');
      const callClean = step.call.replace(/[:;#]/g, '-').replace(/"/g, "'");
      const wrappedCall = this.wrapDiagramText(callClean, 10, '<br/>');

      if (step.type === 'db_query') {
        lines.push(`    ${fromAlias}->>+${toAlias}: 🗄️ ${wrappedCall}`);
      } else {
        lines.push(`    ${fromAlias}->>+${toAlias}: ${wrappedCall}`);
      }

      if (step.response) {
        const respClean = step.response.replace(/[:;#]/g, '-').replace(/"/g, "'");
        const wrappedResp = this.wrapDiagramText(respClean, 10, '<br/>');
        lines.push(`    ${toAlias}-->>-${fromAlias}: ↩️ ${wrappedResp}`);
      } else {
        lines.push(`    ${toAlias}-->>-${fromAlias}: `);
      }
    }

    return lines.join('\n');
  }

  public static generatePlantUml(steps: FlowStep[], participants: string[]): string {
    const lines: string[] = [
      '@startuml',
      'autonumber',
      'skinparam backgroundColor #070A13',
      'skinparam shadowing false',
      'skinparam roundCorner 8',
      'skinparam BoxPadding 10',
      'skinparam ParticipantPadding 10',
      'skinparam defaultFontName "Inter", "Segoe UI", system-ui, sans-serif',
      'skinparam defaultFontSize 11',
      'skinparam defaultFontColor #E2E8F0',
      'skinparam SequenceGroupBodyBackgroundColor #0F172A',
      'skinparam SequenceGroupBorderColor #334155',
      'skinparam SequenceGroupHeaderFontColor #38BDF8',
      'skinparam ArrowColor #38BDF8',
      'skinparam ArrowFontColor #93C5FD',
      'skinparam ArrowFontSize 10',
      'skinparam ArrowThickness 1.2',
      'skinparam ActorBorderColor #10B981',
      'skinparam ActorBackgroundColor #064E3B',
      'skinparam ActorFontColor #34D399',
      'skinparam ActorFontSize 11',
      'skinparam ActorFontStyle bold',
      'skinparam ParticipantBorderColor #6366F1',
      'skinparam ParticipantBackgroundColor #1E1B4B',
      'skinparam ParticipantFontColor #A5B4FC',
      'skinparam ParticipantFontSize 11',
      'skinparam ParticipantFontStyle bold',
      'skinparam DatabaseBorderColor #06B6D4',
      'skinparam DatabaseBackgroundColor #083344',
      'skinparam DatabaseFontColor #67E8F9',
      'skinparam DatabaseFontSize 11',
      'skinparam DatabaseFontStyle bold',
      'skinparam LifeLineBorderColor #475569',
      'skinparam LifeLineBackgroundColor #1E293B',
      'skinparam NoteBorderColor #F59E0B',
      'skinparam NoteBackgroundColor #451A03',
      'skinparam NoteFontColor #FDE68A'
    ];

    const aliasMap = new Map<string, string>();
    participants.forEach((p, idx) => {
      const alias = `P${idx + 1}`;
      aliasMap.set(p, alias);
      const wrappedName = this.wrapDiagramText(p, 10, '\\n');
      if (p.toLowerCase().includes('user') || p.toLowerCase().includes('пользователь')) {
        lines.push(`actor "${wrappedName}" as ${alias}`);
      } else if (p.toLowerCase().includes('db') || p.toLowerCase().includes('база')) {
        lines.push(`database "${wrappedName}" as ${alias}`);
      } else {
        lines.push(`participant "${wrappedName}" as ${alias}`);
      }
    });

    for (const step of steps) {
      const fromAlias = aliasMap.get(step.from) || step.from.replace(/[^a-zA-Z0-9]/g, '_');
      const toAlias = aliasMap.get(step.to) || step.to.replace(/[^a-zA-Z0-9]/g, '_');
      const callClean = step.call.replace(/[:;#]/g, '-').replace(/"/g, "'");
      const wrappedCall = this.wrapDiagramText(callClean, 10, '\\n');

      if (step.type === 'db_query') {
        lines.push(`${fromAlias} -> ${toAlias}: 🗄️ ${wrappedCall}`);
        lines.push(`activate ${toAlias}`);
      } else {
        lines.push(`${fromAlias} -> ${toAlias}: ${wrappedCall}`);
        lines.push(`activate ${toAlias}`);
      }

      if (step.response) {
        const respClean = step.response.replace(/[:;#]/g, '-').replace(/"/g, "'");
        const wrappedResp = this.wrapDiagramText(respClean, 10, '\\n');
        lines.push(`${toAlias} --> ${fromAlias}: ↩️ ${wrappedResp}`);
        lines.push(`deactivate ${toAlias}`);
      } else {
        lines.push(`deactivate ${toAlias}`);
      }
    }

    lines.push('@enduml');
    return lines.join('\n');
  }
}

