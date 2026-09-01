# UnitTests (Тестовые сценарии и результаты)

В данном документе описываются тестовые сценарии модульного, интеграционного и сквозного тестирования системы анализа репозиториев Bitbucket, а также фиксируются результаты выполнения тестов.

## 1. Сценарии тестирования (Test Suites)

### 1.1. Модуль детекции стека и структуры (Stack & Tree Parser)
| ID | Сценарий | Ожидаемый результат | Статус |
|:---|:---------|:---------------------|:-------|
| ST-01 | Парсинг Python FastAPI и SQLAlchemy | Определение Python 3.11+, FastAPI, SQLAlchemy | ✔ Успешно |
| ST-02 | Парсинг .NET C# и Entity Framework Core | Определение C# / .NET 8.0, ASP.NET Core, EF Core | ✔ Успешно |
| ST-03 | Парсинг C++ и фреймворка Oat++ | Определение C / C++, Oat++ Web Framework | ✔ Успешно |

### 1.2. Модуль модели данных и DDL (Data Model Analyzer)
| ID | Сценарий | Ожидаемый результат | Статус |
|:---|:---------|:---------------------|:-------|
| DM-01 | Парсинг PostgreSQL DDL (CREATE TABLE, PK, FK) | Извлечение таблиц, полей, первичных и внешних ключей | ✔ Успешно |
| DM-02 | Построение Mermaid ER-диаграммы | Валидная схема связей сущностей 1:N | ✔ Успешно |
| DM-03 | Валидация Foreign Key связей для D3 графа | Исключение передачи `undefined` узлов в `d3.forceLink` | ✔ Успешно |
| DM-04 | Динамический парсер Prisma / ORM без моков | Извлечение моделей из Prisma/SQL/ORM без подстановки дефолтных банковских таблиц | ✔ Успешно |

| DM-05 | Извлечение JS/TS структур данных | Парсинг объектов, маппингов и начальных состояний фронтенда | ✔ Успешно |
| DM-06 | Связывание неявных FK по типам сущностей | Автоматическая генерация FK связей (1:1 / 1:N) по прямым типам сущностей и коллекций | ✔ Успешно |
| DM-07 | Выделение ENUM сущностей из массивов строк | Автоматическое создание сущностей типа ENUM со списком значений и связью 1:N | ✔ Успешно |
| DM-08 | Регистрация системных типов | Преобразование параметров системных типов (file, folder, system) в отдельные сущности | ✔ Успешно |
| DM-09 | Извлечение ENUM из union-комментариев и структур массивов | Распознавание `'IDLE'|'RUNNING'` в ENUM и `Array of { ... }` в дочерние сущности со связями | ✔ Успешно |
| DM-10 | Скобочно-сбалансированный многострочный парсер объектов | Парсинг многострочных массивов строковых литералов без потери элементов из-за переносов строк | ✔ Успешно |

### 1.3. Модуль Swagger/OpenAPI и трассировки (API & Flows)
| ID | Сценарий | Ожидаемый результат | Статус |
|:---|:---------|:---------------------|:-------|
| API-01 | Парсинг Swagger / OpenAPI (JSON/YAML) | Извлечение маршрутов, HTTP-методов, operationId, параметров и моделей | ✔ Успешно |
| API-02 | Резолвинг схем `$ref` и Request Body в Swagger/OpenAPI | Извлечение вложенных моделей, списка полей, типов и генерация JSON-примера | ✔ Успешно |
| API-03 | Моделирование Response DTO (Scalar & Arrays) | Корректное определение примитивов (`int`), массивов (`int[]`, `UserDto[]`) и объектов | ✔ Успешно |
| TR-01 | Навигация по дереву файлов с подсветкой строки | Разрешение цеп| MN-01 | Детекция монорепозиториев (`MonorepoDetector`) | Распознавание Nx/Turborepo workspaces, .NET Solutions, subprojects и фильтрация файлов | ✔ Успешно |
| RC-01 | Классификатор и профилирование репозиториев (`RepoClassifier`) | Расчет Jaccard-схожести, детекция эволюционных копий (85%+ сходства) и микросервисов | ✔ Успешно |
| CR-01 | Межрепозиторная и межмодульная трассировка связей | Поиск исходящих REST вызовов и публикаций в топики Kafka между микросервисами | ✔ Успешно |
| PG-01 | D3 граф структуры проектов с монорепозиториями и версиями | Построение дерева с подпроектами, связями сходства 88% и безопасными D3 связями | ✔ Успешно |

