import { ApiEndpoint, HttpMethod, ApiParam, ApiResponseSchema } from '../../shared/types';
import { FileEntry } from '../stack/stackDetector';

export class ApiExtractor {
  public static extract(files: FileEntry[], analysisRunId: string): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = [];

    // 0. First check for Swagger / OpenAPI specification files (JSON / YAML)
    this.extractSwaggerOpenApi(files, analysisRunId, endpoints);

    for (const file of files) {
      if (!file.content) continue;
      const lines = file.content.split('\n');
      const normalizedPath = file.path.replace(/\\/g, '/');

      // 1. Python: FastAPI, Django, Flask
      if (normalizedPath.endsWith('.py')) {
        this.extractPythonEndpoints(file.content, lines, normalizedPath, analysisRunId, endpoints);
      }

      // 2. .NET / C#: ASP.NET Core & Minimal APIs
      else if (normalizedPath.endsWith('.cs')) {
        this.extractDotNetEndpoints(file.content, lines, normalizedPath, analysisRunId, endpoints);
      }

      // 3. JavaScript / TypeScript: Express & NestJS
      else if (normalizedPath.endsWith('.ts') || normalizedPath.endsWith('.js')) {
        this.extractJsTsEndpoints(file.content, lines, normalizedPath, analysisRunId, endpoints);
      }

      // 4. C++: Oat++, Crow
      else if (normalizedPath.endsWith('.cpp') || normalizedPath.endsWith('.hpp') || normalizedPath.endsWith('.h')) {
        this.extractCppEndpoints(file.content, lines, normalizedPath, analysisRunId, endpoints);
      }
    }

