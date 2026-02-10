<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

use Bitrix\Main\Loader;

class TimeTrackingComponent extends CBitrixComponent
{
    protected function checkModules()
    {
        if (!Loader::includeModule('crm')) {
            ShowError('Модуль CRM не установлен');
            return false;
        }
        return true;
    }
    
    public function onPrepareComponentParams($arParams)
    {
        $arParams['DEPARTMENT_ID'] = $arParams['DEPARTMENT_ID'] ?? '';
        $arParams['FUNNEL_TZ_ID'] = $arParams['FUNNEL_TZ_ID'] ?? '';
        $arParams['FUNNEL_HOURS_ID'] = $arParams['FUNNEL_HOURS_ID'] ?? '';
        $arParams['SMART_PROCESS_TYPE_ID'] = intval($arParams['SMART_PROCESS_TYPE_ID'] ?? 0);
        $arParams['FIELD_DEAL'] = trim($arParams['FIELD_DEAL'] ?? 'ufCrm_7_DEAL');
        $arParams['FIELD_TIME_SPENT'] = trim($arParams['FIELD_TIME_SPENT'] ?? 'ufCrm_7_TIME_SPENT');
        $arParams['FIELD_COMMENT'] = trim($arParams['FIELD_COMMENT'] ?? 'ufCrm_7_COMMENT');
        $arParams['FIELD_DEAL_STAGE'] = trim($arParams['FIELD_DEAL_STAGE'] ?? 'ufCrm_7_DEAL_STAGE');
        $arParams['CACHE_TIME'] = intval($arParams['CACHE_TIME'] ?? 3600);
        return $arParams;
    }
    
    protected function checkUserDepartment($userId)
    {
        $requiredDepartments = $this->arParams['DEPARTMENT_ID'];
        if (empty($requiredDepartments)) return true;
        
        $requiredDeptIds = explode(',', $requiredDepartments);
        $requiredDeptIds = array_map('trim', $requiredDeptIds);
        $requiredDeptIds = array_map('intval', $requiredDeptIds);
        $requiredDeptIds = array_filter($requiredDeptIds);
        
        if (empty($requiredDeptIds)) return true;
        
        $user = CUser::GetByID($userId)->Fetch();
        $userDepartments = $user['UF_DEPARTMENT'] ?? [];
        if (!is_array($userDepartments)) $userDepartments = [$userDepartments];
        $userDepartments = array_map('intval', $userDepartments);
        
        foreach ($requiredDeptIds as $deptId) {
            if (in_array($deptId, $userDepartments)) return true;
        }
        
        return false;
    }
    
    public function executeComponent()
    {
        global $USER;
        
        if (!$this->checkModules()) return;
        if (!$USER->IsAuthorized()) {
            ShowError('Необходима авторизация');
            return;
        }
        
        $userId = $USER->GetID();
        
        if (!$this->checkUserDepartment($userId)) {
            $this->arResult['ACCESS_DENIED'] = true;
            $this->arResult['ERROR_MESSAGE'] = 'У вас нет доступа к этому функционалу';
            $this->includeComponentTemplate();
            return;
        }
        
        $this->arResult['CONFIG'] = [
            'DEPARTMENT_ID' => $this->arParams['DEPARTMENT_ID'],
            'FUNNEL_TZ_ID' => $this->arParams['FUNNEL_TZ_ID'],
            'FUNNEL_HOURS_ID' => $this->arParams['FUNNEL_HOURS_ID'],
            'SMART_PROCESS_TYPE_ID' => $this->arParams['SMART_PROCESS_TYPE_ID'],
            'FIELD_DEAL' => $this->arParams['FIELD_DEAL'],
            'FIELD_TIME_SPENT' => $this->arParams['FIELD_TIME_SPENT'],
            'FIELD_COMMENT' => $this->arParams['FIELD_COMMENT'],
            'FIELD_DEAL_STAGE' => $this->arParams['FIELD_DEAL_STAGE'],
        ];
        
        $this->arResult['USER_ID'] = $userId;
        $this->arResult['AJAX_URL'] = $this->getPath() . '/ajax.php';
        
        $this->includeComponentTemplate();
    }
}
?>