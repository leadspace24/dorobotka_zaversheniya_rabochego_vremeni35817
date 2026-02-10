<?
use Bitrix\Main\Loader;
use LeadSpace\Custom\Mailer;
use Bitrix\Main\EventManager;
use Bitrix\Socialnetwork\Integration\Main\UISelector\SonetGroups;
use Bitrix\Socialnetwork\Item\Workgroup;
use Bitrix\Socialnetwork\Livefeed\RenderParts\SonetGroup;
use Bitrix\Pull\Event;

//ДЕБАГ
function watch($data)
{
    echo '<pre>'.print_r($data,1).'</pre>';
}

//работа вебхука
function callMethod($queryMethod, $data)
{
    $queryUrl = 'https://dev-crm.lead-space.ru/rest/437/dd1bv42ezgya89zz/' . $queryMethod;
    $queryData = http_build_query($data);

    $curl = curl_init();
    curl_setopt_array($curl, array(
        CURLOPT_SSL_VERIFYPEER => 0,
        CURLOPT_POST => 1,
        CURLOPT_HEADER => 0,
        CURLOPT_RETURNTRANSFER => 1,
        CURLOPT_URL => $queryUrl,
        CURLOPT_POSTFIELDS => $queryData,
    ));

    $result = curl_exec($curl);
    curl_close($curl);

    $result = json_decode($result, 1);

    return $result;
}


//Получение класса HL по ID
if(file_exists($_SERVER['DOCUMENT_ROOT'].'/local/php_interface/lib/HLClass.php'))
{
    require_once($_SERVER['DOCUMENT_ROOT'].'/local/php_interface/lib/HLClass.php');
}


include(__DIR__ . '/../vendor/autoload.php');
if(file_exists(__DIR__ . '/leadspace-events.php'))require_once(__DIR__ . '/leadspace-events.php');
include(__DIR__ . '/prodtest.php');

//Loader::includeModule('leadspace.custom');
//
//function custom_mail($to, $subject, $message, $additional_headers = '', $additional_parameters = '')
//{
//	return Mailer::extMail($to, $subject, $message, $additional_headers, $additional_parameters);
//}
?>
<?php
AddEventHandler('main', 'OnEpilog', function() {
    global $APPLICATION;
    
    $APPLICATION->AddHeadScript('/local/js/timetracking.js');
});