### 1.4. Модуль интеграции и безопасности (Security & Integration)
| ID | Сценарий | Ожидаемый результат | Статус |
|:---|:---------|:---------------------|:-------|
| SEC-01 | Аудит безопасности зависимостей (SAST) | Устранение критических и высоких уязвимостей | ✔ Выполнено |
| SEC-02 | Шифрование токенов PAT (AES-256) | Безопасное локальное хранение учетных данных | ✔ Выполнено |

---

## 2. Результаты запусков тестов

| Дата | Версия / Сборка | Всего тестов | Успешно | Провалено | Ссылка на отчет |
|:-----|:----------------|:-------------|:--------|:----------|:----------------|
| 2026-08-25 | 1.0.0 (Core Engine) | 4 | 4 | 0 | `node --test tests/engine.test.js` (43ms) |
| 2026-08-27 | 1.7.0 (Swagger, PlantUML, ERD Fix) | 7 | 7 | 0 | `node --test tests/engine.test.js` (45ms) |
| 2026-08-27 | 1.8.0 (API Map Layout, PlantUML & Fullscreen, Responsive Typography) | 7 | 7 | 0 | `node --test tests/engine.test.js` (42ms) |
| 2026-08-27 | 2.2.0 (10-char space/bracket newline wrapping for Mermaid & PlantUML) | 8 | 8 | 0 | `node --test tests/engine.test.js` (43ms) |
| 2026-08-28 | 2.4.0 (Swagger $ref, Request Body, Response DTO Modal & Tree Line Focus) | 10 | 10 | 0 | `node --test tests/engine.test.js` (47ms) |
| 2026-08-28 | 2.5.0 (Screen Form D3 Structure Graph, screen_load Lifecycle & Source Navigation) | 12 | 12 | 0 | `node --test tests/engine.test.js` (46ms) |
| 2026-08-28 | 2.6.0 (Left-to-Right D3 Graph, Dynamic Return Button, DTO Model Path & Dropdown) | 13 | 13 | 0 | `node --test tests/engine.test.js` (45ms) |
| 2026-08-28 | 2.7.0 (Multi-tier DTO/Code Node Resolver, Content Search & 2-row Toolbar) | 14 | 14 | 0 | `node --test tests/engine.test.js` (42ms) |
| 2026-08-31 | 2.8.5 (PlantUML Fix, Dark Skinparams & Mermaid-to-PlantUML Converter) | 22 | 22 | 0 | `node --test tests/engine.test.js` (49ms) |
| 2026-08-31 | 2.8.6 (100% Offline PlantUML Local Vector SVG Rendering) | 23 | 23 | 0 | `node --test tests/engine.test.js` (50ms) |
| 2026-08-31 | 2.8.7 (Frontend JS/TS Data Model & ERD Structure Extraction) | 24 | 24 | 0 | `node --test tests/engine.test.js` (50ms) |
| 2026-08-31 | 2.8.8 (SET/ARRAY Element Typification & FK Target Resolution) | 25 | 25 | 0 | `node --test tests/engine.test.js` (51ms) |
| 2026-08-31 | 2.8.9 (Element Description & Class Name Priority Extraction) | 26 | 26 | 0 | `node --test tests/engine.test.js` (50ms) |
| 2026-08-31 | 2.9.0 (Entity Type Matching 1:1/1:N & Attribute Descriptions) | 27 | 27 | 0 | `node --test tests/engine.test.js` (50ms) |
| 2026-08-31 | 2.9.1 (ERD Source Code Navigation for Entities & Columns) | 28 | 28 | 0 | `node --test tests/engine.test.js` (51ms) |
| 2026-08-31 | 2.9.2 (ERD Tab D3 Graph Initialization & Safe Access Fix) | 28 | 28 | 0 | `node --test tests/engine.test.js` (52ms) |
| 2026-08-31 | 2.9.3 (ERD Container Scroll & Details Table Visibility Fix) | 28 | 28 | 0 | `node --test tests/engine.test.js` (50ms) |
| 2026-08-31 | 2.9.4 (ENUM Entities, System Types, Classification Badges & View Modes Toggle) | 30 | 30 | 0 | `node --test tests/engine.test.js` (51ms) |
| 2026-09-01 | 2.9.5 (Comment Union & Struct Array Extraction, Multiline Property Parser & ENUM Inspector) | 32 | 32 | 0 | `node --test tests/engine.test.js` (52ms) |
| 2026-09-01 | 2.9.6 (ERD Inline Comment Scoping & PlantUML ERD Generation/Conversion) | 33 | 33 | 0 | `node --test tests/engine.test.js` (54ms) |
| 2026-09-01 | 2.9.7 (D3 Project Graph: Monorepos, Subprojects & Evolutionary Version Links) | 34 | 34 | 0 | `node --test tests/engine.test.js` (54ms) |
�кальное хранение учетных данных | ✔ Выполнено |

