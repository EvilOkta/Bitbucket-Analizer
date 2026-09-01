
Техническое задание
Разработка приложения для анализа репозиториев Bitbucket, построения архитектуры, API-карт, моделей данных и sequence-диаграмм
1. Общие сведения
1.1. Название системы
Система анализа репозиториев и артефактов разработки.
1.2. Краткое описание
Приложение должно подключаться к Bitbucket и Confluence, анализировать исходный код репозиториев, определять используемый технологический стек, строить дерево проекта, выявлять API-методы, отслеживать потоки данных от фронтенда или интеграций до уровня работы с данными, формировать sequence-диаграммы вызовов, а также строить логическую модель данных на основе структуры базы данных.
Для интеллектуального анализа, генерации рекомендаций, пояснений и текстовых описаний система должна использовать API локально развернутой нейросети.
2. Назначение и цели разработки
2.1. Назначение системы
Система предназначена для автоматизированного анализа репозиториев исходного кода, получения представления об архитектуре приложения, API, потоках данных, структуре БД и качестве организации кодовой базы.
2.2. Цели разработки
Автоматизировать анализ репозиториев Bitbucket.
Повысить прозрачность архитектуры существующих проектов.
Ускорить онбординг новых разработчиков и аналитиков.
Выявлять потенциальные проблемы структуры проекта.
Формировать рекомендации по оптимизации структуры репозитория.
Строить документацию по API, потокам вызовов и модели данных.
Интегрироваться с Confluence для публикации аналитических материалов.
Использовать локальную LLM для генерации пояснений и рекомендаций без выгрузки кода во внешние облачные сервисы.
3. Термины и сокращения
Репозиторий — Git-репозиторий в Bitbucket.
Дерево репозитория — иерархическая структура файлов и директорий проекта.
Стек — набор используемых технологий: языки, фреймворки, библиотеки, инструменты сборки.
API-метод — конечная точка взаимодействия: REST endpoint, GraphQL query/mutation, RPC-метод, handler и т.п.
Sequence-диаграмма — диаграмма последовательности вызовов.
Логическая модель данных — описание сущностей, атрибутов и связей без привязки к физической реализации БД.
LLM — локальная большая языковая модель.
Call Graph — граф вызовов функций/методов.
Data Flow — поток передачи и изменения данных между компонентами системы.
4. Пользователи и роли
4.1. Администратор
Настраивает подключения к Bitbucket и Confluence.
Управляет секретами, токенами, пользователями.
Просматривает журналы аудита.
Настраивает параметры LLM.
4.2. Архитектор / аналитик
Просматривает структуру репозиториев.
Получает рекомендации.
Анализирует API, data flow, sequence-диаграммы.
Работает с логической моделью данных.
Публикует результаты в Confluence.
4.3. Разработчик / технический специалист
Просматривает результаты анализа.
Экспортирует артефакты.
Уточняет параметры анализа конкретного репозитория.
5. Общие требования к системе
5.1. Тип приложения
Веб-приложение с серверной частью и пользовательским интерфейсом.
5.2. Рекомендуемая архитектура
Frontend: SPA.
Backend: REST API / GraphQL API.
Отдельные воркеры для анализа кода.
Очередь задач для длительных операций.
Хранилище метаданных.
Хранилище артефактов анализа.
Адаптер интеграции с локальной LLM.
5.3. Основные принципы работы
Код репозиториев не должен передаваться во внешние публичные сервисы, кроме случаев явно разрешенной локальной LLM.
Анализ должен быть инкрементальным: повторный анализ только измененных файлов/коммитов.
Все интеллектуальные выводы LLM должны помечаться как автоматически сгенерированные.
Должна быть возможность ручного подтверждения или корректировки выводов.
Система должна деградировать gracefully: если LLM недоступна, базовый статический анализ должен продолжать работать.
6. Функциональные требования
6.1. Подключение к Bitbucket
6.1.1. Обязательные требования
Система должна поддерживать подключение к Bitbucket:
Bitbucket Cloud;
опционально Bitbucket Data Center / Server.
6.1.2. Способы авторизации
Поддержать как минимум один из механизмов:
OAuth 2.0;
Personal Access Token;
App password для Bitbucket Cloud;
API token для Data Center.
6.1.3. Функции подключения
Страница подключения должна позволять:
Указать URL Bitbucket.
Выбрать тип подключения: Cloud / Data Center.
Ввести учетные данные или токен.
Проверить соединение.
Запросить необходимые scopes/permissions.
Сохранить подключение в зашифрованном виде.
Протестировать доступ к списку workspace/project/repositories.
6.1.4. Доступы Bitbucket
Для работы системы потребуются права:
чтение workspace/project;
чтение repositories;
чтение pull requests при необходимости;
чтение pipelines при необходимости;
webhooks, если требуется автоматический повторный анализ.
6.2. Подключение к Confluence
6.2.1. Обязательные требования
Система должна поддерживать подключение к Confluence:
Confluence Cloud;
опционально Confluence Data Center / Server.
6.2.2. Функции страницы подключения
Указать URL Confluence.
Выбрать тип подключения.
Ввести API token / OAuth credentials.
Проверить доступ.
Выбрать space для публикации.
Назначить родительскую страницу.
Сохранить подключение.
6.2.3. Возможности интеграции
Система должна уметь:
создавать страницы;
обновлять страницы;
публиковать отчеты;
публиковать диаграммы;
публиковать таблицы модели данных;
прикреплять артефакты анализа;
вести журнал публикации.
6.3. Импорт и синхронизация репозитория
6.3.1. Выбор репозитория
Пользователь должен иметь возможность:
выбрать workspace;
выбрать project;
выбрать repository;
выбрать ветку;
выбрать commit/tag при необходимости.
6.3.2. Синхронизация
Система должна:
Клонировать репозиторий или выгружать содержимое через API/Git-протокол.
Хранить локальную рабочую копию для анализа.
Поддерживать повторную синхронизацию.
Отслеживать текущий commit hash.
Выполнять инкрементальный анализ.
6.3.3. Триггеры анализа
Поддержать:
ручной запуск;
запуск по событию из Bitbucket webhook;
расписание;
запуск после merge/push.
6.4. Построение дерева репозитория
6.4.1. Требования к дереву
Система должна строить иерархическое дерево:
директории;
файлы;
модули;
пакеты;
компоненты;
конфигурационные файлы;
миграции;
тесты;
CI/CD-файлы;
документация.
6.4.2. Атрибуты узлов дерева
Для каждого узла хранить:
путь;
тип: folder/file/module/package;
язык;
размер;
назначение, если определено;
связанные сущности: endpoints, components, services, repositories;
статус анализа;
уровень важности;
обнаруженные проблемы.
6.4.3. Визуализация
UI должен поддерживать:
древовидный просмотр;
поиск по пути;
фильтрацию по типу;
отображение метаданных;
цветовую маркировку проблемных зон;
связь файлов с API и flow-диаграммами.
6.5. Определение технологического стека
6.5.1. Источники определения
Стек должен определяться по:
файлам манифестов: package.json, pom.xml, build.gradle, requirements.txt, pyproject.toml, go.mod, *.csproj;
lock-файлам;
Dockerfile, docker-compose;
конфигурационным файлам;
структуре директорий;
расширению файлов;
импортам;
CI/CD-конфигурациям.
6.5.2. Определяемые категории
Языки программирования.
Frontend-фреймворки.
Backend-фреймворки.
ORM / DB access.
Типы баз данных.
Тестовые фреймворки.
Инструменты сборки.
Линтеры/форматтеры.
Контейнеризация.
API-спецификации: OpenAPI, Swagger, GraphQL schema.
Инфраструктурный код.
6.5.3. Результат
Для репозитория формируется карточка стека:
выявленные технологии;
версия, если определена;
уровень уверенности;
источник доказательства;
альтернативные гипотезы.
6.6. Формирование предложений по оптимизации структуры репозитория
6.6.1. Назначение
Система должна анализировать структуру проекта и предлагать улучшения с учетом определенного стека.
6.6.2. Типы рекомендаций
Оптимизация структуры директорий.
Выделение модулей/пакетов.
Разделение frontend/backend/shared.
Устранение дублирования кода.
Несоответствие структуры принятым конвенциям стека.
Отсутствие или неправильное расположение конфигурации.
Отсутствие тестов, миграций, документации.
Смешивание инфраструктурного и прикладного кода.
Признаки циклических зависимостей.
Признаки устаревшей архитектуры.
6.6.3. Формат рекомендации
Каждая рекомендация должна содержать:
заголовок;
описание проблемы;
уровень критичности: high / medium / low;
категорию;
обнаруженные файлы/директории;
предлагаемое действие;
пример целевой структуры;
обоснование;
уверенность анализа;
источник: rule-based / LLM / hybrid.
6.6.4. Примеры рекомендаций
Вынести общие DTO в отдельный слой shared/dto.
Разделить слои controllers, services, repositories.
Перенести инфраструктурные настройки в infrastructure или config.
Сгруппировать feature-компоненты фронтенда по доменным областям.
Удалить неиспользуемые файлы или вынести их в deprecated.
6.6.5. Роль LLM
LLM может:
дополнять rule-based выводы текстовыми пояснениями;
предлагать альтернативные варианты структуры;
адаптировать рекомендации под конкретный стек;
формировать executive summary.
Но итоговые рекомендации должны быть основаны на детерминированных фактах анализа и не должны быть полностью «галлюцинацией» модели.
6.7. Построение карты API-методов
6.7.1. Назначение
Система должна автоматически находить и систематизировать API-методы репозитория.
6.7.2. Поддерживаемые типы API
Минимально:
REST;
HTTP handlers;
GraphQL queries/mutations;
RPC/gRPC при наличии proto-файлов;
WebSocket/SSE при наличии;
message consumers/producers как отдельный тип integration endpoints.
6.7.3. Источники обнаружения
аннотации и декораторы;
route definitions;
OpenAPI/Swagger файлы;
GraphQL schema;
proto files;
конфиги API gateway;
handler registration;
controller classes;
serverless function definitions.
6.7.4. Атрибуты API-метода
Для каждого endpoint хранить:
ID;
HTTP method, если применимо;
path/route;
тип API;
контроллер/обработчик;
входной DTO/request schema;
выходной DTO/response schema;
авторизация/roles при обнаружении;
source file;
line number;
description;
tags;
related services;
related DB entities;
confidence score;
status: active/deprecated/internal.
6.7.5. Визуализация карты API
UI должен показывать:
список endpoints;
группировку по controller/module/domain;
поиск и фильтры;
карточку endpoint;
связи с sequence diagrams;
связи с model entities;
export в OpenAPI/Markdown/Confluence.
6.7.6. Ограничения и требования к качеству
Если endpoint не может быть точно распознан:
помечать как candidate;
указывать confidence;
показывать исходный фрагмент кода.
6.8. Анализ кода и определение потока данных
6.8.1. Назначение
Система должна отслеживать путь данных:
от frontend-компонента или внешнего интеграционного вызова;
через API/handler;
через service/use-case слой;
до repository/ORM/SQL;
до фактического получения или изменения данных;
и обратно, если применимо.
6.8.2. Объекты анализа
frontend components;
HTTP clients;
API calls;
controllers/handlers;
middleware;
services;
use cases;
repositories;
ORM entities;
SQL queries;
migrations;
external clients;
message brokers;
mappers/DTO converters.
6.8.3. Типы потоков
Поддержать как минимум:
query flow: чтение данных;
command flow: создание/обновление/удаление;
integration flow: внешний вызов;
event flow: обработка события;
auth flow, если возможно.
6.8.4. Результат анализа
Для каждого выявленного потока формировать:
точку входа;
цепочку вызовов;
участвующие компоненты;
передаваемые данные;
места изменения данных;
конечную операцию с БД или внешней системой;
sequence-диаграмму;
confidence score;
найденные риски: N+1 queries, отсутствие транзакции, потенциальная утечка данных и т.п. по желанию.
6.8.5. Алгоритм анализа
Рекомендуемый подход:
Парсинг AST.
Построение call graph.
Разрешение импортов и символов.
Определение route/handler bindings.
Определение dependency injection связей.
Отслеживание передачи аргументов.
Определение repository/DB вызовов.
Построение последовательности вызовов.
Верификация через LLM как вспомогательный шаг.
6.8.6. Ограничения
Система должна явно обрабатывать случаи:
динамическая типизация;
reflection;
DI контейнеры;
runtime route registration;
event-driven вызовы;
очереди;
generic/reusable функции;
метапрограммирование.
Для таких случаев помечать связи как:
confirmed;
inferred;
weak candidate.
6.9. Построение sequence-диаграмм вызовов
6.9.1. Требования
Для каждого обнаруженного data flow система должна генерировать sequence-диаграмму.
6.9.2. Формат
Поддержать:
Mermaid;
PlantUML;
внутренний JSON-формат;
экспорт изображения PNG/SVG при необходимости.
6.9.3. Содержание диаграммы
Диаграмма должна отображать:
participants: Frontend, API, Service, Repository, DB, External System, Broker;
sequence вызовов;
передаваемые сущности или DTO, опционально;
sync/async вызовы;
return responses;
места ошибок/валидации, если обнаружено;
альтернативные ветки при наличии.
6.9.4. UI требования
Пользователь должен:
выбирать flow из списка;
просматривать диаграмму;
раскрывать участников;
переходить к исходному коду;
переключать уровень детализации;
фильтровать по endpoint/module;
публиковать диаграмму в Confluence.
6.10. Инструмент составления логической модели данных
6.10.1. Назначение
Система должна строить логическую модель данных на основе:
структуры БД;
миграций;
ORM entities;
SQL DDL;
schema-файлов;
flyway/liquibase миграций;
Prisma/TypeORM/Sequelize/JPA/Hibernate моделей при наличии.
6.10.2. Источники модели
Поддержать:
Подключение к БД напрямую в режиме read-only.
Загрузку DDL-скриптов.
Анализ миграций.
Анализ ORM entities.
Анализ database changelog файлов.
6.10.3. Состав модели
Модель должна включать:
сущности;
таблицы;
поля;
типы данных;
первичные ключи;
внешние ключи;
индексы;
ограничения;
nullable/not null;
enum-like значения, если определяются;
связи one-to-one / one-to-many / many-to-many;
логические домены;
описания сущностей.
6.10.4. Логическая модель
На основе физической структуры система должна генерировать логическое представление:
Entity;
Attributes;
Relationships;
Business meaning, если может быть выведено из имен и кода;
Domain grouping;
Candidate master data / transactional data.
6.10.5. Визуализация
Требуется:
ER-диаграмма;
табличный список сущностей;
карточка сущности;
поиск связей;
фильтрация по домену;
ручная корректировка имен и описаний;
версионирование модели.
6.10.6. Экспорт
Поддержать экспорт:
PNG/SVG;
Markdown;
Confluence page;
JSON;
CSV;
SQL DDL при необходимости;
PlantUML/Mermaid.
6.11. Использование локальной нейросети
6.11.1. Назначение LLM
Локальная LLM должна использоваться для:
Генерации пояснений к найденным структурам.
Формирования рекомендаций по улучшению структуры.
Описания API-методов.
Описания sequence-диаграмм.
Классификации модулей по доменам.
Генерации описаний сущностей модели данных.
Ответов на вопросы пользователя по результатам анализа.
Summarization large artifacts.
6.11.2. Требования к подключению
Система должна подключаться к локальному LLM API.
Поддержать как минимум один из форматов:
OpenAI-compatible REST API;
Ollama API;
vLLM API;
custom HTTP endpoint с JSON request/response.
6.11.3. Параметры LLM
Настраиваемые параметры:
endpoint URL;
API key, если требуется;
model name;
temperature;
max tokens;
timeout;
retries;
context window;
prompt templates;
rate limit.
6.11.4. Требования к безопасности
Код не должен передаваться во внешние публичные LLM.
Локальная LLM должна рассматриваться как внутренний сервис.
Должна быть возможность полностью отключить LLM.
Промпты и ответы должны логироваться опционально.
Ответы LLM должны помечаться как AI-generated.
6.11.5. Архитектура использования LLM
Рекомендуется hybrid approach:
Статический анализ собирает факты.
LLM получает структурированный контекст.
LLM возвращает JSON/текст.
Backend валидирует ответ.
UI отображает результат с confidence label.
6.11.6. Fallback behavior
Если LLM недоступна:
базовый анализ работает;
рекомендации показываются в упрощенном виде;
пользователь видит статус LLM unavailable.
6.12. Страницы пользовательского интерфейса
6.12.1. Обязательные страницы
Dashboard
список подключений;
последние анализы;
статусы задач;
сводные метрики.
Connections
Bitbucket connection page;
Confluence connection page;
Database connection page, опционально;
LLM settings page.
Repositories
выбор репозитория;
запуск анализа;
статус синхронизации;
история коммитов/анализов.
Repository Explorer
дерево репозитория;
метаданные файла;
найденные проблемы;
рекомендации.
Stack Overview
выявленный стек;
версии;
источники;
confidence.
Recommendations
список рекомендаций;
фильтры по severity/category;
детали;
экспорт.
API Map
список endpoints;
карточка API;
связи;
фильтры;
экспорт.
Data Flows
список потоков;
sequence diagrams;
drill-down;
source links.
Data Model
ER diagram;
entities;
relationships;
domain groups;
manual editing.
Confluence Publishing
выбор space/page;
preview;
publish/update;
history.
Settings
users/roles;
tokens/secrets;
analysis settings;
LLM settings;
notifications.
Audit & Jobs
история запусков;
ошибки;
длительность;
логи.
7. Требования к интеграциям
7.1. Bitbucket Integration
Возможности:
список workspaces/projects/repositories;
получение repository metadata;
клонирование кода;
чтение branches/commits;
webhook events;
чтение pull request metadata при необходимости.
Методы интеграции:
REST API;
Git over HTTPS/SSH;
Webhooks.
7.2. Confluence Integration
Возможности:
создание страниц;
обновление страниц;
публикация rich content;
публикация диаграмм;
загрузка вложений;
поиск страниц;
управление страницей отчетов.
Методы интеграции:
Confluence REST API v2 для Cloud или v1 для Data Center, в зависимости от версии;
OAuth / API token / Basic auth.
7.3. Database Integration
Режимы:
read-only подключение;
загрузка DDL;
анализ миграций.
Поддерживаемые БД для MVP желательно:
PostgreSQL;
MySQL;
MS SQL;
Oracle опционально;
SQLite для локальных артефактов.
Данные для извлечения:
tables;
columns;
constraints;
indexes;
foreign keys;
schemas;
comments, если есть.
7.4. LLM Integration
Требования:
HTTP API;
JSON request/response;
streaming optional;
retry policy;
timeout;
model health check;
prompt template management.
8. Архитектура системы
8.1. Компоненты
8.1.1. Frontend
SPA интерфейс;
визуализация деревьев, графов, диаграмм;
работа с формами подключений.
8.1.2. API Gateway / Backend Core
аутентификация;
управление проектами;
orchestration;
CRUD для результатов;
интеграции.
8.1.3. Analysis Engine
repository scanner;
stack detector;
AST parser;
call graph builder;
data flow analyzer;
API extractor;
DB schema analyzer.
8.1.4. LLM Adapter
prompt builder;
response validator;
cache;
retry/timeout handling.
8.1.5. Job Queue
задачи анализа;
повторный анализ;
экспорт;
публикация в Confluence.
8.1.6. Storage
relational DB для метаданных;
object storage для артефактов;
file storage для repo snapshots.
8.1.7. Audit & Logging
access logs;
analysis logs;
LLM logs;
integration logs.
8.2. Рекомендуемый технологический стек разработки
Может быть изменен по решению команды.
Вариант 1:
Frontend: React / Vue + TypeScript;
Backend: Node.js/NestJS или Python/FastAPI;
Analysis: TypeScript/Python parsers + tree-sitter;
DB: PostgreSQL;
Queue: Redis + BullMQ / Celery;
Diagrams: Mermaid, PlantUML, D3/Cytoscape для графов;
LLM client: OpenAI-compatible HTTP client.
Вариант 2:
Backend: Java/Kotlin Spring Boot;
Frontend: React;
Analysis: tree-sitter / JavaParser / Spoon / Roslyn в зависимости от целевых языков;
DB: PostgreSQL;
Queue: RabbitMQ/Kafka.
9. Модель данных системы
Ниже приведен рекомендуемый состав сущностей.
9.1. IntegrationCredential
id;
type: bitbucket / confluence / database / llm;
auth_type;
encrypted_secret;
status;
created_at;
updated_at.
9.2. Repository
id;
integration_id;
workspace;
project_key;
slug;
default_branch;
clone_url;
last_sync_commit;
last_sync_at.
9.3. AnalysisRun
id;
repository_id;
commit_hash;
branch;
status: queued/running/completed/failed;
started_at;
finished_at;
triggered_by;
stats.
9.4. FileNode
id;
analysis_run_id;
path;
type;
language;
size;
hash;
metadata.
9.5. StackProfile
id;
analysis_run_id;
technology;
version;
category;
confidence;
evidence.
9.6. Recommendation
id;
analysis_run_id;
title;
description;
severity;
category;
source_type;
related_nodes;
confidence;
status.
9.7. ApiEndpoint
id;
analysis_run_id;
method;
path;
type;
handler_ref;
request_schema;
response_schema;
auth_info;
confidence;
source_file;
source_line.
9.8. FlowTrace
id;
analysis_run_id;
entry_point_id;
flow_type;
name;
confidence;
steps.
9.9. SequenceDiagram
id;
flow_trace_id;
format: mermaid/plantuml/json;
content;
version.
9.10. DataModel
id;
analysis_run_id;
source: db/ddl/migrations/orm;
version;
status.
9.11. EntityModel
id;
data_model_id;
name;
physical_table;
domain;
description;
is_logical_only.
9.12. EntityAttribute
id;
entity_id;
name;
physical_column;
type;
nullable;
pk;
fk;
description.
9.13. EntityRelationship
id;
data_model_id;
source_entity_id;
target_entity_id;
type;
cardinality;
foreign_key_name;
confidence.
9.14. LLMTask
id;
purpose;
input_hash;
prompt_template;
model;
status;
response;
error;
created_at.
9.15. AuditLog
id;
user_id;
action;
object_type;
object_id;
timestamp;
metadata.
10. Алгоритмы и правила анализа
10.1. Определение стека
Сбор манифестов.
Извлечение зависимостей.
Сопоставление с базой правил.
Проверка структуры и конфигураций.
Формирование confidence score.
Опциональная LLM-верификация.
10.2. Рекомендации по структуре
Построение дерева.
Определение типа проекта: frontend/backend/fullstack/monorepo/library/infra.
Сопоставление с конвенциями стека.
Выявление anti-patterns:
все файлы в корне;
смешанные слои;
отсутствие тестов;
дубли;
гигантские директории;
неочевидные имена.
Rule-based recommendations.
LLM enrichment.
10.3. API extraction
Поиск route registrations.
Parsing annotations/decorators.
Import resolution.
Mapping controller-method-endpoint.
Request/response extraction.
Linking to call graph.
10.4. Call graph / data flow
AST parsing.
Symbol table.
Function/method resolution.
Edge creation: call, await, emit, subscribe, dispatch.
Path finding from entry point to data sink/source.
Confidence scoring.
Sequence generation.
10.5. DB model extraction
Чтение information_schema при direct connect.
Парсинг DDL.
Парсинг migration files.
Парсинг ORM decorators/entities.
Нормализация физической модели.
Генерация логической модели.
LLM enrichment для описаний.
11. Требования к безопасности
11.1. Аутентификация
локальные пользователи;
SSO/OIDC опционально;
session/token based auth.
11.2. Авторизация
RBAC;
разграничение по spaces/projects/repositories;
read-only доступ к БД;
отдельные права на публикацию в Confluence.
11.3. Хранение секретов
токены только в зашифрованном виде;
secrets manager или encrypted storage;
маскировка в UI;
ротация.
11.4. Обработка кода
код должен оставаться внутри контура организации;
запрет на отправку во внешние SaaS LLM;
доступ к репозиториям только с явно выданными разрешениями.
11.5. LLM security
sanitize prompts;
не выполнять инструкции из кода как команды;
ограничить max context size;
не хранить чувствительные данные дольше необходимого;
помечать AI-generated content.
11.6. Аудит
все подключения;
запуски анализа;
публикации в Confluence;
изменения моделей;
доступ к секретам.
12. Нефункциональные требования
12.1. Производительность
Запуск анализа репозитория среднего размера — асинхронно.
UI должен оставаться отзывчивым.
Для больших репозиториев обязателен инкрементальный анализ.
Timeouts для всех внешних вызовов.
12.2. Масштабируемость
Возможность запускать несколько analysis workers.
Очередь задач для параллельной обработки.
12.3. Надежность
Retry для временных сбоев.
Повторный запуск failed jobs.
Контрольные точки для длительных операций.
12.4. Логирование
structured logs;
correlation id;
error tracking.
12.5. Наблюдаемость
health endpoints;
status LLM;
status Bitbucket/Confluence;
metrics по очередям и длительности анализа.
13. Требования к UI/UX
Единый навигационный раздел по репозиторию.
Быстрый переход от сущности к исходному коду.
Индикаторы confidence для всех автоматических выводов.
Возможность ручного редактирования описаний.
Preview перед публикацией в Confluence.
Экспортируемые отчеты.
Темная/светлая тема опционально.
14. Экспорт и публикация результатов
14.1. Форматы экспорта
Markdown;
HTML;
JSON;
CSV;
PNG/SVG для диаграмм;
PlantUML/Mermaid source;
OpenAPI YAML/JSON при возможности.
14.2. Публикация в Confluence
Поддержать публикацию следующих артефактов:
Repository overview.
Stack summary.
Recommendations report.
API map.
Sequence diagrams.
Logical data model.
ER diagram.
Executive summary.
14.3. Требования к публикации
выбор space;
выбор parent page;
create new / update existing;
page template;
conflict handling;
publish history.
15. Этапы разработки
Этап 1. MVP
Цель: получить базовую ценность.
Включает:
Подключение к Bitbucket.
Выбор репозитория и ветки.
Синхронизация кода.
Построение дерева репозитория.
Определение стека.
Простые rule-based рекомендации по структуре.
Локальная LLM интеграция для пояснений.
Ручной запуск анализа.
Просмотр результатов в UI.
Ограничения MVP:
без Confluence publishing или с минимальной публикацией;
без DB direct connect;
без сложного data flow;
API map только для наиболее популярных стеков.
Этап 2. API Map и расширенный анализ структуры
Расширенное определение стека.
Построение API map.
Связь endpoints с файлами.
Улучшение рекомендаций.
Экспорт отчетов.
Этап 3. Data Flow и Sequence Diagrams
Call graph.
Entry point detection.
Flow tracing.
Sequence diagrams.
Confidence scoring.
Drill-down UI.
Этап 4. Logical Data Model
Анализ миграций/ORM/DDL.
Direct DB read-only подключение.
ER visualization.
Logical model builder.
Manual editing.
Этап 5. Confluence publishing и enterprise features
Полноценная интеграция с Confluence.
Publishing templates.
RBAC.
Audit log.
SSO.
Scheduled analysis.
Webhook triggers.
16. Критерии приемки
16.1. Подключения
Система успешно подключается к Bitbucket и отображает список доступных репозиториев.
Система успешно подключается к Confluence и может создать тестовую страницу.
Ошибки авторизации отображаются пользователю в понятном виде.
16.2. Анализ репозитория
Для выбранного репозитория система строит дерево файлов.
Система корректно определяет основной стек для поддерживаемых языков/фреймворков.
Для каждого файла виден путь, тип и статус анализа.
16.3. Рекомендации
Система формирует минимум один тип рекомендаций по структуре.
Каждая рекомендация имеет severity, description, source, confidence.
Рекомендации связаны с конкретными файлами/директориями.
16.4. API map
Для поддерживаемого backend-фреймворка система находит endpoints.
Для endpoint отображаются method, path, source, handler.
Endpoint может быть связан с flow или помечен как isolated.
16.5. Data flow / sequence diagrams
Для выбранного API-метода система строит хотя бы один flow.
Sequence diagram отображает цепочку вызовов.
Пользователь может перейти к соответствующим исходникам.
16.6. Модель данных
Система строит список сущностей из DDL/миграций/подключения к БД.
Для сущностей отображаются поля и связи.
ER-диаграмма рендерится без ошибок.
16.7. LLM
LLM вызывается локально.
Ответы отображаются с пометкой AI-generated.
При недоступности LLM система не падает.
17. Ограничения и допущения
Полная точность data flow для динамических языков и runtime-generated кода не гарантируется.
Для сложных legacy-проектов часть связей будет помечаться как inferred.
Качество анализа зависит от поддерживаемых языков и фреймворков.
LLM может ошибаться, поэтому критичные решения требуют подтверждения человеком.
Анализ больших монорепозиториев может требовать дополнительной оптимизации.
18. Риски
Риск
Описание
Меры снижения
Сложность статического анализа
Не все вызовы можно отследить статически
confidence labels, частичное покрытие, dynamic tracing в будущем
Разнообразие стеков
Разные версии фреймворков и паттернов
модульные адаптеры, приоритетная поддержка ограниченного набора стеков
Ошибки LLM
Галлюцинации, неточные рекомендации
hybrid approach, валидация, обязательные rule-based facts
Производительность
Большие репозитории, долгие анализы
queue, workers, incremental analysis, кэширование
Безопасность
Доступ к коду и секретам
шифрование, RBAC, audit, локальный LLM
Confluence API differences
Отличия Cloud и Data Center
адаптеры версий, тестирование на обеих платформах
19. Требования к поддерживаемым языкам и стекам для первой очереди
Рекомендуется выбрать ограниченный набор для MVP, чтобы обеспечить качество.
Минимальный набор для MVP:
TypeScript / JavaScript;
Node.js backend: Express/NestJS/Fastify;
Frontend: React/Vue/Angular по необходимости;
Python backend: FastAPI/Django/Flask;
Java backend: Spring Boot;
PostgreSQL DDL/migrations.
Опционально позже:
Go;
C#/.NET;
Kotlin;
Ruby;
PHP;
Rust.
20. Возможные метрики успеха продукта
Время от подключения репозитория до первого полезного отчета.
Доля автоматически определенных API-методов от общего числа фактических endpoints.
Доля подтвержденных пользователями рекомендаций.
Количество опубликованных страниц в Confluence.
Сокращение времени на онбординг в проект.
Количество выявленных проблем структуры.
Процент успешных analysis jobs.
21. Состав deliverables
Web application.
Backend API.
Analysis engine.
LLM adapter.
Bitbucket connector.
Confluence connector.
Database schema analyzer.
Documentation:
user guide;
admin guide;
deployment guide;
API documentation.
Test suite.
CI/CD pipeline.
22. Рекомендуемая структура отчета для пользователя
22.1. Repository Overview
название;
ветка;
commit;
стек;
структура;
размер;
основные модули.
22.2. Architecture Summary
слои;
entry points;
ключевые сервисы;
интеграции;
БД.
22.3. API Inventory
endpoints;
controllers;
methods;
tags.
22.4. Data Flow Report
sequence diagrams;
участники;
изменение данных;
риски.
22.5. Data Model
сущности;
связи;
ER diagram;
описания.
22.6. Recommendations
приоритизированный список;
expected impact;
effort hint, опционально.
23. Черновик API системы
Ниже пример REST endpoints.
Integrations
POST /api/integrations/bitbucket/test
POST /api/integrations/bitbucket
GET /api/integrations
DELETE /api/integrations/{id}
Confluence
POST /api/integrations/confluence/test
POST /api/integrations/confluence
POST /api/confluence/publish
Repositories
GET /api/repositories
POST /api/repositories/{id}/sync
GET /api/repositories/{id}/runs
Analysis
POST /api/analysis/run
GET /api/analysis/{runId}/status
GET /api/analysis/{runId}/tree
GET /api/analysis/{runId}/stack
GET /api/analysis/{runId}/recommendations
API Map
GET /api/analysis/{runId}/endpoints
GET /api/endpoints/{id}
GET /api/endpoints/{id}/flows
Data Flow
GET /api/analysis/{runId}/flows
GET /api/flows/{id}/sequence-diagram
Data Model
GET /api/analysis/{runId}/data-model
GET /api/data-model/{id}/entities
GET /api/data-model/{id}/relationships
GET /api/data-model/{id}/er-diagram
LLM
POST /api/llm/explain
POST /api/llm/recommend
GET /api/llm/health
24. Требования к тестированию
24.1. Виды тестов
Unit tests для парсеров и анализаторов.
Integration tests для Bitbucket/Confluence connectors.
Contract tests для LLM adapter.
E2E tests для ключевых сценариев UI.
Performance tests для больших репозиториев.
Security tests для секретов и доступа.
24.2. Тестовые сценарии
Подключение Bitbucket успешно.
Подключение Bitbucket с неверным токеном дает понятную ошибку.
Анализ репозитория завершается успешно.
Дерево отображается корректно.
Стек определяется по манифестам.
Рекомендации создаются и имеют все атрибуты.
API endpoints извлекаются из тестового проекта.
Flow строится от controller до repository.
Sequence diagram рендерится.
Модель данных строится из DDL.
Confluence page публикуется.
LLM unavailable не приводит к падению системы.
25. Вопросы, которые нужно уточнить перед финализацией ТЗ
Какой Bitbucket используется: Cloud, Data Center или оба?
Какой Confluence используется: Cloud, Data Center или оба?
Какие языки и фреймворки являются приоритетными для первой версии?
Нужен ли прямой доступ к БД или достаточно анализа миграций и ORM?
Какой формат LLM API будет использоваться: OpenAI-compatible, Ollama, vLLM, custom?
Требуется ли поддержка monorepo?
Требуется ли анализ pull requests и pipelines?
Нужна ли поддержка SSO/OIDC?
Какой максимальный размер репозитория ожидается?
Нужен ли multi-tenancy?
Требуется ли динамический анализ/tracing или только статический?
Нужна ли история изменений моделей и рекомендаций во времени?
Нужна ли ролевая модель на уровне конкретных репозиториев?
Нужен ли экспорт в ArchiMate/UML/C4?
Нужна ли генерация документации в формате architecture decision records?
26. Краткая формулировка для шапки официального ТЗ
Разрабатываемое приложение должно обеспечивать автоматизированный анализ репозиториев Bitbucket, определение технологического стека, построение структуры проекта, формирование рекомендаций по оптимизации архитектуры и организации кода, инвентаризацию API-методов, трассировку потоков данных от пользовательских и интеграционных интерфейсов до операций чтения и изменения данных, построение sequence-диаграмм, формирование логической модели данных на основе структуры БД, а также интеграцию с Confluence и локальной нейросетью для генерации пояснений и рекомендаций.