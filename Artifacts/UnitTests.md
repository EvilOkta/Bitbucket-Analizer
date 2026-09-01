# UnitTests (Реестр тестовых сценариев и результаты выполнения)

Документ содержит описание модульных и интеграционных тестов ядра Bitbucket Analyzer, тестовых сценариев и результатов их выполнения.

## Общий статус тестирования

- **Тестовый раннер**: Node.js Built-in Test Runner (node --test tests/engine.test.js)
- **Всего сценариев**: 36
- **Успешно пройдено**: 36
- **Ошибок / Падений**: 0
- **Статус выполнения**: 100% Passed

---

## Реестр тестов

| № | Название сценария | Компонент | Статус |
| :--- | :--- | :--- | :--- |
| 1 | StackDetector: точно определяет Python FastAPI и SQLAlchemy | Детектор стека | Pass |
| 2 | StackDetector: точно определяет .NET C# и Entity Framework Core | Детектор стека | Pass |
| 3 | StackDetector: точно определяет C++ Oat++ веб-фреймворк | Детектор стека | Pass |
| 4 | DDL Parser: извлекает таблицы, PK и FK связи | Парсер DDL | Pass |
| 5 | Swagger/OpenAPI Parser: парсит пути, методы и схемы | Парсер API | Pass |
| 6 | PlantUML Generator: генерирует валидную PlantUML диаграмму | Генератор диаграмм | Pass |
| 7 | ERD Relationship Mapping: проверяет безопасную FK линковку | Модель данных | Pass |
| 8 | Diagram Text Wrapping: переносит длинные строки диаграмм | Генератор диаграмм | Pass |
| 9 | Swagger/OpenAPI: резолвит  в requestBody и DTO ответов | Парсер API | Pass |
| 10 | Project Tree Navigation: находит предков для фокусного файла | Навигация по дереву | Pass |
| 11 | Screen Form Lifecycle: генерирует screen_load onMount элемент | Экранные формы | Pass |
| 12 | Screen Form D3 Graph: извлекает граф Форма -> Загрузка -> Элементы -> API -> DTO -> БД | Экранные формы | Pass |
| 13 | Screen Form Structure: порядок слоев слева направо и путь DTO | Экранные формы | Pass |
| 14 | Project Explorer: многоуровневый резолвер целевых DTO нод | Проводник проекта | Pass |
| 15 | MonorepoDetector: распознает Nx и .NET мультипроекты | Монорепозитории | Pass |
| 16 | RepoClassifier: вычисляет эволюционное сходство и микросервисы | Классификатор репо | Pass |
| 17 | CrossServiceDependencies: трассирует HTTP вызовы и Kafka топики | Межсервисные связи | Pass |
| 18 | RepoExplorer: приоритизирует исходники над .md при поиске DTO | Проводник проекта | Pass |
| 19 | PostgresParser: извлекает сущности из Prisma схем без моков | Модель данных | Pass |
| 20 | FlowTracer: извлекает реальные обработчики событий и сниппеты | Трассировщик потоков | Pass |
| 21 | RepoExplorer: исключает fallback на .gitignore | Проводник проекта | Pass |
| 22 | PlantUML Dark Theme: внедряет темную тему skinparams | Генератор диаграмм | Pass |
| 23 | PlantUML to Mermaid Converter: конвертирует синтаксис | Генератор диаграмм | Pass |
| 24 | Frontend JS/TS Data Model: извлекает сущности из JS объектов | Модель данных | Pass |
| 25 | ERD Element Typification: типизирует SET и ARRAY коллекции | Модель данных | Pass |
| 26 | FlowTracer: извлекает описание элемента перед именем класса | Экранные формы | Pass |
| 27 | ERD Type Matching: связывает колонки-типы как явные FK | Модель данных | Pass |
| 28 | ERD Source Location: сохраняет исходный файл и строку сущностей | Модель данных | Pass |
| 29 | ERD ENUM Extraction: выделяет литеральные массивы в ENUM | Модель данных | Pass |
| 30 | ERD System Types Inclusion: выделяет системные типы параметров | Модель данных | Pass |
| 31 | ERD Comment Union & Struct Array Extraction: извлечение типов | Модель данных | Pass |
| 32 | ERD Multiline Property Parser: разбор многострочных массивов | Модель данных | Pass |
| 33 | ERD PlantUML Conversion: конвертация между ERD форматами | Модель данных | Pass |
| 34 | D3 Project Graph: иерархия с монорепозиториями и версиями | Граф проектов | Pass |
| 35 | FlowTracer: правила IA-1, IA-2, POS-1, POS-2, ATTR-1 и Handlers | Экранные формы | Pass |
| 36 | Autotests Module: TestExtractor парсит сьюты, считает покрытие и генерирует тесты | Автотесты & Runner | Pass |
