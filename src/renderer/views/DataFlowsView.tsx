import React, { useState, useMemo } from 'react';
import { FlowTrace, UiScreenForm, UiInteractableElement } from '../../shared/types';
import { MermaidViewer } from '../components/MermaidViewer';
import { ScreenFormStructureModal } from '../components/ScreenFormStructureModal';
import {
  GitPullRequest,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Layout,
  MousePointerClick,
  Code2,
  FileCode,
  Layers,
  Sparkles,
  CheckCircle2,
  Search,
  Maximize2,
  ChevronRight,
  ChevronDown,
  Download,
  Copy,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  FileText,
  Braces,
  Database,
  ArrowUpRight,
  ChevronsDown,
  ChevronsUp,
  Layers3,
  ExternalLink,
  Zap
} from 'lucide-react';

interface DataFlowsViewProps {
  flows: FlowTrace[];
  screenForms?: UiScreenForm[];
  onNavigateToSource?: (sourceFile: string, sourceLine?: number) => void;
}

// Fallback sample screen forms for instant testing
const sampleScreenForms: UiScreenForm[] = [
  {
    id: 'form-login',
    name: 'LoginForm (Экран аутентификации)',
    componentPath: 'src/components/LoginForm.tsx',
    sourceFile: 'src/components/LoginForm.tsx',
    sourceLine: 1,
    route: '/login',
    description: 'Экранная форма входа пользователей в систему и сброса пароля',
    elements: [
      {
        id: 'elem-load-login',
        name: 'Событие: Инициализация и предзагрузка справочников (LoginForm)',
        type: 'screen_load',
        targetAction: 'AuthController.getInitialConfig',
        dtoModel: 'LoginScreenInitDto',
        frontendPayload: { trigger: 'componentDidMount / useEffect', cacheEnabled: 'true', prefetchSSO: 'true' },
        sourceFile: 'src/components/LoginForm.tsx',
        sourceLine: 1,
        targetSourceFile: 'src/controllers/AuthController.ts',
        targetSourceLine: 12,
        dtoSourceFile: 'src/models/LoginDto.ts',
        sequenceDiagramMermaid: `sequenceDiagram
    autonumber
    actor User as Пользователь
    participant UI as LoginForm (React)
    participant AuthCtrl as AuthController
    participant ConfigSvc as ConfigService
    participant DB as PostgreSQL (settings)

    User->>UI: Переход на страницу /login
    UI->>AuthCtrl: GET /api/v1/auth/config (LoginScreenInitDto)
    AuthCtrl->>ConfigSvc: loadAuthConfig()
    ConfigSvc->>DB: SELECT * FROM sso_providers, auth_settings
    DB-->>ConfigSvc: AuthConfig(sso_enabled=true, recaptcha=false)
    ConfigSvc-->>AuthCtrl: ScreenInitResult
    AuthCtrl-->>UI: 200 OK { ssoProviders: ['OAuth', 'LDAP'] }
    UI-->>User: Отрисовка формы входа и кнопок SSO`,
        sequenceDiagramPlantUml: `@startuml
autonumber
actor "Пользователь" as User
participant "LoginForm (React)" as UI
participant "AuthController" as AuthCtrl
participant "ConfigService" as ConfigSvc
database "PostgreSQL (settings)" as DB

User -> UI: Переход на страницу /login
UI -> AuthCtrl: GET /api/v1/auth/config (LoginScreenInitDto)
AuthCtrl -> ConfigSvc: loadAuthConfig()
ConfigSvc -> DB: SELECT * FROM sso_providers, auth_settings
DB --> ConfigSvc: AuthConfig
ConfigSvc --> AuthCtrl: ScreenInitResult
AuthCtrl --> UI: 200 OK { ssoProviders }
UI --> User: Отрисовка формы входа и SSO
@enduml`,
        sequenceSteps: [
          { order: 1, from: 'Пользователь', to: 'LoginForm (React)', call: 'Открытие страницы /login', sourceFile: 'src/components/LoginForm.tsx', sourceLine: 1 },
          { order: 2, from: 'LoginForm (React)', to: 'AuthController', call: 'GET /api/v1/auth/config', sourceFile: 'src/controllers/AuthController.ts', sourceLine: 12 },
          { order: 3, from: 'AuthController', to: 'ConfigService', call: 'loadAuthConfig()' },
          { order: 4, from: 'ConfigService', to: 'PostgreSQL', call: 'SELECT * FROM auth_settings' },
          { order: 5, from: 'AuthController', to: 'LoginForm (React)', call: '200 OK { sso_enabled }' }
        ]
      },
      {
        id: 'btn-submit-login',
        name: 'Кнопка "Войти в систему"',
        type: 'button',
        targetAction: 'AuthController.authenticateUser',
        dtoModel: 'LoginRequestDto',
        frontendPayload: { email: 'user@corp.com', password: '***' },
        sourceFile: 'src/components/LoginForm.tsx',
        sourceLine: 34,
        targetSourceFile: 'src/controllers/AuthController.ts',
        targetSourceLine: 45,
        dtoSourceFile: 'src/models/LoginDto.ts',
        sequenceDiagramMermaid: `sequenceDiagram
    autonumber
    actor User as Пользователь
    participant UI as LoginForm (React)
    participant AuthCtrl as AuthController
    participant AuthService as AuthenticationService
    participant DB as PostgreSQL (users)

    User->>UI: Ввод логина и клик "Войти"
    UI->>AuthCtrl: POST /api/v1/auth/login (LoginRequestDto)
    AuthCtrl->>AuthService: validateCredentials(email, hash)
    AuthService->>DB: SELECT * FROM users WHERE email = ?
    DB-->>AuthService: UserRow(id, password_hash, role)
    AuthService-->>AuthCtrl: AuthResult(jwt_token, user_profile)
    AuthCtrl-->>UI: 200 OK { token, expires_in }
    UI-->>User: Перенаправление на Dashboard`,
        sequenceDiagramPlantUml: `@startuml
autonumber
actor "Пользователь" as User
participant "LoginForm (React)" as UI
participant "AuthController" as AuthCtrl
participant "AuthenticationService" as AuthService
database "PostgreSQL (users)" as DB

User -> UI: Ввод логина и клик "Войти"
UI -> AuthCtrl: POST /api/v1/auth/login (LoginRequestDto)
AuthCtrl -> AuthService: validateCredentials(email, hash)
AuthService -> DB: SELECT * FROM users WHERE email = ?
DB --> AuthService: UserRow(id, password_hash, role)
AuthService --> AuthCtrl: AuthResult(jwt_token, user_profile)
AuthCtrl --> UI: 200 OK { token, expires_in }
UI --> User: Перенаправление на Dashboard
@enduml`,
        sequenceSteps: [
          { order: 1, from: 'Пользователь', to: 'LoginForm (React)', call: 'Клик "Войти"', sourceFile: 'src/components/LoginForm.tsx', sourceLine: 34 },
          { order: 2, from: 'LoginForm (React)', to: 'AuthController', call: 'POST /api/v1/auth/login', sourceFile: 'src/controllers/AuthController.ts', sourceLine: 45 },
          { order: 3, from: 'AuthController', to: 'AuthenticationService', call: 'validateCredentials()' },
          { order: 4, from: 'AuthenticationService', to: 'PostgreSQL', call: 'SELECT * FROM users' },
          { order: 5, from: 'AuthController', to: 'LoginForm (React)', call: '200 OK { token }' }
        ]
      },
      {
        id: 'btn-forgot-password',
        name: 'Ссылка "Забыли пароль?"',
        type: 'link',
        targetAction: 'AuthController.requestPasswordReset',
        dtoModel: 'PasswordResetRequestDto',
        frontendPayload: { email: 'user@corp.com' },
        sourceFile: 'src/components/LoginForm.tsx',
        sourceLine: 68,
        targetSourceFile: 'src/controllers/AuthController.ts',
        targetSourceLine: 80,
        dtoSourceFile: 'src/models/LoginDto.ts',
        sequenceDiagramMermaid: `sequenceDiagram
    autonumber
    actor User as Пользователь
    participant UI as LoginForm (React)
    participant AuthCtrl as AuthController
    participant Mailer as NotificationService

    User->>UI: Клик "Забыли пароль?"
    UI->>AuthCtrl: POST /api/v1/auth/reset-password
    AuthCtrl->>Mailer: sendResetToken(email)
    Mailer-->>UI: 200 OK { message: "Письмо отправлено" }`,
        sequenceDiagramPlantUml: `@startuml
autonumber
actor "Пользователь" as User
participant "LoginForm" as UI
participant "AuthController" as Ctrl
participant "NotificationService" as Mailer

User -> UI: Клик "Забыли пароль?"
UI -> Ctrl: POST /api/v1/auth/reset-password
Ctrl -> Mailer: sendResetToken(email)
Mailer --> UI: 200 OK
@enduml`,
        sequenceSteps: [
          { order: 1, from: 'Пользователь', to: 'LoginForm', call: 'Клик ссылки', sourceFile: 'src/components/LoginForm.tsx', sourceLine: 68 },
          { order: 2, from: 'LoginForm', to: 'AuthController', call: 'POST /reset-password', sourceFile: 'src/controllers/AuthController.ts', sourceLine: 80 },
          { order: 3, from: 'AuthController', to: 'NotificationService', call: 'sendResetToken()' }
        ]
      }
    ]
  },
  {
    id: 'form-orders',
    name: 'OrderCheckoutForm (Оформление заказа)',
    componentPath: 'src/components/CheckoutForm.tsx',
    sourceFile: 'src/components/CheckoutForm.tsx',
    sourceLine: 1,
    route: '/checkout',
    description: 'Экранная форма оформления и оплаты заказов в корзине покупателя',
    elements: [
      {
        id: 'elem-load-checkout',
        name: 'Событие: Инициализация корзины и адресов доставки (CheckoutForm)',
        type: 'screen_load',
        targetAction: 'OrderController.getCheckoutInitData',
        dtoModel: 'CheckoutInitDto',
        frontendPayload: { trigger: 'componentDidMount', cartId: 'cart-992' },
        sourceFile: 'src/components/CheckoutForm.tsx',
        sourceLine: 1,
        targetSourceFile: 'src/controllers/OrderController.ts',
        targetSourceLine: 20,
        dtoSourceFile: 'src/models/OrderDto.ts',
        sequenceDiagramMermaid: `sequenceDiagram
    autonumber
    actor User as Клиент
    participant UI as CheckoutForm
    participant OrderCtrl as OrderController
    participant DB as PostgreSQL (orders)

    User->>UI: Открытие /checkout
    UI->>OrderCtrl: GET /api/v1/checkout/init?cartId=992
    OrderCtrl->>DB: SELECT * FROM cart_items, delivery_options
    DB-->>OrderCtrl: CartDetails
    OrderCtrl-->>UI: 200 OK { items, subtotal, deliverySlots }`,
        sequenceDiagramPlantUml: `@startuml
autonumber
actor "Клиент" as User
participant "CheckoutForm" as UI
participant "OrderController" as OrderCtrl
database "PostgreSQL (orders)" as DB

User -> UI: Открытие /checkout
UI -> OrderCtrl: GET /api/v1/checkout/init
OrderCtrl -> DB: SELECT * FROM cart_items
DB --> OrderCtrl: CartDetails
OrderCtrl --> UI: 200 OK
@enduml`,
        sequenceSteps: [
          { order: 1, from: 'Клиент', to: 'CheckoutForm', call: 'Открытие /checkout', sourceFile: 'src/components/CheckoutForm.tsx', sourceLine: 1 },
          { order: 2, from: 'CheckoutForm', to: 'OrderController', call: 'GET /api/v1/checkout/init', sourceFile: 'src/controllers/OrderController.ts', sourceLine: 20 },
          { order: 3, from: 'OrderController', to: 'PostgreSQL', call: 'SELECT * FROM cart_items' }
        ]
      },
      {
        id: 'btn-create-order',
        name: 'Кнопка "Подтвердить и оплатить"',
        type: 'form_submit',
        targetAction: 'OrderController.createOrder',
        dtoModel: 'CreateOrderCommand',
        frontendPayload: { cart_id: 'cart-992', delivery_address: 'Main St 10', payment_method: 'card' },
        sourceFile: 'src/components/CheckoutForm.tsx',
        sourceLine: 88,
        targetSourceFile: 'src/controllers/OrderController.ts',
        targetSourceLine: 55,
        dtoSourceFile: 'src/models/OrderDto.ts',
        sequenceDiagramMermaid: `sequenceDiagram
    autonumber
    actor User as Клиент
    participant UI as CheckoutForm
    participant OrderCtrl as OrderController
    participant OrderSvc as OrderService
    participant PayGateway as PaymentGateway
    participant DB as PostgreSQL (orders)

    User->>UI: Клик "Подтвердить и оплатить"
    UI->>OrderCtrl: POST /api/v1/orders (CreateOrderCommand)
    OrderCtrl->>OrderSvc: processCheckout(cart_id)
    OrderSvc->>PayGateway: chargePayment(amount)
    PayGateway-->>OrderSvc: PaymentSuccess(tx_id)
    OrderSvc->>DB: INSERT INTO orders VALUES (...)
    DB-->>OrderSvc: OrderRecord(id, status='PAID')
    OrderSvc-->>OrderCtrl: OrderSummaryDto
    OrderCtrl-->>UI: 201 Created { order_id }`,
        sequenceDiagramPlantUml: `@startuml
autonumber
actor "Клиент" as User
participant "CheckoutForm" as UI
participant "OrderController" as OrderCtrl
participant "OrderService" as OrderSvc
participant "PaymentGateway" as PayGateway
database "PostgreSQL (orders)" as DB

User -> UI: Клик "Подтвердить и оплатить"
UI -> OrderCtrl: POST /api/v1/orders (CreateOrderCommand)
OrderCtrl -> OrderSvc: processCheckout(cart_id)
OrderSvc -> PayGateway: chargePayment(amount)
PayGateway --> OrderSvc: PaymentSuccess(tx_id)
OrderSvc -> DB: INSERT INTO orders
DB --> OrderSvc: OrderRecord(id, status='PAID')
OrderSvc --> OrderCtrl: OrderSummaryDto
OrderCtrl --> UI: 201 Created { order_id }
@enduml`,
        sequenceSteps: [
          { order: 1, from: 'Клиент', to: 'CheckoutForm', call: 'Клик "Подтвердить и оплатить"', sourceFile: 'src/components/CheckoutForm.tsx', sourceLine: 88 },
          { order: 2, from: 'CheckoutForm', to: 'OrderController', call: 'POST /api/v1/orders', sourceFile: 'src/controllers/OrderController.ts', sourceLine: 55 },
          { order: 3, from: 'OrderController', to: 'OrderService', call: 'processCheckout()' },
          { order: 4, from: 'OrderService', to: 'PaymentGateway', call: 'chargePayment()' },
          { order: 5, from: 'OrderService', to: 'PostgreSQL', call: 'INSERT INTO orders' }
        ]
      }
    ]
  }
];

