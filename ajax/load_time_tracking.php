<?php
define('NO_KEEP_STATISTIC', true);
define('NOT_CHECK_PERMISSIONS', true);

require($_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php');

\Bitrix\Main\Loader::includeModule('crm');
\Bitrix\Main\Loader::includeModule('iblock');


$APPLICATION->IncludeComponent(
    "custom:time.tracking",
    ".default",
    [
        "DEPARTMENT_ID" => '12',
        "FUNNEL_TZ_ID" => '34, 35',
        "FUNNEL_HOURS_ID" => 6,
        "SMART_PROCESS_TYPE_ID" => 1114,
        "FIELD_DEAL" => "TITLE",
        "FIELD_TIME_SPENT" => "UF_CRM_30_1770360084006",
        "FIELD_COMMENT" => "UF_CRM_30_1770360099630",
        "FIELD_DEAL_STAGE" => "UF_CRM_30_1770362875416",
        "CACHE_TIME" => 0
    ],
    false
);


// Если компонент вернул пустоту, выводим сообщение
if (empty(trim($content))) {
    echo '<div style="padding: 20px;">';
    echo '<h3>Компонент учёта времени</h3>';
    echo '<p>Компонент не вернул данные. Проверьте настройки.</p>';
    echo '</div>';
} else {
    echo $content;
}