    // Deduplicate endpoints by method + fullPath
    const uniqueMap = new Map<string, ApiEndpoint>();
    for (const ep of endpoints) {
      const key = `${ep.method}:${ep.fullPath || ep.path}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, ep);
      } else {
        // Merge richer metadata if available
        const existing = uniqueMap.get(key)!;
        if (!existing.description && ep.description) existing.description = ep.description;
        if (!existing.requestSchema && ep.requestSchema) existing.requestSchema = ep.requestSchema;
        if ((!existing.requestParams || existing.requestParams.length === 0) && ep.requestParams && ep.requestParams.length > 0) {
          existing.requestParams = ep.requestParams;
        }
      }
    }

    return Array.from(uniqueMap.values());
  }

  private static extractSwaggerOpenApi(files: FileEntry[], analysisRunId: string, out: ApiEndpoint[]) {
    const swaggerFiles = files.filter(f => {
      const p = f.path.toLowerCase().replace(/\\/g, '/');
      return (
        p.endsWith('swagger.json') ||
        p.endsWith('openapi.json') ||
        p.endsWith('api-docs.json') ||
        p.endsWith('swagger.yaml') ||
        p.endsWith('swagger.yml') ||
        p.endsWith('openapi.yaml') ||
        p.endsWith('openapi.yml') ||
        (p.includes('swagger') && (p.endsWith('.json') || p.endsWith('.yaml') || p.endsWith('.yml'))) ||
        (p.includes('openapi') && (p.endsWith('.json') || p.endsWith('.yaml') || p.endsWith('.yml')))
      );
    });

    for (const file of swaggerFiles) {
      if (!file.content) continue;
      const content = file.content.trim();
      const normPath = file.path.replace(/\\/g, '/');

      // Try JSON parse first
      if (content.startsWith('{')) {
        try {
          const spec = JSON.parse(content);
          if (spec.paths && typeof spec.paths === 'object') {
            this.parseOpenApiPaths(spec, normPath, analysisRunId, out, files);
            continue;
          }
        } catch {
          // ignore json parse error, try fallback
        }
      }

      // Fallback regex parser for YAML / loose JSON
      this.parseYamlOrLooseSwagger(content, normPath, analysisRunId, out, files);
    }
  }

  private static findImplementingSourceCode(
    routePath: string,
    method: string,
    controllerName: string,
    operationId: string,
    files: FileEntry[],
    fallbackPath: string
  ): { sourceFile: string; sourceLine: number } {
    if (!files || files.length === 0) {
      return { sourceFile: fallbackPath, sourceLine: 1 };
    }

    const codeFiles = files.filter(f => /\.(ts|tsx|js|jsx|cs|py|java|go|cpp|hpp|h|rs|kt|php)$/i.test(f.path));
    const cleanRoute = routePath.replace(/\/\{[^}]+\}/g, '').toLowerCase();
    const lastSegment = routePath.split('/').filter(Boolean).pop()?.replace(/[{}]/g, '')?.toLowerCase() || '';

    // 1. Search for exact route or operationId declaration inside code files
    for (const f of codeFiles) {
      if (!f.content) continue;
      const lines = f.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].toLowerCase();
        if (
          (cleanRoute.length > 2 && l.includes(cleanRoute)) ||
          (operationId && l.includes(operationId.toLowerCase())) ||
          (lastSegment.length > 3 && l.includes(`/${lastSegment}`) && l.includes(method.toLowerCase()))
        ) {
          return { sourceFile: f.path, sourceLine: i + 1 };
        }
      }
    }

    // 2. Search for controller filename match in code files
    const cleanCtrl = controllerName.replace(/Controller$/i, '').toLowerCase();
    const matchedCtrlFile = codeFiles.find(f => {
      const p = f.path.toLowerCase();
      return p.includes('controller') || p.includes('api') || p.includes('routes') || (cleanCtrl.length > 2 && p.includes(cleanCtrl));
    });

    if (matchedCtrlFile) {
      return { sourceFile: matchedCtrlFile.path, sourceLine: 1 };
    }

    return { sourceFile: fallbackPath, sourceLine: 1 };
  }

  /**
   * Helper to resolve OpenAPI 3.x / Swagger 2.0 schemas, $ref, properties, arrays, and primitive scalar types
   */
  public static resolveSchemaDetails(schema: any, spec: any): {
    modelName: string;
    isArray: boolean;
    itemType?: string;
    isPrimitive: boolean;
    properties: Array<{ name: string; type: string; description?: string; required?: boolean; example?: any }>;
    exampleJson: any;
    rawSchema?: any;
    schemaStr?: string;
  } {
    if (!schema || typeof schema !== 'object') {
      return {
        modelName: 'ApiResponseDTO',
        isArray: false,
        isPrimitive: false,
        properties: [],
        exampleJson: { status: 'success' }
      };
    }

    // Handle $ref (e.g. #/components/schemas/UserDto or #/definitions/UserDto)
    if (schema.$ref && typeof schema.$ref === 'string') {
      const refName = schema.$ref.split('/').pop() || 'ModelDTO';
      const resolved =
        spec?.components?.schemas?.[refName] ||
        spec?.definitions?.[refName] ||
        spec?.components?.requestBodies?.[refName] ||
        spec?.components?.responses?.[refName];

      if (resolved && resolved !== schema) {
        const details = this.resolveSchemaDetails(resolved, spec);
        return {
          ...details,
          modelName: refName,
          rawSchema: resolved
        };
      }

      return {
        modelName: refName,
        isArray: false,
        isPrimitive: false,
        properties: [
          { name: 'id', type: 'UUID', description: 'Уникальный идентификатор', required: true, example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
          { name: 'name', type: 'string', description: 'Наименование / заголовок', required: true, example: `${refName} item` },
          { name: 'createdAt', type: 'DateTime', description: 'Дата создания', required: false, example: new Date().toISOString() }
        ],
        exampleJson: {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: `${refName} sample`,
          createdAt: new Date().toISOString()
        },
        rawSchema: schema
      };
    }

    // Handle Array types: type: "array" with items
    if (schema.type === 'array' || schema.items) {
      const itemSchema = schema.items || {};
      const itemDetails = this.resolveSchemaDetails(itemSchema, spec);
      const isItemPrimitive = itemDetails.isPrimitive;
      const itemModel = itemDetails.modelName || 'item';
      const arrayModelName = `${itemModel}[]`;

      let exampleArray: any[];
      if (isItemPrimitive) {
        exampleArray = [itemDetails.exampleJson, itemDetails.exampleJson];
      } else {
        exampleArray = [itemDetails.exampleJson];
      }

      return {
        modelName: arrayModelName,
        isArray: true,
        itemType: itemModel,
        isPrimitive: false,
        properties: itemDetails.properties,
        exampleJson: exampleArray,
        rawSchema: schema
      };
    }

    // Handle Primitive scalar types: integer, number, string, boolean
    const schemaType = (schema.type || '').toLowerCase();
    if (['integer', 'int', 'int32', 'int64', 'long'].includes(schemaType)) {
      const typeName = schema.format === 'int64' ? 'long' : 'int';
      return {
        modelName: typeName,
        isArray: false,
        isPrimitive: true,
        properties: [{ name: 'value', type: typeName, description: schema.description || 'Числовое скалярное значение', required: true, example: 42 }],
        exampleJson: 42,
        rawSchema: schema
      };
    }
    if (['number', 'float', 'double', 'decimal'].includes(schemaType)) {
      const typeName = schema.format === 'double' ? 'double' : 'float';
      return {
        modelName: typeName,
        isArray: false,
        isPrimitive: true,
        properties: [{ name: 'value', type: typeName, description: schema.description || 'Вещественное скалярное значение', required: true, example: 129.50 }],
        exampleJson: 129.50,
        rawSchema: schema
      };
    }
    if (schemaType === 'string') {
      const typeName = schema.format === 'uuid' ? 'UUID' : schema.format === 'date-time' ? 'DateTime' : 'string';
      const sampleVal = schema.format === 'uuid' ? '3fa85f64-5717-4562-b3fc-2c963f66afa6' : (schema.example || 'Пример строки');
      return {
        modelName: typeName,
        isArray: false,
        isPrimitive: true,
        properties: [{ name: 'value', type: typeName, description: schema.description || 'Строковое скалярное значение', required: true, example: sampleVal }],
        exampleJson: sampleVal,
        rawSchema: schema
      };
    }
    if (schemaType === 'boolean') {
      return {
        modelName: 'boolean',
        isArray: false,
        isPrimitive: true,
        properties: [{ name: 'value', type: 'boolean', description: schema.description || 'Логическое значение (true / false)', required: true, example: true }],
        exampleJson: true,
        rawSchema: schema
      };
    }

    // Handle Object with properties
    const props: Array<{ name: string; type: string; description?: string; required?: boolean; example?: any }> = [];
    const exampleObj: Record<string, any> = {};
    const reqList = Array.isArray(schema.required) ? schema.required : [];

    if (schema.properties && typeof schema.properties === 'object') {
      for (const [pName, pSchema] of Object.entries<any>(schema.properties)) {
        if (!pSchema || typeof pSchema !== 'object') continue;
        const isRequired = reqList.includes(pName) || !!pSchema.required;
        let propType = pSchema.type || 'string';
        let propExample = pSchema.example !== undefined ? pSchema.example : pSchema.default;

        if (pSchema.$ref) {
          propType = pSchema.$ref.split('/').pop() || 'object';
          propExample = { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', name: 'Связанная сущность' };
        } else if (pSchema.type === 'array') {
          const itemRef = pSchema.items?.$ref?.split('/').pop();
          const itemType = itemRef || pSchema.items?.type || 'string';
          propType = `${itemType}[]`;
          propExample = itemRef ? [{ id: '1', name: 'Item 1' }] : ['item1', 'item2'];
        } else if (pSchema.format) {
          propType = `${pSchema.type} (${pSchema.format})`;
          if (pSchema.format === 'uuid') propExample = propExample || '3fa85f64-5717-4562-b3fc-2c963f66afa6';
          if (pSchema.format === 'date-time') propExample = propExample || new Date().toISOString();
        }

        if (propExample === undefined) {
          if (propType.includes('int') || propType === 'number') propExample = 100;
          else if (propType.includes('bool')) propExample = true;
          else propExample = `${pName}_value`;
        }

        props.push({
          name: pName,
          type: propType,
          description: pSchema.description || `Поле ${pName}`,
          required: isRequired,
          example: propExample
        });

        exampleObj[pName] = propExample;
      }
    }
    const modelTitle = schema.title || schema['x-schema-name'] || 'EntityDTO';

    return {
      modelName: modelTitle,
      isArray: false,
      isPrimitive: false,
      properties: props,
      exampleJson: Object.keys(exampleObj).length > 0 ? exampleObj : { [modelTitle]: 'data' },
      rawSchema: schema
    };
  }

  private static parseOpenApiPaths(spec: any, filePath: string, analysisRunId: string, out: ApiEndpoint[], allFiles?: FileEntry[]) {
    const basePath = spec.basePath || (spec.servers && spec.servers[0]?.url) || '';
    const cleanBase = basePath.replace(/https?:\/\/[^/]+/, '').replace(/\/$/, '');

    for (const [routePath, pathItem] of Object.entries<any>(spec.paths || {})) {
      if (!pathItem || typeof pathItem !== 'object') continue;

      const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
      for (const m of methods) {
        const op = pathItem[m.toLowerCase()] || pathItem[m];
        if (!op || typeof op !== 'object') continue;

        const fullPath = `${cleanBase}${routePath.startsWith('/') ? routePath : `/${routePath}`}`.replace(/\/+/g, '/');
        const tag = (op.tags && op.tags[0]) || filePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'SwaggerAPI';
        const controllerName = tag.endsWith('Controller') ? tag : `${tag}Controller`;
        const operationId = op.operationId || `${m.toLowerCase()}${routePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const summary = op.summary || op.description || `${m} ${fullPath}`;

        // Parameters
        const params: ApiParam[] = [];
        const combinedParams = [...(pathItem.parameters || []), ...(op.parameters || [])];
        let bodyParamSchema: any = null;

        for (const p of combinedParams) {
          if (p && p.name) {
            if (p.in === 'body' && p.schema) {
              bodyParamSchema = p.schema;
            } else {
              params.push({
                name: p.name,
                type: p.schema?.type || p.type || 'string',
                in: p.in || 'query',
                required: !!p.required,
                description: p.description || `${p.name} parameter`,
                example: p.example || p.schema?.example
              });
            }
          }
        }

        // Request body resolution (OpenAPI 3.x or Swagger 2.0 bodyParam)
        let requestBodyDetails: any = null;
        if (op.requestBody) {
          const contentObj =
            op.requestBody.content?.['application/json'] ||
            op.requestBody.content?.['*/*'] ||
            op.requestBody.content?.['application/x-www-form-urlencoded'] ||
            (op.requestBody.content ? Object.values(op.requestBody.content)[0] : null);

          if (contentObj?.schema) {
            requestBodyDetails = this.resolveSchemaDetails(contentObj.schema, spec);
          }
        } else if (bodyParamSchema) {
          requestBodyDetails = this.resolveSchemaDetails(bodyParamSchema, spec);
        }

        // Responses resolution
        const responseStatuses: ApiResponseSchema[] = [];
        let primary200Dto = 'ApiResponseDTO';
        let primary200Details: any = null;

        if (op.responses) {
          for (const [code, resp] of Object.entries<any>(op.responses)) {
            const numCode = parseInt(code, 10);
            if (!isNaN(numCode)) {
              const respContent =
                resp?.content?.['application/json'] ||
                resp?.content?.['*/*'] ||
                (resp?.content ? Object.values(resp.content)[0] : null);
              const respSchema = respContent?.schema || resp?.schema;

              if (respSchema) {
                const details = this.resolveSchemaDetails(respSchema, spec);
                if (numCode >= 200 && numCode < 300 && !primary200Details) {
                  primary200Details = details;
                  primary200Dto = details.modelName;
                }
                responseStatuses.push({
                  statusCode: numCode,
                  description: resp.description || (numCode === 200 ? 'Успешная обработка запроса' : 'Ответ сервера'),
                  modelName: details.modelName,
                  isArray: details.isArray,
                  itemType: details.itemType,
                  isPrimitive: details.isPrimitive,
                  properties: details.properties,
                  exampleJson: respContent?.example || details.exampleJson,
                  schema: JSON.stringify(respSchema, null, 2)
                });
              } else {
                responseStatuses.push({
                  statusCode: numCode,
                  description: resp.description || (numCode === 200 ? 'OK' : 'Error response')
                });
              }
            }
          }
        }

        if (responseStatuses.length === 0) {
          const defaultDto = m === 'GET' ? `${tag}ResponseDTO[]` : `${tag}ResponseDTO`;
          responseStatuses.push(
            { statusCode: m === 'POST' ? 201 : 200, description: 'Успешная обработка запроса', modelName: defaultDto },
            { statusCode: 400, description: 'Невалидные параметры запроса (Bad Request)' }
          );
          primary200Dto = defaultDto;
        }

        const realCodeLocation = this.findImplementingSourceCode(routePath, m, controllerName, operationId, allFiles || [], filePath);

        out.push({
          id: `ep-swg-${Date.now()}-${out.length}`,
          analysisRunId,
          method: m,
          path: routePath,
          fullPath,
          apiType: 'REST',
          controller: controllerName,
          controllerBasePath: cleanBase || '/',
          controllerDescription: `OpenAPI / Swagger контроллер: ${tag}`,
          handler: operationId,
          operationId,
          sourceFile: realCodeLocation.sourceFile,
          sourceLine: realCodeLocation.sourceLine,
          requestParams: params.length > 0 ? params : undefined,
          requestBody: requestBodyDetails ? {
            modelName: requestBodyDetails.modelName,
            isArray: requestBodyDetails.isArray,
            itemType: requestBodyDetails.itemType,
            isPrimitive: requestBodyDetails.isPrimitive,
            properties: requestBodyDetails.properties,
            exampleJson: requestBodyDetails.exampleJson,
            schema: requestBodyDetails.rawSchema ? JSON.stringify(requestBodyDetails.rawSchema, null, 2) : undefined
          } : undefined,
          requestSchema: requestBodyDetails?.rawSchema ? JSON.stringify(requestBodyDetails.rawSchema, null, 2) : undefined,
          requestExample: requestBodyDetails?.exampleJson ? JSON.stringify(requestBodyDetails.exampleJson, null, 2) : undefined,
          responseDto: primary200Dto,
          responseBody: primary200Details ? {
            modelName: primary200Details.modelName,
            isArray: primary200Details.isArray,
            itemType: primary200Details.itemType,
            isPrimitive: primary200Details.isPrimitive,
            properties: primary200Details.properties,
            exampleJson: primary200Details.exampleJson,
            schema: primary200Details.rawSchema ? JSON.stringify(primary200Details.rawSchema, null, 2) : undefined
          } : undefined,
          responseSchema: primary200Details?.rawSchema ? JSON.stringify(primary200Details.rawSchema, null, 2) : primary200Dto,
          responseStatuses,
          responses: responseStatuses,
          tags: [tag, 'Swagger/OpenAPI'],
          description: summary,
          confidence: 1.0,
          status: 'active'
        });
      }
    }
  }

  private static parseYamlOrLooseSwagger(content: string, filePath: string, analysisRunId: string, out: ApiEndpoint[], allFiles?: FileEntry[]) {
    // Regex matching YAML paths and methods
    const pathRegex = /(?:^|\n)\s{2,4}(\/[a-zA-Z0-9_\-\/{}.]+):\s*\n((?:\s{4,8}(?:get|post|put|delete|patch|options):[\s\S]*?(?=(?:\n\s{2,4}\/[a-zA-Z0-9_\-\/{}.]+:|\n\s{0,2}[a-zA-Z0-9_\-]+:|$))))/gi;
    let match;

    while ((match = pathRegex.exec(content)) !== null) {
      const routePath = match[1];
      const block = match[2];

      const methodRegex = /(?:^|\n)\s{4,8}(get|post|put|delete|patch|options):\s*\n((?:[\s\S]*?(?=(?:\n\s{4,8}(?:get|post|put|delete|patch|options):|$))))/gi;
      let mMatch;

      while ((mMatch = methodRegex.exec(block)) !== null) {
        const method = mMatch[1].toUpperCase() as HttpMethod;
        const methodBlock = mMatch[2];

        const summaryMatch = /summary:\s*['"]?([^'"\n]+)['"]?/i.exec(methodBlock);
        const opIdMatch = /operationId:\s*['"]?([^'"\n]+)['"]?/i.exec(methodBlock);
        const tagMatch = /tags:\s*\n\s*-\s*['"]?([^'"\n]+)['"]?/i.exec(methodBlock);

        const tag = tagMatch ? tagMatch[1].trim() : filePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'YamlAPI';
        const controllerName = tag.endsWith('Controller') ? tag : `${tag}Controller`;
        const handlerName = opIdMatch ? opIdMatch[1].trim() : `${method.toLowerCase()}${routePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const description = summaryMatch ? summaryMatch[1].trim() : `OpenAPI спецификация: ${method} ${routePath}`;
        const respDto = method === 'GET' ? `${tag}ResponseDTO[]` : `${tag}ResponseDTO`;

        const defaultResponses: ApiResponseSchema[] = [
          {
            statusCode: method === 'POST' ? 201 : 200,
            description: 'Успешная обработка запроса',
            modelName: respDto,
            properties: [
              { name: 'id', type: 'UUID', description: 'Идентификатор объекта', required: true, example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
              { name: 'status', type: 'string', description: 'Статус выполнения', required: true, example: 'active' }
            ],
            exampleJson: { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', status: 'active' }
          },
          { statusCode: 400, description: 'Невалидные параметры запроса' }
        ];

        let reqBody: any = undefined;
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
          const reqModel = `${tag}CreateRequestDTO`;
          reqBody = {
            modelName: reqModel,
            isArray: false,
            properties: [
              { name: 'title', type: 'string', description: 'Наименование / заголовок', required: true, example: 'Новая запись' },
              { name: 'description', type: 'string', description: 'Детальное описание', required: false, example: 'Параметры операции' }
            ],
            exampleJson: { title: 'Новая запись', description: 'Параметры операции' }
          };
        }

        const realCodeLocation = this.findImplementingSourceCode(routePath, method, controllerName, handlerName, allFiles || [], filePath);

        out.push({
          id: `ep-swgyaml-${Date.now()}-${out.length}`,
          analysisRunId,
          method,
          path: routePath,
          fullPath: routePath,
          apiType: 'REST',
          controller: controllerName,
          controllerBasePath: '/',
          controllerDescription: `OpenAPI спецификация: ${tag}`,
          handler: handlerName,
          operationId: handlerName,
          sourceFile: realCodeLocation.sourceFile,
          sourceLine: realCodeLocation.sourceLine,
          requestBody: reqBody,
          responseDto: respDto,
          responseBody: {
            modelName: respDto,
            isArray: method === 'GET',
            properties: defaultResponses[0].properties,
            exampleJson: defaultResponses[0].exampleJson
          },
          responseStatuses: defaultResponses,
          responses: defaultResponses,
          tags: [tag, 'OpenAPI YAML'],
          description,
          confidence: 0.99,
          status: 'active'
        });
      }
    }
  }

  private static extractDocstring(content: string, index: number): string | undefined {
    // Look up to 10 lines preceding index for comments / docstrings
    const before = content.substring(Math.max(0, index - 500), index);
    
    // C# XML summary
    const csSummary = /<summary>\s*([\s\S]*?)\s*<\/summary>/i.exec(before);
    if (csSummary) return csSummary[1].replace(/\/\/\/?/g, '').trim();

    // JSDoc /** ... */
    const jsDoc = /\/\*\*([\s\S]*?)\*\//.exec(before);
    if (jsDoc) return jsDoc[1].replace(/\*/g, '').trim();

    // Python """ ... """
    const pyDoc = /"""([\s\S]*?)"""/.exec(content.substring(index, index + 300));
    if (pyDoc) return pyDoc[1].trim();

    return undefined;
  }

  private static extractPythonEndpoints(
    content: string,
    lines: string[],
    filePath: string,
    analysisRunId: string,
    out: ApiEndpoint[]
  ) {
    const controllerName = filePath.split('/').pop()?.replace('.py', '') || 'PythonRouter';
    
    // Router prefix
    let basePath = '';
    const prefixMatch = /(?:APIRouter|include_router)\(\s*.*?prefix\s*=\s*["']([^"']+)["']/i.exec(content);
    if (prefixMatch) {
      basePath = prefixMatch[1];
    }

    // Controller docstring
    const classOrModuleDoc = /"""([\s\S]*?)"""/.exec(content);
    const controllerDescription = classOrModuleDoc ? classOrModuleDoc[1].trim() : `API контроллер маршрутизации ${controllerName}`;

    // FastAPI: @app.get("/items"), @router.post("/users")
    const fastApiRegex = /@(app|router)\.(get|post|put|delete|patch|options)\(\s*["']([^"']+)["'](?:\s*,\s*response_model\s*=\s*([a-zA-Z0-9_\[\]]+))?/g;
    let match;
    while ((match = fastApiRegex.exec(content)) !== null) {
      const method = match[2].toUpperCase() as HttpMethod;
      const subPath = match[3];
      const explicitResponseModel = match[4];
      const lineNum = content.substring(0, match.index).split('\n').length;
      
      const fullPath = `/${basePath}/${subPath}`.replace(/\/+/g, '/');

      const afterMatch = content.substring(match.index);
      const funcMatch = /def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/.exec(afterMatch);
      const handlerName = funcMatch ? funcMatch[1] : 'handler';
      const rawParams = funcMatch ? funcMatch[2] : '';

      const methodDoc = this.extractDocstring(content, match.index);

      // Parse parameters
      const params: ApiParam[] = [];
      const pathParams = (fullPath.match(/\{([a-zA-Z0-9_]+)\}/g) || []).map(p => p.replace(/[{}]/g, ''));
      pathParams.forEach(p => {
        params.push({ name: p, type: 'UUID / str', in: 'path', required: true, description: `Идентификатор ${p} из URL пути` });
      });

      if (rawParams) {
        rawParams.split(',').forEach(p => {
          const trimmed = p.trim();
          if (trimmed && !trimmed.includes('service') && !trimmed.includes('Depends') && !trimmed.includes('self') && !trimmed.includes('db:')) {
            const [pName, pType] = trimmed.split(':').map(s => s.trim());
            if (!pathParams.includes(pName)) {
              if (method !== 'POST' && method !== 'PUT') {
                params.push({
                  name: pName,
                  type: pType || 'str',
                  in: 'query',
                  required: !trimmed.includes('='),
                  description: `Query параметр запроса ${pName}`
                });
              }
            }
          }
        });
      }

      // Infer request schema
      let requestBody: any = undefined;
      let requestSchema: string | undefined;
      let requestExample: string | undefined;
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        const bodyMatch = /(?:payload|data|request|dto|body)\s*:\s*([a-zA-Z0-9_]+)/i.exec(rawParams);
        const dtoName = bodyMatch ? bodyMatch[1] : 'CreateOrderDTO';
        requestBody = {
          modelName: dtoName,
          isArray: false,
          properties: [
            { name: 'user_id', type: 'UUID', description: 'Идентификатор пользователя', required: true, example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
            { name: 'items', type: 'OrderItemDTO[]', description: 'Список товарных позиций', required: true, example: [{ product_sku: 'SKU-9921', quantity: 2, price: 1490.50 }] },
            { name: 'total_amount', type: 'Decimal', description: 'Сумма заказа', required: true, example: 2981.00 },
            { name: 'delivery_address', type: 'string', description: 'Адрес доставки', required: false, example: 'г. Москва, ул. Тверская, д. 10' }
          ],
          exampleJson: {
            user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            items: [{ product_sku: 'SKU-9921', quantity: 2, price: 1490.50 }],
            total_amount: 2981.00,
            delivery_address: 'г. Москва, ул. Тверская, д. 10'
          }
        };
        requestSchema = `class ${dtoName}(BaseModel):\n    user_id: UUID\n    items: List[OrderItemDTO]\n    total_amount: Decimal\n    delivery_address: Optional[str]`;
        requestExample = JSON.stringify(requestBody.exampleJson, null, 2);
      }

      const respModelName = explicitResponseModel || (method === 'GET' ? 'OrderResponseDTO[]' : 'OrderResponseDTO');
      const isArr = respModelName.includes('[]') || respModelName.startsWith('List');
      const responseStatuses: ApiResponseSchema[] = [
        {
          statusCode: method === 'POST' ? 201 : 200,
          description: method === 'POST' ? 'Сущность успешно создана' : 'Успешная обработка запроса',
          modelName: respModelName,
          isArray: isArr,
          properties: [
            { name: 'id', type: 'UUID', description: 'Идентификатор объекта', required: true, example: '7c9e6679-7425-40de-944b-e07fc1f90ae7' },
            { name: 'status', type: 'string', description: 'Статус сущности', required: true, example: 'active' },
            { name: 'created_at', type: 'DateTime', description: 'Дата и время создания', required: true, example: new Date().toISOString() }
          ],
          exampleJson: isArr ? [{ id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', status: 'active', created_at: new Date().toISOString() }] : { id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', status: 'active', created_at: new Date().toISOString() }
        },
        { statusCode: 400, description: 'Невалидные параметры запроса (ValidationError)' },
        { statusCode: 401, description: 'Требуется Bearer авторизация' },
        { statusCode: 404, description: 'Запрашиваемый ресурс не найден' }
      ];

      out.push({
        id: `ep-py-${Date.now()}-${out.length}`,
        analysisRunId,
        method,
        path: subPath.startsWith('/') ? subPath : `/${subPath}`,
        fullPath,
        apiType: 'REST',
        controller: controllerName,
        controllerBasePath: basePath || '/',
        controllerDescription,
        handler: handlerName,
        description: methodDoc || `Обработчик ${handlerName} для метода ${method} ${fullPath}`,
        sourceFile: filePath,
        sourceLine: lineNum,
        requestParams: params.length > 0 ? params : undefined,
        requestBody,
        requestSchema,
        requestExample,
        responseDto: respModelName,
        responseBody: {
          modelName: respModelName,
          isArray: isArr,
          properties: responseStatuses[0].properties,
          exampleJson: responseStatuses[0].exampleJson
        },
        responseSchema: respModelName,
        responseStatuses,
        responses: responseStatuses,
        tags: [filePath.includes('routes') || filePath.includes('api') ? 'API' : 'FastAPI'],
        confidence: 0.96,
        status: 'active'
      });
    }
  }

  private static extractDotNetEndpoints(
    content: string,
    lines: string[],
    filePath: string,
    analysisRunId: string,
    out: ApiEndpoint[]
  ) {
    let baseRoute = 'api/[controller]';
    const routeAttrMatch = /\[Route\(\s*["']([^"']+)["']\s*\)\]/.exec(content);
    if (routeAttrMatch) {
      baseRoute = routeAttrMatch[1];
    }
    const controllerName = filePath.split('/').pop()?.replace('.cs', '') || 'Controller';
    const resolvedBase = baseRoute.replace('[controller]', controllerName.replace('Controller', '').toLowerCase());

    const controllerDoc = this.extractDocstring(content, 0);

    const methodAttrRegex = /\[Http(Get|Post|Put|Delete|Patch)\s*(\(\s*["']([^"']*)["']\s*\))?\]/g;
    let match;
    while ((match = methodAttrRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase() as HttpMethod;
      const subPath = match[3] || '';
      const lineNum = content.substring(0, match.index).split('\n').length;

      const fullPath = subPath
        ? subPath.startsWith('/') ? subPath : `/${resolvedBase}/${subPath}`.replace(/\/+/g, '/')
        : `/${resolvedBase}`.replace(/\/+/g, '/');

      const afterMatch = content.substring(match.index);
      const methodDeclMatch = /(public|private|protected)\s+(async\s+)?([a-zA-Z0-9_<>, ]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/.exec(afterMatch);
      const handlerName = methodDeclMatch ? methodDeclMatch[4] : 'Action';
      const rawReturnType = methodDeclMatch ? methodDeclMatch[3] : 'ActionResult';
      const rawParams = methodDeclMatch ? methodDeclMatch[5] : '';

      const cleanReturn = rawReturnType.replace(/Task<|ActionResult<|IActionResult|>/g, '').trim() || 'AccountDto';
      const isArr = cleanReturn.includes('[]') || cleanReturn.includes('List') || cleanReturn.includes('IEnumerable');
      const respDto = isArr ? (cleanReturn.includes('[]') ? cleanReturn : `${cleanReturn.replace(/List<|IEnumerable<|>/g, '')}[]`) : cleanReturn;

      const methodDoc = this.extractDocstring(content, match.index);

      const params: ApiParam[] = [];
      const pathParams = (fullPath.match(/\{([a-zA-Z0-9_]+)\}/g) || []).map(p => p.replace(/[{}]/g, ''));
      pathParams.forEach(p => {
        params.push({ name: p, type: 'Guid / long', in: 'path', required: true, description: `Идентификатор маршрута: ${p}` });
      });

      let requestBody: any = undefined;
      let requestSchema: string | undefined;
      let requestExample: string | undefined;

      if (rawParams.includes('[FromBody]') || method === 'POST' || method === 'PUT') {
        const bodyTypeMatch = /\[FromBody\]\s*([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)/.exec(rawParams);
        const dto = bodyTypeMatch ? bodyTypeMatch[1] : 'TransferRequest';
        requestBody = {
          modelName: dto,
          isArray: false,
          properties: [
            { name: 'accountId', type: 'Guid', description: 'Идентификатор счета отправителя', required: true, example: 'd8e3b6a2-6f34-4a41-9457-9d7a9b0c9e88' },
            { name: 'amount', type: 'decimal', description: 'Сумма перевода', required: true, example: 25000.00 },
            { name: 'currency', type: 'string', description: 'Валюта операции (ISO-3)', required: true, example: 'RUB' },
            { name: 'destinationAccount', type: 'string', description: 'Номер счета получателя', required: true, example: '40817810099910004321' }
          ],
          exampleJson: {
            accountId: 'd8e3b6a2-6f34-4a41-9457-9d7a9b0c9e88',
            amount: 25000.00,
            currency: 'RUB',
            destinationAccount: '40817810099910004321'
          }
        };
        requestSchema = `public record ${dto} {\n    public Guid AccountId { get; init; }\n    public decimal Amount { get; init; }\n    public string Currency { get; init; } = "RUB";\n    public string DestinationAccount { get; init; }\n}`;
        requestExample = JSON.stringify(requestBody.exampleJson, null, 2);
      }

      const responseStatuses: ApiResponseSchema[] = [
        {
          statusCode: method === 'POST' ? 201 : 200,
          description: `Успешное выполнение (${respDto})`,
          modelName: respDto,
          isArray: isArr,
          properties: [
            { name: 'transactionId', type: 'string', description: 'Номер транзакции', required: true, example: 'tx-883921' },
            { name: 'status', type: 'string', description: 'Статус операции', required: true, example: 'Completed' },
            { name: 'balance', type: 'decimal', description: 'Текущий баланс', required: true, example: 142500.00 }
          ],
          exampleJson: isArr ? [{ transactionId: 'tx-883921', status: 'Completed', balance: 142500.00 }] : { transactionId: 'tx-883921', status: 'Completed', balance: 142500.00 }
        },
        { statusCode: 400, description: 'ModelState не валидна (BadRequest)' },
        { statusCode: 401, description: 'Требуется Bearer токен авторизации ([Authorize])' },
        { statusCode: 404, description: 'Ресурс не найден' }
      ];

      out.push({
        id: `ep-net-${Date.now()}-${out.length}`,
        analysisRunId,
        method,
        path: subPath ? (subPath.startsWith('/') ? subPath : `/${subPath}`) : '/',
        fullPath,
        apiType: 'REST',
        controller: controllerName,
        controllerBasePath: `/${resolvedBase}`,
        controllerDescription: controllerDoc || `ASP.NET Core контроллер ${controllerName}`,
        handler: handlerName,
        description: methodDoc || `Вызов обработчика ${handlerName} в контроллере ${controllerName}`,
        sourceFile: filePath,
        sourceLine: lineNum,
        requestParams: params.length > 0 ? params : undefined,
        requestBody,
        requestSchema,
        requestExample,
        responseDto: respDto,
        responseBody: {
          modelName: respDto,
          isArray: isArr,
          properties: responseStatuses[0].properties,
          exampleJson: responseStatuses[0].exampleJson
        },
        responseSchema: `Task<${rawReturnType}>`,
        responseStatuses,
        responses: responseStatuses,
        tags: ['.NET C#', 'ASP.NET Core'],
        confidence: 0.97,
        status: 'active'
      });
    }
  }

  private static extractJsTsEndpoints(
    content: string,
    lines: string[],
    filePath: string,
    analysisRunId: string,
    out: ApiEndpoint[]
  ) {
    let nestBase = '';
    const nestControllerMatch = /@Controller\(\s*['"]?([^'")]+)?['"]?\s*\)/.exec(content);
    const controllerName = filePath.split('/').pop()?.replace(/\.(ts|js)/, '') || 'NestController';
    const controllerDoc = this.extractDocstring(content, 0);

    if (nestControllerMatch) {
      nestBase = nestControllerMatch[1] || '';
      const nestMethodRegex = /@(Get|Post|Put|Delete|Patch)\(\s*['"]?([^'")]+)?['"]?\s*\)/g;
      let match;
      while ((match = nestMethodRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase() as HttpMethod;
        const subPath = match[2] || '';
        const lineNum = content.substring(0, match.index).split('\n').length;
        const fullPath = `/${nestBase}/${subPath}`.replace(/\/+/g, '/');

        const afterMatch = content.substring(match.index);
        const methodMatch = /(async\s+)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)/.exec(afterMatch);
        const handlerName = methodMatch ? methodMatch[2] : 'handler';
        const methodDoc = this.extractDocstring(content, match.index);

        const respDto = method === 'GET' ? `${controllerName.replace('Controller', '')}ResponseDTO[]` : `${controllerName.replace('Controller', '')}ResponseDTO`;
        const respStatuses: ApiResponseSchema[] = [
          {
            statusCode: 200,
            description: 'Успешная обработка',
            modelName: respDto,
            properties: [
              { name: 'id', type: 'string', description: 'Идентификатор', required: true, example: 'nest-1' },
              { name: 'active', type: 'boolean', description: 'Активен', required: true, example: true }
            ],
            exampleJson: method === 'GET' ? [{ id: 'nest-1', active: true }] : { id: 'nest-1', active: true }
          },
          { statusCode: 400, description: 'Невалидные параметры' }
        ];

        let reqBody: any = undefined;
        if (method === 'POST' || method === 'PUT') {
          const reqDto = `${controllerName.replace('Controller', '')}CreateDto`;
          reqBody = {
            modelName: reqDto,
            isArray: false,
            properties: [
              { name: 'title', type: 'string', description: 'Заголовок', required: true, example: 'Запись NestJS' },
              { name: 'metadata', type: 'Record<string, any>', description: 'Дополнительные метаданные', required: false, example: { env: 'production' } }
            ],
            exampleJson: { title: 'Запись NestJS', metadata: { env: 'production' } }
          };
        }

        out.push({
          id: `ep-nest-${Date.now()}-${out.length}`,
          analysisRunId,
          method,
          path: subPath ? (subPath.startsWith('/') ? subPath : `/${subPath}`) : '/',
          fullPath,
          apiType: 'REST',
          controller: controllerName,
          controllerBasePath: `/${nestBase}` || '/',
          controllerDescription: controllerDoc || `NestJS REST контроллер ${controllerName}`,
          handler: handlerName,
          description: methodDoc || `Маршрут ${method} ${fullPath}`,
          sourceFile: filePath,
          sourceLine: lineNum,
          requestBody: reqBody,
          responseDto: respDto,
          responseBody: {
            modelName: respDto,
            isArray: method === 'GET',
            properties: respStatuses[0].properties,
            exampleJson: respStatuses[0].exampleJson
          },
          responseStatuses: respStatuses,
          responses: respStatuses,
          tags: ['NestJS', 'TypeScript'],
          confidence: 0.95,
          status: 'active'
        });
      }
    } else {
      // Express style: router.get('/users', handler)
      const expressRegex = /(?:router|app)\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = expressRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase() as HttpMethod;
        const routePath = match[2];
        const lineNum = content.substring(0, match.index).split('\n').length;
        const methodDoc = this.extractDocstring(content, match.index);

        const respDto = method === 'GET' ? `${controllerName}Item[]` : `${controllerName}Item`;
        const respStatuses: ApiResponseSchema[] = [
          {
            statusCode: 200,
            description: 'OK',
            modelName: respDto,
            properties: [{ name: 'success', type: 'boolean', description: 'Флаг успешности', required: true, example: true }],
            exampleJson: { success: true }
          }
        ];

        out.push({
          id: `ep-exp-${Date.now()}-${out.length}`,
          analysisRunId,
          method,
          path: routePath,
          fullPath: routePath,
          apiType: 'REST',
          controller: controllerName,
          controllerBasePath: '/',
          controllerDescription: controllerDoc || `Express Router ${controllerName}`,
          handler: 'anonymousHandler',
          description: methodDoc || `Express handler для ${method} ${routePath}`,
          sourceFile: filePath,
          sourceLine: lineNum,
          responseDto: respDto,
          responseStatuses: respStatuses,
          responses: respStatuses,
          tags: ['Express', 'JavaScript'],
          confidence: 0.92,
          status: 'active'
        });
      }
    }
  }

  private static extractCppEndpoints(
    content: string,
    lines: string[],
    filePath: string,
    analysisRunId: string,
    out: ApiEndpoint[]
  ) {
    const controllerName = filePath.split('/').pop()?.replace(/\.(cpp|hpp|h)/, '') || 'OatppController';
    const controllerDoc = this.extractDocstring(content, 0);

    // Oat++: ENDPOINT("GET", "/api/v1/quotes", getQuotes)
    const oatppRegex = /ENDPOINT\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*([a-zA-Z0-9_]+)\s*\)/g;
    let match;
    while ((match = oatppRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase() as HttpMethod;
      const routePath = match[2];
      const handler = match[3];
      const lineNum = content.substring(0, match.index).split('\n').length;
      const methodDoc = this.extractDocstring(content, match.index);

      const respDto = `${handler.charAt(0).toUpperCase() + handler.slice(1)}ResponseDto`;
      const respStatuses: ApiResponseSchema[] = [
        {
          statusCode: 200,
          description: 'C++ 200 OK',
          modelName: respDto,
          properties: [
            { name: 'statusCode', type: 'int', description: 'Статус код', required: true, example: 200 },
            { name: 'message', type: 'string', description: 'Сообщение Oat++', required: true, example: 'ok' }
          ],
          exampleJson: { statusCode: 200, message: 'ok' }
        }
      ];

      out.push({
        id: `ep-cpp-${Date.now()}-${out.length}`,
        analysisRunId,
        method,
        path: routePath,
        fullPath: routePath,
        apiType: 'REST',
        controller: controllerName,
        controllerBasePath: '/',
        controllerDescription: controllerDoc || `Высокопроизводительный C++ Oat++ контроллер ${controllerName}`,
        handler,
        description: methodDoc || `C++ контроллер-обработчик ${handler}() для ${method} ${routePath}`,
        sourceFile: filePath,
        sourceLine: lineNum,
        responseDto: respDto,
        responseStatuses: respStatuses,
        responses: respStatuses,
        tags: ['C++', 'Oat++'],
        confidence: 0.98,
        status: 'active'
      });
    }
  }
}
