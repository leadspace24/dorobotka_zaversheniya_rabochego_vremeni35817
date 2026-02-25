<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Переопределяем функцию кодирования JSON в Битрикс
if (!function_exists('bx_js_encode')) {
    function bx_js_encode($arData, $bWS = false, $bSkipTilda = false, $bExtType = false) {
        return json_encode($arData, JSON_UNESCAPED_UNICODE);
    }
}

define('NO_KEEP_STATISTIC', true);
define('NOT_CHECK_PERMISSIONS', true);
define('BX_NO_ACCELERATOR_RESET', true);

try {
    require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php';
    
    if (!CModule::IncludeModule('crm')) {
        http_response_code(500);
        die(json_encode(['success' => false, 'message' => 'Модуль CRM не установлен']));
    }
    
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'getDeals':
            getDeals();
            break;
        case 'saveTimeRecords':
            saveTimeRecords();
            break;
        default:
            http_response_code(400);
            die(json_encode(['success' => false, 'message' => 'Неизвестное действие']));
    }
    
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode([
        'success' => false,
        'message' => 'Внутренняя ошибка сервера'
    ]));
}

function getDeals() {
    global $USER;
    
    try {
        $departmentIds = $_POST['departmentId'] ?? '';
        $funnelTzIds = $_POST['funnelTzId'] ?? '';
        $funnelHoursIds = $_POST['funnelHoursId'] ?? '';
        
        $departmentIds = parseIds($departmentIds);
        $funnelTzIds = parseIds($funnelTzIds);
        $funnelHoursIds = parseIds($funnelHoursIds);
        
        if (!empty($departmentIds)) {
            $user = CUser::GetByID($USER->GetID())->Fetch();
            $userDepartments = $user['UF_DEPARTMENT'] ?? [];
            if (!is_array($userDepartments)) $userDepartments = [$userDepartments];
            
            $hasAccess = false;
            foreach ($departmentIds as $deptId) {
                if (in_array($deptId, $userDepartments)) {
                    $hasAccess = true;
                    break;
                }
            }
            if (!$hasAccess && !empty($userDepartments)) {
                http_response_code(403);
                die(json_encode(['success' => false, 'message' => 'Нет доступа к отделу']));
            }
        }
        
        $allFunnels = array_merge($funnelTzIds, $funnelHoursIds);
        $allFunnels = array_unique($allFunnels);
        
        $deals = [];
        $dealIds = [];
        
        foreach ($allFunnels as $funnelId) {
            if ($funnelId <= 0) continue;
            
            // Получаем название воронки через DealCategory::get()
            $funnelInfo = \Bitrix\Crm\Category\DealCategory::get($funnelId);
            $funnelName = $funnelInfo ? $funnelInfo['NAME'] : 'Неизвестная воронка';
            
            $filter = [
                'CATEGORY_ID' => $funnelId,
                'ASSIGNED_BY_ID' => $USER->GetID(),
                'CLOSED' => 'N',
            ];
            
            $dbDeals = CCrmDeal::GetListEx(
                ['DATE_MODIFY' => 'DESC'],
                $filter,
                false,
                false,
                ['ID', 'TITLE', 'STAGE_ID', 'CATEGORY_ID']
            );
            
            if ($dbDeals) {
                while ($deal = $dbDeals->Fetch()) {
                    if (in_array($deal['ID'], $dealIds)) continue;
                    
                    $stageName = CCrmDeal::GetStageName($deal['STAGE_ID'], $deal['CATEGORY_ID']);
                    
                    $deals[] = [
                        'ID' => $deal['ID'],
                        'TITLE' => $deal['TITLE'],
                        'STAGE_ID' => $deal['STAGE_ID'],
                        'STAGE_NAME' => $stageName,
                        'CATEGORY_ID' => $deal['CATEGORY_ID'],
                        'FUNNEL_NAME' => $funnelName, // Добавляем название воронки
                        'FUNNEL_ID' => $deal['CATEGORY_ID'] // Добавляем ID воронки для полноты
                    ];
                    
                    $dealIds[] = $deal['ID'];
                }
            }
        }
        
        // Сортируем сделки по дате модификации (свежие сверху)
        usort($deals, function($a, $b) {
            // Здесь можно добавить сортировку по дате, если нужно
            return 0;
        });
        
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => true,
            'data' => ['deals' => $deals]
        ]);
        exit;
        
    } catch (Exception $e) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'message' => 'Ошибка при получении сделок: ' . $e->getMessage()
        ]);
        exit;
    }
}

