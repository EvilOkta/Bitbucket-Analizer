import { StackProfile } from '../../shared/types';

export interface FileEntry {
  path: string;
  content?: string;
  size: number;
}

export class StackDetector {
  public static detect(files: FileEntry[], analysisRunId: string): StackProfile[] {
    const profiles: StackProfile[] = [];
    const filePaths = new Set(files.map(f => f.path.replace(/\\/g, '/')));

    // Helper to find file content
    const getFileContent = (name: string): string => {
      const match = files.find(f => f.path.endsWith(name) || f.path.replace(/\\/g, '/').endsWith(name));
      return match?.content || '';
    };

    // 1. Python Detection
    if (Array.from(filePaths).some(p => p.endsWith('.py') || p.includes('requirements.txt') || p.includes('pyproject.toml'))) {
      profiles.push({
        id: `stack-py-${Date.now()}`,
        analysisRunId,
        category: 'language',
        technology: 'Python',
        version: '3.11+',
        confidence: 0.98,
        evidence: ['Обнаружены файлы .py, requirements.txt или pyproject.toml']
      });

      const reqContent = getFileContent('requirements.txt') + getFileContent('pyproject.toml');
      if (reqContent.includes('fastapi')) {
        profiles.push({
          id: `stack-fastapi-${Date.now()}`,
          analysisRunId,
          category: 'backend_framework',
          technology: 'FastAPI',
          confidence: 0.95,
          evidence: ['Обнаружена зависимость fastapi в манифесте']
        });
      }
      if (reqContent.includes('django')) {
        profiles.push({
          id: `stack-django-${Date.now()}`,
          analysisRunId,
          category: 'backend_framework',
          technology: 'Django',
          confidence: 0.95,
          evidence: ['Обнаружена зависимость django']
        });
      }
      if (reqContent.includes('flask')) {
        profiles.push({
          id: `stack-flask-${Date.now()}`,
          analysisRunId,
          category: 'backend_framework',
          technology: 'Flask',
          confidence: 0.90,
          evidence: ['Обнаружена зависимость flask']
        });
      }
      if (reqContent.includes('sqlalchemy') || reqContent.includes('sqlmodel')) {
        profiles.push({
          id: `stack-sqlalchemy-${Date.now()}`,
          analysisRunId,
          category: 'orm_db',
          technology: 'SQLAlchemy / Alembic',
          confidence: 0.92,
          evidence: ['Обнаружены зависимости ORM SQLAlchemy/Alembic']
        });
      }
    }

    // 2. .NET / C# Detection
    if (Array.from(filePaths).some(p => p.endsWith('.cs') || p.endsWith('.csproj') || p.endsWith('.sln'))) {
      profiles.push({
        id: `stack-dotnet-${Date.now()}`,
        analysisRunId,
        category: 'language',
        technology: 'C# / .NET',
        version: '8.0 / 9.0',
        confidence: 0.98,
        evidence: ['Обнаружены файлы решения .sln, .csproj и исходники .cs']
      });

      const csprojContent = files
        .filter(f => f.path.endsWith('.csproj'))
        .map(f => f.content || '')
        .join('\n');

      if (csprojContent.includes('Microsoft.AspNetCore') || csprojContent.includes('Microsoft.NET.Sdk.Web')) {
        profiles.push({
          id: `stack-aspnet-${Date.now()}`,
          analysisRunId,
          category: 'backend_framework',
          technology: 'ASP.NET Core',
          confidence: 0.96,
          evidence: ['Обнаружен SDK Microsoft.NET.Sdk.Web']
        });
      }
      if (csprojContent.includes('Microsoft.EntityFrameworkCore')) {
        profiles.push({
          id: `stack-efcore-${Date.now()}`,
          analysisRunId,
          category: 'orm_db',
          technology: 'Entity Framework Core',
          confidence: 0.95,
          evidence: ['Обнаружен пакет Microsoft.EntityFrameworkCore']
        });
      }
    }

    // 3. JavaScript / TypeScript Detection
    if (Array.from(filePaths).some(p => p.endsWith('package.json') || p.endsWith('.ts') || p.endsWith('.js'))) {
      const isTS = Array.from(filePaths).some(p => p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('tsconfig.json'));
      profiles.push({
        id: `stack-js-${Date.now()}`,
        analysisRunId,
        category: 'language',
        technology: isTS ? 'TypeScript' : 'JavaScript',
        confidence: 0.99,
        evidence: [isTS ? 'Обнаружены файлы TypeScript и tsconfig.json' : 'Обнаружены JS файлы и package.json']
      });

      const pkgContent = getFileContent('package.json');
      if (pkgContent) {
        try {
          const pkg = JSON.parse(pkgContent);
          const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

          if (allDeps['@nestjs/core']) {
            profiles.push({
              id: `stack-nest-${Date.now()}`,
              analysisRunId,
              category: 'backend_framework',
              technology: 'NestJS',
              version: allDeps['@nestjs/core'],
              confidence: 0.98,
              evidence: ['package.json: @nestjs/core']
            });
          } else if (allDeps['express']) {
            profiles.push({
              id: `stack-express-${Date.now()}`,
              analysisRunId,
              category: 'backend_framework',
              technology: 'Express',
              version: allDeps['express'],
              confidence: 0.95,
              evidence: ['package.json: express']
            });
          }

          if (allDeps['react']) {
            profiles.push({
              id: `stack-react-${Date.now()}`,
              analysisRunId,
              category: 'frontend_framework',
              technology: 'React',
              version: allDeps['react'],
              confidence: 0.98,
              evidence: ['package.json: react']
            });
          } else if (allDeps['vue']) {
            profiles.push({
              id: `stack-vue-${Date.now()}`,
              analysisRunId,
              category: 'frontend_framework',
              technology: 'Vue.js',
              version: allDeps['vue'],
              confidence: 0.98,
              evidence: ['package.json: vue']
            });
          }

          if (allDeps['pg'] || allDeps['typeorm'] || allDeps['@prisma/client']) {
            profiles.push({
              id: `stack-pg-node-${Date.now()}`,
              analysisRunId,
              category: 'orm_db',
              technology: allDeps['typeorm'] ? 'TypeORM' : allDeps['@prisma/client'] ? 'Prisma' : 'node-postgres (pg)',
              confidence: 0.90,
              evidence: ['package.json database drivers']
            });
          }
        } catch {
          // ignore malformed json
        }
      }
    }

    // 4. C / C++ Detection
    if (Array.from(filePaths).some(p => p.endsWith('.cpp') || p.endsWith('.hpp') || p.endsWith('.c') || p.endsWith('.h') || p.includes('CMakeLists.txt'))) {
      profiles.push({
        id: `stack-cpp-${Date.now()}`,
        analysisRunId,
        category: 'language',
        technology: 'C / C++',
        confidence: 0.95,
        evidence: ['Обнаружены исходные файлы C/C++ и CMakeLists.txt']
      });

      const cmakeContent = getFileContent('CMakeLists.txt');
      if (cmakeContent.toLowerCase().includes('oatpp')) {
        profiles.push({
          id: `stack-oatpp-${Date.now()}`,
          analysisRunId,
          category: 'backend_framework',
          technology: 'Oat++ Web Framework',
          confidence: 0.95,
          evidence: ['CMakeLists.txt содержит линковку oatpp']
        });
      } else if (cmakeContent.toLowerCase().includes('crow')) {
        profiles.push({
          id: `stack-crow-${Date.now()}`,
          analysisRunId,
          category: 'backend_framework',
          technology: 'Crow C++ Framework',
          confidence: 0.92,
          evidence: ['CMakeLists.txt содержит crow']
        });
      }
    }

    // 5. PostgreSQL & Database Detection
    const hasSql = Array.from(filePaths).some(p => p.endsWith('.sql') || p.includes('migrations') || p.includes('alembic'));
    if (hasSql || profiles.some(p => p.evidence.some(e => e.toLowerCase().includes('postgres') || e.toLowerCase().includes('pg')))) {
      profiles.push({
        id: `stack-postgres-${Date.now()}`,
        analysisRunId,
        category: 'database',
        technology: 'PostgreSQL',
        version: '14+ / Relational DB',
        confidence: 0.95,
        evidence: ['Обнаружены SQL-миграции, DDL скрипты и конфигурации подключения к PostgreSQL']
      });
    }

    // 6. CI/CD & Build Tools
    if (Array.from(filePaths).some(p => p.includes('bitbucket-pipelines.yml'))) {
      profiles.push({
        id: `stack-bb-pipeline-${Date.now()}`,
        analysisRunId,
        category: 'ci_cd',
        technology: 'Bitbucket Pipelines',
        confidence: 1.0,
        evidence: ['Обнаружен файл bitbucket-pipelines.yml']
      });
    }
    if (Array.from(filePaths).some(p => p.includes('Dockerfile') || p.includes('docker-compose'))) {
      profiles.push({
        id: `stack-docker-${Date.now()}`,
        analysisRunId,
        category: 'build_tool',
        technology: 'Docker / Containerization',
        confidence: 0.98,
        evidence: ['Обнаружен Dockerfile или docker-compose.yml']
      });
    }

    return profiles;
  }
}
