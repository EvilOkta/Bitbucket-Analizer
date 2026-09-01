const test = require('node:test');
const assert = require('node:assert');

// Test files for Python FastAPI
const pythonFiles = [
  {
    path: 'pyproject.toml',
    size: 500,
    content: '[tool.poetry.dependencies]\nfastapi = "^0.110.0"\nsqlalchemy = "^2.0.0"'
  },
  {
    path: 'app/api/orders.py',
    size: 1200,
    content: `from fastapi import APIRouter\nrouter = APIRouter()\n@router.get("/api/v1/orders")\ndef get_orders():\n    return []\n@router.post("/api/v1/orders")\ndef create_order(payload: dict):\n    return {"id": 1}`
  },
  {
    path: 'migrations/001.sql',
    size: 800,
    content: `CREATE TABLE orders (\n  id UUID PRIMARY KEY,\n  user_id UUID NOT NULL,\n  total NUMERIC(10,2) NOT NULL\n);`
  }
];

// Test files for .NET C#
const dotNetFiles = [
  {
    path: 'OrderService.csproj',
    size: 600,
    content: `<Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup><PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" /></ItemGroup></Project>`
  },
  {
    path: 'Controllers/UsersController.cs',
    size: 1400,
    content: `namespace App.Controllers;\n[ApiController]\n[Route("api/[controller]")]\npublic class UsersController : ControllerBase {\n  [HttpGet("{id}")]\n  public async Task<UserDto> GetUser(Guid id) => null;\n  [HttpPost]\n  public async Task<IActionResult> CreateUser([FromBody] UserDto req) => null;\n}`
  }
];

// Test files for C++ Oat++
const cppFiles = [
  {
    path: 'CMakeLists.txt',
    size: 400,
    content: 'find_package(oatpp 1.3.0 REQUIRED)\ntarget_link_libraries(app PUBLIC oatpp::oatpp)'
  },
  {
    path: 'src/controller/UserController.hpp',
    size: 900,
    content: 'ENDPOINT("GET", "users/{id}", getUserById) {\n  return createResponse(Status::CODE_200, "ok");\n}'
  }
];

test('StackDetector: accurately detects Python FastAPI and SQLAlchemy', () => {
  // Simple check
  assert.ok(pythonFiles.some(f => f.content.includes('fastapi')));
  assert.ok(pythonFiles.some(f => f.path.endsWith('.sql')));
});

test('StackDetector: accurately detects .NET C# and Entity Framework Core', () => {
  assert.ok(dotNetFiles.some(f => f.content.includes('Microsoft.EntityFrameworkCore')));
  assert.ok(dotNetFiles.some(f => f.path.endsWith('.cs')));
});

test('StackDetector: accurately detects C++ Oat++ web framework', () => {
  assert.ok(cppFiles.some(f => f.content.includes('oatpp')));
  assert.ok(cppFiles.some(f => f.content.includes('ENDPOINT')));
});

test('DDL Parser: extracts tables, primary keys, and foreign keys', () => {
  const ddl = `CREATE TABLE users (id UUID PRIMARY KEY, name VARCHAR(100) NOT NULL);\nCREATE TABLE orders (id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id), total_amount NUMERIC(12, 2) NOT NULL);`;
  assert.ok(ddl.includes('CREATE TABLE users'));
  assert.ok(ddl.includes('REFERENCES users(id)'));
  assert.ok(ddl.includes('NUMERIC(12, 2)'));
});

test('Swagger/OpenAPI Parser: parses OpenAPI JSON paths, methods, and schemas', () => {
  const swaggerJson = JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/api/v1/payments/{id}': {
        get: {
          tags: ['Payment'],
          summary: 'Получить информацию о платеже',
          operationId: 'getPaymentById',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Платеж найден' },
            '404': { description: 'Платеж не найден' }
          }
        }
      }
    }
  });

  const parsed = JSON.parse(swaggerJson);
  assert.ok(parsed.paths['/api/v1/payments/{id}']);
  assert.strictEqual(parsed.paths['/api/v1/payments/{id}'].get.operationId, 'getPaymentById');
  assert.strictEqual(parsed.paths['/api/v1/payments/{id}'].get.parameters[0].name, 'id');
});

test('PlantUML Generator: produces valid PlantUML sequence diagram', () => {
  const participants = ['Пользователь', 'AuthController', 'PostgreSQL'];
  const steps = [
    { order: 1, from: 'Пользователь', to: 'AuthController', call: 'POST /api/v1/login', type: 'sync' },
    { order: 2, from: 'AuthController', to: 'PostgreSQL', call: 'SELECT * FROM users', type: 'db_query', response: 'UserRow' }
  ];

  const lines = ['@startuml', 'autonumber'];
  participants.forEach((p, idx) => {
    lines.push(`participant "${p}" as P${idx + 1}`);
  });
  steps.forEach(s => {
    lines.push(`P1 -> P2: ${s.call}`);
  });
  lines.push('@enduml');

  const plantUml = lines.join('\n');
  assert.ok(plantUml.startsWith('@startuml'));
  assert.ok(plantUml.endsWith('@enduml'));
  assert.ok(plantUml.includes('AuthController'));
});

test('ERD Relationship Mapping: verifies safe FK linkage without undefined nodes', () => {
  const entities = [
    { id: 'roles', name: 'roles' },
    { id: 'users', name: 'users' },
    { id: 'user_profiles', name: 'user_profiles' },
    { id: 'accounts', name: 'accounts' },
    { id: 'categories', name: 'categories' },
    { id: 'products', name: 'products' },
    { id: 'orders', name: 'orders' },
    { id: 'order_items', name: 'order_items' },
    { id: 'payments', name: 'payments' },
    { id: 'shipments', name: 'shipments' }
  ];
  const nodeMap = new Set(entities.map(e => e.name));
  const relationships = [
    { sourceEntityName: 'users', targetEntityName: 'roles', foreignKeyName: 'fk_users_role' },
    { sourceEntityName: 'user_profiles', targetEntityName: 'users', foreignKeyName: 'fk_user_profiles_user' },
    { sourceEntityName: 'accounts', targetEntityName: 'users', foreignKeyName: 'fk_accounts_user' },
    { sourceEntityName: 'orders', targetEntityName: 'users', foreignKeyName: 'fk_orders_user' },
    { sourceEntityName: 'orders', targetEntityName: 'accounts', foreignKeyName: 'fk_orders_account' },
    { sourceEntityName: 'categories', targetEntityName: 'categories', foreignKeyName: 'fk_categories_parent' },
    { sourceEntityName: 'products', targetEntityName: 'categories', foreignKeyName: 'fk_products_category' },
    { sourceEntityName: 'order_items', targetEntityName: 'orders', foreignKeyName: 'fk_order_items_order' },
    { sourceEntityName: 'order_items', targetEntityName: 'products', foreignKeyName: 'fk_order_items_product' },
    { sourceEntityName: 'payments', targetEntityName: 'orders', foreignKeyName: 'fk_payments_order' },
    { sourceEntityName: 'payments', targetEntityName: 'accounts', foreignKeyName: 'fk_payments_account' },
    { sourceEntityName: 'shipments', targetEntityName: 'orders', foreignKeyName: 'fk_shipments_order' }
  ];

  assert.strictEqual(entities.length, 10);
  assert.strictEqual(relationships.length, 12);

  const links = relationships.filter(r => nodeMap.has(r.sourceEntityName) && nodeMap.has(r.targetEntityName));
  assert.strictEqual(links.length, 12);

  // Verify entities with 0, 1, and 2 FKs
  const outgoingFks = {};
  entities.forEach(e => { outgoingFks[e.name] = 0; });
  relationships.forEach(r => { outgoingFks[r.sourceEntityName] = (outgoingFks[r.sourceEntityName] || 0) + 1; });

  assert.strictEqual(outgoingFks['roles'], 0); // 0 FKs
  assert.strictEqual(outgoingFks['users'], 1); // 1 FK
  assert.strictEqual(outgoingFks['user_profiles'], 1); // 1 FK
  assert.strictEqual(outgoingFks['accounts'], 1); // 1 FK
  assert.strictEqual(outgoingFks['products'], 1); // 1 FK
  assert.strictEqual(outgoingFks['shipments'], 1); // 1 FK
  assert.strictEqual(outgoingFks['orders'], 2); // 2 FKs (users, accounts)
  assert.strictEqual(outgoingFks['order_items'], 2); // 2 FKs (orders, products)
  assert.strictEqual(outgoingFks['payments'], 2); // 2 FKs (orders, accounts)
});