function saveTimeRecords() {
    global $USER;
    
    try {
        $records = $_POST['records'] ?? [];
        
        if (is_string($records)) {
            $recordsJson = $records;
            
            if (strpos($recordsJson, "'") !== false) {
                $recordsJson = str_replace("'", '"', $recordsJson);
            }
            
            $records = json_decode($recordsJson, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                http_response_code(400);
                die(json_encode([
                    'success' => false, 
                    'message' => 'Некорректный формат данных',
                    'json_error' => json_last_error_msg()
                ]));
            }
        }
        
        if (!is_array($records)) {
            http_response_code(400);
            die(json_encode([
                'success' => false, 
                'message' => 'Данные должны быть массивом'
            ]));
        }
        
        $smartProcessTypeId = intval($_POST['smartProcessTypeId'] ?? 0);
        
        if (empty($records) || $smartProcessTypeId <= 0) {
            http_response_code(400);
            die(json_encode(['success' => false, 'message' => 'Некорректные данные']));
        }
        
        $fieldDeal = $_POST['fieldDeal'] ?? '';
        $fieldTimeSpent = $_POST['fieldTimeSpent'] ?? ''; // Убрал intval, так как это название поля
        $fieldComment = $_POST['fieldComment'] ?? '';
        $fieldDealStage = $_POST['fieldDealStage'] ?? '';
        $fieldFunnel = $_POST['fieldFunnel'] ?? 'Воронка';
        
        if (!class_exists('Bitrix\Crm\Service\Container')) {
            http_response_code(500);
            die(json_encode(['success' => false, 'message' => 'Классы CRM не доступны']));
        }

        $container = \Bitrix\Crm\Service\Container::getInstance();
        $factory = $container->getFactory($smartProcessTypeId);
        
        if (!$factory) {
            http_response_code(400);
            die(json_encode(['success' => false, 'message' => 'Смарт-процесс не найден']));
        }
        
        $created = 0;
        $errors = [];
        
        foreach ($records as $record) {
            try {
                $dealId = intval($record['dealId'] ?? 0);
                $time = floatval($record['timeInHours'] ?? 0); 
                $comment = $record['comment'] ?? '';
                $stageName = $record['stageName'] ?? '';
                $funnelName = $record['funnelName'] ?? '';
                
                if ($dealId <= 0 || $time <= 0) continue;
                
                $item = $factory->createItem();
                $item->setTitle('Затраты времени: ' . date('d.m.Y H:i'));
                
                // Добавляем информацию о сделке
                if ($fieldDeal) {
                    $item->set($fieldDeal, "Сделка #$dealId: " . ($record['dealTitle'] ?? ''));
                }
                
                // Добавляем время
                if ($fieldTimeSpent) {
                    $item->set($fieldTimeSpent, $time);
                }
                
                // Добавляем комментарий
                if ($fieldComment) {
                    $item->set($fieldComment, $comment);
                }
                
                // Добавляем статус сделки
                if ($fieldDealStage && $stageName) {
                    $item->set($fieldDealStage, $stageName);
                }
                
                // Добавляем воронку
                if ($fieldFunnel && $funnelName) {
                    $item->set($fieldFunnel, $funnelName);
                }
                
                $item->setAssignedById($USER->GetID());
                
                $operation = $factory->getAddOperation($item);
                $result = $operation->launch();
                
                if ($result->isSuccess()) {
                    $id = $result->getId();
                    
                    $parentIdentifier = new \Bitrix\Crm\ItemIdentifier(\CCrmOwnerType::Deal, $dealId);
                    $childIdentifier = new \Bitrix\Crm\ItemIdentifier($smartProcessTypeId, $id);
                    
                    $relationManager = $container->getRelationManager();
                    $relationManager->bindItems($parentIdentifier, $childIdentifier);
                    
                    $created++;
                } else {
                    $errors[] = 'Ошибка при создании элемента: ' . implode(', ', $result->getErrorMessages());
                }
                
            } catch (Exception $e) {
                $errors[] = 'Исключение: ' . $e->getMessage();
            }
        }
        
        $response = [
            'success' => $created > 0,
            'message' => $created > 0 ? "Успешно отправлено записей: $created" : "Не удалось создать записи",
            'data' => ['created' => $created]
        ];
        
        if (!empty($errors)) {
            $response['errors'] = $errors;
            // Добавляем первые 3 ошибки в сообщение для отладки
            if ($created == 0) {
                $response['message'] .= '. Ошибки: ' . implode('; ', array_slice($errors, 0, 3));
            }
        }
        
        // Добавляем отладочную информацию
        if ($created == 0) {
            $response['debug'] = [
                'records_count' => count($records),
                'first_record' => !empty($records) ? $records[0] : null,
                'fieldTimeSpent' => $fieldTimeSpent,
                'smartProcessTypeId' => $smartProcessTypeId
            ];
        }
        
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
        
    } catch (Exception $e) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'message' => 'Ошибка при сохранении записей времени: ' . $e->getMessage(),
            'trace' => $e->getTraceAsString() 
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

function parseIds($input) {
    if (empty($input)) return [];
    
    if (is_array($input)) {
        return array_map('intval', $input);
    }
    
    $ids = explode(',', $input);
    $ids = array_map('trim', $ids);
    $ids = array_map('intval', $ids);
    $ids = array_filter($ids, function($id) {
        return $id > 0;
    });
    
    return array_values($ids);
}
?>