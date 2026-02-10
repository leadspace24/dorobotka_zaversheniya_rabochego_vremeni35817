# Структура компонента time.tracking

## Размещение файлов в системе

### 1. Файлы компонента

```
/local/components/custom/time.tracking/
├── .description.php          # Описание компонента
├── .parameters.php           # Параметры компонента
├── class.php                 # Класс компонента
├── lang/
│   └── ru/
│       ├── .description.php  # Языковой файл описания
│       └── .parameters.php   # Языковой файл параметров
└── templates/
    └── .default/
        ├── template.php      # Шаблон компонента
        ├── script.js         # JavaScript
        ├── style.css         # Стили
        └── ajax.php          # AJAX обработчик
```

### 2. Страница для вызова компонента

```
/company/personal/time-tracking/
├── .section.php              # Описание раздела
└── index.php                 # Страница с компонентом
```

### 3. Интеграция с модулем timeman

```
/local/php_interface/
└── init.php                  # Добавить код интеграции
```

## Соответствие файлов проекта и структуры Битрикс

| Файл проекта    | Путь в Битрикс                                                 |
| -------------------------- | -------------------------------------------------------------------------- |
| `.description.php`       | `/local/components/custom/time.tracking/.description.php`                |
| `.parameters.php`        | `/local/components/custom/time.tracking/.parameters.php`                 |
| `component_class.php`    | `/local/components/custom/time.tracking/class.php`                       |
| `component_template.php` | `/local/components/custom/time.tracking/templates/.default/template.php` |
| `template_script.js`     | `/local/components/custom/time.tracking/templates/.default/script.js`    |
| `time_tracking.css`      | `/local/components/custom/time.tracking/templates/.default/style.css`    |
| `template_ajax.php`      | `/local/components/custom/time.tracking/templates/.default/ajax.php`     |
| `lang_parameters.php`    | `/local/components/custom/time.tracking/lang/ru/.parameters.php`         |
| `page_index.php`         | `/company/personal/time-tracking/index.php`                              |
| `page_section.php`       | `/company/personal/time-tracking/.section.php`                           |
| `init_integration.php`   | Код добавить в `/local/php_interface/init.php`               |

## Как это работает

1. **Пользователь нажимает** "Завершить рабочий день" в модуле учета времени Битрикс
2. **Срабатывает событие** `OnAfterTMDayClose` или JS-обработчик
3. **Открывается страница** `/company/personal/time-tracking/` в слайдере
4. **Компонент отображает таблицу** с сделками пользователя
5. **Пользователь заполняет время** и комментарии
6. **Данные сохраняются** в смарт-процесс через AJAX
7. **Слайдер закрывается** , пользователь возвращается к работе

## Использование компонента на произвольной странице

```php
<?$APPLICATION->IncludeComponent(
    "custom:time.tracking",
    ".default",
    [
        "DEPARTMENT_ID" => 42,
        "FUNNEL_TZ_ID" => 5,
        "FUNNEL_HOURS_ID" => 6,
        "SMART_PROCESS_TYPE_ID" => 128,
        "FIELD_DEAL" => "ufCrm_7_DEAL",
        "FIELD_TIME_SPENT" => "ufCrm_7_TIME_SPENT",
        "FIELD_COMMENT" => "ufCrm_7_COMMENT",
        "FIELD_DEAL_STAGE" => "ufCrm_7_DEAL_STAGE",
        "CACHE_TIME" => 3600
    ]
);?>
```

## Минимальные обязательные параметры

```php
<?$APPLICATION->IncludeComponent(
    "custom:time.tracking",
    "",
    [
        "FUNNEL_TZ_ID" => 5,
        "FUNNEL_HOURS_ID" => 6,
        "SMART_PROCESS_TYPE_ID" => 128
    ]
);?>
```

## Интеграция с кнопкой "Завершить рабочий день"

Выберите один из вариантов:

### Вариант 1: Через событие OnAfterTMDayClose

Добавьте в** **`/local/php_interface/init.php`:

```php
$eventManager->addEventHandler('timeman', 'OnAfterTMDayClose', 'showTimeTrackingModal');

function showTimeTrackingModal(&$arFields) {
    global $APPLICATION;
    $APPLICATION->AddHeadString('
        <script>
        BX.ready(function() {
            BX.SidePanel.Instance.open("/company/personal/time-tracking/?IFRAME=Y", {
                width: 1200
            });
        });
        </script>
    ');
}
```

### Вариант 2: Через JavaScript

Добавьте в** **`/local/php_interface/init.php`:

```php
AddEventHandler("main", "OnEpilog", function() {
    global $APPLICATION;
    $APPLICATION->AddHeadString('
        <script>
        BX.ready(function() {
            BX.addCustomEvent("BX.Timeman.Monitor:close", function() {
                BX.SidePanel.Instance.open("/company/personal/time-tracking/?IFRAME=Y", {
                    width: 1200
                });
            });
        });
        </script>
    ');
});
```