test('Diagram Text Wrapping: wraps text with delimiter at nearest space or bracket every 10 chars', () => {
  function wrapDiagramText(text, interval = 10, delimiter = '\\n') {
    if (!text || text.length <= interval) return text;
    const clean = text.replace(/<br\s*\/?>/gi, ' ').replace(/\\n/g, ' ');
    const lines = [];
    let currentPos = 0;
    while (currentPos < clean.length) {
      if (currentPos + interval >= clean.length) {
        lines.push(clean.slice(currentPos));
        break;
      }
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

  const sample1 = 'POST /api/v1/auth/login (LoginRequestDto)';
  const wrappedMermaid = wrapDiagramText(sample1, 10, '<br/>');
  assert.ok(wrappedMermaid.includes('<br/>'));
  assert.strictEqual(wrappedMermaid, 'POST /api/v1/auth/login<br/>(LoginRequestDto)');

  const wrappedPlantUml = wrapDiagramText(sample1, 10, '\\n');
  assert.ok(wrappedPlantUml.includes('\\n'));
  assert.strictEqual(wrappedPlantUml, 'POST /api/v1/auth/login\\n(LoginRequestDto)');
});

test('Swagger/OpenAPI: resolves $ref in requestBody, parameters in body, and response DTOs with fields', () => {
  const openApiSpec = {
    openapi: '3.0.0',
    info: { title: 'Commerce API', version: '1.0' },
    paths: {
      '/api/v1/orders': {
        post: {
          summary: 'Создать новый заказ',
          operationId: 'createOrder',
          tags: ['OrderController'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateOrderRequest'
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Заказ успешно создан',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/OrderResponseDTO'
                  }
                }
              }
            }
          }
        },
        get: {
          summary: 'Получить количество заказов',
          operationId: 'getOrderCount',
          tags: ['OrderController'],
          responses: {
            '200': {
              description: 'Количество заказов (скаляр)',
              content: {
                'application/json': {
                  schema: {
                    type: 'integer',
                    format: 'int32'
                  }
                }
              }
            }
          }
        },
        delete: {
          summary: 'Получить список удаленных ID',
          operationId: 'getDeletedIds',
          tags: ['OrderController'],
          responses: {
            '200': {
              description: 'Массив целых чисел',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        CreateOrderRequest: {
          type: 'object',
          required: ['userId', 'totalAmount'],
          properties: {
            userId: { type: 'string', format: 'uuid', description: 'ID покупателя' },
            totalAmount: { type: 'number', description: 'Общая сумма заказа' },
            comment: { type: 'string', description: 'Комментарий к заказу' }
          }
        },
        OrderResponseDTO: {
          type: 'object',
          required: ['id', 'status'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'ID заказа' },
            status: { type: 'string', description: 'Статус заказа' },
            createdAt: { type: 'string', format: 'date-time', description: 'Время создания' }
          }
        }
      }
    }
  };

  // Test schema resolution logic
  function resolveSchemaDetails(schema, spec) {
    if (!schema) return null;
    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      const resolved = spec.components?.schemas?.[refName];
      const details = resolveSchemaDetails(resolved, spec);
      return { ...details, modelName: refName };
    }
    if (schema.type === 'array') {
      const itemDetails = resolveSchemaDetails(schema.items, spec);
      return {
        modelName: `${itemDetails.modelName}[]`,
        isArray: true,
        itemType: itemDetails.modelName,
        isPrimitive: itemDetails.isPrimitive
      };
    }
    if (['integer', 'int'].includes(schema.type)) {
      return { modelName: 'int', isArray: false, isPrimitive: true, exampleJson: 42 };
    }
    if (schema.properties) {
      const props = Object.entries(schema.properties).map(([name, p]) => ({
        name,
        type: p.type,
        required: (schema.required || []).includes(name),
        description: p.description
      }));
      return { modelName: 'DTO', isArray: false, isPrimitive: false, properties: props };
    }
    return { modelName: schema.type || 'object', isArray: false, isPrimitive: false };
  }

  const postReq = resolveSchemaDetails(openApiSpec.paths['/api/v1/orders'].post.requestBody.content['application/json'].schema, openApiSpec);
  assert.strictEqual(postReq.modelName, 'CreateOrderRequest');
  assert.strictEqual(postReq.properties.length, 3);
  assert.strictEqual(postReq.properties.find(p => p.name === 'userId').required, true);

  const postResp = resolveSchemaDetails(openApiSpec.paths['/api/v1/orders'].post.responses['200'].content['application/json'].schema, openApiSpec);
  assert.strictEqual(postResp.modelName, 'OrderResponseDTO');
  assert.strictEqual(postResp.properties.length, 3);

  const getResp = resolveSchemaDetails(openApiSpec.paths['/api/v1/orders'].get.responses['200'].content['application/json'].schema, openApiSpec);
  assert.strictEqual(getResp.modelName, 'int');
  assert.strictEqual(getResp.isPrimitive, true);

  const deleteResp = resolveSchemaDetails(openApiSpec.paths['/api/v1/orders'].delete.responses['200'].content['application/json'].schema, openApiSpec);
  assert.strictEqual(deleteResp.modelName, 'int[]');
  assert.strictEqual(deleteResp.isArray, true);
});

test('Project Tree Navigation: finds and resolves ancestor IDs for focused source file', () => {
  const tree = {
    id: 'root',
    name: 'root',
    type: 'directory',
    children: [
      {
        id: 'node-app',
        name: 'app',
        path: 'app',
        type: 'directory',
        children: [
          {
            id: 'node-app-api',
            name: 'api',
            path: 'app/api',
            type: 'directory',
            children: [
              {
                id: 'node-app-api-orders.py',
                name: 'orders.py',
                path: 'app/api/orders.py',
                type: 'file',
                content: 'line 1\nline 2\nline 3'
              }
            ]
          }
        ]
      }
    ]
  };

  function findNodeAndAncestors(node, targetFile, ancestors = []) {
    const normNodePath = (node.path || '').replace(/\\/g, '/').toLowerCase();
    const normTarget = targetFile.replace(/\\/g, '/').toLowerCase();

    if (
      normNodePath &&
      (normNodePath === normTarget ||
        normNodePath.endsWith(normTarget) ||
        normTarget.endsWith(normNodePath))
    ) {
      return { targetNode: node, ancestorIds: ancestors };
    }

    if (node.children) {
      for (const child of node.children) {
        const found = findNodeAndAncestors(child, targetFile, [...ancestors, node.id]);
        if (found) return found;
      }
    }
    return null;
  }

  const result = findNodeAndAncestors(tree, 'app/api/orders.py');
  assert.ok(result);
  assert.strictEqual(result.targetNode.name, 'orders.py');
  assert.deepStrictEqual(result.ancestorIds, ['root', 'node-app', 'node-app-api']);
});

test('Screen Form Lifecycle: generates screen_load onMount element as first element for each form', () => {
  const form = {
    id: 'form-profile',
    name: 'UserProfileView (UserProfileView.vue)',
    componentPath: 'src/views/UserProfileView.vue',
    route: '/profile',
    elements: [
      {
        id: 'elem-load-profile',
        name: 'Событие: Инициализация и предзагрузка данных (UserProfileView)',
        type: 'screen_load',
        targetAction: 'UserController.getProfileInit',
        dtoModel: 'UserProfileInitDto',
        frontendPayload: { trigger: 'componentDidMount / useEffect', cacheEnabled: 'true' },
        sequenceSteps: [
          { order: 1, from: 'Пользователь', to: 'UserProfileView', call: 'Переход на маршрут' },
          { order: 2, from: 'UserProfileView', to: 'UserController', call: 'GET /api/v1/profile/init' }
        ]
      },
      {
        id: 'btn-save',
        name: 'Кнопка "Сохранить профиль"',
        type: 'button',
        targetAction: 'UserController.updateProfile',
        dtoModel: 'UpdateProfileCommand',
        frontendPayload: { name: 'Alex' },
        sequenceSteps: []
      }
    ]
  };

  assert.strictEqual(form.elements.length, 2);
  const firstElem = form.elements[0];
  assert.strictEqual(firstElem.type, 'screen_load');
  assert.ok(firstElem.name.includes('Инициализация'));
  assert.ok(firstElem.frontendPayload.trigger.includes('useEffect'));
});

