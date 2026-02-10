<?php
/**
 * Параметры компонента "Учет трудозатрат"
 * Файл: /local/components/custom/time.tracking/.parameters.php
 */

if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

use Bitrix\Main\Loader;
use Bitrix\Main\Localization\Loc;
use Bitrix\Iblock\SectionTable;
use Bitrix\Crm\Category\DealCategory;
use Bitrix\Crm\Model\Dynamic\TypeTable;

// Загружаем модули
Loader::includeModule('crm');
Loader::includeModule('iblock');

// Получаем список подразделений
$arDepartments = [];
$resDepartments = CIBlockSection::GetList(
    ['LEFT_MARGIN' => 'ASC'],
    [
        'IBLOCK_ID' => COption::GetOptionInt('intranet', 'iblock_structure', false),
        'ACTIVE' => 'Y'
    ],
    false,
    ['ID', 'NAME', 'DEPTH_LEVEL']
);

while ($arDepartment = $resDepartments->GetNext()) {
    $prefix = str_repeat('...', $arDepartment['DEPTH_LEVEL'] - 1);
    $arDepartments[$arDepartment['ID']] = $prefix . ' ' . $arDepartment['NAME'];
}

// Получаем список воронок сделок
$arFunnels = [];
$categories = DealCategory::getAll();
foreach ($categories as $category) {
    $arFunnels[$category['ID']] = $category['NAME'];
}

// Получаем список типов смарт-процессов
$arSmartProcesses = [];
if (Loader::includeModule('crm')) {
    $resTypes = TypeTable::getList([
        'select' => ['ID', 'ENTITY_TYPE_ID', 'TITLE'],
        'filter' => ['=IS_DYNAMIC' => 'Y'],
        'order' => ['TITLE' => 'ASC']
    ]);
    
    while ($type = $resTypes->fetch()) {
        $arSmartProcesses[$type['ENTITY_TYPE_ID']] = $type['TITLE'];
    }
}

$arComponentParameters = [
    "GROUPS" => [
        "SETTINGS" => [
            "NAME" => "Настройки",
            "SORT" => 100
        ],
        "FILTERS" => [
            "NAME" => "Фильтры",
            "SORT" => 200
        ],
        "SMART_PROCESS" => [
            "NAME" => "Смарт-процесс",
            "SORT" => 300
        ],
    ],
    
    "PARAMETERS" => [
        // Группа: Настройки
        "DEPARTMENT_ID" => [
            "PARENT" => "SETTINGS",
            "NAME" => "Подразделение",
            "TYPE" => "LIST",
            "VALUES" => $arDepartments,
            "ADDITIONAL_VALUES" => "N",
            "REFRESH" => "N",
            "DEFAULT" => "",
            "MULTIPLE" => "N",
        ],
        
        // Группа: Фильтры
        "FUNNEL_TZ_ID" => [
            "PARENT" => "FILTERS",
            "NAME" => "Воронка \"Реализация через ТЗ\"",
            "TYPE" => "LIST",
            "VALUES" => $arFunnels,
            "ADDITIONAL_VALUES" => "N",
            "REFRESH" => "N",
            "DEFAULT" => "",
            "MULTIPLE" => "N",
        ],
        
        "FUNNEL_HOURS_ID" => [
            "PARENT" => "FILTERS",
            "NAME" => "Воронка \"Реализация через часы\"",
            "TYPE" => "LIST",
            "VALUES" => $arFunnels,
            "ADDITIONAL_VALUES" => "N",
            "REFRESH" => "N",
            "DEFAULT" => "",
            "MULTIPLE" => "N",
        ],
        
        // Группа: Смарт-процесс
        "SMART_PROCESS_TYPE_ID" => [
            "PARENT" => "SMART_PROCESS",
            "NAME" => "Тип смарт-процесса",
            "TYPE" => "LIST",
            "VALUES" => $arSmartProcesses,
            "ADDITIONAL_VALUES" => "N",
            "REFRESH" => "N",
            "DEFAULT" => "",
            "MULTIPLE" => "N",
        ],
        
        "FIELD_DEAL" => [
            "PARENT" => "SMART_PROCESS",
            "NAME" => "Символьный код поля \"Привязанная сделка\"",
            "TYPE" => "STRING",
            "DEFAULT" => "ufCrm_7_DEAL",
        ],
        
        "FIELD_TIME_SPENT" => [
            "PARENT" => "SMART_PROCESS",
            "NAME" => "Символьный код поля \"Затраченное время\"",
            "TYPE" => "STRING",
            "DEFAULT" => "ufCrm_7_TIME_SPENT",
        ],
        
        "FIELD_COMMENT" => [
            "PARENT" => "SMART_PROCESS",
            "NAME" => "Символьный код поля \"Комментарий\"",
            "TYPE" => "STRING",
            "DEFAULT" => "ufCrm_7_COMMENT",
        ],
        
        "FIELD_DEAL_STAGE" => [
            "PARENT" => "SMART_PROCESS",
            "NAME" => "Символьный код поля \"Статус сделки\"",
            "TYPE" => "STRING",
            "DEFAULT" => "ufCrm_7_DEAL_STAGE",
        ],
        
        // Кеширование
        "CACHE_TIME" => [
            "DEFAULT" => 3600
        ],
    ],
];