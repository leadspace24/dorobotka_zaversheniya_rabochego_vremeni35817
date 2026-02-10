<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

use Bitrix\Main\Page\Asset;

// Переопределяем стандартную функцию кодирования JSON в Битрикс
if (!function_exists('bx_js_encode')) {
    function bx_js_encode($arData, $bWS = false, $bSkipTilda = false, $bExtType = false) {
        return json_encode($arData, JSON_UNESCAPED_UNICODE);
    }
}

if ($arResult['ACCESS_DENIED']) {
    echo '<div class="alert alert-warning">' . htmlspecialcharsbx($arResult['ERROR_MESSAGE']) . '</div>';
    return;
}
?>

<div id="time-tracking-container"></div>

<script>
window.TimeTrackingConfig = <?= CUtil::PhpToJSObject([
    'DEPARTMENT_ID' => $arResult['CONFIG']['DEPARTMENT_ID'],
    'FUNNEL_TZ_ID' => $arResult['CONFIG']['FUNNEL_TZ_ID'],
    'FUNNEL_HOURS_ID' => $arResult['CONFIG']['FUNNEL_HOURS_ID'],
    'SMART_PROCESS_TYPE_ID' => $arResult['CONFIG']['SMART_PROCESS_TYPE_ID'],
    'FIELD_DEAL' => $arResult['CONFIG']['FIELD_DEAL'],
    'FIELD_TIME_SPENT' => $arResult['CONFIG']['FIELD_TIME_SPENT'],
    'FIELD_COMMENT' => $arResult['CONFIG']['FIELD_COMMENT'],
    'FIELD_DEAL_STAGE' => $arResult['CONFIG']['FIELD_DEAL_STAGE'],
], false, true, true) ?>;
window.TimeTrackingConfig.AJAX_URL = '<?= CUtil::JSEscape($arResult['AJAX_URL']) ?>';
window.TimeTrackingConfig.USER_ID = <?= intval($arResult['USER_ID']) ?>;

BX.ready(function() {
    if (window.TimeTracking) {
        TimeTracking.init();
    }
});
</script>

<?php
Asset::getInstance()->addCss($this->GetFolder() . '/style.css');
Asset::getInstance()->addJs($this->GetFolder() . '/script.js');