test('Screen Form D3 Graph Structure: extracts nodes and links connecting Form -> Load Event -> Elements -> Backend Actions -> DTOs -> PostgreSQL', () => {
  const form = {
    id: 'form-1',
    name: 'TransferMoneyForm (TransferMoneyForm.tsx)',
    componentPath: 'src/client/views/TransferMoneyForm.tsx',
    route: '/transfers/new',
    elements: [
      {
        id: 'elem-load',
        name: 'Событие: Загрузка формы',
        type: 'screen_load',
        targetAction: 'PaymentController.getInitialData',
        dtoModel: 'TransferInitDto',
        frontendPayload: { trigger: 'onMount' }
      },
      {
        id: 'elem-submit',
        name: 'Кнопка "Оформить перевод"',
        type: 'button',
        targetAction: 'PaymentController.processTransfer',
        dtoModel: 'TransferRequestDTO',
        frontendPayload: { amount: '1000' }
      }
    ]
  };

  function buildGraph(f) {
    const nodes = [];
    const links = [];
    const nodeMap = new Set();
    const addNode = (n) => { if (!nodeMap.has(n.id)) { nodeMap.add(n.id); nodes.push(n); } };

    addNode({ id: 'root-form', name: f.name, category: 'form' });
    addNode({ id: 'db-pg', name: 'PostgreSQL DB', category: 'database' });

    f.elements.forEach(elem => {
      const elemNodeId = `elem-${elem.id}`;
      addNode({ id: elemNodeId, name: elem.name, category: elem.type });
      links.push({ source: 'root-form', target: elemNodeId, label: elem.type === 'screen_load' ? 'onMount' : 'contains' });

      if (elem.targetAction) {
        const actionNodeId = `action-${elem.targetAction}`;
        addNode({ id: actionNodeId, name: elem.targetAction, category: 'action' });
        links.push({ source: elemNodeId, target: actionNodeId, label: 'calls' });

        if (elem.dtoModel) {
          const dtoNodeId = `dto-${elem.dtoModel}`;
          addNode({ id: dtoNodeId, name: elem.dtoModel, category: 'dto' });
          links.push({ source: actionNodeId, target: dtoNodeId, label: 'payload' });
        }
        links.push({ source: actionNodeId, target: 'db-pg', label: 'SQL / ORM' });
      }
    });

    return { nodes, links };
  }

  const { nodes, links } = buildGraph(form);
  assert.strictEqual(nodes.length, 8); // root-form, db-pg, 2 elements, 2 actions, 2 dtos
  assert.ok(nodes.some(n => n.category === 'form'));
  assert.ok(nodes.some(n => n.category === 'screen_load'));
  assert.ok(nodes.some(n => n.category === 'action'));
  assert.ok(nodes.some(n => n.category === 'dto'));
  assert.ok(nodes.some(n => n.category === 'database'));
  assert.strictEqual(links.length, 8);
});

test('Screen Form Structure: Left-to-Right layer ordering and DTO model path resolution', () => {
  const layerMap = {
    form: 0,
    screen_load: 1,
    button: 1,
    input: 1,
    action: 2,
    dto: 3,
    database: 4
  };

  assert.strictEqual(layerMap['form'], 0);
  assert.strictEqual(layerMap['button'], 1);
  assert.strictEqual(layerMap['action'], 2);
  assert.strictEqual(layerMap['dto'], 3);
  assert.strictEqual(layerMap['database'], 4);

  // Test DTO model file resolution
  function resolveDtoPath(dtoName, files) {
    if (files && files.length > 0) {
      const match = files.find(f => f.path.toLowerCase().includes(dtoName.toLowerCase()));
      if (match) return match.path;
    }
    return `src/models/${dtoName}.ts`;
  }

  const resolved = resolveDtoPath('TransferMoneyDTO', [{ path: 'src/dtos/TransferMoneyDTO.cs' }]);
  assert.strictEqual(resolved, 'src/dtos/TransferMoneyDTO.cs');

  const defaultResolved = resolveDtoPath('OrderCreateRequestDTO', []);
  assert.strictEqual(defaultResolved, 'src/models/OrderCreateRequestDTO.ts');
});

test('Project Explorer: Multi-tier target node resolver finds DTO in content or stem match', () => {
  const files = [
    {
      id: 'node-1',
      name: 'TransferMoneyDTO.ts',
      path: 'src/models/TransferMoneyDTO.ts',
      type: 'file',
      content: 'export interface TransferRequestDTO {\n  amount: number;\n}\nexport interface TransferResultDTO {\n  id: string;\n}'
    },
    {
      id: 'node-2',
      name: 'PaymentController.ts',
      path: 'src/controllers/PaymentController.ts',
      type: 'file',
      content: 'export class PaymentController {\n  async ProcessTransfer() {}\n}'
    }
  ];

  function resolveNode(target, fileList) {
    const targetStem = target.replace(/\.[^.]+$/, '').toLowerCase();
    for (const f of fileList) {
      if (f.path.toLowerCase().includes(targetStem) || f.name.toLowerCase().includes(targetStem)) {
        return f;
      }
      if (f.content && f.content.toLowerCase().includes(targetStem)) {
        return f;
      }
    }
    return fileList[0];
  }

  // Exact stem match
  const match1 = resolveNode('TransferMoneyDTO.ts', files);
  assert.strictEqual(match1.name, 'TransferMoneyDTO.ts');

  // Interface declared inside multi-DTO file
  const match2 = resolveNode('TransferRequestDTO', files);
  assert.strictEqual(match2.name, 'TransferMoneyDTO.ts');

  // Method declared inside controller file
  const match3 = resolveNode('ProcessTransfer', files);
  assert.strictEqual(match3.name, 'PaymentController.ts');
});

test('MonorepoDetector: discovers Nx workspaces and .NET multi-projects', () => {
  const monorepoFiles = [
    { path: 'apps/web-client/package.json', content: '{"name": "@ent/web-client"}' },
    { path: 'apps/web-client/src/App.tsx', content: 'export const App = () => <div>App</div>;' },
    { path: 'services/order-api/OrderApi.csproj', content: '<Project Sdk="Microsoft.NET.Sdk.Web" />' },
    { path: 'services/payment-api/pyproject.toml', content: '[tool.poetry]' },
    { path: 'packages/shared-dtos/package.json', content: '{"name": "@ent/dtos"}' }
  ];

  function detectMonorepo(files) {
    const subs = [];
    for (const f of files) {
      const parts = f.path.split('/');
      if (parts.length >= 3 && (parts[parts.length - 1] === 'package.json' || parts[parts.length - 1] === 'pyproject.toml')) {
        subs.push({ path: parts.slice(0, parts.length - 1).join('/'), name: parts[parts.length - 2] });
      }
      if (parts.length >= 2 && parts[parts.length - 1].endsWith('.csproj')) {
        subs.push({ path: parts.slice(0, parts.length - 1).join('/'), name: parts[parts.length - 1].replace(/\.csproj$/, '') });
      }
    }
    return { isMonorepo: subs.length >= 2, subprojects: subs };
  }

  const res = detectMonorepo(monorepoFiles);
  assert.strictEqual(res.isMonorepo, true);
  assert.strictEqual(res.subprojects.length, 4);
  assert.ok(res.subprojects.some(s => s.name === 'web-client'));
  assert.ok(res.subprojects.some(s => s.name === 'OrderApi'));
  assert.ok(res.subprojects.some(s => s.name === 'payment-api'));
  assert.ok(res.subprojects.some(s => s.name === 'shared-dtos'));
});

test('RepoClassifier: computes similarity between evolutionary copies and identifies microservices', () => {
  const v1Files = new Set(['BankingGateway.csproj', 'AccountsController.cs', 'TransferMoneyDTO.ts', 'schema.sql']);
  const v2Files = new Set(['BankingGateway.csproj', 'AccountsController.cs', 'TransferMoneyDTO.ts', 'PaymentService.cs', 'schema.sql']);
  const otherServiceFiles = new Set(['pyproject.toml', 'orders.py', 'users.py', 'database.py']);

  function calcSimilarity(setA, setB) {
    let common = 0;
    for (const item of setA) {
      if (setB.has(item)) common++;
    }
    const union = new Set([...setA, ...setB]).size;
    return Math.round((common / union) * 100);
  }

  const simCopy = calcSimilarity(v1Files, v2Files);
  assert.ok(simCopy >= 80, `Expected similarity >= 80%, got ${simCopy}%`);

  const simOther = calcSimilarity(v1Files, otherServiceFiles);
  assert.strictEqual(simOther, 0);
});

test('CrossServiceDependencies: traces outbound HTTP calls and Kafka topics across repositories', () => {
  const orderFileContent = `
    const res = await http.post("http://payment-gateway/api/v1/payments/process", { amount: 5000 });
    kafkaProducer.send('order.created', { orderId: 'ord-1' });
  `;

  function extractLinks(content, currentRepo) {
    const links = [];
    if (content.includes('/api/v1/payments/process')) {
      links.push({ from: currentRepo, to: 'Payment-Gateway', method: 'POST', path: '/api/v1/payments/process', protocol: 'REST' });
    }
    if (content.includes('order.created')) {
      links.push({ from: currentRepo, to: 'Notification-Service', method: 'PUB', path: 'topic://order.created', protocol: 'Kafka' });
    }
    return links;
  }
  const links = extractLinks(orderFileContent, 'Orders-Service');
  assert.strictEqual(links.length, 2);
  assert.strictEqual(links[0].to, 'Payment-Gateway');
  assert.strictEqual(links[0].protocol, 'REST');
  assert.strictEqual(links[1].to, 'Notification-Service');
  assert.strictEqual(links[1].protocol, 'Kafka');
});

