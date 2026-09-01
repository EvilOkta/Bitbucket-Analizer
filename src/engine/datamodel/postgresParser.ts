import { ApiEndpoint, DataModel, EntityAttribute, EntityModel, EntityRelationship } from '../../shared/types';
import { FileEntry } from '../stack/stackDetector';

export class PostgresParser {
  public static parse(files: FileEntry[], analysisRunId: string, endpoints: ApiEndpoint[] = []): DataModel {
    const entities: EntityModel[] = [];
    const relationships: EntityRelationship[] = [];
    let detectedSource: DataModel['source'] = 'none';

    // 1. First Priority: Physical SQL DDL and Migrations
    this.parseSqlDdl(files, entities, relationships);
    if (entities.length > 0) {
      detectedSource = 'postgresql_ddl';
    }

    // 2. Second Priority: Prisma Schemas (*.prisma)
    if (entities.length === 0) {
      this.parsePrismaSchemas(files, entities, relationships);
      if (entities.length > 0) {
        detectedSource = 'prisma_schema';
      }
    }

    // 3. Third Priority: Python SQLAlchemy / Django ORM models
    if (entities.length === 0) {
      this.parsePythonOrm(files, entities, relationships);
      if (entities.length > 0) {
        detectedSource = 'python_orm';
      }
    }

    // 4. Fourth Priority: .NET C# Entity Framework Core entities
    if (entities.length === 0) {
      this.parseDotNetEfCore(files, entities, relationships);
      if (entities.length > 0) {
        detectedSource = 'dotnet_ef_core';
      }
    }

    // 5. Fifth Priority: TypeScript / Domain Entities & Interfaces
    if (entities.length === 0) {
      this.parseTypeScriptEntities(files, entities, relationships);
      if (entities.length > 0) {
        detectedSource = 'typescript_entities';
      }
    }

    // 6. Sixth Priority: JavaScript / TypeScript Object Structures & State Constants (Frontend)
    if (entities.length === 0) {
      this.parseJavaScriptObjectStructures(files, entities, relationships);
      if (entities.length > 0) {
        detectedSource = 'javascript_structures';
      }
    }

    // 7. Seventh Priority: Infer from extracted API Request/Response DTO models
    if (entities.length === 0 && endpoints && endpoints.length > 0) {
      this.parseFromApiEndpoints(endpoints, entities, relationships);
      if (entities.length > 0) {
        detectedSource = 'api_dtos';
      }
    }

    // 8. Auto-link relationships by ID naming convention & collection properties
    this.inferImplicitRelationships(entities, relationships);

    const erDiagramMermaid = this.generateMermaidErd(entities, relationships);
    const erDiagramPlantUml = this.generatePlantUmlErd(entities, relationships);

    return {
      id: `dm-${Date.now()}`,
      analysisRunId,
      source: detectedSource,
      version: '1.0',
      entities,
      relationships,
      erDiagramMermaid,
      erDiagramPlantUml
    };
  }