export const DataFlowsView: React.FC<DataFlowsViewProps> = ({ flows, screenForms = [], onNavigateToSource }) => {
  const activeForms = useMemo(() => {
    return screenForms.length > 0 ? screenForms : sampleScreenForms;
  }, [screenForms]);

  const [activeMode, setActiveMode] = useState<'forms' | 'backend'>('forms');
  const [searchQuery, setSearchQuery] = useState('');

  // Structure Modal State
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);

  // Track expanded screen forms
  const [expandedFormIds, setExpandedFormIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeForms.length > 0) {
      initial.add(activeForms[0].id);
    }
    return initial;
  });

  // Track expanded element spoilers (showing Frontend Payload JSON & DTO model inside the element card)
  const [expandedElementIds, setExpandedElementIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeForms.length > 0 && activeForms[0].elements.length > 0) {
      initial.add(activeForms[0].elements[0].id);
    }
    return initial;
  });

  // Track currently selected form and element for diagram display
  const [selectedFormId, setSelectedFormId] = useState<string>(activeForms[0]?.id || '');
  const [selectedElementId, setSelectedElementId] = useState<string>(activeForms[0]?.elements[0]?.id || '');

  // Backend Flows State
  const [selectedFlow, setSelectedFlow] = useState<FlowTrace | null>(flows[0] || null);

  // Collapsible panels
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightTraceOpen, setIsRightTraceOpen] = useState(false); // Collapsed by default
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);

  const toggleFormAccordion = (formId: string) => {
    setExpandedFormIds(prev => {
      const next = new Set(prev);
      if (next.has(formId)) {
        next.delete(formId);
      } else {
        next.add(formId);
      }
      return next;
    });
  };

  const toggleElementAccordion = (elemId: string) => {
    setExpandedElementIds(prev => {
      const next = new Set(prev);
      if (next.has(elemId)) {
        next.delete(elemId);
      } else {
        next.add(elemId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allFormIds = new Set(activeForms.map(f => f.id));
    const allElemIds = new Set<string>();
    activeForms.forEach(f => f.elements.forEach(e => allElemIds.add(e.id)));
    setExpandedFormIds(allFormIds);
    setExpandedElementIds(allElemIds);
  };

  const handleCollapseAll = () => {
    setExpandedFormIds(new Set());
    setExpandedElementIds(new Set());
  };

  const handleCopyPayload = (payload: any, elemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(payload || {}, null, 2));
    setCopiedPayloadId(elemId);
    setTimeout(() => setCopiedPayloadId(null), 2000);
  };

  // Filtered forms & child elements
  const filteredForms = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return activeForms;
    return activeForms
      .map(form => {
        const matchesForm = form.name.toLowerCase().includes(q) || form.componentPath.toLowerCase().includes(q) || form.route.toLowerCase().includes(q);
        const matchingElements = form.elements.filter(e =>
          e.name.toLowerCase().includes(q) || e.targetAction.toLowerCase().includes(q) || e.dtoModel.toLowerCase().includes(q)
        );
        if (matchesForm || matchingElements.length > 0) {
          return {
            ...form,
            elements: matchingElements.length > 0 ? matchingElements : form.elements
          };
        }
        return null;
      })
      .filter((f): f is UiScreenForm => f !== null);
  }, [activeForms, searchQuery]);

  const selectedForm = useMemo(() => {
    return activeForms.find(f => f.id === selectedFormId) || activeForms[0] || null;
  }, [activeForms, selectedFormId]);

  const selectedElement = useMemo(() => {
    if (!selectedForm) return null;
    return selectedForm.elements.find(e => e.id === selectedElementId) || selectedForm.elements[0] || null;
  }, [selectedForm, selectedElementId]);

  // Export Trace to formatted TXT file
  const handleExportTxt = () => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    let txtContent = '';

    if (activeMode === 'forms' && selectedElement && selectedForm) {
      txtContent = `================================================================================
АРХИТЕКТУРНАЯ ТРАССИРОВКА ВЗАИМОДЕЙСТВИЯ (UI -> BACKEND -> DB)
================================================================================
Дата экспорта: ${timestamp}
Экранная форма: ${selectedForm.name}
Путь к компоненту: ${selectedForm.componentPath}
Маршрут: ${selectedForm.route}

ИНТЕРАКТИВНОЕ ДЕЙСТВИЕ:
Название: ${selectedElement.name}
Тип элемента: ${selectedElement.type}
Целевой обработчик / Action: ${selectedElement.targetAction}
DTO Модель: ${selectedElement.dtoModel}

ПАРАМЕТРЫ FRONTEND (PAYLOAD):
${JSON.stringify(selectedElement.frontendPayload || {}, null, 2)}

--------------------------------------------------------------------------------
ПОШАГОВЫЙ СТЕК ВЫЗОВОВ (CALL TRACE):
--------------------------------------------------------------------------------
${(selectedElement.sequenceSteps || []).map(s => `[Шаг ${s.order}] ${s.from}  ==>  ${s.to}\n      Вызов / Метод: ${s.call}`).join('\n\n')}

--------------------------------------------------------------------------------
PLANTUML SEQUENCE DIAGRAM SOURCE:
--------------------------------------------------------------------------------
${selectedElement.sequenceDiagramPlantUml || selectedElement.sequenceDiagramMermaid || ''}

================================================================================
Сгенерировано: Bitbucket Architecture Analyzer
================================================================================`;
    } else if (selectedFlow) {
      txtContent = `================================================================================
АРХИТЕКТУРНАЯ ТРАССИРОВКА ВЫЗОВА: ${selectedFlow.name}
================================================================================
Дата экспорта: ${timestamp}
Точка входа: ${selectedFlow.entryPoint}
Тип потока: ${selectedFlow.flowType}
Уровень достоверности (Confidence): ${Math.round((selectedFlow.confidence || 1) * 100)}%

АРХИТЕКТУРНЫЕ РИСКИ:
${selectedFlow.risks && selectedFlow.risks.length > 0 ? selectedFlow.risks.map(r => `* ${r}`).join('\n') : 'Архитектурные риски не выявлены'}

--------------------------------------------------------------------------------
ПОШАГОВЫЙ СТЕК ВЫЗОВОВ:
--------------------------------------------------------------------------------
${(selectedFlow.steps || []).map(s => `[Шаг ${s.order}] ${s.from}  ==>  ${s.to}\n      Метод: ${s.call}`).join('\n\n')}

--------------------------------------------------------------------------------
PLANTUML SOURCE:
--------------------------------------------------------------------------------
${selectedFlow.sequenceDiagramPlantUml || selectedFlow.sequenceDiagramMermaid || ''}
================================================================================`;
    }

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trace-${(selectedElement?.name || selectedFlow?.name || 'export').replace(/\s+/g, '_')}.txt`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#0B0F19]">
      {/* Top Mode Selector & Export Header */}
      <div className="p-3 border-b border-gray-800 bg-gray-950/80 flex flex-wrap items-center justify-between gap-2 z-10 shrink-0 select-none">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 shrink-0">
            <GitPullRequest size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-gray-100 uppercase tracking-wider truncate">
              {activeMode === 'forms'
                ? 'Экранные формы & Sequence Трассировка'
                : 'Backend API Call Graphs'}
            </h2>
            <p className="text-[10px] text-gray-400 truncate">
              Сквозной стек вызовов от UI действий через контроллеры и DTO до базы данных PostgreSQL
            </p>
          </div>
        </div>

        {/* Right Controls: Mode Toggle, Export TXT, Toggle Trace Panel */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Mode Switcher */}
          <div className="flex items-center space-x-1 bg-gray-900/90 p-0.5 rounded-lg border border-gray-800 text-xs">
            <button
              onClick={() => setActiveMode('forms')}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center space-x-1.5 ${
                activeMode === 'forms' ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layout size={12} />
              <span>Экранные формы ({activeForms.length})</span>
            </button>

            <button
              onClick={() => setActiveMode('backend')}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center space-x-1.5 ${
                activeMode === 'backend' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers size={12} />
              <span>Backend Flows ({flows.length})</span>
            </button>
          </div>

          {/* Export TXT Button */}
          <button
            onClick={handleExportTxt}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-700 rounded-lg text-xs transition"
            title="Выгрузить полную пошаговую трассировку и параметры в файл .txt"
          >
            <Download size={12} className="text-emerald-400" />
            <span>Экспорт в TXT</span>
          </button>

          {/* Toggle Right Trace Panel Button */}
          <button
            onClick={() => setIsRightTraceOpen(!isRightTraceOpen)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs transition border ${
              isRightTraceOpen
                ? 'bg-blue-950/80 text-blue-300 border-blue-800 shadow-sm'
                : 'bg-gray-900 hover:bg-gray-800 text-gray-400 border-gray-800'
            }`}
            title={isRightTraceOpen ? 'Скрыть правую панель трассировки' : 'Показать пошаговую трассировку вызовов'}
          >
            {isRightTraceOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
            <span>Трассировка шагов</span>
          </button>
        </div>
      </div>

      {/* Main Container Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* ================= UNIFIED LEFT PANEL (SCREEN FORMS & ELEMENTS ACCORDION WITH INLINE PAYLOAD & DTO) ================= */}
        {isLeftPanelOpen ? (
          <div className="w-80 shrink-0 border-r border-gray-800 flex flex-col h-full bg-gray-950/80 transition-all duration-200 ease-in-out select-none">
            {/* Header & Controls */}
            <div className="p-2.5 border-b border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-1.5 min-w-0">
                <Layout size={13} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-gray-200 truncate uppercase tracking-wider">
                  {activeMode === 'forms' ? 'Экранные формы & Элементы' : 'Цепочки вызовов'}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleExpandAll}
                  className="p-1 hover:bg-gray-800 text-gray-400 hover:text-gray-200 rounded transition text-[10px]"
                  title="Развернуть все спойлеры"
                >
                  <ChevronsDown size={13} className="text-emerald-400" />
                </button>
                <button
                  onClick={handleCollapseAll}
                  className="p-1 hover:bg-gray-800 text-gray-400 hover:text-gray-200 rounded transition text-[10px]"
                  title="Свернуть все спойлеры"
                >
                  <ChevronsUp size={13} />
                </button>
                <div className="w-[1px] h-3 bg-gray-800 mx-0.5" />
                <button
                  onClick={() => setIsLeftPanelOpen(false)}
                  className="p-1 hover:bg-gray-800 text-gray-400 hover:text-gray-200 rounded transition"
                  title="Свернуть левую панель"
                >
                  <PanelLeftClose size={13} />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="p-2 border-b border-gray-800/80 shrink-0">
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1.5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Поиск формы, кнопки, DTO..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-7 pr-2 py-0.5 text-[11px] text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Accordion Tree List */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
              {activeMode === 'forms' ? (
                filteredForms.map(form => {
                  const isFormExpanded = expandedFormIds.has(form.id);
                  const isFormSelected = selectedFormId === form.id;

                  return (
                    <div
                      key={form.id}
                      className="rounded-xl border border-gray-800/90 bg-gray-900/30 overflow-hidden"
                    >
                      {/* Form Accordion Header */}
                      <div
                        onClick={() => {
                          setSelectedFormId(form.id);
                          toggleFormAccordion(form.id);
                          if (form.elements.length > 0 && selectedElementId !== form.elements[0].id) {
                            setSelectedElementId(form.elements[0].id);
                          }
                        }}
                        className={`p-2 cursor-pointer flex items-center justify-between transition ${
                          isFormSelected
                            ? 'bg-emerald-950/40 border-l-2 border-emerald-500 text-emerald-200'
                            : 'hover:bg-gray-900/60 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 min-w-0 truncate">
                          <div className={`transition-transform duration-150 shrink-0 ${isFormExpanded ? 'rotate-90 text-emerald-400' : 'text-gray-500'}`}>
                            <ChevronRight size={14} />
                          </div>
                          <span className="font-semibold text-[11px] text-gray-100 truncate">{form.name}</span>
                        </div>

                        <span className="text-[9px] font-mono text-emerald-400 bg-gray-950 px-1.5 py-0.2 rounded border border-gray-800 shrink-0 ml-1">
                          {form.elements.length} эл.
                        </span>
                      </div>

                      {/* Expanded Sub-Elements Spoilers (Each Element has its own spoiler with Payload & DTO) */}
                      {isFormExpanded && (
                        <div className="pl-3 pr-1.5 pb-2 pt-1 space-y-1.5 border-t border-gray-800/60 bg-gray-950/50 animate-in fade-in duration-150">
                          {form.elements.map(elem => {
                            const isElementSelected = selectedElementId === elem.id;
                            const isElementExpanded = expandedElementIds.has(elem.id);

                            return (
                              <div
                                key={elem.id}
                                className={`rounded-lg transition border text-xs overflow-hidden ${
                                  isElementSelected
                                    ? 'bg-blue-950/40 border-blue-500/80 text-blue-200 shadow-sm ring-1 ring-blue-500/40'
                                    : 'bg-gray-900/40 border-gray-800/80 hover:bg-gray-900 text-gray-300'
                                }`}
                              >
                                {/* Element Header Row */}
                                <div
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedFormId(form.id);
                                    setSelectedElementId(elem.id);
                                  toggleElementAccordion(elem.id);
                                  }}
                                  className="p-2 cursor-pointer flex items-center justify-between gap-1.5 select-none hover:bg-white/5 transition"
                                >
                                  <div className="flex items-center space-x-1.5 min-w-0 truncate">
                                    <div className={`transition-transform duration-150 shrink-0 ${isElementExpanded ? 'rotate-90 text-blue-400' : 'text-gray-500'}`}>
                                      <ChevronRight size={12} />
                                    </div>
                                    <span className="font-semibold text-gray-200 text-[11px] truncate">{elem.name}</span>
                                  </div>

                                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-900/60 shrink-0">
                                    {elem.sourceLine ? `L${elem.sourceLine}` : 'UI'}
                                  </span>
                                </div>

                                {/* Element Spoiler Details: Target Action, Code Declaration, DTO, Frontend Payload */}
                                {isElementExpanded && (
                                  <div className="p-2 pt-0 space-y-1.5 border-t border-gray-800/60 bg-gray-950/70 text-[10px] font-mono animate-in fade-in duration-150">
                                    {/* UI Section & JSX Path */}
                                    {elem.position?.jsxPath && (
                                      <div className="pt-1.5 space-y-1">
                                        <div className="flex items-center justify-between text-gray-400">
                                          <span className="text-gray-500">JSX Путь:</span>
                                          <span className="text-teal-300 font-semibold truncate max-w-[170px]" title={elem.position.jsxPath}>
                                            {elem.position.jsxPath}
                                          </span>
                                        </div>
                                        {elem.position.uiSection && elem.position.uiSection !== 'content' && (
                                          <div className="flex items-center justify-between text-gray-400">
                                            <span className="text-gray-500">Секция UI:</span>
                                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 uppercase font-bold">
                                              {elem.position.uiSection}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Element Props & Attributes */}
                                    {elem.attributes && (elem.attributes.icon || elem.attributes.disabled || elem.attributes.required || elem.attributes.placeholder || elem.attributes.type) && (
                                      <div className="flex flex-wrap gap-1 pt-0.5">
                                        {elem.attributes.icon && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                                            🎨 {elem.attributes.icon}
                                          </span>
                                        )}
                                        {elem.attributes.disabled && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-950/80 text-red-300 border border-red-800/60">
                                            disabled
                                          </span>
                                        )}
                                        {elem.attributes.required && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-800/60">
                                            required
                                          </span>
                                        )}
                                        {elem.attributes.placeholder && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-gray-900 text-gray-300 border border-gray-800 truncate max-w-[150px]" title={`placeholder: ${elem.attributes.placeholder}`}>
                                            "{elem.attributes.placeholder}"
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Redux Actions and Side Effects */}
                                    {elem.handlers && elem.handlers.some(h => (h.reduxActions && h.reduxActions.length > 0) || (h.sideEffects && h.sideEffects.length > 0)) && (
                                      <div className="space-y-1 pt-0.5 border-t border-gray-900">
                                        {elem.handlers.map((h, hIdx) => (
                                          <React.Fragment key={hIdx}>
                                            {h.reduxActions && h.reduxActions.length > 0 && (
                                              <div className="space-y-0.5">
                                                <span className="text-purple-400 font-bold text-[9px]">⚛️ Redux Actions:</span>
                                                <div className="flex flex-wrap gap-1">
                                                  {h.reduxActions.map((act, aIdx) => (
                                                    <span key={aIdx} className="px-1.5 py-0.2 rounded text-[9px] bg-purple-950/80 text-purple-200 border border-purple-800/60">
                                                      {act}()
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {h.sideEffects && h.sideEffects.length > 0 && (
                                              <div className="space-y-0.5">
                                                <span className="text-cyan-400 font-bold text-[9px]">🌐 Эффекты:</span>
                                                <div className="flex flex-wrap gap-1">
                                                  {h.sideEffects.map((eff, eIdx) => (
                                                    <span key={eIdx} className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950/80 text-cyan-200 border border-cyan-800/60 truncate max-w-[200px]" title={eff}>
                                                      {eff}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </React.Fragment>
                                        ))}
                                      </div>
                                    )}

                                    {/* Action / Method target */}
                                    <div className="pt-1 flex items-center justify-between text-gray-400">
                                      <span className="text-gray-500">Метод:</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onNavigateToSource?.(elem.targetSourceFile || elem.sourceFile || form.componentPath, elem.targetSourceLine || elem.sourceLine || 1);
                                        }}
                                        className="text-blue-300 hover:text-blue-100 underline truncate font-semibold flex items-center space-x-0.5 group"
                                        title="Перейти к обработчику в дереве проекта"
                                      >
                                        <span className="truncate">{elem.targetAction || elem.handlerMethod || 'onClick'}</span>
                                        <ExternalLink size={9} className="shrink-0 group-hover:scale-110 transition-transform" />
                                      </button>
                                    </div>

                                    {/* Element Declaration Location in Code */}
                                    <div className="flex items-center justify-between text-gray-400">
                                      <span className="text-gray-500">Код элемента:</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onNavigateToSource?.(elem.sourceFile || form.componentPath, elem.sourceLine || 1);
                                        }}
                                        className="text-cyan-300 hover:text-cyan-100 underline font-bold truncate flex items-center space-x-0.5 group"
                                        title={`Перейти к строке ${elem.sourceLine || 1} в файле ${elem.sourceFile || form.componentPath}`}
                                      >
                                        <span className="truncate">{(elem.sourceFile || form.componentPath).split('/').pop()}:{elem.sourceLine || 1}</span>
                                        <ExternalLink size={9} className="shrink-0 group-hover:scale-110 transition-transform" />
                                      </button>
                                    </div>

                                    {/* Code Declaration Snippet */}
                                    {elem.codeSnippet && (
                                      <div className="space-y-0.5 pt-0.5">
                                        <pre className="p-1.5 bg-gray-950 rounded text-[9px] font-mono text-cyan-300 border border-gray-900 overflow-x-auto max-h-[75px] whitespace-pre-wrap break-all leading-tight">
                                          {elem.codeSnippet}
                                        </pre>
                                      </div>
                                    )}

                                    {/* DTO model (only if real DTO is defined) */}
                                    {elem.dtoModel && elem.dtoModel !== 'None' && (
                                      <div className="flex items-center justify-between text-gray-400">
                                        <span className="text-gray-500">DTO:</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const dtoPath = elem.dtoSourceFile || `src/models/${elem.dtoModel}.ts`;
                                            onNavigateToSource?.(dtoPath, 1);
                                          }}
                                          className="text-purple-300 hover:text-purple-100 underline font-bold truncate flex items-center space-x-0.5 group"
                                          title="Перейти к файлу DTO модели в дереве проекта"
                                        >
                                          <span className="truncate">{elem.dtoModel}</span>
                                          <ExternalLink size={9} className="shrink-0 group-hover:scale-110 transition-transform" />
                                        </button>
                                      </div>
                                    )}

                                    {/* Frontend Payload JSON Block (only if real payload exists) */}
                                    {elem.frontendPayload && Object.keys(elem.frontendPayload).length > 0 && (
                                      <div className="space-y-1 pt-1">
                                        <div className="flex items-center justify-between text-gray-400">
                                          <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                                            <Code2 size={10} />
                                            <span>Frontend Payload:</span>
                                          </span>
                                          <button
                                            onClick={(e) => handleCopyPayload(elem.frontendPayload, elem.id, e)}
                                            className="p-0.5 hover:bg-gray-800 text-gray-400 hover:text-gray-200 rounded transition flex items-center space-x-0.5 text-[9px]"
                                            title="Скопировать JSON payload"
                                          >
                                            {copiedPayloadId === elem.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                                            <span>{copiedPayloadId === elem.id ? 'Copied' : 'JSON'}</span>
                                          </button>
                                        </div>
                                        <pre className="p-1.5 bg-gray-950 rounded text-[9px] font-mono text-emerald-300 border border-gray-900 overflow-x-auto max-h-[85px] leading-tight">
                                          {JSON.stringify(elem.frontendPayload, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                /* Backend Flows List */
                flows.map(flow => {
                  const isSelected = selectedFlow?.id === flow.id;
                  return (
                    <div
                      key={flow.id}
                      onClick={() => handleSelectFlow(flow)}
                      className={`p-2 rounded-xl cursor-pointer text-xs transition border ${
                        isSelected
                          ? 'bg-blue-950/50 border-blue-500/80 text-blue-200 shadow-sm'
                          : 'bg-gray-900/40 border-gray-800 hover:bg-gray-900 text-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-100 text-[11px] mb-0.5 truncate">
                        {flow.name}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span className="font-mono truncate">{flow.entryPoint}</span>
                        <span className="px-1 py-0.2 rounded bg-gray-950 text-gray-400 font-mono text-[9px] shrink-0 ml-1">
                          {flow.steps.length} ш.
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Collapsed Icon Strip for Left Panel */
          <div className="w-10 shrink-0 border-r border-gray-800 bg-gray-950/90 flex flex-col items-center py-2.5 space-y-2 select-none">
            <button
              onClick={() => setIsLeftPanelOpen(true)}
              className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-emerald-400 border border-gray-800 transition"
              title="Развернуть список экранных форм и элементов"
            >
              <PanelLeftOpen size={14} />
            </button>
            <div className="w-4 h-[1px] bg-gray-800 my-1" />
            <span className="text-[10px] font-mono text-gray-500 [writing-mode:vertical-lr] tracking-widest uppercase rotate-180">
              {activeMode === 'forms' ? 'Экранные формы' : 'Backend Flows'}
            </span>
          </div>
        )}

        {/* ================= CENTER MAIN AREA: FULL-HEIGHT SEQUENCE DIAGRAM VISUALIZER ================= */}
        <div className="flex-1 flex flex-col h-full overflow-hidden p-3.5 space-y-2 bg-[#070A13] min-w-0">
          {activeMode === 'forms' && selectedElement ? (
            <>
              {/* Selected Element Header Bar */}
              <div className="glass-panel p-2 px-3 rounded-xl border border-gray-800 flex flex-wrap items-center justify-between gap-2 shrink-0 select-none">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="text-xs font-semibold font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 shrink-0">
                    {selectedForm?.name}
                  </span>

                  <span className="text-xs font-bold text-gray-100 font-mono truncate">
                    {selectedElement.name}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs font-mono text-gray-400 shrink-0">
                  <span>Маршрут: <strong className="text-gray-200">{selectedForm?.route}</strong></span>

                  {/* Show Structure Button */}
                  <button
                    onClick={() => setIsStructureModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/70 text-emerald-300 rounded-lg text-xs font-semibold transition shadow-sm group"
                    title="Открыть интерактивную D3 структуру экранной формы"
                  >
                    <Layers3 size={13} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>Показать структуру</span>
                  </button>
                </div>
              </div>

              {/* Full-Height Sequence Visualizer with PlantUML & Mermaid */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <MermaidViewer
                  chart={selectedElement.sequenceDiagramMermaid || ''}
                  plantUmlCode={selectedElement.sequenceDiagramPlantUml || ''}
                  title={`${selectedForm?.name || 'Форма'}: ${selectedElement.name}`}
                  className="flex-1"
                />
              </div>
            </>
          ) : activeMode === 'backend' && selectedFlow ? (
            <>
              {/* Backend Flow Header */}
              <div className="glass-panel p-2.5 px-3.5 rounded-xl border border-gray-800 flex flex-wrap items-center justify-between gap-2 shrink-0 select-none">
                <div className="flex items-center space-x-2 min-w-0">
                  <h3 className="text-xs font-bold text-gray-100 font-mono truncate">{selectedFlow.name}</h3>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/50 shrink-0">
                    {Math.round((selectedFlow.confidence || 1) * 100)}% Confidence
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-mono shrink-0">
                  Точка входа: <span className="text-blue-300">{selectedFlow.entryPoint}</span> | Тип: <span className="text-purple-300 uppercase">{selectedFlow.flowType}</span>
                </p>
              </div>

              {/* Sequence Visualizer */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <MermaidViewer
                  chart={selectedFlow.sequenceDiagramMermaid || ''}
                  plantUmlCode={selectedFlow.sequenceDiagramPlantUml || ''}
                  title={selectedFlow.name}
                  className="flex-1"
                />
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-gray-500 text-xs font-mono m-auto">
              Выберите элемент экранной формы для просмотра диаграммы
            </div>
          )}
        </div>

        {/* ================= RIGHT COLLAPSIBLE TRACE PANEL (STEP-BY-STEP TRACE) ================= */}
        {isRightTraceOpen && (
          <div className="w-80 shrink-0 border-l border-gray-800 flex flex-col h-full bg-gray-950/90 transition-all duration-200 ease-in-out select-none animate-in slide-in-from-right duration-200">
            <div className="p-2.5 border-b border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-1.5 min-w-0">
                <FileText size={13} className="text-blue-400 shrink-0" />
                <span className="text-xs font-bold text-gray-200 truncate uppercase tracking-wider">Пошаговая трассировка</span>
              </div>
              <button
                onClick={() => setIsRightTraceOpen(false)}
                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-gray-200 rounded transition"
                title="Скрыть панель трассировки"
              >
                <PanelRightClose size={13} />
              </button>
            </div>

            {/* Trace Steps Content */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {activeMode === 'forms' && selectedElement ? (
                (selectedElement.sequenceSteps || []).map(step => (
                  <div
                    key={step.order}
                    onClick={() => step.sourceFile && onNavigateToSource?.(step.sourceFile, step.sourceLine || 1)}
                    className={`glass-panel p-2.5 rounded-xl border border-gray-800/80 text-xs space-y-1.5 transition ${
                      step.sourceFile ? 'cursor-pointer hover:border-blue-500/60 hover:bg-blue-950/20 group' : ''
                    }`}
                    title={step.sourceFile ? `Перейти к ${step.sourceFile}:${step.sourceLine || 1}` : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-4 h-4 rounded-full bg-blue-900 text-blue-300 flex items-center justify-center font-mono text-[9px] font-bold shrink-0">
                        {step.order}
                      </span>
                      {step.sourceFile ? (
                        <span className="text-[9px] font-mono text-blue-400 flex items-center space-x-0.5 group-hover:underline">
                          <span>{step.sourceFile.split('/').pop()}:{step.sourceLine || 1}</span>
                          <ExternalLink size={8} />
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-gray-500">Шаг {step.order}</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 text-[11px] font-semibold">
                      <span className="text-gray-200 truncate">{step.from}</span>
                      <ArrowRight size={11} className="text-gray-500 shrink-0" />
                      <span className="text-emerald-300 truncate">{step.to}</span>
                    </div>

                    <div className="p-1.5 bg-gray-950 rounded border border-gray-900 text-[10px] font-mono text-blue-300 break-all">
                      {step.call}
                    </div>
                  </div>
                ))
              ) : activeMode === 'backend' && selectedFlow ? (
                (selectedFlow.steps || []).map(step => (
                  <div key={step.order} className="glass-panel p-2.5 rounded-xl border border-gray-800/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="w-4 h-4 rounded-full bg-blue-900 text-blue-300 flex items-center justify-center font-mono text-[9px] font-bold shrink-0">
                        {step.order}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">Шаг {step.order}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[11px] font-semibold">
                      <span className="text-gray-200 truncate">{step.from}</span>
                      <ArrowRight size={11} className="text-gray-500 shrink-0" />
                      <span className="text-blue-300 truncate">{step.to}</span>
                    </div>

                    <div className="p-1.5 bg-gray-950 rounded border border-gray-900 text-[10px] font-mono text-blue-300 break-all">
                      {step.call}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 text-xs font-mono p-6">
                  Нет данных трассировки
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= SCREEN FORM STRUCTURE D3 MODAL ================= */}
      {isStructureModalOpen && selectedForm && (
        <ScreenFormStructureModal
          form={selectedForm}
          onClose={() => setIsStructureModalOpen(false)}
          onNavigateToSource={onNavigateToSource}
        />
      )}
    </div>
  );
};