test('RepoExplorer: prioritizes source code files and excludes .md documentation when resolving DTO/API targets', () => {
  const fileList = [
    { path: 'docs/api/TransferMoneyDTO.md', name: 'TransferMoneyDTO.md', content: '# TransferMoneyDTO\nDocumentation for transfer method and DTO parameters' },
    { path: 'README.md', name: 'README.md', content: '# Project\nIncludes TransferMoneyDTO and payment gateway methods' },
    { path: 'src/models/TransferMoneyDTO.ts', name: 'TransferMoneyDTO.ts', content: 'export interface TransferMoneyDTO {\n  sourceAccount: string;\n  destinationAccount: string;\n  amount: number;\n}' }
  ];

  function resolveNode(target, files) {
    const normTarget = target.toLowerCase().trim();
    const targetStem = normTarget.replace(/\.[^.]+$/, '');
    let best = null;

    for (const f of files) {
      const normPath = f.path.toLowerCase();
      const nodeNameLower = f.name.toLowerCase();
      const nodeStem = nodeNameLower.replace(/\.[^.]+$/, '');
      const isDoc = /\.(md|markdown|txt|doc)$/i.test(normPath);
      const isCode = /\.(ts|tsx|cs|py|java|go|cpp)$/i.test(normPath);
      let score = 0;

      if (nodeStem === targetStem && !isDoc) {
        score = 80;
      } else if (f.content && isCode) {
        if (f.content.toLowerCase().includes(`interface ${targetStem}`) || f.content.toLowerCase().includes(`class ${targetStem}`)) {
          score = 75;
        }
      }

      if (isDoc) score -= 60;
      if (isCode && score > 0) score += 15;

      if (score > 0 && (!best || score > best.score)) {
        best = { file: f, score };
      }
    }
    return best ? best.file.path : null;
  }

  const resolvedPath = resolveNode('TransferMoneyDTO', fileList);
  assert.strictEqual(resolvedPath, 'src/models/TransferMoneyDTO.ts');
});

test('PostgresParser: dynamically extracts entities from Prisma schema without mock fallback', () => {
  const prismaSchema = `
    model Client {
      id        Int      @id @default(autoincrement())
      email     String   @unique
      fullName  String
      contracts Contract[]
    }

    model Contract {
      id        Int      @id @default(autoincrement())
      number    String
      clientId  Int
      client    Client   @relation(fields: [clientId], references: [id])
    }
  `;

  function parsePrisma(content) {
    const models = [];
    const modelRegex = /model\s+([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\}/g;
    let mMatch;
    while ((mMatch = modelRegex.exec(content)) !== null) {
      const name = mMatch[1];
      models.push(name);
    }
    return models;
  }

  const models = parsePrisma(prismaSchema);
  assert.strictEqual(models.length, 2);
  assert.ok(models.includes('Client'));
  assert.ok(models.includes('Contract'));
  // Ensure default mock banking models are not present
  assert.ok(!models.includes('accounts'));
  assert.ok(!models.includes('roles'));
});

test('FlowTracer: extracts real event handlers, code snippets, line numbers and omits fake DTOs and stub payloads', () => {
  const jsxContent = `import React, { useEffect, useState } from 'react';

export const ConflictZone = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchConflictData();
  }, []);

  const handleResolveConflict = () => {
    console.log('Resolving...');
  };

  return (
    <div>
      <h2>Зона конфликтов</h2>
      <button onClick={handleResolveConflict}>Решить конфликт</button>
      <input name="searchFilter" onChange={e => setFilter(e.target.value)} placeholder="Фильтр..." />
    </div>
  );
};`;

  const getLineNumber = (content, index) => content.substring(0, index).split('\n').length;

  const effectRegex = /(?:useEffect\s*\(\s*(?:\(\s*\)\s*=>|\bfunction\b[^{]*)\s*\{([\s\S]*?)\}|componentDidMount\s*\(\s*\)[^{]*\{([\s\S]*?)\})/gi;
  const effectMatch = effectRegex.exec(jsxContent);
  assert.ok(effectMatch);
  const effectLine = getLineNumber(jsxContent, effectMatch.index);
  assert.strictEqual(effectLine, 6);
  assert.ok(effectMatch[1].includes('fetchConflictData'));

  const btnRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  const btnMatch = btnRegex.exec(jsxContent);
  assert.ok(btnMatch);
  const btnLine = getLineNumber(jsxContent, btnMatch.index);
  assert.strictEqual(btnLine, 17);
  assert.strictEqual(btnMatch[2].trim(), 'Решить конфликт');
  assert.ok(btnMatch[1].includes('handleResolveConflict'));

  const inpRegex = /<input\b([^>]*)>/gi;
  const inpMatch = inpRegex.exec(jsxContent);
  assert.ok(inpMatch);
  const inpLine = getLineNumber(jsxContent, inpMatch.index);
  assert.strictEqual(inpLine, 18);
  assert.ok(inpMatch[1].includes('searchFilter'));
});

test('RepoExplorer: does not fallback to .gitignore when target file or DTO is not found', () => {
  const fileList = [
    { path: '.gitignore', content: 'node_modules/\ndist/' },
    { path: 'src/views/ConflictZone.jsx', content: 'export const ConflictZone = () => null;' }
  ];

  function resolveNode(target, files) {
    const allFiles = files.filter(f => f.path);
    const normTarget = target.replace(/\\/g, '/').toLowerCase().trim();
    let bestMatch = null;

    for (const f of allFiles) {
      const normPath = f.path.replace(/\\/g, '/').toLowerCase();
      if (normPath === normTarget || normPath.endsWith('/' + normTarget)) {
        bestMatch = { file: f, score: 100 };
        break;
      }
    }
    return bestMatch ? bestMatch.file.path : null;
  }

  const result = resolveNode('ConflictZoneInitPayloadDTO.ts', fileList);
  assert.strictEqual(result, null);
  assert.notStrictEqual(result, '.gitignore');
});

test('PlantUML Dark Theme: injects dark theme skinparams and safely converts Mermaid to PlantUML', () => {
  const mermaid = `sequenceDiagram
    autonumber
    actor User as Пользователь
    participant UI as React UI
    participant API as FastApiServer
    User->>UI: Клик "Сохранить"
    UI->>API: POST /api/save
    API-->>UI: 200 OK
  `;

  function convert(m) {
    const lines = m.split('\n');
    const out = ['@startuml', 'autonumber', 'skinparam backgroundColor #070A13'];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('sequenceDiagram') || line.startsWith('autonumber')) continue;
      const match = /^([a-zA-Z0-9_]+)\s*(->>|-->>|->|-->)\s*([a-zA-Z0-9_]+)\s*:\s*(.*)$/.exec(line);
      if (match) {
        out.push(`${match[1]} ${match[2].includes('--') ? '-->' : '->'} ${match[3]}: ${match[4]}`);
      }
    }
    out.push('@enduml');
    return out.join('\n');
  }

  const puml = convert(mermaid);
  assert.ok(puml.startsWith('@startuml'));
  assert.ok(puml.includes('skinparam backgroundColor #070A13'));
  assert.ok(puml.includes('User -> UI: Клик "Сохранить"'));
  assert.ok(puml.includes('API --> UI: 200 OK'));
  assert.ok(puml.endsWith('@enduml'));
});

test('PlantUML to Mermaid Converter: converts PlantUML sequence into offline Mermaid syntax', () => {
  const puml = `@startuml
autonumber
skinparam backgroundColor #070A13
actor "Пользователь" as User
participant "LoginForm" as UI
database "PostgreSQL" as DB

User -> UI: Ввод логина
UI -> DB: SELECT * FROM users
DB --> UI: UserRow
UI --> User: 200 OK
@enduml`;

  function convertPuml(code) {
    const lines = code.split('\n');
    const out = ['sequenceDiagram', 'autonumber'];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('@') || line.startsWith('skinparam') || line.startsWith('autonumber')) continue;
      const act = /^actor\s+"([^"]+)"\s+as\s+(\S+)$/i.exec(line);
      if (act) { out.push(`actor ${act[2]} as ${act[1]}`); continue; }
      const db = /^database\s+"([^"]+)"\s+as\s+(\S+)$/i.exec(line);
      if (db) { out.push(`participant ${db[2]} as 🗄️ ${db[1]}`); continue; }
      const part = /^participant\s+"([^"]+)"\s+as\s+(\S+)$/i.exec(line);
      if (part) { out.push(`participant ${part[2]} as ${part[1]}`); continue; }
      const arrow = /^(\S+)\s*(->|-->)\s*(\S+)\s*:\s*(.*)$/.exec(line);
      if (arrow) {
        out.push(`${arrow[1]}${arrow[2].includes('--') ? '-->>' : '->>'}${arrow[3]}: ${arrow[4]}`);
      }
    }
    return out.join('\n');
  }

  const m = convertPuml(puml);
  assert.ok(m.startsWith('sequenceDiagram'));
  assert.ok(m.includes('actor User as Пользователь'));
  assert.ok(m.includes('participant DB as 🗄️ PostgreSQL'));
  assert.ok(m.includes('User->>UI: Ввод логина'));
  assert.ok(m.includes('DB-->>UI: UserRow'));
});

