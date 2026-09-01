import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { DataModel, EntityModel, EntityRelationship } from '../../shared/types';
import { MermaidViewer } from '../components/MermaidViewer';
import {
  Database,
  Key,
  Link2,
  Table,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Eye,
  Layers,
  Search,
  Sparkles,
  FileCode,
  ExternalLink,
  ListFilter,
  Boxes,
  Code,
  Cpu,
  Braces,
  Globe,
  Server,
  Tag,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  Info,
  CheckCircle2
} from 'lucide-react';

interface DataModelViewProps {
  dataModel: DataModel | null;
  onNavigateToSource?: (filePath: string, line: number) => void;
}

interface ERDNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  entity: EntityModel;
  isFocused?: boolean;
  width: number;
  height: number;
}

interface ERDLink extends d3.SimulationLinkDatum<ERDNode> {
  source: string | ERDNode;
  target: string | ERDNode;
  relationship: EntityRelationship;
}

type MainViewMode = 'table' | 'visualization';
type VisualType = 'd3' | 'mermaid';

// Fallback sample data model with diverse source types, enums, and system types
const sampleDataModel: DataModel = {
  id: 'sample-dm',
  analysisRunId: 'sample-run',
  source: 'postgresql_ddl',
  version: '1.0.0',
  entities: [
    {
      id: 'roles',
      dataModelId: 'sample-dm',
      name: 'roles',
      physicalTable: 'roles',
      domain: 'Auth & Access',
      description: 'Роли пользователей и системные привилегии',
      sourceType: 'sql_ddl',
      sourceLabel: 'База данных (SQL DDL)',
      attributes: [
        { id: 'attr-roles-id', name: 'id', physicalColumn: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, description: 'Идентификатор роли' },
        { id: 'attr-roles-name', name: 'role_name', physicalColumn: 'role_name', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Наименование роли' },
        { id: 'attr-roles-perm', name: 'permissions_json', physicalColumn: 'permissions_json', type: 'JSONB', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'JSON-матрица прав' },
        { id: 'attr-roles-desc', name: 'description', physicalColumn: 'description', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false, isNullable: true, description: 'Описание назначения роли' }
      ]
    },
    {
      id: 'users',
      dataModelId: 'sample-dm',
      name: 'users',
      physicalTable: 'users',
      domain: 'Auth & Access',
      description: 'Учетные записи пользователей платформы',
      sourceType: 'sql_ddl',
      sourceLabel: 'База данных (SQL DDL)',
      attributes: [
        { id: 'attr-users-id', name: 'id', physicalColumn: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, description: 'ID пользователя' },
        { id: 'attr-users-role', name: 'role_id', physicalColumn: 'role_id', type: 'UUID', isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: 'roles.id', isNullable: false, description: 'Внешний ключ на роль' },
        { id: 'attr-users-email', name: 'email', physicalColumn: 'email', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Email для входа' },
        { id: 'attr-users-pass', name: 'password_hash', physicalColumn: 'password_hash', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Хэш пароля' },
        { id: 'attr-users-name', name: 'full_name', physicalColumn: 'full_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false, isNullable: true, description: 'Полное имя' }
      ]
    },
    {
      id: 'filenode',
      dataModelId: 'dm-sys',
      name: 'FileNode',
      physicalTable: 'file_nodes_sys',
      domain: 'Системные типы',
      description: 'Системный тип данных: узел файлового дерева проекта',
      sourceType: 'system_type',
      sourceLabel: 'Системный тип',
      isSystemType: true,
      attributes: [
        { id: 'attr-fn-id', name: 'id', physicalColumn: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, description: 'Идентификатор узла' },
        { id: 'attr-fn-path', name: 'path', physicalColumn: 'path', type: 'VARCHAR(500)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Относительный путь' },
        { id: 'attr-fn-type', name: 'type', physicalColumn: 'type', type: 'VARCHAR(30)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'file или directory' },
        { id: 'attr-fn-size', name: 'sizeBytes', physicalColumn: 'sizeBytes', type: 'INTEGER', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Размер узла в байтах' }
      ]
    },
    {
      id: 'capabilities_enum',
      dataModelId: 'dm-enum',
      name: 'CapabilityEnum',
      physicalTable: 'capabilities_enum',
      domain: 'Перечисления (Enums)',
      description: 'Перечисление поддерживаемых возможностей анализатора',
      sourceType: 'enum',
      sourceLabel: 'ENUM Перечисление',
      isEnum: true,
      enumValues: [
        'Автоматическая классификация документов, медиа, архивов и кода',
        'Возможность исключать или переназначать отдельные файлы',
        'Безопасное выполнение в интерактивном режиме или симуляции'
      ],
      attributes: []
    },
    {
      id: 'status_enum',
      dataModelId: 'dm-enum',
      name: 'StatusEnum',
      physicalTable: 'status_enum',
      domain: 'Перечисления (Enums)',
      description: 'Жизненный цикл фоновой задачи анализа',
      sourceType: 'enum',
      sourceLabel: 'ENUM Перечисление',
      isEnum: true,
      enumValues: [
        'IDLE',
        'RUNNING',
        'PAUSED',
        'DONE',
        'STOPPED'
      ],
      attributes: []
    },
    {
      id: 'accounts',
      dataModelId: 'sample-dm',
      name: 'accounts',
      physicalTable: 'accounts',
      domain: 'Finance',
      description: 'Счета и балансы пользователей',
      sourceType: 'sql_ddl',
      sourceLabel: 'База данных (SQL DDL)',
      attributes: [
        { id: 'attr-acc-id', name: 'id', physicalColumn: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, description: 'ID счета' },
        { id: 'attr-acc-user', name: 'user_id', physicalColumn: 'user_id', type: 'UUID', isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: 'users.id', isNullable: false, description: 'Владелец счета' },
        { id: 'attr-acc-num', name: 'account_number', physicalColumn: 'account_number', type: 'VARCHAR(34)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Номер счета IBAN' },
        { id: 'attr-acc-curr', name: 'currency', physicalColumn: 'currency', type: 'VARCHAR(3)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Код валюты' },
        { id: 'attr-acc-bal', name: 'balance', physicalColumn: 'balance', type: 'NUMERIC(15,2)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Текущий баланс' }
      ]
    },
    {
      id: 'categories',
      dataModelId: 'sample-dm',
      name: 'categories',
      physicalTable: 'categories',
      domain: 'Catalog',
      description: 'Дерево товарных категорий',
      sourceType: 'sql_ddl',
      sourceLabel: 'База данных (SQL DDL)',
      attributes: [
        { id: 'attr-cat-id', name: 'id', physicalColumn: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, description: 'ID категории' },
        { id: 'attr-cat-parent', name: 'parent_id', physicalColumn: 'parent_id', type: 'UUID', isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: 'categories.id', isNullable: true, description: 'Родительская категория' },
        { id: 'attr-cat-name', name: 'name', physicalColumn: 'name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Наименование' },
        { id: 'attr-cat-slug', name: 'slug', physicalColumn: 'slug', type: 'VARCHAR(120)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'ЧПУ URL slug' }
      ]
    },
    {
      id: 'products',
      dataModelId: 'sample-dm',
      name: 'products',
      physicalTable: 'products',
      domain: 'Catalog',
      description: 'Номенклатура товаров и остатки',
      sourceType: 'sql_ddl',
      sourceLabel: 'База данных (SQL DDL)',
      attributes: [
        { id: 'attr-prod-id', name: 'id', physicalColumn: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, description: 'ID товара' },
        { id: 'attr-prod-cat', name: 'category_id', physicalColumn: 'category_id', type: 'UUID', isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: 'categories.id', isNullable: false, description: 'Категория' },
        { id: 'attr-prod-sku', name: 'sku', physicalColumn: 'sku', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Артикул' },
        { id: 'attr-prod-title', name: 'title', physicalColumn: 'title', type: 'VARCHAR(200)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Заголовок' },
        { id: 'attr-prod-price', name: 'price', physicalColumn: 'price', type: 'NUMERIC(10,2)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Цена продажи' }
      ]
    },
    {
      id: 'orders',
      dataModelId: 'sample-dm',
      name: 'orders',
      physicalTable: 'orders',
      domain: 'Orders',
      description: 'Заказы клиентов и статус исполнения',
      sourceType: 'sql_ddl',
      sourceLabel: 'База данных (SQL DDL)',
      attributes: [
        { id: 'attr-ord-id', name: 'id', physicalColumn: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, description: 'ID заказа' },
        { id: 'attr-ord-user', name: 'user_id', physicalColumn: 'user_id', type: 'UUID', isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: 'users.id', isNullable: false, description: 'Клиент' },
        { id: 'attr-ord-acc', name: 'account_id', physicalColumn: 'account_id', type: 'UUID', isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: 'accounts.id', isNullable: false, description: 'Счет списания' },
        { id: 'attr-ord-num', name: 'order_number', physicalColumn: 'order_number', type: 'VARCHAR(60)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Номер заказа' },
        { id: 'attr-ord-status', name: 'status', physicalColumn: 'status', type: 'STATUSENUM ENUM', isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: 'StatusEnum.id', isNullable: false, description: 'Статус исполнения заказа' },
        { id: 'attr-ord-tot', name: 'total_amount', physicalColumn: 'total_amount', type: 'NUMERIC(12,2)', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Итоговая сумма' }
      ]
    },
    {
      id: 'order_items',
      dataModelId: 'sample-dm',
      name: 'order_items',
      physicalTable: 'order_items',
      domain: 'Orders',
      description: 'Позиции товаров в составе заказа',
      sourceType: 'sql_ddl',
      sourceLabel: 'База данных (SQL DDL)',
      attributes: [
        { id: 'attr-item-id', name: 'id', physicalColumn: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, description: 'ID позиции' },
        { id: 'attr-item-ord', name: 'order_id', physicalColumn: 'order_id', type: 'UUID', isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: 'orders.id', isNullable: false, description: 'Заказ' },
        { id: 'attr-item-prod', name: 'product_id', physicalColumn: 'product_id', type: 'UUID', isPrimaryKey: false, isForeignKey: true, foreignKeyTarget: 'products.id', isNullable: false, description: 'Товар' },
        { id: 'attr-item-qty', name: 'quantity', physicalColumn: 'quantity', type: 'INTEGER', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Количество' }
      ]
    }
  ],
  relationships: [
    { id: 'rel-1', sourceEntityId: 'users', sourceEntityName: 'users', targetEntityId: 'roles', targetEntityName: 'roles', type: '1:N', foreignKeyName: 'users.role_id -> roles.id', confidence: 0.99 },
    { id: 'rel-2', sourceEntityId: 'accounts', sourceEntityName: 'accounts', targetEntityId: 'users', targetEntityName: 'users', type: '1:N', foreignKeyName: 'accounts.user_id -> users.id', confidence: 0.99 },
    { id: 'rel-3', sourceEntityId: 'orders', sourceEntityName: 'orders', targetEntityId: 'users', targetEntityName: 'users', type: '1:N', foreignKeyName: 'orders.user_id -> users.id', confidence: 0.99 },
    { id: 'rel-4', sourceEntityId: 'orders', sourceEntityName: 'orders', targetEntityId: 'accounts', targetEntityName: 'accounts', type: '1:N', foreignKeyName: 'orders.account_id -> accounts.id', confidence: 0.99 },
    { id: 'rel-4-enum', sourceEntityId: 'orders', sourceEntityName: 'orders', targetEntityId: 'StatusEnum', targetEntityName: 'StatusEnum', type: '1:N', foreignKeyName: 'orders.status -> StatusEnum.id', confidence: 0.99 },
    { id: 'rel-5', sourceEntityId: 'categories', sourceEntityName: 'categories', targetEntityId: 'categories', targetEntityName: 'categories', type: '1:N', foreignKeyName: 'categories.parent_id -> categories.id', confidence: 0.95 },
    { id: 'rel-6', sourceEntityId: 'products', sourceEntityName: 'products', targetEntityId: 'categories', targetEntityName: 'categories', type: '1:N', foreignKeyName: 'products.category_id -> categories.id', confidence: 0.99 },
    { id: 'rel-7', sourceEntityId: 'order_items', sourceEntityName: 'order_items', targetEntityId: 'orders', targetEntityName: 'orders', type: '1:N', foreignKeyName: 'order_items.order_id -> orders.id', confidence: 0.99 },
    { id: 'rel-8', sourceEntityId: 'order_items', sourceEntityName: 'order_items', targetEntityId: 'products', targetEntityName: 'products', type: '1:N', foreignKeyName: 'order_items.product_id -> products.id', confidence: 0.99 }
  ],
  erDiagramMermaid: `erDiagram
    roles ||--o{ users : "role_id"
    users ||--o{ accounts : "user_id"
    users ||--o{ orders : "user_id"
    accounts ||--o{ orders : "account_id"
    orders ||--o{ StatusEnum : "status"
    categories ||--o{ categories : "parent_id"
    categories ||--o{ products : "category_id"
    orders ||--|{ order_items : "order_id"
    products ||--o{ order_items : "product_id"
    roles {
        uuid id PK "Идентификатор роли"
        varchar role_name "Наименование роли"
        jsonb permissions_json "JSON-матрица прав"
    }
    users {
        uuid id PK "ID пользователя"
        uuid role_id FK "Внешний ключ на роль"
        varchar email "Email для входа"
    }
    StatusEnum {
        enum IDLE "Значение"
        enum RUNNING "Значение"
        enum PAUSED "Значение"
        enum DONE "Значение"
        enum STOPPED "Значение"
    }
    CapabilityEnum {
        enum auto_classify "Автоклассификация"
        enum exclude_reassign "Исключение и переназначение"
        enum safe_mode "Безопасный режим"
    }`,
  erDiagramPlantUml: `@startuml
!theme plain
skinparam backgroundColor #070A13
skinparam roundcorner 8
skinparam entity {
  BackgroundColor #0F172A
  ArrowColor #3B82F6
  BorderColor #334155
  FontColor #F9FAFB
  FontSize 11
  FontName Consolas
}
skinparam enum {
  BackgroundColor #0D2818
  ArrowColor #10B981
  BorderColor #059669
  FontColor #ECFDF5
  FontSize 11
  FontName Consolas
}
entity "roles" as roles {
  * id : UUID <<PK>>
  --
  role_name : VARCHAR(50)
  permissions_json : JSONB
  description : VARCHAR(255)
}
entity "users" as users {
  * id : UUID <<PK>>
  --
  * role_id : UUID <<FK>>
  email : VARCHAR(255)
  password_hash : VARCHAR(255)
  full_name : VARCHAR(150)
}
entity "accounts" as accounts {
  * id : UUID <<PK>>
  --
  * user_id : UUID <<FK>>
  account_number : VARCHAR(34)
  balance : NUMERIC(15,2)
  currency : VARCHAR(3)
}
entity "orders" as orders {
  * id : UUID <<PK>>
  --
  * user_id : UUID <<FK>>
  * account_id : UUID <<FK>>
  * status : STATUSENUM <<FK>>
  order_number : VARCHAR(60)
  total_amount : NUMERIC(12,2)
}
entity "categories" as categories {
  * id : UUID <<PK>>
  --
  parent_id : UUID <<FK>>
  name : VARCHAR(100)
  slug : VARCHAR(120)
}
entity "products" as products {
  * id : UUID <<PK>>
  --
  * category_id : UUID <<FK>>
  sku : VARCHAR(50)
  title : VARCHAR(200)
  price : NUMERIC(10,2)
}
entity "order_items" as order_items {
  * id : UUID <<PK>>
  --
  * order_id : UUID <<FK>>
  * product_id : UUID <<FK>>
  quantity : INTEGER
}
enum "StatusEnum" as StatusEnum {
  IDLE
  RUNNING
  PAUSED
  DONE
  STOPPED
}
enum "CapabilityEnum" as CapabilityEnum {
  auto_classify
  exclude_reassign
  safe_mode
}
roles ||--o{ users : "role_id"
users ||--o{ accounts : "user_id"
users ||--o{ orders : "user_id"
accounts ||--o{ orders : "account_id"
orders ||--o{ StatusEnum : "status"
categories ||--o{ categories : "parent_id"
categories ||--o{ products : "category_id"
orders ||--|{ order_items : "order_id"
products ||--o{ order_items : "product_id"
@enduml`
};

export const DataModelView: React.FC<DataModelViewProps> = ({ dataModel, onNavigateToSource }) => {
  const hasRepoEntities = Boolean(dataModel && dataModel.entities && dataModel.entities.length > 0);
  const [useSampleModel, setUseSampleModel] = useState<boolean>(!hasRepoEntities);

  // Sync state whenever dataModel or repo entities change
  useEffect(() => {
    if (hasRepoEntities) {
      setUseSampleModel(false);
    } else {
      setUseSampleModel(true);
    }
  }, [hasRepoEntities, dataModel]);

  // Use active model (analyzed repo model or sample fallback)
  const activeModel = useMemo(() => {
    if (!useSampleModel && hasRepoEntities && dataModel) {
      return dataModel;
    }
    return sampleDataModel;
  }, [dataModel, useSampleModel, hasRepoEntities]);

  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    activeModel.entities[0]?.id || 'roles'
  );

  useEffect(() => {
    if (activeModel.entities.length > 0 && !activeModel.entities.some(e => e.id === selectedEntityId)) {
      setSelectedEntityId(activeModel.entities[0].id);
    }
  }, [activeModel, selectedEntityId]);

  // UI Modes
  const [mainMode, setMainMode] = useState<MainViewMode>('table');
  const [visualType, setVisualType] = useState<VisualType>('d3');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'all' | 'neighborhood'>('all');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<ERDNode, ERDLink> | null>(null);

  const selectedEntity = useMemo(() => {
    return activeModel.entities.find(e => e.id === selectedEntityId) || activeModel.entities[0] || { id: '', name: 'Empty', attributes: [] };
  }, [activeModel, selectedEntityId]);

  // Find incoming references for the selected entity (e.g. for enums or tables)
  const incomingReferences = useMemo(() => {
    if (!selectedEntity || !selectedEntity.name) return [];
    const targetNameLower = selectedEntity.name.toLowerCase();
    const refs: { sourceEntity: EntityModel; attributeName: string; relationship: EntityRelationship }[] = [];

    (activeModel.relationships || []).forEach(rel => {
      if (rel.targetEntityName.toLowerCase() === targetNameLower) {
        const srcEnt = activeModel.entities.find(e => e.name.toLowerCase() === rel.sourceEntityName.toLowerCase());
        if (srcEnt) {
          const attr = srcEnt.attributes.find(a => 
            a.foreignKeyTarget?.toLowerCase().startsWith(targetNameLower) ||
            a.type.toLowerCase().includes(targetNameLower)
          );
          refs.push({
            sourceEntity: srcEnt,
            attributeName: attr?.name || rel.foreignKeyName?.split('->')[0]?.split('.')?.pop() || 'field',
            relationship: rel
          });
        }
      }
    });

    return refs;
  }, [activeModel, selectedEntity]);

  const filteredEntityList = useMemo(() => {
    let list = activeModel.entities;
    if (sourceFilter === 'enum') {
      list = list.filter(e => e.isEnum || e.sourceType === 'enum');
    } else if (sourceFilter === 'table') {
      list = list.filter(e => !e.isEnum && !e.isSystemType);
    } else if (sourceFilter === 'system_type') {
      list = list.filter(e => e.isSystemType || e.sourceType === 'system_type');
    }

    if (!tableSearch.trim()) return list;
    return list.filter(e => 
      e.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
      (e.sourceLabel || '').toLowerCase().includes(tableSearch.toLowerCase()) ||
      (e.enumValues || []).some(v => v.toLowerCase().includes(tableSearch.toLowerCase())) ||
      (e.attributes || []).some(a => a.name.toLowerCase().includes(tableSearch.toLowerCase()))
    );
  }, [activeModel, tableSearch, sourceFilter]);

  // Source Badge configuration helper
  const getSourceBadge = (entity: EntityModel) => {
    const type = entity.sourceType || 'js_structure';
    const label = entity.sourceLabel || (entity.isEnum ? 'ENUM Перечисление' : entity.isSystemType ? 'Системный тип' : 'Структура данных');

    if (entity.isEnum) {
      return { label: 'ENUM Перечисление', bg: 'bg-teal-950/70 text-teal-300 border-teal-800/50', icon: ListFilter };
    }

    switch (type) {
      case 'sql_ddl':
        return { label, bg: 'bg-blue-950/70 text-blue-300 border-blue-800/50', icon: Database };
      case 'prisma':
        return { label, bg: 'bg-purple-950/70 text-purple-300 border-purple-800/50', icon: Boxes };
      case 'python_orm':
        return { label, bg: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/50', icon: Code };
      case 'dotnet_ef':
        return { label, bg: 'bg-violet-950/70 text-violet-300 border-violet-800/50', icon: Cpu };
      case 'ts_interface':
        return { label, bg: 'bg-sky-950/70 text-sky-300 border-sky-800/50', icon: FileCode };
      case 'js_structure':
        return { label, bg: 'bg-amber-950/70 text-amber-300 border-amber-800/50', icon: Braces };
      case 'api_dto':
        return { label, bg: 'bg-pink-950/70 text-pink-300 border-pink-800/50', icon: Globe };
      case 'enum':
        return { label, bg: 'bg-teal-950/70 text-teal-300 border-teal-800/50', icon: ListFilter };
      case 'system_type':
        return { label, bg: 'bg-slate-900/90 text-slate-300 border-slate-700/60', icon: Server };
      default:
        return { label, bg: 'bg-gray-900 text-gray-300 border-gray-800', icon: Table };
    }
  };

  // Build subgraph for current viewMode
  const { nodesData, linksData } = useMemo(() => {
    let entitiesToShow = activeModel.entities;

    if (viewMode === 'neighborhood' && selectedEntity && selectedEntity.name) {
      const neighborNames = new Set<string>([selectedEntity.name.toLowerCase()]);
      (activeModel.relationships || []).forEach(r => {
        if (r.sourceEntityName.toLowerCase() === selectedEntity.name.toLowerCase()) {
          neighborNames.add(r.targetEntityName.toLowerCase());
        }
        if (r.targetEntityName.toLowerCase() === selectedEntity.name.toLowerCase()) {
          neighborNames.add(r.sourceEntityName.toLowerCase());
        }
      });
      entitiesToShow = activeModel.entities.filter(e => neighborNames.has(e.name.toLowerCase()));
    }

    const nodes: ERDNode[] = entitiesToShow.map(e => ({
      id: e.name,
      name: e.name,
      entity: e,
      isFocused: e.name.toLowerCase() === selectedEntity?.name?.toLowerCase(),
      width: e.isEnum ? 165 : 180,
      height: e.isEnum 
        ? 36 + Math.min(e.enumValues?.length || 0, 4) * 15
        : 40 + Math.min(e.attributes.length, 5) * 16
    }));

    const nodeNameSet = new Set(nodes.map(n => n.id.toLowerCase()));

    const links: ERDLink[] = (activeModel.relationships || [])
      .filter(r => nodeNameSet.has(r.sourceEntityName.toLowerCase()) && nodeNameSet.has(r.targetEntityName.toLowerCase()))
      .map(r => ({
        source: r.sourceEntityName,
        target: r.targetEntityName,
        relationship: r
      }));

    return { nodesData: nodes, linksData: links };
  }, [activeModel, viewMode, selectedEntity]);

  // Center/Focus on selected entity node in D3 graph
  const focusOnNode = (nodeName: string) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const targetNode = nodesData.find(n => n.id.toLowerCase() === nodeName.toLowerCase());
    if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
      const width = svgRef.current.clientWidth || 900;
      const height = svgRef.current.clientHeight || 500;
      d3.select(svgRef.current)
        .transition()
        .duration(650)
        .call(
          zoomBehaviorRef.current.transform,
          d3.zoomIdentity.translate(width / 2 - targetNode.x * 1.1, height / 2 - targetNode.y * 1.1).scale(1.1)
        );
    }
  };

  // Trigger focus when selection or visualization mode changes
  useEffect(() => {
    if (mainMode === 'visualization' && visualType === 'd3' && selectedEntity?.name) {
      const timer = setTimeout(() => {
        focusOnNode(selectedEntity.name);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedEntityId, mainMode, visualType]);

  // D3 Graph Render Effect
  useEffect(() => {
    if (!svgRef.current || mainMode !== 'visualization' || visualType !== 'd3' || nodesData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 500;

    // Defs for arrows and gradients
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'erd-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#60A5FA');

    const container = svg.append('g').attr('class', 'zoom-container');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Initial center transform
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2 - 150, height / 2 - 120).scale(0.9));

    const simulation = d3.forceSimulation<ERDNode>(nodesData)
      .force('link', d3.forceLink<ERDNode, ERDLink>(linksData).id(d => d.id).distance(180))
      .force('charge', d3.forceManyBody().strength(-700))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<ERDNode>().radius(d => Math.max(d.width, d.height) / 1.5 + 22));

    simulationRef.current = simulation;

    // Draw Links
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('g')
      .data(linksData)
      .enter()
      .append('g');

    const linkLine = link.append('line')
      .attr('stroke', '#3B82F6')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#erd-arrow)');

    const linkLabel = link.append('text')
      .attr('font-size', '9px')
      .attr('fill', '#93C5FD')
      .attr('text-anchor', 'middle')
      .attr('font-family', 'monospace')
      .text(d => d.relationship.foreignKeyName?.split('->')[0]?.split('.')?.pop() || d.relationship.type || 'FK');

    // Draw Nodes
    const node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodesData)
      .enter()
      .append('g')
      .attr('class', 'cursor-pointer')
      .call(d3.drag<SVGGElement, ERDNode>()
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
        setSelectedEntityId(d.entity.id);
      });

    // Node Box
    node.append('rect')
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('rx', 7)
      .attr('x', d => -d.width / 2)
      .attr('y', d => -d.height / 2)
      .attr('fill', d => d.isFocused ? '#1E293B' : d.entity.isEnum ? '#042F2E' : d.entity.isSystemType ? '#18181B' : '#0F172A')
      .attr('stroke', d => d.isFocused ? '#F59E0B' : d.entity.isEnum ? '#14B8A6' : d.entity.isSystemType ? '#71717A' : '#334155')
      .attr('stroke-width', d => d.isFocused ? 2.5 : 1)
      .attr('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4))');

    // Node Header Box
    node.append('path')
      .attr('d', d => {
        const w = d.width;
        const x = -w / 2;
        const y = -d.height / 2;
        return `M ${x} ${y + 7} A 7 7 0 0 1 ${x + 7} ${y} L ${x + w - 7} ${y} A 7 7 0 0 1 ${x + w} ${y + 7} L ${x + w} ${y + 24} L ${x} ${y + 24} Z`;
      })
      .attr('fill', d => d.isFocused ? '#78350F' : d.entity.isEnum ? '#115E59' : d.entity.isSystemType ? '#27272A' : '#1E293B');

    // Node Title (Entity Name)
    node.append('text')
      .attr('x', d => -d.width / 2 + 8)
      .attr('y', d => -d.height / 2 + 16)
      .attr('fill', d => d.isFocused ? '#FDE68A' : d.entity.isEnum ? '#99F6E4' : '#E2E8F0')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .text(d => d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name);

    // Node Type Tag on top right
    node.append('text')
      .attr('x', d => d.width / 2 - 6)
      .attr('y', d => -d.height / 2 + 16)
      .attr('text-anchor', 'end')
      .attr('fill', d => d.entity.isEnum ? '#2DD4BF' : '#94A3B8')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .text(d => d.entity.isEnum ? 'ENUM' : d.entity.isSystemType ? 'SYS' : 'TBL');

    // Inner Items Preview (Enum values or Table columns)
    node.each(function(d) {
      const g = d3.select(this);

      if (d.entity.isEnum && d.entity.enumValues && d.entity.enumValues.length > 0) {
        // ENUM values preview
        const values = d.entity.enumValues.slice(0, 4);
        values.forEach((val, idx) => {
          const yPos = -d.height / 2 + 37 + idx * 15;
          g.append('text')
            .attr('x', -d.width / 2 + 8)
            .attr('y', yPos)
            .attr('fill', '#2DD4BF')
            .attr('font-size', '8px')
            .text('•');

          g.append('text')
            .attr('x', -d.width / 2 + 18)
            .attr('y', yPos)
            .attr('fill', '#CCFBF1')
            .attr('font-size', '8.5px')
            .attr('font-family', 'monospace')
            .text(val.length > 18 ? val.slice(0, 16) + '…' : val);
        });
      } else {
        // Table attributes preview
        const attrs = d.entity.attributes.slice(0, 5);
        attrs.forEach((attr, idx) => {
          const yPos = -d.height / 2 + 38 + idx * 16;
          
          if (attr.isPrimaryKey) {
            g.append('text')
              .attr('x', -d.width / 2 + 8)
              .attr('y', yPos)
              .attr('fill', '#F59E0B')
              .attr('font-size', '8px')
              .attr('font-weight', 'bold')
              .text('PK');
          } else if (attr.isEnum || attr.type.includes('ENUM')) {
            g.append('text')
              .attr('x', -d.width / 2 + 8)
              .attr('y', yPos)
              .attr('fill', '#2DD4BF')
              .attr('font-size', '8px')
              .attr('font-weight', 'bold')
              .text('EN');
          } else if (attr.isForeignKey) {
            g.append('text')
              .attr('x', -d.width / 2 + 8)
              .attr('y', yPos)
              .attr('fill', '#60A5FA')
              .attr('font-size', '8px')
              .attr('font-weight', 'bold')
              .text('FK');
          }

          // Attribute Name
          g.append('text')
            .attr('x', -d.width / 2 + (attr.isPrimaryKey || attr.isForeignKey || attr.isEnum || attr.type.includes('ENUM') ? 24 : 8))
            .attr('y', yPos)
            .attr('fill', '#94A3B8')
            .attr('font-size', '9px')
            .attr('font-family', 'monospace')
            .text(attr.name.length > 13 ? attr.name.slice(0, 11) + '…' : attr.name);

          // Attribute Type
          g.append('text')
            .attr('x', d.width / 2 - 8)
            .attr('y', yPos)
            .attr('text-anchor', 'end')
            .attr('fill', '#64748B')
            .attr('font-size', '8px')
            .attr('font-family', 'monospace')
            .text(attr.type.split('(')[0]);
        });
      }
    });

    simulation.on('tick', () => {
      linkLine
        .attr('x1', d => (d.source as ERDNode).x!)
        .attr('y1', d => (d.source as ERDNode).y!)
        .attr('x2', d => (d.target as ERDNode).x!)
        .attr('y2', d => (d.target as ERDNode).y!);

      linkLabel
        .attr('x', d => ((d.source as ERDNode).x! + (d.target as ERDNode).x!) / 2)
        .attr('y', d => ((d.source as ERDNode).y! + (d.target as ERDNode).y!) / 2 - 4);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodesData, linksData, mainMode, visualType]);

  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 500;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(width / 2 - 150, height / 2 - 120).scale(0.9));
  };

  const selectedBadge = getSourceBadge(selectedEntity);
  const SelectedIcon = selectedBadge.icon;

  return (
    <div className={`p-4 space-y-3 overflow-hidden h-full max-w-7xl mx-auto flex flex-col bg-[#090A0F] text-[#F1F5F9] select-none ${isFullScreen ? 'fixed inset-0 z-50 bg-[#090A0F] p-4 max-w-none' : ''}`}>
      {/* Top Header & Mode Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#111318] p-3.5 rounded border border-[#1E2330] shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#161922] border border-[#1E2330] rounded text-blue-400">
            <Database size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-slate-100">
                Модель данных & ER-Диаграмма
              </h2>
              {useSampleModel && (
                <span className="px-2 py-0.5 text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/40 rounded font-medium flex items-center space-x-1">
                  <Sparkles size={10} />
                  <span>Демо-модель</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Таблицы, структуры объектов, ENUM перечисления, системные типы и внешние связи
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Model Source Toggle */}
          {hasRepoEntities && (
            <div className="flex items-center space-x-1 bg-[#161922] p-0.5 rounded border border-[#1E2330] text-xs">
              <button
                onClick={() => {
                  setUseSampleModel(false);
                  setSelectedEntityId(dataModel?.entities?.[0]?.id || '');
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  !useSampleModel ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Показать модель данных из репозитория"
              >
                Репозиторий ({dataModel?.entities?.length || 0})
              </button>
              <button
                onClick={() => {
                  setUseSampleModel(true);
                  setSelectedEntityId('roles');
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center space-x-1 ${
                  useSampleModel ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Переключить на демонстрационную модель"
              >
                <Sparkles size={11} className={useSampleModel ? 'text-white' : 'text-amber-400'} />
                <span>Демо (10)</span>
              </button>
            </div>
          )}

          {/* Primary View Toggle: Таблица vs Визуализация */}
          <div className="flex items-center bg-[#161922] p-0.5 rounded border border-[#1E2330] text-xs">
            <button
              onClick={() => setMainMode('table')}
              className={`px-3 py-1 rounded text-xs font-medium transition flex items-center space-x-1.5 ${
                mainMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Показать подробный состав и свойства выбранной сущности"
            >
              <Table size={13} />
              <span>Таблица</span>
            </button>
            <button
              onClick={() => {
                setMainMode('visualization');
                if (selectedEntity?.name) {
                  setTimeout(() => focusOnNode(selectedEntity.name), 100);
                }
              }}
              className={`px-3 py-1 rounded text-xs font-medium transition flex items-center space-x-1.5 ${
                mainMode === 'visualization' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Сфокусироваться на таблице в визуализации ERD"
            >
              <Layers size={13} />
              <span>Визуализация</span>
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 bg-[#161922] hover:bg-[#1E222D] text-slate-300 rounded border border-[#1E2330] transition"
            title={isFullScreen ? 'Свернуть' : 'Развернуть во весь экран'}
          >
            {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Main Workspace Layout with Collapsible Entity Frame */}
      <div className="flex-1 flex overflow-hidden gap-3 min-h-0">
        {/* Left Entity Frame (Collapsible) */}
        <div
          className={`bg-[#111318] rounded border border-[#1E2330] transition-all duration-200 flex flex-col shrink-0 ${
            isSidebarCollapsed ? 'w-12 items-center p-2' : 'w-72 md:w-80 p-3'
          }`}
        >
          {/* Sidebar Header with Collapse Toggle */}
          <div className="flex items-center justify-between pb-2 border-b border-[#1E2330] w-full">
            {!isSidebarCollapsed && (
              <div className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5 truncate">
                <Table size={13} className="text-blue-400 shrink-0" />
                <span>Таблицы модели ({activeModel.entities.length})</span>
              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 hover:bg-[#1E222D] text-slate-400 hover:text-slate-200 rounded border border-[#1E2330] transition shrink-0 mx-auto"
              title={isSidebarCollapsed ? 'Развернуть список таблиц' : 'Свернуть панель таблиц'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
          </div>

          {/* Expanded Sidebar Controls */}
          {!isSidebarCollapsed ? (
            <div className="flex flex-col flex-1 overflow-hidden space-y-2 pt-2">
              {/* Search */}
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  placeholder="Поиск таблицы, ENUM или поля..."
                  className="w-full bg-[#0D0E14] border border-[#1E2330] rounded pl-7 pr-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[10px] font-mono">
                <button
                  onClick={() => setSourceFilter('all')}
                  className={`px-2 py-0.5 rounded border transition shrink-0 ${
                    sourceFilter === 'all' ? 'bg-blue-600/15 text-blue-300 border-blue-500/40' : 'bg-[#161922] text-slate-400 border-[#1E2330] hover:text-slate-200'
                  }`}
                >
                  Все ({activeModel.entities.length})
                </button>
                <button
                  onClick={() => setSourceFilter('table')}
                  className={`px-2 py-0.5 rounded border transition shrink-0 flex items-center space-x-1 ${
                    sourceFilter === 'table' ? 'bg-blue-600/15 text-blue-300 border-blue-500/40' : 'bg-[#161922] text-slate-400 border-[#1E2330] hover:text-slate-200'
                  }`}
                >
                  <Table size={9} />
                  <span>Таблицы ({activeModel.entities.filter(e => !e.isEnum && !e.isSystemType).length})</span>
                </button>
                <button
                  onClick={() => setSourceFilter('enum')}
                  className={`px-2 py-0.5 rounded border transition shrink-0 flex items-center space-x-1 ${
                    sourceFilter === 'enum' ? 'bg-teal-500/15 text-teal-300 border-teal-500/40' : 'bg-[#161922] text-slate-400 border-[#1E2330] hover:text-slate-200'
                  }`}
                >
                  <ListFilter size={9} />
                  <span>ENUM ({activeModel.entities.filter(e => e.isEnum).length})</span>
                </button>
                <button
                  onClick={() => setSourceFilter('system_type')}
                  className={`px-2 py-0.5 rounded border transition shrink-0 flex items-center space-x-1 ${
                    sourceFilter === 'system_type' ? 'bg-slate-500/15 text-slate-300 border-slate-500/40' : 'bg-[#161922] text-slate-400 border-[#1E2330] hover:text-slate-200'
                  }`}
                >
                  <Server size={9} />
                  <span>Системные ({activeModel.entities.filter(e => e.isSystemType).length})</span>
                </button>
              </div>

              {/* Scrollable Entities List */}
              <div className="space-y-1 overflow-y-auto flex-1 pr-1">
                {filteredEntityList.map(ent => {
                  const isSelected = ent.id === selectedEntity?.id;
                  const badge = getSourceBadge(ent);
                  const BadgeIcon = badge.icon;

                  return (
                    <div
                      key={ent.id}
                      onClick={() => {
                        setSelectedEntityId(ent.id);
                        if (mainMode === 'visualization') {
                          focusOnNode(ent.name);
                        }
                      }}
                      className={`p-2 rounded cursor-pointer text-xs transition flex flex-col space-y-1 group ${
                        isSelected
                          ? 'bg-blue-600/15 text-blue-200 border border-blue-500/70 font-semibold'
                          : 'bg-[#161922] hover:bg-[#1E222D] text-slate-300 border border-[#1E2330]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-mono truncate text-[11px] flex items-center space-x-1.5">
                          {ent.isEnum ? (
                            <Tag size={11} className={isSelected ? 'text-teal-300' : 'text-teal-400'} />
                          ) : (
                            <Table size={11} className={isSelected ? 'text-blue-300' : 'text-slate-400'} />
                          )}
                          <span>{ent.name}</span>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0 ml-1.5">
                          {ent.sourceFile && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToSource?.(ent.sourceFile!, ent.sourceLine || 1);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#111318] text-blue-400 rounded border border-[#1E2330] transition"
                              title={`Перейти к коду: ${ent.sourceFile}:${ent.sourceLine || 1}`}
                            >
                              <ExternalLink size={10} />
                            </button>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono">
                            {ent.isEnum ? `${ent.enumValues?.length || 0} знач.` : `${ent.attributes?.length || 0} пол.`}
                          </span>
                        </div>
                      </div>

                      {/* Source classification badge */}
                      <div className="flex items-center justify-between">
                        <span className={`px-1.5 py-0.2 text-[9px] rounded font-medium border inline-flex items-center space-x-1 ${badge.bg}`}>
                          <BadgeIcon size={9} />
                          <span className="truncate max-w-[150px]">{badge.label}</span>
                        </span>
                        {ent.domain && (
                          <span className="text-[9px] text-slate-500 font-mono truncate max-w-[80px]">{ent.domain}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Collapsed mini-sidebar icons list */
            <div className="flex flex-col space-y-1.5 pt-2 overflow-y-auto flex-1 w-full items-center">
              {filteredEntityList.map(ent => {
                const isSelected = ent.id === selectedEntity?.id;
                const badge = getSourceBadge(ent);
                const BadgeIcon = badge.icon;
                return (
                  <button
                    key={ent.id}
                    onClick={() => {
                      setSelectedEntityId(ent.id);
                      if (mainMode === 'visualization') {
                        focusOnNode(ent.name);
                      }
                    }}
                    className={`p-2 rounded transition text-center ${
                      isSelected ? 'bg-blue-600 text-white shadow' : 'bg-[#161922] hover:bg-[#1E222D] text-slate-400 border border-[#1E2330]'
                    }`}
                    title={`${ent.name} (${badge.label})`}
                  >
                    <BadgeIcon size={13} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* ========================================================= */}
          {/* MODE 1: TABLE VIEW (Selected entity composition / ENUM)   */}
          {/* ========================================================= */}
          {mainMode === 'table' && (
            <div className="bg-[#111318] p-4 rounded border border-[#1E2330] h-full flex flex-col space-y-3 overflow-hidden">
              {/* Header Info */}
              <div className="flex items-start justify-between border-b border-[#1E2330] pb-3 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wide">
                      {selectedEntity?.isEnum ? 'Ключ ENUM перечисления' : 'Выбранная таблица'}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] rounded font-medium border inline-flex items-center space-x-1 ${selectedBadge.bg}`}>
                      <SelectedIcon size={10} />
                      <span>{selectedBadge.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <h3 className="text-base font-semibold text-slate-100 font-mono">{selectedEntity?.name || 'Таблица не выбрана'}</h3>
                    {selectedEntity?.sourceFile && (
                      <button
                        onClick={() => onNavigateToSource?.(selectedEntity.sourceFile!, selectedEntity.sourceLine || 1)}
                        className="px-2.5 py-0.5 bg-[#161922] hover:bg-[#1E222D] text-blue-300 hover:text-blue-100 border border-[#1E2330] rounded text-[11px] font-mono flex items-center space-x-1.5 transition group"
                        title={`Открыть ${selectedEntity.name} в файле ${selectedEntity.sourceFile}:${selectedEntity.sourceLine || 1}`}
                      >
                        <FileCode size={12} className="text-blue-400" />
                        <span className="underline decoration-blue-500/50 truncate max-w-[250px]">
                          {selectedEntity.sourceFile.split(/[/\\]/).pop()}:{selectedEntity.sourceLine || 1}
                        </span>
                        <ExternalLink size={10} className="shrink-0 group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>

                  {selectedEntity?.description && (
                    <p className="text-xs text-slate-400">{selectedEntity.description}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => {
                      setMainMode('visualization');
                      setTimeout(() => focusOnNode(selectedEntity.name), 100);
                    }}
                    className="px-2.5 py-1 bg-[#161922] hover:bg-[#1E222D] text-slate-300 border border-[#1E2330] rounded text-xs flex items-center space-x-1.5 transition font-mono"
                    title="Сфокусироваться на этой таблице в визуализации графа"
                  >
                    <Eye size={12} />
                    <span>В визуализацию</span>
                  </button>
                  <span className="text-xs font-mono text-slate-300 bg-[#090A0F] px-2.5 py-1 rounded border border-[#1E2330]">
                    {selectedEntity?.isEnum ? `${selectedEntity.enumValues?.length || 0} значений` : `${selectedEntity?.attributes?.length || 0} колонок`}
                  </span>
                </div>
              </div>

              {/* VIEW A: IF SELECTED ENTITY IS ENUM */}
              {selectedEntity?.isEnum ? (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {/* ENUM Values Card List */}
                  <div className="p-3 bg-[#161922] border border-[#1E2330] rounded space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-teal-300 flex items-center space-x-1.5">
                        <Tag size={13} />
                        <span>Допустимые значения перечисления ({selectedEntity.enumValues?.length || 0})</span>
                      </div>
                      <span className="text-[10px] text-teal-400 font-mono">Ключ: {selectedEntity.name}</span>
                    </div>

                    {/* Quick Badges Preview */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(selectedEntity.enumValues || []).map((val, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1 bg-[#0D0E14] border border-[#1E2330] rounded text-xs font-mono text-teal-200 flex items-center space-x-1.5 transition"
                        >
                          <span className="text-teal-400 text-[10px] font-mono font-bold">#{idx + 1}</span>
                          <span className="font-semibold">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clean Values Specification Table */}
                  <div className="rounded border border-[#1E2330] overflow-hidden bg-[#0D0E14]">
                    <div className="bg-[#161922] px-3.5 py-2 border-b border-[#1E2330] text-xs font-semibold text-slate-300 flex items-center space-x-2">
                      <ListFilter size={13} className="text-teal-400" />
                      <span>Спецификация значений</span>
                    </div>
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#090A0F] text-slate-400 text-[10px] uppercase border-b border-[#1E2330]">
                        <tr>
                          <th className="p-2.5 w-12 text-center">№</th>
                          <th className="p-2.5">Значение / Литерал перечисления</th>
                          <th className="p-2.5">Описание / Назначение</th>
                          <th className="p-2.5 w-28 text-center">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E2330]">
                        {(selectedEntity.enumValues || []).map((val, idx) => (
                          <tr key={idx} className="hover:bg-[#161922]/40 transition">
                            <td className="p-2.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-teal-300">
                              <span className="bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">{val}</span>
                            </td>
                            <td className="p-2.5 text-slate-300 font-sans text-xs">
                              {selectedEntity.description && selectedEntity.description.includes(val) ? (
                                <span>Элемент {val}</span>
                              ) : (
                                <span>Допустимое значение для перечисления {selectedEntity.name}</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40 inline-flex items-center space-x-1">
                                <CheckCircle2 size={9} />
                                <span>Active</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Incoming References */}
                  {incomingReferences.length > 0 && (
                    <div className="p-3 bg-[#161922] border border-[#1E2330] rounded space-y-2">
                      <div className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                        <Link2 size={13} className="text-blue-400" />
                        <span>Используется в сущностях ({incomingReferences.length}):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {incomingReferences.map((ref, i) => (
                          <div
                            key={i}
                            onClick={() => setSelectedEntityId(ref.sourceEntity.id)}
                            className="p-2 bg-[#0D0E14] hover:bg-[#161922] border border-[#1E2330] rounded cursor-pointer transition flex items-center justify-between group"
                          >
                            <div className="flex items-center space-x-2 font-mono text-xs">
                              <Table size={12} className="text-blue-400" />
                              <span className="text-slate-200 group-hover:text-blue-300 font-semibold">{ref.sourceEntity.name}</span>
                              <span className="text-slate-500 font-sans">({ref.attributeName})</span>
                            </div>
                            <span className="text-[10px] text-blue-400 group-hover:underline flex items-center space-x-1 font-mono">
                              <span>Перейти</span>
                              <ArrowRight size={10} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* VIEW B: IF SELECTED ENTITY IS STANDARD TABLE / STRUCTURE */
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  <div className="rounded border border-[#1E2330] overflow-hidden bg-[#0D0E14]">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#090A0F] text-slate-400 text-[10px] uppercase border-b border-[#1E2330] sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5">Колонка / Свойство</th>
                          <th className="p-2.5">Тип данных</th>
                          <th className="p-2.5">Ключ / Связь</th>
                          <th className="p-2.5">Описание</th>
                          <th className="p-2.5">Nullable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E2330]">
                        {(selectedEntity?.attributes || []).map((attr, i) => {
                          const fkTarget = attr.foreignKeyTarget || (activeModel.relationships || []).find(r => 
                            r.sourceEntityName?.toLowerCase() === selectedEntity?.name?.toLowerCase() &&
                            (r.foreignKeyName?.toLowerCase().includes(attr.name.toLowerCase()) || 
                             r.targetEntityName?.toLowerCase() === attr.name.toLowerCase().replace(/_?id$/, '') ||
                             r.targetEntityName?.toLowerCase() + 's' === attr.name.toLowerCase().replace(/_?id$/, ''))
                          )?.targetEntityName;

                          const attrFile = attr.sourceFile || selectedEntity?.sourceFile;
                          const attrLine = attr.sourceLine || selectedEntity?.sourceLine || 1;

                          return (
                            <tr key={i} className="hover:bg-[#161922]/40 transition">
                              <td 
                                onClick={() => {
                                  if (attrFile) onNavigateToSource?.(attrFile, attrLine);
                                }}
                                className={`p-2.5 font-semibold flex items-center space-x-1.5 truncate ${
                                  attrFile ? 'text-slate-200 hover:text-blue-300 cursor-pointer group' : 'text-slate-200'
                                }`}
                                title={attrFile ? `Перейти к ${attr.name} в ${attrFile}:${attrLine}` : undefined}
                              >
                                {attr.isPrimaryKey && <Key size={11} className="text-amber-400 shrink-0" />}
                                {attr.isEnum && <ListFilter size={11} className="text-teal-400 shrink-0" />}
                                {attr.isForeignKey && !attr.isEnum && <Link2 size={11} className="text-blue-400 shrink-0" />}
                                <span className={attrFile ? 'group-hover:underline decoration-blue-500/50' : ''}>{attr.name}</span>
                                {attrFile && (
                                  <ExternalLink size={9} className="text-blue-400/50 group-hover:text-blue-300 opacity-0 group-hover:opacity-100 transition shrink-0 ml-0.5" />
                                )}
                              </td>
                              <td className="p-2.5 text-blue-300">
                                <span className="font-mono">{attr.type}</span>
                                {attr.isForeignKey && fkTarget && (
                                  <span 
                                    onClick={() => {
                                      const targetEntity = activeModel.entities.find(ent => ent.name.toLowerCase() === fkTarget.toLowerCase().replace(/\.id$/, '').replace(/\(id\)$/, ''));
                                      if (targetEntity) {
                                        setSelectedEntityId(targetEntity.id);
                                      }
                                    }}
                                    className="ml-2 text-[10px] text-blue-300 hover:text-blue-100 cursor-pointer font-mono bg-blue-950/50 hover:bg-blue-900/60 px-1.5 py-0.5 rounded border border-blue-800/40 inline-flex items-center space-x-1 transition" 
                                    title={`Внешний ключ ссылается на таблицу ${fkTarget} (кликните для перехода)`}
                                  >
                                    <span className="text-blue-500">→</span>
                                    <span className="font-semibold underline decoration-blue-500/50">{fkTarget}</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5">
                                {attr.isPrimaryKey ? (
                                  <span className="text-amber-400 font-bold text-[9px] bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">PK</span>
                                ) : attr.isEnum ? (
                                  <span className="text-teal-400 font-bold text-[9px] bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/40">ENUM</span>
                                ) : attr.isForeignKey ? (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-blue-400 font-bold text-[9px] bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">FK</span>
                                    {fkTarget && (
                                      <span 
                                        onClick={() => {
                                          const targetEntity = activeModel.entities.find(ent => ent.name.toLowerCase() === fkTarget.toLowerCase().replace(/\.id$/, '').replace(/\(id\)$/, ''));
                                          if (targetEntity) {
                                            setSelectedEntityId(targetEntity.id);
                                          }
                                        }}
                                        className="text-[9px] text-blue-400 hover:text-blue-200 hover:underline cursor-pointer font-mono bg-blue-950/40 px-1 py-0.2 rounded border border-blue-800/30"
                                        title={`Перейти к таблице ${fkTarget}`}
                                      >
                                        {fkTarget.replace(/\.id$/, '')}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                              <td className="p-2.5 text-slate-400 font-sans text-xs max-w-[240px] truncate" title={attr.description || ''}>
                                {attr.description ? (
                                  <span className="text-slate-300">{attr.description}</span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                              <td className="p-2.5 text-slate-400 font-mono">
                                {attr.isNullable ? <span className="text-emerald-400 text-[10px]">NULL</span> : <span className="text-slate-500 text-[10px]">NOT NULL</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 2: VISUALIZATION VIEW (D3 Graph / Mermaid Focus)     */}
          {/* ========================================================= */}
          {mainMode === 'visualization' && (
            <div className="bg-[#111318] rounded border border-[#1E2330] h-full flex flex-col overflow-hidden relative">
              {/* Controls Bar */}
              <div className="bg-[#161922] p-2 border-b border-[#1E2330] flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-[#090A0F] p-0.5 rounded border border-[#1E2330] text-xs">
                    <button
                      onClick={() => setVisualType('d3')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center space-x-1 ${
                        visualType === 'd3' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Layers size={12} />
                      <span>Интерактивный граф</span>
                    </button>
                    <button
                      onClick={() => setVisualType('mermaid')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center space-x-1 ${
                        visualType === 'mermaid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Eye size={12} />
                      <span>Mermaid диаграмма</span>
                    </button>
                  </div>

                  {visualType === 'd3' && (
                    <div className="flex items-center space-x-1 text-xs font-mono">
                      <button
                        onClick={() => setViewMode('all')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                          viewMode === 'all' ? 'bg-blue-600/15 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Все ({activeModel.entities.length})
                      </button>
                      <button
                        onClick={() => setViewMode('neighborhood')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                          viewMode === 'neighborhood' ? 'bg-blue-600/15 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Окружение ({selectedEntity?.name})
                      </button>
                    </div>
                  )}
                </div>

                {visualType === 'd3' && (
                  <div className="flex items-center space-x-1">
                    <button onClick={() => handleZoom(1.3)} className="p-1.5 bg-[#090A0F] hover:bg-[#1E222D] text-slate-300 rounded border border-[#1E2330]" title="Приблизить">
                      <ZoomIn size={13} />
                    </button>
                    <button onClick={() => handleZoom(0.7)} className="p-1.5 bg-[#090A0F] hover:bg-[#1E222D] text-slate-300 rounded border border-[#1E2330]" title="Отдалить">
                      <ZoomOut size={13} />
                    </button>
                    <button onClick={handleResetZoom} className="p-1.5 bg-[#090A0F] hover:bg-[#1E222D] text-slate-300 rounded border border-[#1E2330]" title="По центру">
                      <Maximize2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Visual Display Content */}
              <div className="flex-1 w-full bg-[#090A0F] relative overflow-hidden">
                {visualType === 'd3' ? (
                  <>
                    <svg ref={svgRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />
                    {/* Floating Selected Node Quick Info Overlay */}
                    {selectedEntity && (
                      <div className="absolute bottom-3 left-3 bg-[#111318] border border-[#1E2330] p-2.5 rounded shadow-xl flex items-center space-x-3 text-xs max-w-md">
                        <div className="p-2 bg-[#161922] rounded text-blue-400 border border-[#1E2330]">
                          {selectedEntity.isEnum ? <Tag size={15} /> : <Table size={15} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-semibold text-slate-100 truncate">{selectedEntity.name}</span>
                            <span className={`px-1.5 py-0.2 text-[9px] rounded border ${selectedBadge.bg}`}>
                              {selectedBadge.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate font-mono">
                            {selectedEntity.isEnum ? `${selectedEntity.enumValues?.length || 0} значений` : `${selectedEntity.attributes?.length || 0} колонок`}
                          </p>
                        </div>
                        <button
                          onClick={() => setMainMode('table')}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-[11px] shrink-0 transition"
                        >
                          Состав
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 h-full overflow-auto">
                    <MermaidViewer
                      chart={activeModel.erDiagramMermaid || sampleDataModel.erDiagramMermaid}
                      plantUmlCode={activeModel.erDiagramPlantUml || sampleDataModel.erDiagramPlantUml}
                      title="ER Диаграмма сущностей и связей (ERD)"
                      className="h-full"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