---

## 2. Результаты запусков тестов

| Дата | Версия / Сборка | Всего тестов | Успешно | Провалено | Ссылка на отчет |
|:-----|:----------------|:-------------|:--------|:----------|:----------------|
| 2026-08-25 | 1.0.0 (Core Engine) | 4 | 4 | 0 | `node --test tests/engine.test.js` (43ms) |
| 2026-08-27 | 1.7.0 (Swagger, PlantUML, ERD Fix) | 7 | 7 | 0 | `node --test tests/engine.test.js` (45ms) |
| 2026-08-27 | 1.8.0 (API Map Layout, PlantUML & Fullscreen, Responsive Typography) | 7 | 7 | 0 | `node --test tests/engine.test.js` (42ms) |
| 2026-08-27 | 2.2.0 (10-char space/bracket newline wrapping for Mermaid & PlantUML) | 8 | 8 | 0 | `node --test tests/engine.test.js` (43ms) |
| 2026-08-28 | 2.4.0 (Swagger $ref, Request Body, Response DTO Modal & Tree Line Focus) | 10 | 10 | 0 | `node --test tests/engine.test.js` (47ms) |
| 2026-08-28 | 2.5.0 (Screen Form D3 Structure Graph, screen_load Lifecycle & Source Navigation) | 12 | 12 | 0 | `node --test tests/engine.test.js` (46ms) |
| 2026-08-28 | 2.6.0 (Left-to-Right D3 Graph, Dynamic Return Button, DTO Model Path & Dropdown) | 13 | 13 | 0 | `node --test tests/engine.test.js` (45ms) |
| 2026-08-28 | 2.7.0 (Multi-tier DTO/Code Node Resolver, Content Search & 2-row Toolbar) | 14 | 14 | 0 | `node --test tests/engine.test.js` (42ms) |
| 2026-08-31 | 2.8.5 (PlantUML Fix, Dark Skinparams & Mermaid-to-PlantUML Converter) | 22 | 22 | 0 | `node --test tests/engine.test.js` (49ms) |
| 2026-08-31 | 2.8.6 (100% Offline PlantUML Local Vector SVG Rendering) | 23 | 23 | 0 | `node --test tests/engine.test.js` (50ms) |
| 2026-08-31 | 2.8.7 (Frontend JS/TS Data Model & ERD Structure Extraction) | 24 | 24 | 0 | `node --test tests/engine.test.js` (50ms) |
| 2026-08-31 | 2.8.8 (SET/ARRAY Element Typification & FK Target Resolution) | 25 | 25 | 0 | `node --test tests/engine.test.js` (51ms) |
| 2026-08-31 | 2.8.9 (Element Description & Class Name Priority Extraction) | 26 | 26 | 0 | `node --test tests/engine.test.js` (50ms) |
| 2026-08-31 | 2.9.0 (Entity Type Matching 1:1/1:N & Attribute Descriptions) | 27 | 27 | 0 | `node --test tests/engine.test.js` (50ms) |
| 2026-08-31 | 2.9.1 (ERD Source Code Navigation for Entities & Columns) | 28 | 28 | 0 | `node --test tests/engine.test.js` (51ms) |
| 2026-08-31 | 2.9.2 (ERD Tab D3 Graph Initialization & Safe Access Fix) | 28 | 28 | 0 | `node --test tests/engine.test.js` (52ms) |
| 2026-08-31 | 2.9.3 (ERD Container Scroll & Details Table Visibility Fix) | 28 | 28 | 0 | `node --test tests/engine.test.js` (50ms) |
| 2026-08-31 | 2.9.4 (ENUM Entities, System Types, Classification Badges & View Modes Toggle) | 30 | 30 | 0 | `node --test tests/engine.test.js` (51ms) |
| 2026-09-01 | 2.9.5 (Comment Union & Struct Array Extraction, Multiline Property Parser & ENUM Inspector) | 32 | 32 | 0 | `node --test tests/engine.test.js` (52ms) |
| 2026-09-01 | 2.9.6 (ERD Inline Comment Scoping & PlantUML ERD Generation/Conversion) | 33 | 33 | 0 | `node --test tests/engine.test.js` (54ms) |