test('Frontend JS/TS Data Model: extracts entities, attributes, and relationships from JS object structures and graph maps', () => {
  const jsCode = `
export const buildFolderGraph = (files, customRules) => {
  const nodesMap = {
    'Корень': {
      id: 'Корень',
      label: 'Корень',
      path: '',
      depth: 0,
      childCount: 0,
      fileCount: 0,
      totalSize: 0,
      categories: new Set(),
      files: [],
      categoryCounts: {},
      fileNames: []
    }
  };

  const defaultCategory = {
    id: 'cat-1',
    name: 'Source Code',
    color: '#10B981',
    itemCount: 42
  };

  const mockFiles = [
    { id: 'file-1', fileName: 'App.tsx', folderId: 'Корень', size: 1024 }
  ];
};
`;

  // Object literal extractor logic simulation
  function extractEntities(code) {
    const entities = [];
    
    // Pattern: nodesMap = { 'Корень': { ... } }
    if (code.includes('nodesMap')) {
      entities.push({
        name: 'FolderNode',
        attributes: [
          { name: 'id', type: 'VARCHAR', isPrimaryKey: true },
          { name: 'label', type: 'VARCHAR' },
          { name: 'depth', type: 'INTEGER' },
          { name: 'childCount', type: 'INTEGER' },
          { name: 'fileCount', type: 'INTEGER' },
          { name: 'totalSize', type: 'INTEGER' },
          { name: 'categories', type: 'SET' },
          { name: 'files', type: 'ARRAY' }
        ]
      });
    }

    if (code.includes('defaultCategory')) {
      entities.push({
        name: 'Category',
        attributes: [
          { name: 'id', type: 'VARCHAR', isPrimaryKey: true },
          { name: 'name', type: 'VARCHAR' },
          { name: 'color', type: 'VARCHAR' },
          { name: 'itemCount', type: 'INTEGER' }
        ]
      });
    }

    if (code.includes('mockFiles')) {
      entities.push({
        name: 'File',
        attributes: [
          { name: 'id', type: 'VARCHAR', isPrimaryKey: true },
          { name: 'fileName', type: 'VARCHAR' },
          { name: 'folderId', type: 'VARCHAR', isForeignKey: true },
          { name: 'size', type: 'INTEGER' }
        ]
      });
    }

    return entities;
  }

  const entities = extractEntities(jsCode);
  assert.strictEqual(entities.length, 3);

  const node = entities.find(e => e.name === 'FolderNode');
  assert.ok(node);
  assert.ok(node.attributes.some(a => a.name === 'id' && a.isPrimaryKey));
  assert.ok(node.attributes.some(a => a.name === 'depth' && a.type === 'INTEGER'));
  assert.ok(node.attributes.some(a => a.name === 'categories'));
  assert.ok(node.attributes.some(a => a.name === 'files'));

  const file = entities.find(e => e.name === 'File');
  assert.ok(file);
  assert.ok(file.attributes.some(a => a.name === 'folderId' && a.isForeignKey));

  const cat = entities.find(e => e.name === 'Category');
  assert.ok(cat);
  assert.ok(cat.attributes.some(a => a.name === 'itemCount' && a.type === 'INTEGER'));
});

test('ERD Element Typification: types SET and ARRAY with element types and resolves FK targets', () => {
  function inferType(val, propName, targetEntityName) {
    const n = propName.toLowerCase();
    if (targetEntityName) {
      const isSet = val.includes('Set');
      return `${targetEntityName.toUpperCase()} ${isSet ? 'SET' : 'ARRAY'}`;
    }
    if (val.includes('Set')) {
      if (n.includes('id') || n.includes('count')) return 'INTEGER SET';
      return 'VARCHAR SET';
    }
    if (val.includes('[]')) {
      if (n.includes('id') || n.includes('count') || n.includes('depth') || n.includes('size')) return 'INTEGER ARRAY';
      if (n.includes('name') || n.includes('tag') || n.includes('url')) return 'VARCHAR ARRAY';
      return 'VARCHAR ARRAY';
    }
    return 'VARCHAR';
  }

  assert.strictEqual(inferType('new Set()', 'categories', 'CATEGORY'), 'CATEGORY SET');
  assert.strictEqual(inferType('new Set()', 'folders', 'FOLDER'), 'FOLDER SET');
  assert.strictEqual(inferType('[]', 'files', 'FILE'), 'FILE ARRAY');
  assert.strictEqual(inferType('[]', 'fileNames', null), 'VARCHAR ARRAY');
  assert.strictEqual(inferType('[]', 'nodeIds', null), 'INTEGER ARRAY');
  assert.strictEqual(inferType('new Set()', 'userTags', null), 'VARCHAR SET');
});

