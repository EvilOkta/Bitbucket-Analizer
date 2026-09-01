import { Recommendation, StackProfile, ApiEndpoint } from '../../shared/types';
import { FileEntry } from '../stack/stackDetector';

export class RuleEngine {
  public static analyze(
    files: FileEntry[],
    stack: StackProfile[],
    endpoints: ApiEndpoint[],
    analysisRunId: string
  ): Recommendation[] {
    const recs: Recommendation[] = [];
    const filePaths = files.map(f => f.path.replace(/\\/g, '/'));

    // 1. Проверка наличия тестов
    const hasTests = filePaths.some(p => p.includes('test') || p.includes('spec') || p.endsWith('_test.py') || p.endsWith('Tests.cs'));
    if (!hasTests) {
      recs.push({
        id: `rec-tests-${Date.now()}`,
        analysisRunId,
        title: 'Отсутствуют автоматизированные тесты в репозитории',
        description: 'В проекте не обнаружены каталоги или файлы модульных/интеграционных тестов (test/, tests/, *.spec.ts, *Tests.cs).',
        severity: 'high',
        category: 'testing',
        sourceType: 'rule_based',
        relatedFiles: [],
        suggestedAction: 'Создать каталог для тестов и настроить тестовый фреймворк в соответствии со стеком (PyTest, xUnit, Jest/Vitest, GTest).',
        rationale: 'Отсутствие тестов снижает надежность кодовой базы и увеличивает риск регрессий при рефакторинге.',
        confidence: 0.99,
        status: 'open'
      });
    }

    // 2. Проверка CI/CD конфигурации (Bitbucket Pipelines)
    const hasPipeline = filePaths.some(p => p.includes('bitbucket-pipelines.yml'));
    if (!hasPipeline) {
      recs.push({
        id: `rec-ci-${Date.now()}`,
        analysisRunId,
        title: 'Отсутствует конфигурация CI/CD (bitbucket-pipelines.yml)',
        description: 'В корне репозитория не найден файл bitbucket-pipelines.yml для автоматической сборки, тестирования и аудита безопасности.',
        severity: 'medium',
        category: 'maintainability',
        sourceType: 'rule_based',
        relatedFiles: [],
        suggestedAction: 'Добавить файл bitbucket-pipelines.yml с шагами линтинга, выполнения тестов и сборки артефакта.',
        rationale: 'Автоматизация CI/CD обеспечивает непрерывную интеграцию и проверку качества кода на каждом коммите.',
        confidence: 1.0,
        status: 'open'
      });
    }

    // 3. Проверка архитектурных слоев (Controllers vs Services vs Data Access)
    const controllerFiles = files.filter(f => f.path.toLowerCase().includes('controller') || f.path.toLowerCase().includes('routes'));
    for (const cf of controllerFiles) {
      if (cf.content && (cf.content.includes('SELECT ') || cf.content.includes('INSERT INTO') || (cf.content.split('\n').length > 400))) {
        recs.push({
          id: `rec-fat-controller-${Date.now()}-${recs.length}`,
          analysisRunId,
          title: `Смешивание слоев или перегруженный контроллер: ${cf.path.split('/').pop()}`,
          description: `Файл контроллера содержит прямые SQL-запросы или превышает рекомендуемый размер (${cf.content.split('\n').length} строк).`,
          severity: 'high',
          category: 'layering',
          sourceType: 'rule_based',
          relatedFiles: [cf.path],
          suggestedAction: 'Вынести бизнес-логику в сервисный слой (Service/UseCase), а работу с БД — в репозитории (Repository/DAO).',
          targetStructureExample: 'Controllers -> Services -> Repositories -> PostgreSQL DB',
          rationale: 'Нарушение принципа единой ответственности (SRP) усложняет масштабирование и тестирование логики.',
          confidence: 0.92,
          status: 'open'
        });
      }
    }

    // 4. Проверка безопасности и секретов (Hardcoded Secrets Detection)
    for (const f of files) {
      if (!f.content || f.path.includes('.git') || f.path.includes('node_modules')) continue;
      const secretMatches = /(password|secret|api_key|token)\s*=\s*['"][a-zA-Z0-9_\-+=/]{12,}['"]/i.test(f.content);
      if (secretMatches && !f.path.endsWith('.env.example')) {
        recs.push({
          id: `rec-sec-token-${Date.now()}-${recs.length}`,
          analysisRunId,
          title: `Потенциально захардкоженный секрет или токен в файле ${f.path.split('/').pop()}`,
          description: 'В исходном коде обнаружены строки, похожие на статически заданные пароли, токены или API-ключи.',
          severity: 'high',
          category: 'security',
          sourceType: 'rule_based',
          relatedFiles: [f.path],
          suggestedAction: 'Вынести секреты и учетные данные в переменные окружения (.env) или корпоративный Vault.',
          rationale: 'Хранение секретов в репозитории создает критический риск несанкционированного доступа к ресурсам.',
          confidence: 0.88,
          status: 'open'
        });
      }
    }

    // 5. Проверка версионирования БД / Миграций
    const hasDbStack = stack.some(s => s.category === 'database' || s.category === 'orm_db');
    const hasMigrations = filePaths.some(p => p.includes('migrations') || p.includes('alembic') || p.includes('flyway') || p.includes('liquibase'));
    if (hasDbStack && !hasMigrations) {
      recs.push({
        id: `rec-migrations-${Date.now()}`,
        analysisRunId,
        title: 'Не обнаружены версионированные миграции базы данных',
        description: 'Проект использует реляционную БД, однако в репозитории отсутствуют файлы миграций схемы (Alembic, EF Core Migrations, Flyway).',
        severity: 'medium',
        category: 'architecture',
        sourceType: 'rule_based',
        relatedFiles: [],
        suggestedAction: 'Внедрить систему миграций (Alembic для Python, EF Migrations для .NET, Flyway/Liquibase) для воспроизводимости структуры БД.',
        rationale: 'Управление изменениями схемы через миграции предотвращает рассинхронизацию между средами разработки и продакшена.',
        confidence: 0.90,
        status: 'open'
      });
    }

    return recs;
  }
}
