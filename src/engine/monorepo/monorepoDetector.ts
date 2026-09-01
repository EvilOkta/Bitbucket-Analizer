import { FileEntry } from '../stack/stackDetector';
import { SubprojectItem } from '../../shared/types';

export class MonorepoDetector {
  /**
   * Detects whether the repository is a Monorepo and discovers its subprojects/workspaces.
   */
  public static detect(files: FileEntry[]): { isMonorepo: boolean; subprojects: SubprojectItem[] } {
    const subprojects: SubprojectItem[] = [];
    const discoveredPaths = new Set<string>();

    for (const file of files) {
      const normPath = file.path.replace(/\\/g, '/');
      const parts = normPath.split('/');

      // 1. JavaScript / TypeScript Workspaces (apps/*/package.json, packages/*/package.json, services/*/package.json)
      if (parts.length >= 3 && parts[parts.length - 1] === 'package.json') {
        const subPath = parts.slice(0, parts.length - 1).join('/');
        if (!subPath.includes('node_modules') && !discoveredPaths.has(subPath)) {
          discoveredPaths.add(subPath);
          const name = parts[parts.length - 2];
          const type = parts[0] === 'apps' || parts[0] === 'client' ? 'app' : parts[0] === 'packages' || parts[0] === 'shared' ? 'package' : 'service';
          
          subprojects.push({
            id: `subproj-${subPath.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
            name,
            path: subPath,
            type,
            description: `${type === 'app' ? 'Клиентское приложение' : type === 'package' ? 'Общий пакет/библиотека' : 'Микросервис'}: ${name}`
          });
        }
      }

      // 2. .NET Multi-Project (*.csproj inside subdirectories)
      if (parts.length >= 2 && parts[parts.length - 1].endsWith('.csproj')) {
        const subPath = parts.slice(0, parts.length - 1).join('/');
        if (!discoveredPaths.has(subPath) && subPath !== '') {
          discoveredPaths.add(subPath);
          const projFileName = parts[parts.length - 1].replace(/\.csproj$/, '');
          const type = projFileName.toLowerCase().includes('client') || projFileName.toLowerCase().includes('ui') ? 'app' : projFileName.toLowerCase().includes('common') || projFileName.toLowerCase().includes('dto') ? 'package' : 'service';
          
          subprojects.push({
            id: `subproj-${subPath.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
            name: projFileName,
            path: subPath,
            type,
            description: `.NET Проект: ${projFileName}`
          });
        }
      }

      // 3. Python / FastAPI sub-services (services/*/pyproject.toml or services/*/requirements.txt)
      if (parts.length >= 3 && (parts[parts.length - 1] === 'pyproject.toml' || parts[parts.length - 1] === 'requirements.txt')) {
        const subPath = parts.slice(0, parts.length - 1).join('/');
        if (!discoveredPaths.has(subPath) && (parts[0] === 'services' || parts[0] === 'apps' || parts[0] === 'packages')) {
          discoveredPaths.add(subPath);
          const name = parts[parts.length - 2];
          const type = parts[0] === 'apps' ? 'app' : parts[0] === 'packages' ? 'package' : 'service';

          subprojects.push({
            id: `subproj-${subPath.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
            name,
            path: subPath,
            type,
            description: `Python Сервис: ${name}`
          });
        }
      }

      // 4. Java / Maven / Gradle submodules
      if (parts.length >= 3 && (parts[parts.length - 1] === 'pom.xml' || parts[parts.length - 1] === 'build.gradle' || parts[parts.length - 1] === 'build.gradle.kts')) {
        const subPath = parts.slice(0, parts.length - 1).join('/');
        if (!discoveredPaths.has(subPath) && subPath !== '') {
          discoveredPaths.add(subPath);
          const name = parts[parts.length - 2];
          const type = parts[0] === 'apps' ? 'app' : parts[0] === 'libs' ? 'package' : 'service';

          subprojects.push({
            id: `subproj-${subPath.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
            name,
            path: subPath,
            type,
            description: `JVM Модуль: ${name}`
          });
        }
      }
    }

    const isMonorepo = subprojects.length >= 2;
    return { isMonorepo, subprojects };
  }

  /**
   * Filters repository files by subproject path.
   */
  public static filterFiles(files: FileEntry[], subprojectPath?: string): FileEntry[] {
    if (!subprojectPath || subprojectPath === 'all' || subprojectPath === '') {
      return files;
    }
    const normSub = subprojectPath.replace(/\\/g, '/').toLowerCase();
    return files.filter(f => {
      const normP = f.path.replace(/\\/g, '/').toLowerCase();
      return normP.startsWith(normSub + '/') || normP === normSub;
    });
  }
}