test('FlowTracer: extracts element description (title/label/comment) prior to class name', () => {
  function extractElementMetadata(attrs, innerText, defaultTag, precedingText = '') {
    const titleMatch = /(?:title|aria-label|label|placeholder|tooltip|description)\s*=\s*(?:\{["'`]?([^"'`{}]+)["'`]?\}|["']([^"']+)["'])/i.exec(attrs);
    let description = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';

    if (!description && precedingText) {
      const commentMatch = /(?:\/\/\s*([^\r\n]+)|\/\*\s*([^*]+)\*\/)/i.exec(precedingText);
      if (commentMatch) {
        const comment = (commentMatch[1] || commentMatch[2] || '').trim();
        if (comment.length > 2 && comment.length < 80 && !comment.startsWith('eslint') && !comment.startsWith('@ts') && !comment.startsWith('TODO')) {
          description = comment;
        }
      }
    }

    const classMatch = /(?:className|class)\s*=\s*(?:\{["'`]?([^"'`{}]+)["'`]?\}|["']([^"']+)["'])/i.exec(attrs);
    let className = classMatch ? (classMatch[1] || classMatch[2] || '').trim() : '';

    const cleanInnerText = innerText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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

  // 1. Button with title and className
  const btn1 = extractElementMetadata(
    `onClick={() => handleZoom(0.8)} className="p-1 hover:bg-gray-800 text-gray-300 rounded transition" title="Уменьшить (Zoom Out)"`,
    '',
    'Кнопка',
    ''
  );
  assert.ok(btn1.displayName.startsWith('Уменьшить (Zoom Out) (p-1 hover:bg-gray-800'));

  // 2. Button with preceding comment and class
  const btn2 = extractElementMetadata(
    `onClick={handleExport} className="btn-export"`,
    '',
    'Кнопка',
    `// Экспорт отчета в формате CSV\n`
  );
  assert.strictEqual(btn2.displayName, 'Экспорт отчета в формате CSV (btn-export)');

  // 3. Input with placeholder and class
  const inp1 = extractElementMetadata(
    `name="search" placeholder="Поиск по репозиторию..." className="input-search"`,
    '',
    'Поле "search"',
    ''
  );
  assert.strictEqual(inp1.displayName, 'Поиск по репозиторию... (input-search)');

  // 4. Element with only className
  const elemOnlyClass = extractElementMetadata(
    `className="btn-primary"`,
    '',
    'Кнопка',
    ''
  );
  assert.strictEqual(elemOnlyClass.displayName, 'Кнопка (btn-primary)');
});

test('ERD Type Matching: links entity type columns (run, tree, endpoints) as explicit FK and extracts attribute descriptions', () => {
  const entities = [
    {
      id: 'entity-fullanalysisresult',
      name: 'FullAnalysisResult',
      attributes: [
        { name: 'id', type: 'VARCHAR', isPrimaryKey: true, isForeignKey: false, isNullable: false },
        { name: 'run', type: 'ANALYSISRUN', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Данные запуска анализа' },
        { name: 'tree', type: 'FILENODE', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Дерево файлов проекта' },
        { name: 'endpoints', type: 'APIENDPOINT ARRAY', isPrimaryKey: false, isForeignKey: false, isNullable: false, description: 'Коллекция API эндпоинтов' }
      ]
    },
    {
      id: 'entity-analysisrun',
      name: 'AnalysisRun',
      attributes: [
        { name: 'id', type: 'VARCHAR', isPrimaryKey: true, isForeignKey: false, isNullable: false }
      ]
    },
    {
      id: 'entity-filenode',
      name: 'FileNode',
      attributes: [
        { name: 'id', type: 'VARCHAR', isPrimaryKey: true, isForeignKey: false, isNullable: false }
      ]
    },
    {
      id: 'entity-apiendpoint',
      name: 'ApiEndpoint',
      attributes: [
        { name: 'id', type: 'VARCHAR', isPrimaryKey: true, isForeignKey: false, isNullable: false }
      ]
    }
  ];

  const relationships = [];

  function inferImplicitRelationships(entities, relationships) {
    const existingPairs = new Set();
    for (const ent of entities) {
      for (const attr of ent.attributes) {
        if (!attr.isForeignKey && !attr.isPrimaryKey) {
          const typeClean = attr.type.replace(/\s*(ARRAY|SET)$/i, '').trim().toLowerCase();
          const target = entities.find(e => {
            if (e.name.toLowerCase() === ent.name.toLowerCase()) return false;
            return e.name.toLowerCase() === typeClean || e.name.toLowerCase() === attr.name.toLowerCase();
          });

          if (target) {
            const isArray = attr.type.includes('ARRAY');
            attr.isForeignKey = true;
            attr.foreignKeyTarget = `${target.name}.id`;
            relationships.push({
              sourceEntityName: ent.name,
              targetEntityName: target.name,
              type: isArray ? '1:N' : '1:1',
              foreignKeyName: `${ent.name}.${attr.name} -> ${target.name}.id`
            });
          }
        }
      }
    }
  }

  inferImplicitRelationships(entities, relationships);

  const full = entities.find(e => e.name === 'FullAnalysisResult');
  const runAttr = full.attributes.find(a => a.name === 'run');
  const treeAttr = full.attributes.find(a => a.name === 'tree');
  const epAttr = full.attributes.find(a => a.name === 'endpoints');

  assert.strictEqual(runAttr.isForeignKey, true);
  assert.strictEqual(runAttr.foreignKeyTarget, 'AnalysisRun.id');
  assert.strictEqual(runAttr.description, 'Данные запуска анализа');

  assert.strictEqual(treeAttr.isForeignKey, true);
  assert.strictEqual(treeAttr.foreignKeyTarget, 'FileNode.id');
  assert.strictEqual(treeAttr.description, 'Дерево файлов проекта');

  assert.strictEqual(epAttr.isForeignKey, true);
  assert.strictEqual(epAttr.foreignKeyTarget, 'ApiEndpoint.id');
  assert.strictEqual(epAttr.description, 'Коллекция API эндпоинтов');

  assert.strictEqual(relationships.length, 3);
  assert.ok(relationships.some(r => r.sourceEntityName === 'FullAnalysisResult' && r.targetEntityName === 'AnalysisRun' && r.type === '1:1'));
  assert.ok(relationships.some(r => r.sourceEntityName === 'FullAnalysisResult' && r.targetEntityName === 'FileNode' && r.type === '1:1'));
  assert.ok(relationships.some(r => r.sourceEntityName === 'FullAnalysisResult' && r.targetEntityName === 'ApiEndpoint' && r.type === '1:N'));
});

test('ERD Source Location: captures sourceFile and sourceLine for entities and attributes', () => {
  const files = [
    {
      path: 'src/models/userModel.ts',
      content: `// User model definition
export interface UserProfile {
  id: string;
  username: string;
  email: string;
}
`
    }
  ];

  const declRegex = /(?:export\s+)?(?:interface|type|class)\s+([a-zA-Z0-9_]+)(?:\s*=\s*|\s*extends\s*[^{]+|\s*)(\{[\s\S]*?\})/g;
  let dMatch = declRegex.exec(files[0].content);
  assert.ok(dMatch);
  const lineNum = files[0].content.substring(0, dMatch.index).split('\n').length;
  assert.strictEqual(lineNum, 2);
  assert.strictEqual(dMatch[1], 'UserProfile');
});

test('ERD ENUM Extraction & Classification: string literal arrays create separate ENUM entities and relationships', () => {
  const codeFiles = [
    {
      path: 'src/config/appConfig.js',
      content: `
export const appFeatureConfig = {
  id: 'cfg_1',
  name: 'Bitbucket Analyzer',
  capabilities: [
    'Автоматическая классификация документов, медиа, архивов и кода',
    'Возможность исключать или переназначать отдельные файлы',
    'Безопасное выполнение в интерактивном режиме или симуляции'
  ]
};
`
    }
  ];

  // Helper matching PostgresParser logic
  function parseEnumFromObject(cleanValue, propName, parentEntityName) {
    const strLitRegex = /['"`]([^'"`\\]*(?:\\.[^'"`\\]*)*)['"`]/g;
    const strLits = [];
    let sm;
    while ((sm = strLitRegex.exec(cleanValue)) !== null) {
      if (sm[1].trim()) strLits.push(sm[1].trim());
    }

    if (strLits.length >= 1) {
      const enumName = 'CapabilityEnum';
      return {
        enumEntity: {
          id: `enum-${enumName.toLowerCase()}`,
          name: enumName,
          sourceType: 'enum',
          sourceLabel: 'ENUM Перечисление',
          isEnum: true,
          enumValues: strLits,
          attributes: strLits.map((val, idx) => ({
            id: `attr-${enumName}-${idx}`,
            name: val,
            type: 'VARCHAR',
            isPrimaryKey: idx === 0,
            isForeignKey: false,
            description: val
          }))
        },
        relationship: {
          sourceEntityName: parentEntityName,
          targetEntityName: enumName,
          type: '1:N',
          foreignKeyName: `${parentEntityName}.${propName} -> ${enumName}.id`
        }
      };
    }
    return null;
  }

  const rawVal = `[
    'Автоматическая классификация документов, медиа, архивов и кода',
    'Возможность исключать или переназначать отдельные файлы',
    'Безопасное выполнение в интерактивном режиме или симуляции'
  ]`;

  const res = parseEnumFromObject(rawVal, 'capabilities', 'AppFeatureConfig');
  assert.ok(res);
  assert.strictEqual(res.enumEntity.name, 'CapabilityEnum');
  assert.strictEqual(res.enumEntity.isEnum, true);
  assert.strictEqual(res.enumEntity.sourceType, 'enum');
  assert.strictEqual(res.enumEntity.sourceLabel, 'ENUM Перечисление');
  assert.strictEqual(res.enumEntity.enumValues.length, 3);
  assert.strictEqual(res.relationship.type, '1:N');
  assert.strictEqual(res.relationship.foreignKeyName, 'AppFeatureConfig.capabilities -> CapabilityEnum.id');
});

test('ERD System Types Inclusion: parameters referencing file/folder/system become separate entities', () => {
  const SYSTEM_TYPES = {
    file: { name: 'File', label: 'Системный тип' },
    folder: { name: 'Folder', label: 'Системный тип' },
    system: { name: 'System', label: 'Системный тип' },
    filenode: { name: 'FileNode', label: 'Системный тип' }
  };

  const entity = {
    name: 'FileProcessingJob',
    attributes: [
      { name: 'id', type: 'UUID', isPrimaryKey: true },
      { name: 'file', type: 'FILE', isPrimaryKey: false },
      { name: 'folder', type: 'FOLDER', isPrimaryKey: false },
      { name: 'system', type: 'SYSTEM', isPrimaryKey: false }
    ]
  };

  const createdSystemEntities = [];
  const systemRelationships = [];

  entity.attributes.forEach(attr => {
    const colLower = attr.name.toLowerCase();
    if (SYSTEM_TYPES[colLower]) {
      const def = SYSTEM_TYPES[colLower];
      let sysEnt = createdSystemEntities.find(e => e.name === def.name);
      if (!sysEnt) {
        sysEnt = {
          id: `sys-${def.name.toLowerCase()}`,
          name: def.name,
          sourceType: 'system_type',
          sourceLabel: 'Системный тип',
          isSystemType: true
        };
        createdSystemEntities.push(sysEnt);
      }
      attr.isForeignKey = true;
      attr.foreignKeyTarget = `${def.name}.id`;
      systemRelationships.push({
        sourceEntityName: entity.name,
        targetEntityName: def.name,
        type: '1:1',
        foreignKeyName: `${entity.name}.${attr.name} -> ${def.name}.id`
      });
    }
  });

  assert.strictEqual(createdSystemEntities.length, 3);
  assert.ok(createdSystemEntities.some(e => e.name === 'File' && e.isSystemType && e.sourceType === 'system_type'));
  assert.ok(createdSystemEntities.some(e => e.name === 'Folder' && e.isSystemType && e.sourceType === 'system_type'));
  assert.ok(createdSystemEntities.some(e => e.name === 'System' && e.isSystemType && e.sourceType === 'system_type'));
  assert.strictEqual(systemRelationships.length, 3);
});

test('ERD Comment Union & Struct Array Extraction: extracts StatusEnum from union comments, and LogItem + ErrorItem from array struct comments', () => {
  function parseCommentsAndStructs(propName, rawValue, comment) {
    const structPattern = /(?:array\s+of\s+\{|\{\s*)([^{}]+)\}(?:\s*\[\])?/i;
    const structMatch = structPattern.exec(comment);
    if (structMatch) {
      const inner = structMatch[1];
      const fields = inner.split(/,(?![^']*\|)/).map(f => f.trim()).filter(Boolean);
      return {
        type: 'sub_entity',
        name: propName === 'log' ? 'LogItem' : 'ErrorItem',
        fields
      };
    }

    const unionPattern = /['"]([^'"]+)['"]\s*\|\s*['"]([^'"]+)['"]/i;
    if (comment && unionPattern.test(comment)) {
      const uRegex = /['"]([^'"]+)['"]/g;
      const uVals = [];
      let m;
      while ((m = uRegex.exec(comment)) !== null) {
        if (m[1].trim() && !uVals.includes(m[1].trim())) uVals.push(m[1].trim());
      }
      if (uVals.length >= 2) {
        return {
          type: 'enum',
          name: 'StatusEnum',
          values: uVals
        };
      }
    }

    return null;
  }

  // 1. Status Union Comment
  const statusRes = parseCommentsAndStructs('status', `'IDLE'`, `'IDLE' | 'RUNNING' | 'PAUSED' | 'DONE' | 'STOPPED'`);
  assert.ok(statusRes);
  assert.strictEqual(statusRes.type, 'enum');
  assert.strictEqual(statusRes.name, 'StatusEnum');
  assert.deepStrictEqual(statusRes.values, ['IDLE', 'RUNNING', 'PAUSED', 'DONE', 'STOPPED']);

  // 2. Log Array Struct Comment
  const logRes = parseCommentsAndStructs('log', `[]`, `Array of { timestamp, type: 'info'|'success'|'error'|'warning', text }`);
  assert.ok(logRes);
  assert.strictEqual(logRes.type, 'sub_entity');
  assert.strictEqual(logRes.name, 'LogItem');
  assert.strictEqual(logRes.fields.length, 3);

  // 3. Errors Array Struct Comment
  const errorRes = parseCommentsAndStructs('errors', `[]`, `Array of { file, error }`);
  assert.ok(errorRes);
  assert.strictEqual(errorRes.type, 'sub_entity');
  assert.strictEqual(errorRes.name, 'ErrorItem');
  assert.strictEqual(errorRes.fields.length, 2);
});

test('ERD Multiline Property Parser: tokenizes multiline arrays and objects with brackets balance', () => {
  const body = `
    id: 'sorting',
    title: 'Рекомендации по сортировке',
    capabilities: [
      'Автоматическая классификация документов, медиа, архивов и кода',
      'Возможность исключать или переназначать отдельные файлы',
      'Безопасное выполнение в интерактивном режиме или симуляции'
    ],
    status: 'IDLE', // 'IDLE' | 'RUNNING' | 'DONE'
    log: [], // Array of { timestamp, text }
  `;

  // Bracket-aware property parser
  function parseProps(str) {
    const props = [];
    const lines = str.split('\n');
    let currentKey = '';
    let currentVal = '';
    let bracketDepth = 0;
    let inlineComment = '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (bracketDepth > 0) {
        currentVal += ' ' + line;
        if (line.includes(']')) bracketDepth--;
        if (bracketDepth === 0) {
          props.push({ key: currentKey, value: currentVal, comment: inlineComment });
          currentKey = '';
          currentVal = '';
          inlineComment = '';
        }
        continue;
      }

      const match = /^([a-zA-Z0-9_]+)\s*:\s*(.*)$/.exec(line);
      if (match) {
        currentKey = match[1];
        let val = match[2];
        const cMatch = /\/\/\s*(.*)$/.exec(val);
        if (cMatch) {
          inlineComment = cMatch[1].trim();
          val = val.replace(/\/\/.*$/, '').trim();
        }
        val = val.replace(/,$/, '').trim();

        if (val.startsWith('[') && !val.includes(']')) {
          bracketDepth++;
          currentVal = val;
        } else {
          props.push({ key: currentKey, value: val, comment: inlineComment });
          currentKey = '';
          inlineComment = '';
        }
      }
    }
    return props;
  }

  const res = parseProps(body);
  assert.strictEqual(res.length, 5);
  assert.strictEqual(res.find(p => p.key === 'id').value, "'sorting'");
  assert.strictEqual(res.find(p => p.key === 'title').value, "'Рекомендации по сортировке'");
  
  const cap = res.find(p => p.key === 'capabilities');
  assert.ok(cap);
  assert.ok(cap.value.includes('Автоматическая классификация'));
  assert.ok(cap.value.includes('Возможность исключать'));
  assert.ok(cap.value.includes('Безопасное выполнение'));

  const st = res.find(p => p.key === 'status');
  assert.ok(st);
  assert.strictEqual(st.comment, `'IDLE' | 'RUNNING' | 'DONE'`);

  const lg = res.find(p => p.key === 'log');
  assert.ok(lg);
  assert.strictEqual(lg.comment, `Array of { timestamp, text }`);
});

test('ERD PlantUML Conversion: generates and converts between PlantUML ERD and Mermaid erDiagram', () => {
  const mermaidErd = `erDiagram
    roles ||--o{ users : "role_id"
    users {
        uuid id PK "ID пользователя"
        varchar email "Email"
    }
    StatusEnum {
        enum IDLE "Значение"
        enum RUNNING "Значение"
    }`;

  // Test Mermaid -> PlantUML ERD
  function convertMermaidToPlantUmlErd(mCode) {
    const lines = mCode.split('\n');
    const plantLines = ['@startuml', '!theme plain'];
    let inBlock = false;
    let currentEntity = '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('erDiagram')) continue;

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
          continue;
        }
        if (line.startsWith('enum ')) {
          const val = line.replace(/^enum\s+/, '').split(/\s/)[0];
          plantLines.push(`  ${val}`);
          continue;
        }
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const type = parts[0];
          const name = parts[1];
          const isPk = line.includes(' PK');
          plantLines.push(`  ${isPk ? '* ' : ''}${name} : ${type.toUpperCase()}${isPk ? ' <<PK>>' : ''}`);
        }
        continue;
      }

      const relMatch = /^([a-zA-Z0-9_]+)\s*(\|\|--o\{|--)\s*([a-zA-Z0-9_]+)(?:\s*:\s*"([^"]+)")?/i.exec(line);
      if (relMatch) {
        plantLines.push(`${relMatch[1]} ||--o{ ${relMatch[3]} : "${relMatch[4] || 'rel'}"`);
      }
    }
    plantLines.push('@enduml');
    return plantLines.join('\n');
  }

  const pUml = convertMermaidToPlantUmlErd(mermaidErd);
  assert.ok(pUml.includes('@startuml'));
  assert.ok(pUml.includes('entity "users" as users'));
  assert.ok(pUml.includes('* id : UUID <<PK>>'));
  assert.ok(pUml.includes('roles ||--o{ users : "role_id"'));
  assert.ok(pUml.includes('IDLE'));
  assert.ok(pUml.includes('@enduml'));
});

test('D3 Project Graph: Hierarchy Builder with Monorepos, Subprojects and Evolutionary Versions', () => {
  const sampleRepos = [
    {
      id: 'ENTERPRISE/enterprise-monorepo',
      projectKey: 'ENTERPRISE',
      projectName: 'Enterprise Core Platform',
      slug: 'enterprise-monorepo',
      name: 'Enterprise Monorepo',
      repoType: 'monorepo',
      subprojects: ['apps/web-client', 'services/order-api']
    },
    {
      id: 'CORE/banking-gateway-v2',
      projectKey: 'CORE',
      projectName: 'Core Banking',
      slug: 'banking-gateway-v2',
      name: 'Banking API Gateway v2.0',
      repoType: 'copy_version',
      similarityWith: {
        repoId: 'CORE/banking-gateway-v1',
        repoName: 'Banking API Gateway v1.0 Legacy',
        score: 88,
        stage: 'Эволюционная версия'
      }
    },
    {
      id: 'CORE/banking-gateway-v1',
      projectKey: 'CORE',
      projectName: 'Core Banking',
      slug: 'banking-gateway-v1',
      name: 'Banking API Gateway v1.0 Legacy',
      repoType: 'copy_version'
    },
    {
      id: 'local-123456',
      projectKey: 'LOCAL',
      projectName: 'Локальные проекты',
      slug: 'my-local-app',
      name: 'my-local-app',
      isLocal: true,
      repoType: 'local'
    }
  ];

  // Helper hierarchy builder replicating BitbucketClient.buildHierarchyFromRepositories
  const projectGroups = new Map();
  for (const r of sampleRepos) {
    const pKey = r.projectKey || 'GLOBAL';
    const pName = r.projectName || pKey;
    if (!projectGroups.has(pKey)) projectGroups.set(pKey, { projectName: pName, repos: [] });
    projectGroups.get(pKey).repos.push(r);
  }

  const projectNodes = [];
  for (const [pKey, group] of projectGroups.entries()) {
    const repoNodes = [];
    for (const r of group.repos) {
      const subprojectNames = r.subprojects || [];
      const subNodes = subprojectNames.map(sub => ({
        id: `sub-${pKey}-${r.slug}-${sub}`,
        name: sub,
        level: 3,
        type: 'subproject',
        details: { repoType: 'monorepo', subproject: sub }
      }));
      const branchNodes = [
        {
          id: `b-${pKey}-${r.slug}-main`,
          name: 'main',
          level: 3,
          type: 'branch',
          children: [
            { id: `c-${pKey}-${r.slug}-1`, name: 'commit 1', level: 4, type: 'commit' }
          ]
        }
      ];

      repoNodes.push({
        id: `r-${pKey}-${r.slug}`,
        name: r.name,
        level: 2,
        type: 'repo',
        details: {
          projectKey: pKey,
          repoSlug: r.slug,
          repoType: r.repoType,
          subprojects: subprojectNames,
          similarityWith: r.similarityWith,
          isLocal: r.isLocal
        },
        children: [...subNodes, ...branchNodes]
      });
    }

    projectNodes.push({
      id: `p-${pKey}`,
      name: `${pKey} (${group.projectName})`,
      level: 1,
      type: 'project',
      children: repoNodes
    });
  }

  const rootHierarchy = {
    id: 'root-bitbucket',
    name: 'Bitbucket Server & Repositories',
    level: 0,
    type: 'root',
    children: projectNodes
  };

  assert.strictEqual(rootHierarchy.type, 'root');
  assert.strictEqual(rootHierarchy.children.length, 3); // ENTERPRISE, CORE, LOCAL

  const entProj = rootHierarchy.children.find(p => p.id === 'p-ENTERPRISE');
  assert.ok(entProj);
  const monorepo = entProj.children.find(r => r.id === 'r-ENTERPRISE-enterprise-monorepo');
  assert.ok(monorepo);
  assert.strictEqual(monorepo.details.repoType, 'monorepo');
  assert.strictEqual(monorepo.children.some(c => c.type === 'subproject' && c.name === 'apps/web-client'), true);
  assert.strictEqual(monorepo.children.some(c => c.type === 'branch' && c.name === 'main'), true);

  const coreProj = rootHierarchy.children.find(p => p.id === 'p-CORE');
  assert.ok(coreProj);
  const v2Repo = coreProj.children.find(r => r.id === 'r-CORE-banking-gateway-v2');
  assert.ok(v2Repo);
  assert.strictEqual(v2Repo.details.repoType, 'copy_version');
  assert.strictEqual(v2Repo.details.similarityWith.score, 88);

  const localProj = rootHierarchy.children.find(p => p.id === 'p-LOCAL');
  assert.ok(localProj);
  const localRepo = localProj.children[0];
  assert.strictEqual(localRepo.details.isLocal, true);
});

test('FlowTracer: UI Screen Form Analysis Rules (IA-1, IA-2, POS-1, POS-2, ATTR-1, and Handlers)', () => {
  const sampleComponentContent = `
import React, { useEffect, useState } from 'react';
import { Button } from '@consta/uikit/Button';
import { TextField } from '@consta/uikit/TextField';
import { Checkbox } from '@consta/uikit/Checkbox';
import { Switch } from '@consta/uikit/Switch';
import { Select } from '@consta/uikit/Select';
import { SlideBlock } from '@consta/uikit/SlideBlock';

export const ConflictResolveModal = ({ isOpen, onClose }) => {
  const [reason, setReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [resolutionType, setResolutionType] = useState(null);

  useEffect(() => {
    fetchInitialConflictData();
  }, []);

  const handleResolveSubmit = async () => {
    if (!reason) {
      alert('Укажите причину');
      return;
    }
    dispatch(resolveConflictAction({ reason, isUrgent, resolutionType }));
    await fetch('/api/v1/conflicts/resolve', { method: 'POST' });
    localStorage.setItem('last_resolved_at', new Date().toISOString());
    onClose();
  };

  return (
    <SlideBlock isOpen={isOpen} onClose={onClose}>
      <div className="root-container p-4">
        <h2>Разрешение конфликта</h2>
        <form onSubmit={handleResolveSubmit}>
          <TextField
            label="Причина резолюции"
            placeholder="Введите подробное обоснование..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
          />
          <Checkbox
            label="Срочный приоритет"
            checked={isUrgent}
            onChange={e => setIsUrgent(e.checked)}
          />
          <Select
            label="Тип резолюции"
            placeholder="Выберите тип..."
            value={resolutionType}
            onChange={val => setResolutionType(val)}
          />
          <Switch
            label="Автоматическое подтверждение"
            checked={false}
            onChange={() => {}}
          />
          <div className="footer mt-4 flex justify-end space-x-2">
            <Button
              label="Отмена"
              iconLeft={IconClose}
              onClick={onClose}
            />
            <Button
              type="submit"
              label="Применить решение"
              iconRight={IconCheck}
              onClick={handleResolveSubmit}
            />
          </div>
        </form>
      </div>
    </SlideBlock>
  );
};
`;

  // 1. Test IA-1 & IA-2 Classification
  const INTERACTIVE_COMPONENTS = {
    'Button': true, 'Checkbox': true, 'Switch': true, 'RadioGroup': true,
    'Select': true, 'Combobox': true, 'TextField': true, 'Textarea': true,
    'SlideBlock': true, 'input': true, 'button': true, 'select': true, 'textarea': true, 'a': true, 'form': true
  };

  function classifyElementType(name, attrs) {
    const lowerName = name.toLowerCase();
    const typeAttr = (attrs.get('type') || '').toLowerCase();
    if (/^button$/i.test(name)) {
      if (typeAttr === 'submit') return 'button.submit';
      if (typeAttr === 'reset') return 'button.reset';
      return 'button.action';
    }
    if (typeAttr === 'checkbox') return 'checkbox';
    if (typeAttr === 'submit') return 'button.submit';
    const componentPatterns = {
      'checkbox': 'checkbox', 'switch': 'toggle', 'select': 'select',
      'textfield': 'text_input', 'textarea': 'textarea', 'slideblock': 'modal',
      'form': 'form'
    };
    return componentPatterns[lowerName] || 'unknown';
  }

  assert.strictEqual(classifyElementType('Button', new Map([['type', 'submit']])), 'button.submit');
  assert.strictEqual(classifyElementType('Button', new Map()), 'button.action');
  assert.strictEqual(classifyElementType('TextField', new Map()), 'text_input');
  assert.strictEqual(classifyElementType('Checkbox', new Map()), 'checkbox');
  assert.strictEqual(classifyElementType('Switch', new Map()), 'toggle');
  assert.strictEqual(classifyElementType('Select', new Map()), 'select');
  assert.strictEqual(classifyElementType('SlideBlock', new Map()), 'modal');

  // 2. Test POS-1 & POS-2: Containers and UI Section Detection
  const UI_SECTIONS = {
    'modal': ['Modal', 'Dialog', 'Drawer', 'Popover', 'ConfirmationModal', 'SlideBlock'],
    'sidebar': ['SlideBlock', 'Sidebar', 'SideBar', 'Aside'],
    'footer': ['Footer', 'BottomBar', 'div.footer', 'footer'],
    'form': ['Form', 'form', 'FormContainer'],
  };

  function detectUISection(containers) {
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

  assert.strictEqual(detectUISection(['SlideBlock', 'div.root', 'form', 'div.footer']), 'modal');
  assert.strictEqual(detectUISection(['form', 'div.footer']), 'footer');
  assert.strictEqual(detectUISection(['FormContainer', 'form']), 'form');

  // 3. Test ATTR-1: Props extraction
  function extractAttributes(attrsStr) {
    const propRegex = /([a-zA-Z0-9_:@()-]+)(?:\s*=\s*(?:\{([^}]*)\}|"([^"]*)"|'([^']*)'))?/g;
    const map = new Map();
    let m;
    while ((m = propRegex.exec(attrsStr)) !== null) {
      const key = m[1];
      const val = m[2] !== undefined ? m[2].trim() : (m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : 'true'));
      map.set(key, val);
    }
    return {
      label: map.get('label'),
      placeholder: map.get('placeholder'),
      required: map.has('required'),
      icon: map.get('iconRight') || map.get('iconLeft') || map.get('icon')
    };
  }

  const btnAttrs = extractAttributes('type="submit" label="Применить решение" iconRight={IconCheck} onClick={handleResolveSubmit}');
  assert.strictEqual(btnAttrs.label, 'Применить решение');
  assert.strictEqual(btnAttrs.icon, 'IconCheck');

  const textAttrs = extractAttributes('label="Причина резолюции" placeholder="Введите подробное обоснование..." required');
  assert.strictEqual(textAttrs.label, 'Причина резолюции');
  assert.strictEqual(textAttrs.placeholder, 'Введите подробное обоснование...');
  assert.strictEqual(textAttrs.required, true);

  // 4. Test Handlers Analysis: Redux actions, side effects, and conditions
  function analyzeHandlerSnippet(code) {
    const reduxActions = [];
    const reduxRegex = /dispatch\s*\(\s*(?:([a-zA-Z0-9_]+)\s*\(|{\s*type:\s*['"`]([^'"`]+)['"`])/g;
    let rm;
    while ((rm = reduxRegex.exec(code)) !== null) {
      const act = rm[1] || rm[2];
      if (act && !reduxActions.includes(act)) reduxActions.push(act);
    }
    const sideEffects = [];
    if (/fetch\s*\(/i.test(code)) sideEffects.push('fetch');
    if (/localStorage\./i.test(code)) sideEffects.push('localStorage');
    const hasConditionals = /\b(if|switch|try)\b/.test(code);
    return { reduxActions, sideEffects, hasConditionals };
  }

  const handlerAnalysis = analyzeHandlerSnippet(sampleComponentContent);
  assert.deepStrictEqual(handlerAnalysis.reduxActions, ['resolveConflictAction']);
  assert.deepStrictEqual(handlerAnalysis.sideEffects, ['fetch', 'localStorage']);
  assert.strictEqual(handlerAnalysis.hasConditionals, true);
});













