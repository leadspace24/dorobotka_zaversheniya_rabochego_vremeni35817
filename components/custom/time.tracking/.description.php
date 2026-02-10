<?php
/**
 * Описание компонента "Учет трудозатрат"
 * Файл: /local/components/custom/time.tracking/.description.php
 */

if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

use Bitrix\Main\Localization\Loc;

$arComponentDescription = [
    "NAME" => "Учет трудозатрат менеджеров проектов",
    "DESCRIPTION" => "Компонент для фиксации времени, затраченного на работу по сделкам",
    "ICON" => "/images/icon.gif",
    "SORT" => 10,
    "CACHE_PATH" => "Y",
    "PATH" => [
        "ID" => "custom",
        "NAME" => "Пользовательские компоненты",
        "CHILD" => [
            "ID" => "crm",
            "NAME" => "CRM",
        ],
    ],
];