  // ==========================================
  // 1. SQL DDL Parser
  // ==========================================
  private static parseSqlDdl(files: FileEntry[], entities: EntityModel[], relationships: EntityRelationship[]) {
    const sqlFiles = files.filter(
      f => f.path.endsWith('.sql') || f.path.includes('migration') || f.path.includes('schema') || f.path.endsWith('.ddl')
    );

    for (const file of sqlFiles) {
      if (!file.content) continue;
      const ddl = file.content;
      // Regex for CREATE TABLE
      const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_."`]+)\s*\(([\s\S]*?)\)(?:\s*;|\s*$)/gi;
      let match;

      while ((match = createTableRegex.exec(ddl)) !== null) {
        const rawTableName = match[1].replace(/["'`]/g, '').split('.').pop() || 'table';
        const body = match[2];
        const lineNum = ddl.substring(0, match.index).split('\n').length;
        const attributes: EntityAttribute[] = [];

        const colDefs = this.splitColumnDefinitions(body);

        for (const line of colDefs) {
          // FK Constraints check: FOREIGN KEY (col) REFERENCES table(col)
          const fkMatch = /FOREIGN\s+KEY\s*\(([a-zA-Z0-9_]+)\)\s*REFERENCES\s+([a-zA-Z0-9_."`]+)\s*(?:\(([a-zA-Z0-9_]+)\))?/i.exec(line);
          if (fkMatch) {
            const srcCol = fkMatch[1];
            const targetTable = fkMatch[2].replace(/["'`]/g, '').split('.').pop() || '';
            const targetCol = fkMatch[3] || 'id';

            relationships.push({
              id: `rel-${rawTableName}-${targetTable}-${relationships.length}`,
              sourceEntityId: rawTableName,
              sourceEntityName: rawTableName,
              targetEntityId: targetTable,
              targetEntityName: targetTable,
              type: '1:N',
              foreignKeyName: `${rawTableName}.${srcCol} -> ${targetTable}.${targetCol}`,
              confidence: 0.98
            });

            const existingAttr = attributes.find(a => a.name === srcCol);
            if (existingAttr) {
              existingAttr.isForeignKey = true;
              existingAttr.foreignKeyTarget = `${targetTable}.${targetCol}`;
            }
            continue;
          }

          // Primary key constraint line
          const pkLineMatch = /PRIMARY\s+KEY\s*\(([a-zA-Z0-9_,\s]+)\)/i.exec(line);
          if (pkLineMatch) {
            const pkCols = pkLineMatch[1].split(',').map(c => c.trim());
            for (const pkCol of pkCols) {
              const attr = attributes.find(a => a.name === pkCol);
              if (attr) attr.isPrimaryKey = true;
            }
            continue;
          }

          // Regular column definition
          const parsedCol = this.parseColumnLine(line);
          if (parsedCol) {
            attributes.push({
              id: `attr-${rawTableName}-${parsedCol.name}`,
              name: parsedCol.name,
              physicalColumn: parsedCol.name,
              type: parsedCol.fullType,
              isPrimaryKey: parsedCol.isPk,
              isForeignKey: parsedCol.isFk,
              foreignKeyTarget: parsedCol.fkTarget,
              isNullable: parsedCol.isNullable,
              description: `${parsedCol.fullType} колонка таблицы ${rawTableName}`,
              sourceFile: file.path,
              sourceLine: lineNum
            });

            if (parsedCol.isFk && parsedCol.fkTarget) {
              const targetTable = parsedCol.fkTarget.split('.')[0];
              relationships.push({
                id: `rel-${rawTableName}-${targetTable}-${relationships.length}`,
                sourceEntityId: rawTableName,
                sourceEntityName: rawTableName,
                targetEntityId: targetTable,
                targetEntityName: targetTable,
                type: '1:N',
                foreignKeyName: `${rawTableName}.${parsedCol.name} -> ${parsedCol.fkTarget}`,
                confidence: 0.98
              });
            }
          }
        }

        if (!entities.some(e => e.name.toLowerCase() === rawTableName.toLowerCase())) {
          entities.push({
            id: `entity-${rawTableName.toLowerCase()}`,
            dataModelId: 'dm-sql',
            name: rawTableName,
            physicalTable: rawTableName,
            domain: rawTableName.includes('user') || rawTableName.includes('auth') || rawTableName.includes('account') ? 'Core / Auth' : 'Business Domain',
            description: `PostgreSQL таблица ${rawTableName}`,
            attributes,
            sourceFile: file.path,
            sourceLine: lineNum,
            sourceType: 'sql_ddl',
            sourceLabel: 'База данных (SQL DDL)'
          });
        }
      }

      // Parse standalone ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY
      const alterTableFkRegex = /ALTER\s+TABLE\s+(?:ONLY\s+)?([a-zA-Z0-9_."`]+)\s+ADD\s+CONSTRAINT\s+[a-zA-Z0-9_]+\s+FOREIGN\s+KEY\s*\(([a-zA-Z0-9_]+)\)\s*REFERENCES\s+([a-zA-Z0-9_."`]+)\s*(?:\(([a-zA-Z0-9_]+)\))?/gi;
      let alterMatch;
      while ((alterMatch = alterTableFkRegex.exec(ddl)) !== null) {
        const srcTable = alterMatch[1].replace(/["'`]/g, '').split('.').pop() || '';
        const srcCol = alterMatch[2];
        const targetTable = alterMatch[3].replace(/["'`]/g, '').split('.').pop() || '';
        const targetCol = alterMatch[4] || 'id';

        relationships.push({
          id: `rel-${srcTable}-${targetTable}-${relationships.length}`,
          sourceEntityId: srcTable,
          sourceEntityName: srcTable,
          targetEntityId: targetTable,
          targetEntityName: targetTable,
          type: '1:N',
          foreignKeyName: `${srcTable}.${srcCol} -> ${targetTable}.${targetCol}`,
          confidence: 0.99
        });
      }
    }
  }

  // ==========================================
  // 2. Prisma Schema Parser
  // ==========================================
  private static parsePrismaSchemas(files: FileEntry[], entities: EntityModel[], relationships: EntityRelationship[]) {
    const prismaFiles = files.filter(f => f.path.endsWith('.prisma') || f.content?.includes('datasource db'));
    for (const file of prismaFiles) {
      if (!file.content) continue;
      const modelRegex = /model\s+([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\}/g;
      let mMatch;
      while ((mMatch = modelRegex.exec(file.content)) !== null) {
        const modelName = mMatch[1];
        const body = mMatch[2];
        const lineNum = file.content.substring(0, mMatch.index).split('\n').length;
        const lines = body.split('\n');
        const attributes: EntityAttribute[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;

          const fieldMatch = /^([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_?\[\]]+)(.*)$/.exec(trimmed);
          if (fieldMatch) {
            const fieldName = fieldMatch[1];
            const rawType = fieldMatch[2];
            const rest = fieldMatch[3] || '';

            // Ignore relation fields that don't have @relation with fields parameter
            if (rawType.endsWith('[]') || (/^[A-Z]/.test(rawType) && !rest.includes('@relation'))) {
              continue;
            }

            const isPk = rest.includes('@id');
            const isFk = rest.includes('@relation') || fieldName.endsWith('Id');
            const isNullable = rawType.includes('?');

            let fkTarget: string | undefined;
            if (rest.includes('@relation')) {
              const relMatch = /references:\s*\[([a-zA-Z0-9_]+)\]/.exec(rest);
              const targetCol = relMatch ? relMatch[1] : 'id';
              fkTarget = `${rawType.replace('?', '')}.${targetCol}`;
            }

            attributes.push({
              id: `attr-${modelName}-${fieldName}`,
              name: fieldName,
              physicalColumn: fieldName,
              type: rawType.replace('?', '').toUpperCase(),
              isPrimaryKey: isPk,
              isForeignKey: isFk,
              foreignKeyTarget: fkTarget,
              isNullable,
              sourceFile: file.path,
              sourceLine: lineNum
            });

            if (isFk && fkTarget) {
              const targetTable = fkTarget.split('.')[0];
              relationships.push({
                id: `rel-${modelName}-${targetTable}-${relationships.length}`,
                sourceEntityId: modelName,
                sourceEntityName: modelName,
                targetEntityId: targetTable,
                targetEntityName: targetTable,
                type: '1:N',
                foreignKeyName: `${modelName}.${fieldName} -> ${fkTarget}`,
                confidence: 0.99
              });
            }
          }
        }

        if (attributes.length > 0 && !entities.some(e => e.name.toLowerCase() === modelName.toLowerCase())) {
          entities.push({
            id: `entity-${modelName.toLowerCase()}`,
            dataModelId: 'dm-prisma',
            name: modelName,
            physicalTable: modelName.toLowerCase() + 's',
            domain: 'Prisma Domain',
            description: `Prisma ORM сущность ${modelName}`,
            attributes,
            sourceFile: file.path,
            sourceLine: lineNum,
            sourceType: 'prisma',
            sourceLabel: 'Prisma Schema'
          });
        }
      }
    }
  }

  // ==========================================
  // 3. Python SQLAlchemy / Django ORM Parser
  // ==========================================
  private static parsePythonOrm(files: FileEntry[], entities: EntityModel[], relationships: EntityRelationship[]) {
    const pyFiles = files.filter(f => f.path.endsWith('.py') && (f.path.includes('model') || f.path.includes('entity') || f.path.includes('schema') || f.path.includes('db')));

    for (const file of pyFiles) {
      if (!file.content) continue;
      const classRegex = /class\s+([a-zA-Z0-9_]+)\s*(?:\([^)]*\))?\s*:/g;
      let cMatch;

      while ((cMatch = classRegex.exec(file.content)) !== null) {
        const className = cMatch[1];
        if (className === 'Config' || className === 'Base' || className.endsWith('Schema') || className.endsWith('DTO')) continue;

        const classIndex = cMatch.index;
        const remaining = file.content.substring(classIndex);
        const classBody = remaining.split(/\n(?=class\s|\ndef\s|$)/)[0] || '';

        const attributes: EntityAttribute[] = [];
        const lines = classBody.split('\n');

        let tableName = className.toLowerCase() + 's';
        const tableMatch = /__tablename__\s*=\s*['"]([a-zA-Z0-9_]+)['"]/i.exec(classBody);
        if (tableMatch) tableName = tableMatch[1];

        for (const line of lines) {
          const trimmed = line.trim();
          // SQLAlchemy Column(Type)
          const saMatch = /([a-zA-Z0-9_]+)\s*(?::\s*[^=]+)?\s*=\s*Column\s*\(([\s\S]*?)\)/i.exec(trimmed);
          if (saMatch) {
            const colName = saMatch[1];
            const colDef = saMatch[2];
            const isPk = /primary_key\s*=\s*True/i.test(colDef);
            const isFk = /ForeignKey\s*\(\s*['"]([a-zA-Z0-9_.]+)['"]\s*\)/i.exec(colDef);
            const typeMatch = /([a-zA-Z0-9_]+)/.exec(colDef);
            const colType = typeMatch ? typeMatch[1].toUpperCase() : 'VARCHAR';

            attributes.push({
              id: `attr-${className}-${colName}`,
              name: colName,
              physicalColumn: colName,
              type: colType,
              isPrimaryKey: isPk,
              isForeignKey: !!isFk,
              foreignKeyTarget: isFk ? isFk[1] : undefined,
              isNullable: !/nullable\s*=\s*False/i.test(colDef) && !isPk
            });

            if (isFk) {
              const targetTbl = isFk[1].split('.')[0];
              relationships.push({
                id: `rel-${tableName}-${targetTbl}-${relationships.length}`,
                sourceEntityId: tableName,
                sourceEntityName: tableName,
                targetEntityId: targetTbl,
                targetEntityName: targetTbl,
                type: '1:N',
                foreignKeyName: `${tableName}.${colName} -> ${isFk[1]}`,
                confidence: 0.95
              });
            }
          }

          // Django models.Field
          const djMatch = /([a-zA-Z0-9_]+)\s*=\s*models\.([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)/i.exec(trimmed);
          if (djMatch) {
            const colName = djMatch[1];
            const fieldType = djMatch[2];
            const fieldParams = djMatch[3];
            const isPk = /primary_key\s*=\s*True/i.test(fieldParams);

            if (fieldType === 'ForeignKey' || fieldType === 'OneToOneField') {
              const targetMatch = /['"]?([a-zA-Z0-9_]+)['"]?/i.exec(fieldParams);
              const targetName = targetMatch ? targetMatch[1].toLowerCase() + 's' : 'target';
              attributes.push({
                id: `attr-${className}-${colName}_id`,
                name: `${colName}_id`,
                physicalColumn: `${colName}_id`,
                type: 'UUID',
                isPrimaryKey: false,
                isForeignKey: true,
                foreignKeyTarget: `${targetName}.id`,
                isNullable: /null\s*=\s*True/i.test(fieldParams)
              });

              relationships.push({
                id: `rel-${tableName}-${targetName}-${relationships.length}`,
                sourceEntityId: tableName,
                sourceEntityName: tableName,
                targetEntityId: targetName,
                targetEntityName: targetName,
                type: fieldType === 'OneToOneField' ? '1:1' : '1:N',
                foreignKeyName: `${tableName}.${colName}_id -> ${targetName}.id`,
                confidence: 0.95
              });
            } else {
              attributes.push({
                id: `attr-${className}-${colName}`,
                name: colName,
                physicalColumn: colName,
                type: fieldType.replace('Field', '').toUpperCase() || 'VARCHAR',
                isPrimaryKey: isPk,
                isForeignKey: false,
                isNullable: /null\s*=\s*True/i.test(fieldParams)
              });
            }
          }
        }

        if (attributes.length > 0 && !entities.some(e => e.name.toLowerCase() === className.toLowerCase())) {
          entities.push({
            id: `entity-${className.toLowerCase()}`,
            dataModelId: 'dm-python',
            name: className,
            physicalTable: tableName,
            domain: 'Python Domain',
            description: `Python ORM модель ${className}`,
            attributes,
            sourceFile: file.path,
            sourceLine: file.content.substring(0, cMatch.index).split('\n').length,
            sourceType: 'python_orm',
            sourceLabel: 'Python ORM (SQLAlchemy/Django)'
          });
        }
      }
    }
  }

  // ==========================================
  // 4. .NET C# Entity Framework Core Parser
  // ==========================================
  private static parseDotNetEfCore(files: FileEntry[], entities: EntityModel[], relationships: EntityRelationship[]) {
    const csFiles = files.filter(f => f.path.endsWith('.cs') && (f.path.includes('Models') || f.path.includes('Entities') || f.path.includes('Data') || f.path.includes('Domain')));

    for (const file of csFiles) {
      if (!file.content) continue;
      const classRegex = /(?:\[Table\(["']([^"']+)["']\)\]\s*)?public\s+(?:sealed\s+|partial\s+)?class\s+([a-zA-Z0-9_]+)(?:\s*:\s*[^{]+)?\s*\{([\s\S]*?)\}/g;
      let cMatch;

      while ((cMatch = classRegex.exec(file.content)) !== null) {
        const customTable = cMatch[1];
        const className = cMatch[2];
        if (className.endsWith('Controller') || className.endsWith('Service') || className.endsWith('Repository') || className.endsWith('Context')) continue;

        const body = cMatch[3];
        const lineNum = file.content.substring(0, cMatch.index).split('\n').length;
        const attributes: EntityAttribute[] = [];
        const lines = body.split('\n');

        for (const line of lines) {
          const propMatch = /public\s+([a-zA-Z0-9_<>?]+)\s+([a-zA-Z0-9_]+)\s*\{\s*get;\s*set;\s*\}/i.exec(line.trim());
          if (propMatch) {
            const rawType = propMatch[1];
            const propName = propMatch[2];

            // Check if navigation property pointing to another entity
            if (rawType.startsWith('ICollection') || rawType.startsWith('List') || rawType.startsWith('IEnumerable')) {
              continue;
            }

            const isPk = propName.toLowerCase() === 'id' || propName.toLowerCase() === `${className.toLowerCase()}id`;
            const isFk = propName.toLowerCase().endsWith('id') && !isPk;

            attributes.push({
              id: `attr-${className}-${propName}`,
              name: propName,
              physicalColumn: propName.toLowerCase(),
              type: this.mapDotNetTypeToSql(rawType),
              isPrimaryKey: isPk,
              isForeignKey: isFk,
              isNullable: rawType.includes('?'),
              sourceFile: file.path,
              sourceLine: lineNum
            });
          }
        }

        if (attributes.length > 0 && !entities.some(e => e.name.toLowerCase() === className.toLowerCase())) {
          entities.push({
            id: `entity-${className.toLowerCase()}`,
            dataModelId: 'dm-dotnet',
            name: className,
            physicalTable: customTable || className.toLowerCase() + 's',
            domain: 'Domain Entity',
            description: `.NET C# EF Core сущность ${className}`,
            attributes,
            sourceFile: file.path,
            sourceLine: lineNum,
            sourceType: 'dotnet_ef',
            sourceLabel: '.NET EF Core (C#)'
          });
        }
      }
    }
  }

  // ==========================================
  // 5. TypeScript / TypeORM / Domain Entities Parser (All Code Files)
  // ==========================================
  private static parseTypeScriptEntities(files: FileEntry[], entities: EntityModel[], relationships: EntityRelationship[]) {
    const tsFiles = files.filter(f => 
      (f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.d.ts')) && 
      !f.path.endsWith('.test.ts') && !f.path.endsWith('.spec.ts')
    );

    const seenNames = new Set(entities.map(e => e.name.toLowerCase()));

    for (const file of tsFiles) {
      if (!file.content) continue;

      // 5.1 Parse TypeScript Enums (e.g. enum TaskStatus { OPEN = 'OPEN', CLOSED = 'CLOSED' })
      const enumRegex = /(?:export\s+)?enum\s+([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\}/g;
      let eMatch;
      while ((eMatch = enumRegex.exec(file.content)) !== null) {
        const enumName = eMatch[1];
        const enumBody = eMatch[2];
        const lineNum = file.content.substring(0, eMatch.index).split('\n').length;
        const values: string[] = [];
        const lines = enumBody.split('\n');
        for (const l of lines) {
          const trimmed = l.trim().replace(/,$/, '');
          if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;
          const kvMatch = /([a-zA-Z0-9_]+)(?:\s*=\s*['"`]([^'"`]+)['"`]|\s*=\s*(\d+))?/.exec(trimmed);
          if (kvMatch) {
            const val = kvMatch[2] || kvMatch[1];
            values.push(val);
          }
        }
        if (values.length > 0 && !seenNames.has(enumName.toLowerCase())) {
          seenNames.add(enumName.toLowerCase());
          entities.push({
            id: `enum-${enumName.toLowerCase()}`,
            dataModelId: 'dm-enum',
            name: enumName,
            physicalTable: enumName.toLowerCase() + '_enum',
            domain: 'Перечисления (Enums)',
            description: `TypeScript перечисление ${enumName} (${values.join(', ')})`,
            sourceType: 'enum',
            sourceLabel: 'ENUM Перечисление',
            isEnum: true,
            enumValues: values,
            attributes: values.map((val, idx) => ({
              id: `attr-${enumName}-${idx}`,
              name: val,
              physicalColumn: `val_${idx + 1}`,
              type: 'VARCHAR',
              isPrimaryKey: false,
              isForeignKey: false,
              isNullable: false,
              description: `Значение: ${val}`,
              sourceFile: file.path,
              sourceLine: lineNum
            })),
            sourceFile: file.path,
            sourceLine: lineNum
          });
        }
      }

      // 5.2 Parse TypeScript Union Types (e.g. export type FileCategory = 'controller' | 'service' | 'dto')
      const typeUnionRegex = /(?:export\s+)?type\s+([a-zA-Z0-9_]+)\s*=\s*([\s\S]*?);/g;
      let tuMatch;
      while ((tuMatch = typeUnionRegex.exec(file.content)) !== null) {
        const typeName = tuMatch[1];
        const typeBody = tuMatch[2].trim();
        const lineNum = file.content.substring(0, tuMatch.index).split('\n').length;

        if (typeName.endsWith('Props') || typeName.endsWith('State') || typeName.endsWith('Context')) continue;

        // Check if union of string literals
        const strLitRegex = /['"`]([^'"`\\]*(?:\\.[^'"`\\]*)*)['"`]/g;
        const unionValues: string[] = [];
        let sm;
        while ((sm = strLitRegex.exec(typeBody)) !== null) {
          if (sm[1].trim()) unionValues.push(sm[1].trim());
        }

        if (unionValues.length >= 2 && !seenNames.has(typeName.toLowerCase())) {
          seenNames.add(typeName.toLowerCase());
          entities.push({
            id: `enum-${typeName.toLowerCase()}`,
            dataModelId: 'dm-enum',
            name: typeName,
            physicalTable: typeName.toLowerCase() + '_enum',
            domain: 'Перечисления (Enums)',
            description: `TypeScript строковое перечисление ${typeName} (${unionValues.join(', ')})`,
            sourceType: 'enum',
            sourceLabel: 'ENUM Перечисление',
            isEnum: true,
            enumValues: unionValues,
            attributes: unionValues.map((val, idx) => ({
              id: `attr-${typeName}-${idx}`,
              name: val,
              physicalColumn: `val_${idx + 1}`,
              type: 'VARCHAR',
              isPrimaryKey: false,
              isForeignKey: false,
              isNullable: false,
              description: `Значение: ${val}`,
              sourceFile: file.path,
              sourceLine: lineNum
            })),
            sourceFile: file.path,
            sourceLine: lineNum
          });
        }
      }

      // 5.3 Parse TypeScript Interfaces & Classes
      const declRegex = /(?:export\s+)?(?:interface|type|class)\s+([a-zA-Z0-9_]+)(?:\s*=\s*|\s*extends\s*[^{]+|\s*)(\{[\s\S]*?\})/g;
      let dMatch;

      while ((dMatch = declRegex.exec(file.content)) !== null) {
        const entityName = dMatch[1];
        if (entityName.endsWith('Props') || entityName.endsWith('State') || entityName.endsWith('Context') || entityName.endsWith('View') || entityName.endsWith('Handler')) continue;

        const body = dMatch[2];
        const attributes: EntityAttribute[] = [];
        const lines = body.replace(/[{}]/g, '').split('\n');
        let currentComment = '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('//')) {
            currentComment = trimmed.replace(/^\/\/\s*/, '');
            continue;
          }
          if (trimmed.startsWith('/**') || trimmed.startsWith('*')) {
            const clean = trimmed.replace(/^\/\*+\s*|\*+\/|\s*\*\s*/g, '').trim();
            if (clean && !clean.startsWith('@')) {
              currentComment = clean;
            }
            continue;
          }

          const propMatch = /^\s*([a-zA-Z0-9_]+)(\?)?:\s*([^;,]+)/i.exec(line);
          if (propMatch) {
            const propName = propMatch[1];
            const isOptional = !!propMatch[2];
            const rawPropType = propMatch[3].trim();
            const propType = rawPropType.split('//')[0].split('/*')[0].trim();
            const isPk = propName.toLowerCase() === 'id' || propName.toLowerCase() === '_id' || propName.toLowerCase() === 'key';
            const isFk = (propName.toLowerCase().endsWith('id') || propName.toLowerCase().endsWith('_id')) && !isPk;

            let description = currentComment;
            const inlineCommentMatch = /\/\/\s*([^\r\n]+)|\/\*\s*([^*]+)\*\//.exec(line);
            if (inlineCommentMatch) {
              description = (inlineCommentMatch[1] || inlineCommentMatch[2] || '').trim();
            }

            attributes.push({
              id: `attr-ts-${entityName}-${propName}`,
              name: propName,
              physicalColumn: propName,
              type: this.mapTsTypeToSql(propType),
              isPrimaryKey: isPk,
              isForeignKey: isFk,
              isNullable: isOptional,
              description: description || undefined,
              sourceFile: file.path,
              sourceLine: file.content.substring(0, dMatch.index + dMatch[0].indexOf(line)).split('\n').length
            });

            currentComment = '';
          }
        }

        if (attributes.length >= 2 && !seenNames.has(entityName.toLowerCase())) {
          seenNames.add(entityName.toLowerCase());
          entities.push({
            id: `entity-${entityName.toLowerCase()}`,
            dataModelId: 'dm-ts',
            name: entityName,
            physicalTable: entityName.toLowerCase() + 's',
            domain: this.deriveDomainFromFile(file.path),
            description: `TypeScript структура данных ${entityName} (${file.path.split(/[/\\]/).pop()})`,
            attributes,
            sourceFile: file.path,
            sourceLine: file.content.substring(0, dMatch.index).split('\n').length,
            sourceType: 'ts_interface',
            sourceLabel: 'TypeScript Интерфейс'
          });
        }
      }
    }
  }

  // ==========================================
  // 6. JavaScript / TypeScript Object Structures & State Models Parser
  // ==========================================
  private static parseJavaScriptObjectStructures(files: FileEntry[], entities: EntityModel[], relationships: EntityRelationship[]) {
    const codeFiles = files.filter(f => 
      (f.path.endsWith('.js') || f.path.endsWith('.jsx') || f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.vue') || f.path.endsWith('.svelte') || f.path.endsWith('.mjs')) &&
      !f.path.endsWith('.test.js') && !f.path.endsWith('.test.ts') && !f.path.endsWith('.spec.js') && !f.path.endsWith('.spec.ts') && !f.path.endsWith('.d.ts')
    );

    const seenNames = new Set(entities.map(e => e.name.toLowerCase()));

    for (const file of codeFiles) {
      if (!file.content) continue;
      const content = file.content;

      // Pattern 1: Nested object maps e.g.
      // nodesMap = { 'Корень': { id: ..., label: ..., path: ..., depth: ..., categories: ..., files: ... } }
      // or const folderGraph = { root: { id: ..., ... } }
      const mapRegex = /(?:const|let|var|export\s+const)\s+([a-zA-Z0-9_]+)\s*=\s*\{([\s\S]*?)\n\s*\};?/g;
      let mapMatch;
      while ((mapMatch = mapRegex.exec(content)) !== null) {
        const varName = mapMatch[1];
        const objBody = mapMatch[2];
        const lineNum = content.substring(0, mapMatch.index).split('\n').length;

        // Check if inside objBody there is a sub-object with 3+ properties
        const subObjRegex = /(?:['"`]?([a-zA-Z0-9_а-яА-ЯёЁ\s-]+)['"`]?\s*:\s*\{)([\s\S]*?)(?:\n\s*\})/g;
        let subMatch;
        let foundSubObj = false;

        while ((subMatch = subObjRegex.exec(objBody)) !== null) {
          const subKey = subMatch[1].trim();
          const subBody = subMatch[2];
          const entityName = this.deriveEntityName(varName, subKey);
          const attrs = this.extractAttributesFromObjectLiteral(subBody, file, lineNum, entities, relationships, entityName);

          if (attrs.length >= 3) {
            foundSubObj = true;
            if (!seenNames.has(entityName.toLowerCase())) {
              seenNames.add(entityName.toLowerCase());
              entities.push({
                id: `entity-${entityName.toLowerCase()}`,
                dataModelId: 'dm-js',
                name: entityName,
                physicalTable: entityName.toLowerCase() + 's',
                domain: this.deriveDomainFromFile(file.path),
                description: `Структура данных ${entityName} (извлечена из ${file.path.split(/[/\\]/).pop()})`,
                attributes: attrs,
                sourceFile: file.path,
                sourceLine: lineNum,
                sourceType: 'js_structure',
                sourceLabel: 'JavaScript Структура'
              });
            }
          }
        }

        // If no sub-objects, check if the var itself is a flat structured object with 3+ properties
        if (!foundSubObj) {
          const entityName = this.deriveEntityName(varName, '');
          const directAttrs = this.extractAttributesFromObjectLiteral(objBody, file, lineNum, entities, relationships, entityName);
          if (directAttrs.length >= 3) {
            const hasDataField = directAttrs.some(a => 
              ['id', '_id', 'name', 'title', 'label', 'path', 'type', 'status', 'createdat', 'created_at', 'depth', 'count', 'code'].includes(a.name.toLowerCase())
            );
            if (hasDataField) {
              if (!seenNames.has(entityName.toLowerCase()) && !this.isIgnoredVariableName(varName)) {
                seenNames.add(entityName.toLowerCase());
                entities.push({
                  id: `entity-${entityName.toLowerCase()}`,
                  dataModelId: 'dm-js',
                  name: entityName,
                  physicalTable: entityName.toLowerCase() + 's',
                  domain: this.deriveDomainFromFile(file.path),
                  description: `Объектная модель ${entityName} (извлечена из ${file.path.split(/[/\\]/).pop()})`,
                  attributes: directAttrs,
                  sourceFile: file.path,
                  sourceLine: lineNum,
                  sourceType: 'js_structure',
                  sourceLabel: 'JavaScript Структура'
                });
              }
            }
          }
        }
      }

      // Pattern 2: Array of sample objects e.g. const mockFiles = [ { id: '', fileName: '', size: 0, folderId: '' } ]
      const arrayObjRegex = /(?:const|let|var|export\s+const)\s+([a-zA-Z0-9_]+)\s*=\s*\[\s*\{([\s\S]*?)\}\s*(?:,|\s*\])/g;
      let arrMatch;
      while ((arrMatch = arrayObjRegex.exec(content)) !== null) {
        const varName = arrMatch[1];
        const sampleBody = arrMatch[2];
        const lineNum = content.substring(0, arrMatch.index).split('\n').length;
        const entityName = this.deriveEntityName(varName, '');
        const attrs = this.extractAttributesFromObjectLiteral(sampleBody, file, lineNum, entities, relationships, entityName);
        if (attrs.length >= 2) {
          if (!seenNames.has(entityName.toLowerCase()) && !this.isIgnoredVariableName(varName)) {
            seenNames.add(entityName.toLowerCase());
            entities.push({
              id: `entity-${entityName.toLowerCase()}`,
              dataModelId: 'dm-js',
              name: entityName,
              physicalTable: entityName.toLowerCase() + 's',
              domain: this.deriveDomainFromFile(file.path),
              description: `Коллекция сущностей ${entityName} (извлечена из ${file.path.split(/[/\\]/).pop()})`,
              attributes: attrs,
              sourceFile: file.path,
              sourceLine: lineNum,
              sourceType: 'js_structure',
              sourceLabel: 'JavaScript Структура'
            });
          }
        }
      }
    }
  }

  // ==========================================
  // 7. Infer from Extracted API DTOs
  // ==========================================
  private static parseFromApiEndpoints(endpoints: ApiEndpoint[], entities: EntityModel[], relationships: EntityRelationship[]) {
    const seenDtos = new Set<string>();

    for (const ep of endpoints) {
      // 1. From request body
      if (ep.requestBody && ep.requestBody.modelName && ep.requestBody.properties && ep.requestBody.properties.length > 0) {
        const name = ep.requestBody.modelName.replace(/DTO$/i, '').replace(/Request$/i, '');
        if (name && !seenDtos.has(name.toLowerCase())) {
          seenDtos.add(name.toLowerCase());
          const attrs: EntityAttribute[] = ep.requestBody.properties.map(p => ({
            id: `attr-${name}-${p.name}`,
            name: p.name,
            physicalColumn: p.name,
            type: p.type.toUpperCase() || 'VARCHAR',
            isPrimaryKey: p.name.toLowerCase() === 'id' || p.name.toLowerCase() === 'accountid',
            isForeignKey: p.name.toLowerCase().endsWith('id') && p.name.toLowerCase() !== 'id',
            isNullable: !p.required,
            description: p.description,
            sourceFile: ep.sourceFile,
            sourceLine: ep.sourceLine
          }));

          entities.push({
            id: `entity-${name.toLowerCase()}`,
            dataModelId: 'dm-api',
            name,
            physicalTable: name.toLowerCase() + 's',
            domain: ep.controller || 'API Domain',
            description: `Логическая модель ${name} (извлечена из API спецификации)`,
            attributes: attrs,
            sourceFile: ep.sourceFile,
            sourceLine: ep.sourceLine || 1,
            sourceType: 'api_dto',
            sourceLabel: 'API DTO Модель'
          });
        }
      }

      // 2. From response body
      if (ep.responseBody && ep.responseBody.modelName && ep.responseBody.properties && ep.responseBody.properties.length > 0) {
        const name = ep.responseBody.modelName.replace(/DTO$/i, '').replace(/Response$/i, '').replace(/Result$/i, '');
        if (name && !seenDtos.has(name.toLowerCase())) {
          seenDtos.add(name.toLowerCase());
          const attrs: EntityAttribute[] = ep.responseBody.properties.map(p => ({
            id: `attr-${name}-${p.name}`,
            name: p.name,
            physicalColumn: p.name,
            type: p.type.toUpperCase() || 'VARCHAR',
            isPrimaryKey: p.name.toLowerCase() === 'id' || p.name.toLowerCase().endsWith('id'),
            isForeignKey: false,
            isNullable: !p.required,
            description: p.description,
            sourceFile: ep.sourceFile,
            sourceLine: ep.sourceLine
          }));

          entities.push({
            id: `entity-${name.toLowerCase()}`,
            dataModelId: 'dm-api',
            name,
            physicalTable: name.toLowerCase() + 's',
            domain: ep.controller || 'API Domain',
            description: `Логическая модель ${name} (извлечена из API ответов)`,
            attributes: attrs,
            sourceFile: ep.sourceFile,
            sourceLine: ep.sourceLine || 1,
            sourceType: 'api_dto',
            sourceLabel: 'API DTO Модель'
          });
        }
      }
    }
  }

  // ==========================================
  // Implicit Relationships Resolution (IDs, Tree, Enums & System Types)
  // ==========================================
  private static inferImplicitRelationships(entities: EntityModel[], relationships: EntityRelationship[]) {
    const existingPairs = new Set(relationships.map(r => `${r.sourceEntityName.toLowerCase()}_${r.targetEntityName.toLowerCase()}`));

    // Known System Types Dictionary
    const SYSTEM_TYPES: Record<string, { name: string; desc: string; attrs: { name: string; type: string; isPk?: boolean; desc: string }[] }> = {
      file: {
        name: 'File',
        desc: 'Системный тип данных: файл или дескриптор файла',
        attrs: [
          { name: 'id', type: 'UUID', isPk: true, desc: 'Системный ID файла' },
          { name: 'name', type: 'VARCHAR(255)', desc: 'Имя файла' },
          { name: 'path', type: 'VARCHAR(500)', desc: 'Путь к файлу' },
          { name: 'size', type: 'INTEGER', desc: 'Размер в байтах' },
          { name: 'content', type: 'TEXT', desc: 'Содержимое файла' }
        ]
      },
      filenode: {
        name: 'FileNode',
        desc: 'Системный тип данных: узел файлового дерева проекта',
        attrs: [
          { name: 'id', type: 'UUID', isPk: true, desc: 'Идентификатор узла' },
          { name: 'path', type: 'VARCHAR(500)', desc: 'Относительный путь' },
          { name: 'type', type: 'VARCHAR(30)', desc: 'Тип (file/directory)' },
          { name: 'sizeBytes', type: 'INTEGER', desc: 'Размер узла в байтах' }
        ]
      },
      folder: {
        name: 'Folder',
        desc: 'Системный тип данных: каталог или папка файлов',
        attrs: [
          { name: 'id', type: 'UUID', isPk: true, desc: 'Системный ID каталога' },
          { name: 'name', type: 'VARCHAR(255)', desc: 'Имя каталога' },
          { name: 'path', type: 'VARCHAR(500)', desc: 'Путь к каталогу' },
          { name: 'childCount', type: 'INTEGER', desc: 'Количество дочерних файлов' }
        ]
      },
      foldernode: {
        name: 'FolderNode',
        desc: 'Системный тип данных: узел структуры директорий',
        attrs: [
          { name: 'id', type: 'UUID', isPk: true, desc: 'Идентификатор директории' },
          { name: 'name', type: 'VARCHAR(255)', desc: 'Имя директории' },
          { name: 'path', type: 'VARCHAR(500)', desc: 'Полный путь к директории' }
        ]
      },
      system: {
        name: 'System',
        desc: 'Системный тип данных: системный контекст и окружение',
        attrs: [
          { name: 'id', type: 'UUID', isPk: true, desc: 'Идентификатор системы' },
          { name: 'platform', type: 'VARCHAR(50)', desc: 'Платформа ОС (win32/linux/darwin)' },
          { name: 'arch', type: 'VARCHAR(20)', desc: 'Архитектура процессора' },
          { name: 'version', type: 'VARCHAR(50)', desc: 'Версия операционной системы' }
        ]
      },
      blob: {
        name: 'Blob',
        desc: 'Системный тип данных: бинарный объект (BLOB / Buffer)',
        attrs: [
          { name: 'id', type: 'UUID', isPk: true, desc: 'Хеш / ID блоба' },
          { name: 'mimeType', type: 'VARCHAR(100)', desc: 'MIME-тип данных' },
          { name: 'size', type: 'INTEGER', desc: 'Размер в байтах' }
        ]
      },
      stream: {
        name: 'Stream',
        desc: 'Системный тип данных: поток данных (Readable/Writable)',
        attrs: [
          { name: 'id', type: 'UUID', isPk: true, desc: 'Идентификатор потока' },
          { name: 'readable', type: 'BOOLEAN', desc: 'Доступен для чтения' },
          { name: 'writable', type: 'BOOLEAN', desc: 'Доступен для записи' }
        ]
      }
    };

    // System entity generator helper
    const ensureSystemEntity = (sysKey: string): EntityModel | null => {
      const def = SYSTEM_TYPES[sysKey.toLowerCase()];
      if (!def) return null;
      let existing = entities.find(e => e.name.toLowerCase() === def.name.toLowerCase());
      if (!existing) {
        existing = {
          id: `sys-${def.name.toLowerCase()}`,
          dataModelId: 'dm-sys',
          name: def.name,
          physicalTable: def.name.toLowerCase() + '_sys',
          domain: 'Системные типы',
          description: def.desc,
          sourceType: 'system_type',
          sourceLabel: 'Системный тип',
          isSystemType: true,
          attributes: def.attrs.map(a => ({
            id: `attr-sys-${def.name}-${a.name}`,
            name: a.name,
            physicalColumn: a.name,
            type: a.type,
            isPrimaryKey: !!a.isPk,
            isForeignKey: false,
            isNullable: !a.isPk,
            description: a.desc
          }))
        };
        entities.push(existing);
      }
      return existing;
    };

    // Helper to ensure sourceType & sourceLabel on all entities
    entities.forEach(ent => {
      if (!ent.sourceType) {
        if (ent.isEnum) {
          ent.sourceType = 'enum';
          ent.sourceLabel = 'ENUM Перечисление';
        } else if (ent.isSystemType) {
          ent.sourceType = 'system_type';
          ent.sourceLabel = 'Системный тип';
        } else if (ent.dataModelId === 'dm-sql') {
          ent.sourceType = 'sql_ddl';
          ent.sourceLabel = 'База данных (SQL DDL)';
        } else if (ent.dataModelId === 'dm-prisma') {
          ent.sourceType = 'prisma';
          ent.sourceLabel = 'Prisma Schema';
        } else if (ent.dataModelId === 'dm-python') {
          ent.sourceType = 'python_orm';
          ent.sourceLabel = 'Python ORM (SQLAlchemy/Django)';
        } else if (ent.dataModelId === 'dm-dotnet') {
          ent.sourceType = 'dotnet_ef';
          ent.sourceLabel = '.NET EF Core (C#)';
        } else if (ent.dataModelId === 'dm-ts') {
          ent.sourceType = 'ts_interface';
          ent.sourceLabel = 'TypeScript Интерфейс';
        } else if (ent.dataModelId === 'dm-js') {
          ent.sourceType = 'js_structure';
          ent.sourceLabel = 'JavaScript Структура';
        } else if (ent.dataModelId === 'dm-api') {
          ent.sourceType = 'api_dto';
          ent.sourceLabel = 'API DTO Модель';
        } else {
          ent.sourceType = 'js_structure';
          ent.sourceLabel = 'Структура данных';
        }
      }
    });

    for (const ent of entities) {
      for (const attr of ent.attributes) {
        const colLower = attr.name.toLowerCase();

        // 1. Self-referencing tree relation (parentId -> Entity.id)
        if (colLower === 'parentid' || colLower === 'parent_id') {
          attr.isForeignKey = true;
          attr.foreignKeyTarget = `${ent.name}.id`;
          const pairKey = `${ent.name.toLowerCase()}_${ent.name.toLowerCase()}_parent`;
          if (!existingPairs.has(pairKey)) {
            existingPairs.add(pairKey);
            relationships.push({
              id: `rel-tree-${ent.name}-${relationships.length}`,
              sourceEntityId: ent.name,
              sourceEntityName: ent.name,
              targetEntityId: ent.name,
              targetEntityName: ent.name,
              type: '1:N',
              foreignKeyName: `${ent.name}.${attr.name} -> ${ent.name}.id`,
              confidence: 0.95
            });
          }
          continue;
        }

        // 2. System Types Matching (e.g. file, folder, system, filenode, foldernode, blob, stream)
        const checkSystemKey = Object.keys(SYSTEM_TYPES).find(k => {
          const typeClean = attr.type.replace(/\s*(ARRAY|SET|ENUM)$/i, '').toLowerCase();
          return k === colLower || k === typeClean || (colLower.startsWith(k) && colLower.length <= k.length + 4) || (typeClean.startsWith(k) && typeClean.length <= k.length + 4);
        });

        if (checkSystemKey && ent.name.toLowerCase() !== SYSTEM_TYPES[checkSystemKey].name.toLowerCase()) {
          const sysEnt = ensureSystemEntity(checkSystemKey);
          if (sysEnt) {
            const isArray = attr.type.includes('ARRAY') || attr.type.includes('SET');
            attr.isForeignKey = true;
            attr.foreignKeyTarget = `${sysEnt.name}.id`;
            if (attr.type === 'VARCHAR' || attr.type === 'OBJECT' || !attr.type.includes('(')) {
              attr.type = isArray ? `${sysEnt.name.toUpperCase()} ARRAY` : sysEnt.name.toUpperCase();
            }
            const pairKey = `${ent.name.toLowerCase()}_${sysEnt.name.toLowerCase()}`;
            if (!existingPairs.has(pairKey)) {
              existingPairs.add(pairKey);
              relationships.push({
                id: `rel-sys-${ent.name}-${sysEnt.name}-${relationships.length}`,
                sourceEntityId: ent.name,
                sourceEntityName: ent.name,
                targetEntityId: sysEnt.name,
                targetEntityName: sysEnt.name,
                type: isArray ? '1:N' : '1:1',
                foreignKeyName: `${ent.name}.${attr.name} -> ${sysEnt.name}.id`,
                confidence: 0.92
              });
            }
            continue;
          }
        }

        // 3. Foreign Key stem matching (e.g. folderId -> Folder/FolderNode/Node, userId -> User)
        if (colLower.endsWith('id') || colLower.endsWith('_id')) {
          const stem = colLower.replace(/_?id$/, '');
          if (!stem || stem === ent.name.toLowerCase()) continue;

          const target = entities.find(e => {
            const eName = e.name.toLowerCase();
            const eTable = (e.physicalTable || '').toLowerCase();
            return (
              eName === stem || 
              eName === stem + 's' || 
              eName.startsWith(stem) ||
              eTable === stem || 
              eTable === stem + 's' ||
              eTable.startsWith(stem)
            );
          });

          if (target && target.name.toLowerCase() !== ent.name.toLowerCase()) {
            const pairKey = `${ent.name.toLowerCase()}_${target.name.toLowerCase()}`;
            if (!existingPairs.has(pairKey)) {
              existingPairs.add(pairKey);
              attr.isForeignKey = true;
              attr.foreignKeyTarget = `${target.name}.id`;

              relationships.push({
                id: `rel-auto-${ent.name}-${target.name}-${relationships.length}`,
                sourceEntityId: ent.name,
                sourceEntityName: ent.name,
                targetEntityId: target.name,
                targetEntityName: target.name,
                type: '1:N',
                foreignKeyName: `${ent.name}.${attr.name} -> ${target.name}.id`,
                confidence: 0.88
              });
            }
          }
        }

        // 4. Collection / Array / Set attribute matching (e.g. files: [] -> FileItem, categories: Set -> Category)
        if (attr.type.includes('ARRAY') || attr.type.includes('SET') || attr.type === 'JSONB') {
          let propStem = colLower.replace(/(counts?|names?|items?|list|set|array|map)$/i, '').trim();
          if (propStem.endsWith('ies')) propStem = propStem.slice(0, -3) + 'y';
          else if (propStem.endsWith('s') && propStem.length > 3) propStem = propStem.slice(0, -1);

          if (propStem) {
            const target = entities.find(e => {
              if (e.name.toLowerCase() === ent.name.toLowerCase()) return false;
              const eName = e.name.toLowerCase();
              return eName === propStem || eName.startsWith(propStem) || propStem.startsWith(eName);
            });

            if (target) {
              const isSet = attr.type.includes('SET');
              attr.type = `${target.name.toUpperCase()} ${isSet ? 'SET' : 'ARRAY'}`;
              attr.isForeignKey = true;
              attr.foreignKeyTarget = `${target.name}.id`;

              const pairKey = `${ent.name.toLowerCase()}_${target.name.toLowerCase()}`;
              if (!existingPairs.has(pairKey)) {
                existingPairs.add(pairKey);
                relationships.push({
                  id: `rel-coll-${ent.name}-${target.name}-${relationships.length}`,
                  sourceEntityId: ent.name,
                  sourceEntityName: ent.name,
                  targetEntityId: target.name,
                  targetEntityName: target.name,
                  type: '1:N',
                  foreignKeyName: `${ent.name}.${attr.name} -> ${target.name}.id`,
                  confidence: 0.85
                });
              }
            }
          }
        }

        // 5. Direct Entity Type Matching (e.g. run: ANALYSISRUN, tree: FILENODE, endpoints: APIENDPOINT ARRAY, stack: STACKPROFILE ARRAY)
        if (!attr.isForeignKey) {
          const typeClean = attr.type.replace(/\s*(ARRAY|SET|ENUM)$/i, '').trim().toLowerCase();
          const target = entities.find(e => {
            if (e.name.toLowerCase() === ent.name.toLowerCase()) return false;
            const eName = e.name.toLowerCase();
            const eTable = (e.physicalTable || '').toLowerCase();
            return (
              eName === typeClean ||
              eTable === typeClean ||
              (typeClean.length >= 4 && (eName.startsWith(typeClean) || typeClean.startsWith(eName))) ||
              eName === colLower ||
              (colLower.length >= 4 && eName.startsWith(colLower))
            );
          });

          if (target) {
            const isArray = attr.type.includes('ARRAY');
            const isSet = attr.type.includes('SET');
            const isCollection = isArray || isSet;

            if (isCollection) {
              attr.type = `${target.name.toUpperCase()} ${isSet ? 'SET' : 'ARRAY'}`;
            } else if (attr.type === 'VARCHAR' || attr.type === 'JSONB' || attr.type === 'OBJECT' || !attr.type.includes('(')) {
              attr.type = target.name.toUpperCase();
            }

            attr.isForeignKey = true;
            attr.foreignKeyTarget = `${target.name}.id`;

            const pairKey = `${ent.name.toLowerCase()}_${target.name.toLowerCase()}_${attr.name.toLowerCase()}`;
            if (!existingPairs.has(pairKey)) {
              existingPairs.add(pairKey);
              relationships.push({
                id: `rel-type-${ent.name}-${target.name}-${relationships.length}`,
                sourceEntityId: ent.name,
                sourceEntityName: ent.name,
                targetEntityId: target.name,
                targetEntityName: target.name,
                type: isCollection ? '1:N' : '1:1',
                foreignKeyName: `${ent.name}.${attr.name} -> ${target.name}.id`,
                confidence: 0.90
              });
            }
          }
        }
      }
    }
  }

  // ==========================================
  // Mermaid ERD Generation
  // ==========================================
  private static generateMermaidErd(entities: EntityModel[], relationships: EntityRelationship[]): string {
    if (entities.length === 0) {
      return 'erDiagram\n    %% В репозитории не обнаружены схемы таблиц или сущности данных';
    }

    const lines: string[] = ['erDiagram'];

    // Map entity display name to safe Mermaid identifier
    const idMap = new Map<string, string>();
    entities.forEach((ent, idx) => {
      let clean = ent.name.replace(/[^a-zA-Z0-9_]/g, '');
      if (!clean || /^[0-9]/.test(clean)) {
        clean = `Entity_${idx + 1}`;
      }
      idMap.set(ent.name.toLowerCase(), clean);
    });

    for (const ent of entities) {
      const cleanEntityName = idMap.get(ent.name.toLowerCase()) || `Entity_${ent.name.replace(/[^a-zA-Z0-9_]/g, '')}`;
      lines.push(`    ${cleanEntityName} {`);
      if (ent.isEnum && ent.enumValues && ent.enumValues.length > 0) {
        ent.enumValues.slice(0, 10).forEach((val, idx) => {
          let cleanVal = val.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30);
          if (!cleanVal || /^[0-9]/.test(cleanVal)) cleanVal = `val_${idx + 1}_${cleanVal}`;
          lines.push(`        enum ${cleanVal} "Значение"`);
        });
      } else {
        for (const attr of ent.attributes) {
          let cleanType = attr.type.split('(')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
          if (/^[0-9]/.test(cleanType) || !cleanType) cleanType = 'type_' + cleanType;
          let cleanName = attr.name.replace(/[^a-zA-Z0-9_]/g, '_');
          if (/^[0-9]/.test(cleanName) || !cleanName) cleanName = 'attr_' + cleanName;
          const keyTag = attr.isPrimaryKey ? 'PK' : attr.isForeignKey ? 'FK' : '';
          const descComment = attr.description ? ` "${attr.description.replace(/["\r\n]/g, ' ').substring(0, 45).trim()}"` : '';
          lines.push(`        ${cleanType} ${cleanName} ${keyTag}${descComment}`.trimEnd());
        }
      }
      lines.push('    }');
    }

    const seenRels = new Set<string>();
    for (const rel of relationships) {
      const srcId = idMap.get(rel.sourceEntityName.toLowerCase()) || rel.sourceEntityName.replace(/[^a-zA-Z0-9_]/g, '');
      const tgtId = idMap.get(rel.targetEntityName.toLowerCase()) || rel.targetEntityName.replace(/[^a-zA-Z0-9_]/g, '');
      const relKey = `${srcId}_${tgtId}_${rel.foreignKeyName || ''}`;
      if (!seenRels.has(relKey)) {
        seenRels.add(relKey);
        const fkCol = rel.foreignKeyName?.split('->')[0]?.split('.')?.pop()?.trim() || 'rel';
        const cleanFkLabel = fkCol.replace(/[^a-zA-Z0-9_]/g, '_') || 'references';
        const relSymbol = rel.type === '1:1' ? '||--||' : '}o--||';
        lines.push(`    ${srcId} ${relSymbol} ${tgtId} : "${cleanFkLabel}"`);
      }
    }

    return lines.join('\n');
  }

  // ==========================================
  // PlantUML ERD Generation
  // ==========================================
  public static generatePlantUmlErd(entities: EntityModel[], relationships: EntityRelationship[]): string {
    if (entities.length === 0) {
      return '@startuml\n!theme plain\n\' В репозитории не обнаружены схемы таблиц или сущности данных\n@enduml';
    }

    const lines: string[] = [
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

    const idMap = new Map<string, string>();
    entities.forEach((ent, idx) => {
      let clean = ent.name.replace(/[^a-zA-Z0-9_]/g, '');
      if (!clean || /^[0-9]/.test(clean)) {
        clean = `Entity_${idx + 1}`;
      }
      idMap.set(ent.name.toLowerCase(), clean);
    });

    for (const ent of entities) {
      const cleanEntityName = idMap.get(ent.name.toLowerCase()) || `Entity_${ent.name.replace(/[^a-zA-Z0-9_]/g, '')}`;
      if (ent.isEnum && ent.enumValues && ent.enumValues.length > 0) {
        lines.push(`enum "${ent.name}" as ${cleanEntityName} {`);
        ent.enumValues.slice(0, 15).forEach((val) => {
          let cleanVal = val.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 40);
          lines.push(`  ${cleanVal}`);
        });
        lines.push('}');
      } else {
        lines.push(`entity "${ent.name}" as ${cleanEntityName} {`);
        const pkAttrs = ent.attributes.filter(a => a.isPrimaryKey);
        const otherAttrs = ent.attributes.filter(a => !a.isPrimaryKey);

        for (const attr of pkAttrs) {
          const typeStr = attr.type.replace(/["\r\n]/g, ' ').substring(0, 30);
          lines.push(`  * ${attr.name} : ${typeStr} <<PK>>`);
        }
        if (pkAttrs.length > 0 && otherAttrs.length > 0) {
          lines.push('  --');
        }
        for (const attr of otherAttrs) {
          const typeStr = attr.type.replace(/["\r\n]/g, ' ').substring(0, 30);
          const fkTag = attr.isForeignKey ? ' <<FK>>' : '';
          const reqMark = attr.isNullable === false ? '* ' : '';
          lines.push(`  ${reqMark}${attr.name} : ${typeStr}${fkTag}`);
        }
        lines.push('}');
      }
    }

    const seenRels = new Set<string>();
    for (const rel of relationships) {
      const srcId = idMap.get(rel.sourceEntityName.toLowerCase()) || rel.sourceEntityName.replace(/[^a-zA-Z0-9_]/g, '');
      const tgtId = idMap.get(rel.targetEntityName.toLowerCase()) || rel.targetEntityName.replace(/[^a-zA-Z0-9_]/g, '');
      const relKey = `${srcId}_${tgtId}_${rel.foreignKeyName || ''}`;
      if (!seenRels.has(relKey)) {
        seenRels.add(relKey);
        const fkCol = rel.foreignKeyName?.split('->')[0]?.split('.')?.pop()?.trim() || 'rel';
        const cleanFkLabel = fkCol.replace(/[^a-zA-Z0-9_]/g, '_') || 'references';
        const relSymbol = rel.type === '1:1' ? '||--||' : '}o--||';
        lines.push(`${srcId} ${relSymbol} ${tgtId} : "${cleanFkLabel}"`);
      }
    }

    lines.push('@enduml');
    return lines.join('\n');
  }

  // ==========================================
  // Object Extraction & Typification Helpers
  // ==========================================
  private static deriveEnumEntityName(propName: string): string {
    let stem = propName.replace(/^(mock|initial|default|current|sample|test)/i, '');
    stem = stem.replace(/(Enum|List|Array|Values|Options)$/i, '');
    if (stem.endsWith('ies')) stem = stem.slice(0, -3) + 'y';
    else if (stem.endsWith('s') && stem.length > 3) stem = stem.slice(0, -1);
    if (!stem) stem = 'Variant';
    return stem.charAt(0).toUpperCase() + stem.slice(1) + 'Enum';
  }

  private static parseObjectLiteralProperties(body: string): {
    rawKey: string;
    cleanKey: string;
    rawValue: string;
    cleanValue: string;
    leadingComment: string;
    inlineComment: string;
    lineOffset: number;
  }[] {
    const results: {
      rawKey: string;
      cleanKey: string;
      rawValue: string;
      cleanValue: string;
      leadingComment: string;
      inlineComment: string;
      lineOffset: number;
    }[] = [];

    let i = 0;
    const len = body.length;
    let currentLeadingComment = '';
    let currentLine = 1;

    while (i < len) {
      // 1. Skip whitespace and collect line counts
      while (i < len && /\s/.test(body[i])) {
        if (body[i] === '\n') currentLine++;
        i++;
      }
      if (i >= len) break;

      // 2. Check for comments
      if (body[i] === '/' && i + 1 < len) {
        if (body[i + 1] === '/') {
          // Single-line comment
          const end = body.indexOf('\n', i);
          const comment = body.substring(i + 2, end === -1 ? len : end).trim();
          currentLeadingComment = currentLeadingComment ? currentLeadingComment + ' ' + comment : comment;
          if (end === -1) break;
          i = end + 1;
          currentLine++;
          continue;
        } else if (body[i + 1] === '*') {
          // Multi-line comment
          const end = body.indexOf('*/', i + 2);
          const comment = body.substring(i + 2, end === -1 ? len : end).replace(/^\*+|\*+$/g, '').trim();
          currentLeadingComment = currentLeadingComment ? currentLeadingComment + ' ' + comment : comment;
          const newlineMatches = body.substring(i, end === -1 ? len : end + 2).match(/\n/g);
          if (newlineMatches) currentLine += newlineMatches.length;
          if (end === -1) break;
          i = end + 2;
          continue;
        }
      }

      // 3. Match Key (identifier or quoted string)
      let keyStart = i;
      let rawKey = '';

      if (body[i] === "'" || body[i] === '"' || body[i] === '`') {
        const q = body[i];
        i++;
        let keyValStart = i;
        while (i < len && body[i] !== q) {
          if (body[i] === '\\') i++;
          i++;
        }
        rawKey = body.substring(keyValStart, i);
        if (i < len) i++; // skip closing quote
      } else {
        while (i < len && /[a-zA-Z0-9_а-яА-ЯёЁ$-]/.test(body[i])) {
          i++;
        }
        rawKey = body.substring(keyStart, i).trim();
      }

      if (!rawKey) {
        i++;
        continue;
      }

      // 4. Look for ':' colon separator
      while (i < len && /\s/.test(body[i])) {
        if (body[i] === '\n') currentLine++;
        i++;
      }

      if (i >= len || body[i] !== ':') {
        // Not a key-value pair, move forward
        i++;
        continue;
      }
      i++; // skip ':'

      // 5. Capture Value with bracket, brace, paren and quote balance
      let valStart = i;
      let bracketDepth = 0;
      let braceDepth = 0;
      let parenDepth = 0;
      let inQuote = false;
      let quoteChar = '';
      let inlineComment = '';
      let propertyPushed = false;

      while (i < len) {
        const ch = body[i];

        if (inQuote) {
          if (ch === '\\') {
            i += 2;
            continue;
          }
          if (ch === quoteChar) {
            inQuote = false;
          }
          i++;
          continue;
        }

        if (ch === "'" || ch === '"' || ch === '`') {
          inQuote = true;
          quoteChar = ch;
          i++;
          continue;
        }

        // Check for inline single-line comment
        if (ch === '/' && i + 1 < len && body[i + 1] === '/') {
          const end = body.indexOf('\n', i);
          inlineComment = body.substring(i + 2, end === -1 ? len : end).trim();
          const newlineMatches = body.substring(valStart, i).match(/\n/g);
          if (newlineMatches) currentLine += newlineMatches.length;
          
          if (bracketDepth === 0 && braceDepth === 0 && parenDepth === 0) {
            const rawVal = body.substring(valStart, i).trim();
            results.push({
              rawKey,
              cleanKey: rawKey.replace(/[^a-zA-Z0-9_]/g, '_') || 'field',
              rawValue: rawVal,
              cleanValue: rawVal.replace(/,$/, '').trim(),
              leadingComment: currentLeadingComment,
              inlineComment,
              lineOffset: currentLine
            });
            currentLeadingComment = '';
            if (end === -1) {
              i = len;
              break;
            }
            i = end + 1;
            currentLine++;
            break;
          } else {
            if (end === -1) break;
            i = end + 1;
            currentLine++;
            continue;
          }
        }

        if (ch === '[') bracketDepth++;
        else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
        else if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
        else if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
        else if (ch === '\n') currentLine++;
        else if (ch === ',' && bracketDepth === 0 && braceDepth === 0 && parenDepth === 0) {
          const rawVal = body.substring(valStart, i).trim();
          
          // Check if there is an inline comment on the rest of this line after comma
          let checkIdx = i + 1;
          while (checkIdx < len && (body[checkIdx] === ' ' || body[checkIdx] === '\t')) {
            checkIdx++;
          }
          if (checkIdx + 1 < len && body[checkIdx] === '/' && body[checkIdx + 1] === '/') {
            const lineEnd = body.indexOf('\n', checkIdx);
            inlineComment = body.substring(checkIdx + 2, lineEnd === -1 ? len : lineEnd).trim();
            i = lineEnd === -1 ? len : lineEnd + 1;
            currentLine++;
          } else {
            i++; // skip comma
          }

          results.push({
            rawKey,
            cleanKey: rawKey.replace(/[^a-zA-Z0-9_]/g, '_') || 'field',
            rawValue: rawVal,
            cleanValue: rawVal.replace(/,$/, '').trim(),
            leadingComment: currentLeadingComment,
            inlineComment,
            lineOffset: currentLine
          });
          currentLeadingComment = '';
          propertyPushed = true;
          break;
        }

        i++;
      }

      // If finished loop without trailing comma
      if (!propertyPushed && bracketDepth === 0 && braceDepth === 0 && parenDepth === 0 && valStart < i) {
        const rawVal = body.substring(valStart, i).trim();
        if (rawVal && !results.some(r => r.rawKey === rawKey && r.rawValue === rawVal)) {
          results.push({
            rawKey,
            cleanKey: rawKey.replace(/[^a-zA-Z0-9_]/g, '_') || 'field',
            rawValue: rawVal,
            cleanValue: rawVal.replace(/,$/, '').trim(),
            leadingComment: currentLeadingComment,
            inlineComment,
            lineOffset: currentLine
          });
          currentLeadingComment = '';
        }
      }
    }

    return results;
  }

  private static extractAttributesFromObjectLiteral(
    body: string,
    file?: FileEntry,
    lineNum: number = 1,
    entities?: EntityModel[],
    relationships?: EntityRelationship[],
    parentEntityName?: string
  ): EntityAttribute[] {
    const attributes: EntityAttribute[] = [];
    const seenProps = new Set<string>();

    const parsedProps = this.parseObjectLiteralProperties(body);

    for (const prop of parsedProps) {
      const rawPropName = prop.rawKey;
      const propName = prop.cleanKey;

      if (seenProps.has(propName.toLowerCase())) continue;
      seenProps.add(propName.toLowerCase());

      const cleanValue = prop.cleanValue;
      let attrType = this.inferJsValueType(cleanValue, rawPropName);

      const isPk = propName.toLowerCase() === 'id' || propName.toLowerCase() === '_id' || propName.toLowerCase() === 'key';
      let isFk = (propName.toLowerCase().endsWith('id') || propName.toLowerCase().endsWith('_id')) && !isPk;

      const combinedComment = [prop.leadingComment, prop.inlineComment].filter(Boolean).join(' | ');
      let description = combinedComment || (rawPropName !== propName ? `Поле: ${rawPropName}` : undefined);

      let isEnum = false;
      let enumValues: string[] | undefined;
      let fkTarget: string | undefined;

      // =========================================================================
      // RULE 1: Detect Array of Struct in Comments (e.g. log: [], // Array of { timestamp, type: 'info'|'success'|'error'|'warning', text })
      // Or errors: [], // Array of { file, error }
      // Checked FIRST so that inner field unions don't hijack the top-level property!
      // =========================================================================
      const structPattern = /(?:array\s+of\s+\{|\{\s*)([^{}]+)\}(?:\s*\[\])?/i;
      const structMatch = structPattern.exec(combinedComment);

      if (structMatch) {
        const innerFieldsStr = structMatch[1];
        const subEntityStem = rawPropName.endsWith('s') && rawPropName.length > 3 ? rawPropName.slice(0, -3) + 'y' : rawPropName;
        const subEntityName = rawPropName.charAt(0).toUpperCase() + (rawPropName.endsWith('s') && rawPropName.length > 3 ? rawPropName.slice(1, -1) : rawPropName.slice(1)) + 'Item';

        const subAttrs: EntityAttribute[] = [];
        const fieldTokens = innerFieldsStr.split(/,(?![^']*\|)/); // split by comma not in union

        for (const token of fieldTokens) {
          const trimmed = token.trim();
          if (!trimmed) continue;

          // Check if token has union e.g. type: 'info'|'success'|'error'|'warning'
          const fieldUnionMatch = /^([a-zA-Z0-9_]+)\s*:\s*(['"].*['"])/i.exec(trimmed);
          if (fieldUnionMatch) {
            const fName = fieldUnionMatch[1].trim();
            const fUnionStr = fieldUnionMatch[2];
            const uRegex = /['"]([^'"]+)['"]/g;
            const uVals: string[] = [];
            let um;
            while ((um = uRegex.exec(fUnionStr)) !== null) {
              if (um[1].trim()) uVals.push(um[1].trim());
            }

            let fieldEnumName = this.deriveEnumEntityName(`${rawPropName}_${fName}`);
            if (uVals.length >= 2) {
              if (entities && !entities.some(e => e.name.toLowerCase() === fieldEnumName.toLowerCase())) {
                entities.push({
                  id: `enum-${fieldEnumName.toLowerCase()}`,
                  dataModelId: 'dm-enum',
                  name: fieldEnumName,
                  physicalTable: fieldEnumName.toLowerCase() + '_enum',
                  domain: 'Перечисления (Enums)',
                  description: `Перечисление типов для ${subEntityName}.${fName}`,
                  sourceType: 'enum',
                  sourceLabel: 'ENUM Перечисление',
                  isEnum: true,
                  enumValues: uVals,
                  attributes: uVals.map((v, idx) => ({
                    id: `attr-${fieldEnumName}-${idx}`,
                    name: v,
                    physicalColumn: `val_${idx + 1}`,
                    type: 'VARCHAR',
                    isPrimaryKey: false,
                    isForeignKey: false,
                    isNullable: false,
                    description: `Значение: ${v}`,
                    sourceFile: file?.path,
                    sourceLine: lineNum + prop.lineOffset
                  })),
                  sourceFile: file?.path,
                  sourceLine: lineNum + prop.lineOffset
                });
              }

              if (relationships) {
                relationships.push({
                  id: `rel-enum-${subEntityName}-${fieldEnumName}-${relationships.length}`,
                  sourceEntityId: subEntityName,
                  sourceEntityName: subEntityName,
                  targetEntityId: fieldEnumName,
                  targetEntityName: fieldEnumName,
                  type: '1:N',
                  foreignKeyName: `${subEntityName}.${fName} -> ${fieldEnumName}.id`,
                  confidence: 0.95
                });
              }

              subAttrs.push({
                id: `attr-sub-${subEntityName}-${fName}`,
                name: fName,
                physicalColumn: fName,
                type: `${fieldEnumName.toUpperCase()} ENUM`,
                isPrimaryKey: false,
                isForeignKey: true,
                foreignKeyTarget: `${fieldEnumName}.id`,
                isNullable: false,
                isEnum: true,
                enumValues: uVals,
                description: `Тип события (${uVals.join(', ')})`,
                sourceFile: file?.path,
                sourceLine: lineNum + prop.lineOffset
              });
            }
          } else {
            // Simple field like timestamp, file, error, text
            const simpleNameMatch = /^([a-zA-Z0-9_]+)/.exec(trimmed);
            if (simpleNameMatch) {
              const fName = simpleNameMatch[1];
              let fType = 'VARCHAR(255)';
              if (fName.toLowerCase().includes('time') || fName.toLowerCase().includes('date') || fName.toLowerCase().includes('at')) {
                fType = 'TIMESTAMP';
              } else if (fName.toLowerCase().includes('text') || fName.toLowerCase().includes('error') || fName.toLowerCase().includes('message')) {
                fType = 'TEXT';
              } else if (fName.toLowerCase().includes('count') || fName.toLowerCase().includes('size') || fName.toLowerCase().includes('id')) {
                fType = 'INTEGER';
              }

              subAttrs.push({
                id: `attr-sub-${subEntityName}-${fName}`,
                name: fName,
                physicalColumn: fName,
                type: fType,
                isPrimaryKey: fName.toLowerCase() === 'id',
                isForeignKey: false,
                isNullable: fName.toLowerCase() !== 'id',
                description: `Поле ${fName} элемента ${rawPropName}`,
                sourceFile: file?.path,
                sourceLine: lineNum + prop.lineOffset
              });
            }
          }
        }

        if (subAttrs.length > 0) {
          if (!subAttrs.some(a => a.isPrimaryKey)) {
            subAttrs.unshift({
              id: `attr-sub-${subEntityName}-id`,
              name: 'id',
              physicalColumn: 'id',
              type: 'UUID',
              isPrimaryKey: true,
              isForeignKey: false,
              isNullable: false,
              description: 'Идентификатор элемента',
              sourceFile: file?.path,
              sourceLine: lineNum + prop.lineOffset
            });
          }

          if (entities && !entities.some(e => e.name.toLowerCase() === subEntityName.toLowerCase())) {
            entities.push({
              id: `entity-${subEntityName.toLowerCase()}`,
              dataModelId: 'dm-js',
              name: subEntityName,
              physicalTable: subEntityName.toLowerCase() + 's',
              domain: this.deriveDomainFromFile(file?.path || ''),
              description: `Элемент коллекции ${rawPropName} (${combinedComment})`,
              sourceType: 'js_structure',
              sourceLabel: 'JavaScript Структура',
              attributes: subAttrs,
              sourceFile: file?.path,
              sourceLine: lineNum + prop.lineOffset
            });
          }

          attrType = `${subEntityName.toUpperCase()} ARRAY`;
          isFk = true;
          fkTarget = `${subEntityName}.id`;

          if (relationships && parentEntityName) {
            if (!relationships.some(r => r.sourceEntityName.toLowerCase() === parentEntityName.toLowerCase() && r.targetEntityName.toLowerCase() === subEntityName.toLowerCase())) {
              relationships.push({
                id: `rel-sub-${parentEntityName}-${subEntityName}-${relationships.length}`,
                sourceEntityId: parentEntityName,
                sourceEntityName: parentEntityName,
                targetEntityId: subEntityName,
                targetEntityName: subEntityName,
                type: '1:N',
                foreignKeyName: `${parentEntityName}.${rawPropName} -> ${subEntityName}.id`,
                confidence: 0.92
              });
            }
          }
        }
      }

      // =========================================================================
      // RULE 2: Detect Union String Literals in Comments (e.g. status: 'IDLE', // 'IDLE' | 'RUNNING' | 'PAUSED' | 'DONE' | 'STOPPED')
      // =========================================================================
      const unionPattern = /['"]([^'"]+)['"]\s*\|\s*['"]([^'"]+)['"]/i;
      if (!isEnum && !structMatch && combinedComment && unionPattern.test(combinedComment)) {
        const unionValRegex = /['"]([^'"]+)['"]/g;
        const uValues: string[] = [];
        let um;
        while ((um = unionValRegex.exec(combinedComment)) !== null) {
          if (um[1].trim() && !uValues.includes(um[1].trim())) {
            uValues.push(um[1].trim());
          }
        }

        if (uValues.length >= 2) {
          isEnum = true;
          enumValues = uValues;
          const enumEntityName = this.deriveEnumEntityName(rawPropName);
          attrType = `${enumEntityName.toUpperCase()} ENUM`;
          isFk = true;
          fkTarget = `${enumEntityName}.id`;

          if (entities && !entities.some(e => e.name.toLowerCase() === enumEntityName.toLowerCase())) {
            entities.push({
              id: `enum-${enumEntityName.toLowerCase()}`,
              dataModelId: 'dm-enum',
              name: enumEntityName,
              physicalTable: enumEntityName.toLowerCase() + '_enum',
              domain: 'Перечисления (Enums)',
              description: `Перечисление состояний/значений для свойства ${rawPropName} (${uValues.join(', ')})`,
              sourceType: 'enum',
              sourceLabel: 'ENUM Перечисление',
              isEnum: true,
              enumValues: uValues,
              attributes: uValues.map((val, idx) => ({
                id: `attr-${enumEntityName}-${idx}`,
                name: val,
                physicalColumn: `val_${idx + 1}`,
                type: 'VARCHAR',
                isPrimaryKey: false,
                isForeignKey: false,
                isNullable: false,
                description: `Значение: ${val}`,
                sourceFile: file?.path,
                sourceLine: lineNum + prop.lineOffset
              })),
              sourceFile: file?.path,
              sourceLine: lineNum + prop.lineOffset
            });
          }

          if (relationships && parentEntityName) {
            if (!relationships.some(r => r.sourceEntityName.toLowerCase() === parentEntityName.toLowerCase() && r.targetEntityName.toLowerCase() === enumEntityName.toLowerCase())) {
              relationships.push({
                id: `rel-enum-${parentEntityName}-${enumEntityName}-${relationships.length}`,
                sourceEntityId: parentEntityName,
                sourceEntityName: parentEntityName,
                targetEntityId: enumEntityName,
                targetEntityName: enumEntityName,
                type: '1:N',
                foreignKeyName: `${parentEntityName}.${rawPropName} -> ${enumEntityName}.id`,
                confidence: 0.96
              });
            }
          }
        }
      }

      // =========================================================================
      // RULE 3: Detect String Literal Array in value (including multiline arrays like TOOLS_CONFIG capabilities: [...])
      // =========================================================================
      if (!isEnum && cleanValue.startsWith('[') && !cleanValue.includes('{') && !cleanValue.includes(':')) {
        const strLitRegex = /['"`]([^'"`\\]*(?:\\.[^'"`\\]*)*)['"`]/g;
        const strLits: string[] = [];
        let sm;
        while ((sm = strLitRegex.exec(cleanValue)) !== null) {
          if (sm[1].trim()) strLits.push(sm[1].trim());
        }

        if (strLits.length >= 1) {
          isEnum = true;
          enumValues = strLits;
          const enumEntityName = this.deriveEnumEntityName(rawPropName);
          attrType = `${enumEntityName.toUpperCase()} ENUM`;
          isFk = true;
          fkTarget = `${enumEntityName}.id`;

          if (entities && !entities.some(e => e.name.toLowerCase() === enumEntityName.toLowerCase())) {
            entities.push({
              id: `enum-${enumEntityName.toLowerCase()}`,
              dataModelId: 'dm-enum',
              name: enumEntityName,
              physicalTable: enumEntityName.toLowerCase() + '_enum',
              domain: 'Перечисления (Enums)',
              description: `Перечисление значений для свойства ${rawPropName}`,
              sourceType: 'enum',
              sourceLabel: 'ENUM Перечисление',
              isEnum: true,
              enumValues: strLits,
              attributes: strLits.map((val, idx) => ({
                id: `attr-${enumEntityName}-${idx}`,
                name: val.length > 35 ? val.slice(0, 32) + '…' : val,
                physicalColumn: `val_${idx + 1}`,
                type: 'VARCHAR',
                isPrimaryKey: false,
                isForeignKey: false,
                isNullable: false,
                description: val,
                sourceFile: file?.path,
                sourceLine: lineNum + prop.lineOffset
              })),
              sourceFile: file?.path,
              sourceLine: lineNum + prop.lineOffset
            });
          }

          if (relationships && parentEntityName) {
            if (!relationships.some(r => r.sourceEntityName.toLowerCase() === parentEntityName.toLowerCase() && r.targetEntityName.toLowerCase() === enumEntityName.toLowerCase())) {
              relationships.push({
                id: `rel-enum-${parentEntityName}-${enumEntityName}-${relationships.length}`,
                sourceEntityId: parentEntityName,
                sourceEntityName: parentEntityName,
                targetEntityId: enumEntityName,
                targetEntityName: enumEntityName,
                type: '1:N',
                foreignKeyName: `${parentEntityName}.${rawPropName} -> ${enumEntityName}.id`,
                confidence: 0.95
              });
            }
          }
        }
      }

      attributes.push({
        id: `attr-js-${propName}-${Math.random().toString(36).substr(2, 6)}`,
        name: rawPropName,
        physicalColumn: propName,
        type: attrType,
        isPrimaryKey: isPk,
        isForeignKey: isFk,
        foreignKeyTarget: fkTarget,
        isNullable: cleanValue === 'null' || cleanValue === 'undefined' || cleanValue === "''" || cleanValue === '""',
        description,
        sourceFile: file?.path,
        sourceLine: lineNum + prop.lineOffset,
        isEnum,
        enumValues
      });
    }

    return attributes;
  }

  private static inferJsValueType(val: string, name: string): string {
    const v = (val || '').toLowerCase().trim();
    const n = (name || '').toLowerCase().trim();

    // 1. SET detection
    if (v.startsWith('new set') || v.startsWith('new map')) {
      if (n.includes('id') || n.includes('count') || n.includes('num')) return 'INTEGER SET';
      if (n.includes('tag') || n.includes('name') || n.includes('str') || n.includes('url') || n.includes('path')) return 'VARCHAR SET';
      let stem = n.replace(/(set|map|list|collection)$/i, '').trim();
      if (stem.endsWith('ies')) stem = stem.slice(0, -3) + 'y';
      else if (stem.endsWith('s') && stem.length > 3) stem = stem.slice(0, -1);
      if (stem) return `${stem.toUpperCase()} SET`;
      return 'VARCHAR SET';
    }

    // 2. ARRAY detection
    if (v.startsWith('[') || v.endsWith('[]')) {
      if (/\[\s*['"`]/.test(v)) return 'VARCHAR ARRAY';
      if (/\[\s*-?\d+\s*[,\]]/.test(v)) return 'INTEGER ARRAY';
      if (/\[\s*(true|false)\s*[,\]]/.test(v)) return 'BOOLEAN ARRAY';
      if (/\[\s*\{/.test(v)) return 'OBJECT ARRAY';

      if (n.includes('name') || n.includes('str') || n.includes('tag') || n.includes('path') || n.includes('file_name') || n.includes('filename') || n.includes('url')) return 'VARCHAR ARRAY';
      if (n.includes('id') || n.includes('count') || n.includes('depth') || n.includes('num') || n.includes('index') || n.includes('size')) return 'INTEGER ARRAY';
      
      let stem = n.replace(/(names?|titles?|urls?|paths?|items?|list|array|collection)$/i, '').trim();
      if (stem.endsWith('ies')) stem = stem.slice(0, -3) + 'y';
      else if (stem.endsWith('s') && stem.length > 3) stem = stem.slice(0, -1);
      if (stem) return `${stem.toUpperCase()} ARRAY`;
      return 'VARCHAR ARRAY';
    }

    if (v.startsWith('{')) return 'JSONB';
    if (v === 'true' || v === 'false') return 'BOOLEAN';
    if (/^-?\d+$/.test(val)) return 'INTEGER';
    if (/^-?\d+\.\d+$/.test(val)) return 'NUMERIC';
    if (n.includes('count') || n.includes('depth') || n.includes('index') || n.includes('size') || n.includes('total') || n.includes('page') || n.includes('weight')) return 'INTEGER';
    if (n.includes('date') || n.includes('time') || n.includes('at')) return 'TIMESTAMP';
    if (n.includes('price') || n.includes('amount') || n.includes('sum')) return 'NUMERIC';
    if (n.startsWith('is') || n.startsWith('has') || n.startsWith('enable') || n.startsWith('can')) return 'BOOLEAN';
    return 'VARCHAR(255)';
  }

  private static deriveEntityName(varName: string, subKey: string): string {
    let base = varName;
    base = base.replace(/^(mock|initial|default|current|sample|test|get|build|create|fetch)/i, '');
    base = base.replace(/(Map|List|Store|State|Data|Dict|Config|Collection|Items|Array|Graph)$/i, '');
    if (!base && subKey) {
      base = subKey;
    }
    if (!base) base = 'Entity';

    if (base.endsWith('ies')) base = base.slice(0, -3) + 'y';
    else if (base.endsWith('ses')) base = base.slice(0, -2);
    else if (base.endsWith('s') && !base.endsWith('ss') && base.length > 3) base = base.slice(0, -1);

    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  private static deriveDomainFromFile(filePath: string): string {
    const parts = filePath.replace(/\\/g, '/').split('/');
    if (parts.length > 2) {
      return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1) + ' Domain';
    }
    return 'Frontend Models';
  }

  private static isIgnoredVariableName(varName: string): boolean {
    const v = varName.toLowerCase();
    return v === 'options' || v === 'style' || v === 'styles' || v === 'props' || v === 'headers' || v === 'params' || v === 'colors' || v === 'icons' || v === 'routes' || v === 'constants';
  }

  // Helpers
  private static splitColumnDefinitions(body: string): string[] {
    const lines: string[] = [];
    let current = '';
    let parenDepth = 0;
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (inQuotes) {
        current += ch;
        if (ch === quoteChar) inQuotes = false;
      } else if (ch === '"' || ch === "'" || ch === '`') {
        inQuotes = true;
        quoteChar = ch;
        current += ch;
      } else if (ch === '(') {
        parenDepth++;
        current += ch;
      } else if (ch === ')') {
        parenDepth = Math.max(0, parenDepth - 1);
        current += ch;
      } else if (ch === ',' && parenDepth === 0) {
        if (current.trim()) lines.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) lines.push(current.trim());
    return lines;
  }

  private static parseColumnLine(line: string): { name: string; type: string; fullType: string; isPk: boolean; isFk: boolean; isNullable: boolean; fkTarget?: string } | null {
    const trimmed = line.trim();
    if (!trimmed || /^(PRIMARY\s+KEY|FOREIGN\s+KEY|CONSTRAINT|UNIQUE|INDEX|CHECK)/i.test(trimmed)) {
      return null;
    }

    const colMatch = /^([a-zA-Z0-9_."`]+)\s+([a-zA-Z0-9_]+(?:\s*\([^)]*\))?)/i.exec(trimmed);
    if (!colMatch) return null;

    const colName = colMatch[1].replace(/["'`]/g, '');
    const fullType = colMatch[2].toUpperCase().trim();
    const baseType = colMatch[2].split('(')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '_') || 'text';

    const isPk = /PRIMARY\s+KEY/i.test(trimmed);
    const isFk = /REFERENCES/i.test(trimmed);
    const isNullable = !/NOT\s+NULL/i.test(trimmed) && !isPk;

    let fkTarget: string | undefined;
    if (isFk) {
      const refMatch = /REFERENCES\s+([a-zA-Z0-9_."`]+)\s*(?:\(([a-zA-Z0-9_]+)\))?/i.exec(trimmed);
      if (refMatch) {
        const targetTbl = refMatch[1].replace(/["'`]/g, '').split('.').pop() || '';
        const targetCol = refMatch[2] || 'id';
        fkTarget = `${targetTbl}.${targetCol}`;
      }
    }

    return { name: colName, type: baseType, fullType, isPk, isFk, isNullable, fkTarget };
  }

  private static mapDotNetTypeToSql(csType: string): string {
    const t = csType.replace('?', '').trim();
    switch (t) {
      case 'int':
      case 'Int32':
        return 'INTEGER';
      case 'long':
      case 'Int64':
        return 'BIGINT';
      case 'Guid':
        return 'UUID';
      case 'string':
        return 'VARCHAR(255)';
      case 'decimal':
        return 'NUMERIC(18,2)';
      case 'double':
      case 'float':
        return 'FLOAT';
      case 'bool':
      case 'Boolean':
        return 'BOOLEAN';
      case 'DateTime':
      case 'DateTimeOffset':
        return 'TIMESTAMP';
      default:
        return 'VARCHAR(100)';
    }
  }

  private static mapTsTypeToSql(tsType: string): string {
    const raw = tsType.trim();
    if (raw.endsWith('[]') || raw.toLowerCase().startsWith('array<')) {
      const inner = raw.replace(/\[\]$/, '').replace(/^array</i, '').replace(/>$/, '').trim();
      const innerSql = this.mapTsTypeToSql(inner);
      return `${innerSql} ARRAY`;
    }
    if (raw.toLowerCase().startsWith('set<')) {
      const inner = raw.replace(/^set</i, '').replace(/>$/, '').trim();
      const innerSql = this.mapTsTypeToSql(inner);
      return `${innerSql} SET`;
    }
    const t = raw.toLowerCase();
    switch (t) {
      case 'number':
        return 'INTEGER';
      case 'string':
        return 'VARCHAR(255)';
      case 'boolean':
        return 'BOOLEAN';
      case 'date':
        return 'TIMESTAMP';
      case 'any':
      case 'unknown':
        return 'JSONB';
      default:
        if (/^[A-Z]/.test(raw)) {
          return raw.toUpperCase();
        }
        return 'VARCHAR(255)';
    }
  }
}


