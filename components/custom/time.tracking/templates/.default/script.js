(function() {
    'use strict';

    const TimeTracking = {
        config: {},
        deals: [],
        isLoading: false,
        container: null,

        init: function() {
            // Копируем конфиг из window в локальный объект
            this.config = Object.assign({}, window.TimeTrackingConfig || {});
            
            if (!this.config.AJAX_URL) {
                console.error('TimeTracking: AJAX_URL не определен');
                this.showError('Ошибка конфигурации');
                return;
            }
            
            // Находим контейнер для вывода
            this.container = document.getElementById('time-tracking-container');
            if (!this.container) {
                console.error('TimeTracking: Контейнер #time-tracking-container не найден');
                return;
            }
            
            this.showLoader();
            this.loadUserDeals()
                .then(() => {
                    this.hideLoader();
                    this.renderContent();
                })
                .catch((error) => {
                    this.hideLoader();
                    console.error('Ошибка:', error);
                    this.showError(error.message || 'Ошибка загрузки данных');
                });
        },

        loadUserDeals: function() {
            console.log('TimeTracking: Параметры:', {
                departmentId: this.config.DEPARTMENT_ID,
                funnelTzId: this.config.FUNNEL_TZ_ID,
                funnelHoursId: this.config.FUNNEL_HOURS_ID
            });
            
            return new Promise((resolve, reject) => {
                BX.ajax({
                    url: this.config.AJAX_URL,
                    method: 'POST',
                    dataType: 'json',
                    data: {
                        action: 'getDeals',
                        sessid: BX.bitrix_sessid(),
                        departmentId: this.config.DEPARTMENT_ID,
                        funnelTzId: this.config.FUNNEL_TZ_ID,
                        funnelHoursId: this.config.FUNNEL_HOURS_ID,
                        smartProcessTypeId: this.config.SMART_PROCESS_TYPE_ID
                    },
                    onsuccess: (response) => {
                        console.log('TimeTracking: Ответ от сервера:', response);
                        if (response.success) {
                            this.deals = response.data.deals || [];
                            console.log('TimeTracking: Загружено сделок:', this.deals.length);
                            resolve();
                        } else {
                            console.error('TimeTracking: Ошибка сервера:', response.message);
                            reject(new Error(response.message || 'Ошибка загрузки'));
                        }
                    },
                    onfailure: (error) => {
                        console.error('TimeTracking: AJAX ошибка:', error);
                        reject(new Error('Ошибка соединения с сервером'));
                    }
                });
            });
        },

        renderContent: function() {
            console.log('TimeTracking: Отрисовка контента');
            if (this.deals.length === 0) {
                console.warn('TimeTracking: Нет сделок для отображения');
                this.container.innerHTML = '<div class="time-tracking-info">У вас нет активных сделок в указанных воронках</div>';
                return;
            }
            
            const content = document.createElement('div');
            content.className = 'time-tracking-content';
            // Увеличиваем отступы в 2 раза
            content.style.padding = '40px';
            
            const header = document.createElement('div');
            header.className = 'time-tracking-header';
            header.style.marginBottom = '20px';
            header.innerHTML = `
                <h2>Учет трудозатрат за ${this.getCurrentDate()}</h2>
                <p class="time-tracking-description">Укажите время, затраченное на каждую сделку</p>
            `;
            content.appendChild(header);
            
            const body = document.createElement('div');
            body.className = 'time-tracking-body';
            body.appendChild(this.buildTable());
            content.appendChild(body);
            
            const footer = document.createElement('div');
            footer.className = 'time-tracking-footer';
            footer.style.marginTop = '40px';
            
            const submitBtn = document.createElement('button');
            submitBtn.className = 'ui-btn ui-btn-success';
            submitBtn.style.marginTop = '20px';
            submitBtn.textContent = 'Отправить';
            submitBtn.onclick = () => this.submitData();
            footer.appendChild(submitBtn);
            
            content.appendChild(footer);
            
            const messageContainer = document.createElement('div');
            messageContainer.id = 'messageContainer';
            messageContainer.className = 'message-container';
            messageContainer.style.marginTop = '20px';
            content.appendChild(messageContainer);
            
            this.container.innerHTML = '';
            this.container.style.padding = '40px'; // Увеличиваем отступы контейнера в 2 раза
            this.container.appendChild(content);
        },

        buildTable: function() {
            const table = document.createElement('table');
            table.className = 'deals-table';
            
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Сделка</th>
                    <th>Воронка</th>
                    <th>Статус проекта</th>
                    <th>Трудозатраты (минуты)</th>
                    <th>Комментарий</th>
                </tr>
            `;
            table.appendChild(thead);
            
            const tbody = document.createElement('tbody');
            this.deals.forEach((deal, index) => {
                const row = document.createElement('tr');
                row.dataset.dealId = deal.ID;
                
                // Название сделки - кликабельное, открывается в новом окне
                const titleCell = document.createElement('td');
                const dealLink = document.createElement('a');
                dealLink.href = `/crm/deal/details/${deal.ID}/`;
                dealLink.target = '_blank';
                dealLink.textContent = deal.TITLE;
                dealLink.style.textDecoration = 'none';
                dealLink.style.color = '#2067b0';
                dealLink.style.cursor = 'pointer';
                dealLink.onmouseover = () => dealLink.style.textDecoration = 'underline';
                dealLink.onmouseout = () => dealLink.style.textDecoration = 'none';
                titleCell.appendChild(dealLink);
                row.appendChild(titleCell);
                
                // Воронка
                const funnelCell = document.createElement('td');
                funnelCell.textContent = deal.FUNNEL_NAME || 'Не указана';
                funnelCell.dataset.funnelId = deal.FUNNEL_ID;
                row.appendChild(funnelCell);
                
                // Статус
                const stageCell = document.createElement('td');
                stageCell.textContent = deal.STAGE_NAME;
                row.appendChild(stageCell);
                
                // Время
                const timeCell = document.createElement('td');
                const timeInput = document.createElement('input');
                timeInput.type = 'number';
                timeInput.className = 'time-input';
                timeInput.min = '0';
                timeInput.step = '1';
                timeInput.value = '0';
                timeInput.placeholder = 'минуты';
                timeInput.dataset.index = index;
                timeInput.dataset.dealId = deal.ID;
                timeCell.appendChild(timeInput);
                row.appendChild(timeCell);
                
                // Комментарий - ИЗМЕНЕНО: теперь textarea вместо input
                const commentCell = document.createElement('td');
                const commentTextarea = document.createElement('textarea');
                commentTextarea.className = 'comment-input';
                commentTextarea.placeholder = 'Комментарий (необязательно)';
                commentTextarea.rows = 1;
                commentTextarea.dataset.index = index;
                commentTextarea.dataset.dealId = deal.ID;
                
                // Добавляем автоматическое расширение
                commentTextarea.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = (this.scrollHeight) + 'px';
                });
                
                commentCell.appendChild(commentTextarea);
                row.appendChild(commentCell);
                
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            
            return table;
        },

        submitData: function() {
            if (this.isLoading) return;
            
            const timeInputs = document.querySelectorAll('.time-input');
            const commentTextareas = document.querySelectorAll('.comment-input');
            const records = [];
            
            timeInputs.forEach((input, index) => {
                const timeInMinutes = parseInt(input.value) || 0;
                if (timeInMinutes > 0) {
                    const deal = this.deals[index];
                    // Получаем название воронки из ячейки таблицы
                    const funnelCell = input.closest('tr').querySelector('td:nth-child(2)');
                    const funnelName = funnelCell ? funnelCell.textContent : 'Не указана';
                    
                    records.push({
                        dealId: deal.ID,
                        dealTitle: deal.TITLE,
                        stageId: deal.STAGE_ID,
                        stageName: deal.STAGE_NAME,
                        timeInMinutes: timeInMinutes,
                        timeInHours: (timeInMinutes / 60).toFixed(2),
                        comment: commentTextareas[index].value.trim(), // Работает и с textarea
                        funnelName: funnelName
                    });
                }
            });
            
            if (records.length === 0) {
                this.showWarning('Не указано ни одного значения времени');
                return;
            }
            
            this.isLoading = true;
            this.showLoader('Сохранение данных...');
            
            BX.ajax({
                url: this.config.AJAX_URL,
                method: 'POST',
                dataType: 'json',
                data: {
                    action: 'saveTimeRecords',
                    records: records,
                    sessid: BX.bitrix_sessid(),
                    departmentId: this.config.DEPARTMENT_ID,
                    smartProcessTypeId: this.config.SMART_PROCESS_TYPE_ID,
                    fieldDeal: this.config.FIELD_DEAL,
                    fieldTimeSpent: this.config.FIELD_TIME_SPENT,
                    fieldComment: this.config.FIELD_COMMENT,
                    fieldDealStage: this.config.FIELD_DEAL_STAGE,
                    fieldFunnel: this.config.FIELD_FUNNEL || 'Воронка'
                },
                onsuccess: (response) => {
                    this.isLoading = false;
                    this.hideLoader();
                    if (response.success) {
                        this.showSuccess(response.message || `Успешно отправлено записей: ${response.data.created}`);
                        setTimeout(() => {
                            document.querySelectorAll('.time-input').forEach(input => input.value = '0');
                            document.querySelectorAll('.comment-input').forEach(textarea => {
                                textarea.value = '';
                                // Сбрасываем высоту textarea
                                textarea.style.height = 'auto';
                            });
                        }, 2000);
                    } else {
                        this.showError(response.message || 'Ошибка при сохранении данных');
                    }
                },
                onfailure: () => {
                    this.isLoading = false;
                    this.hideLoader();
                    this.showError('Ошибка соединения с сервером');
                }
            });
        },

        showLoader: function(text) {
            BX.showWait(this.container, text);
        },

        hideLoader: function() {
            BX.closeWait(this.container);
        },

        getCurrentDate: function() {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            return `${day}.${month}.${year}`;
        },

        showSuccess: function(message) {
            this.showMessage(message, 'success');
        },

        showWarning: function(message) {
            this.showMessage(message, 'warning');
        },

        showError: function(message) {
            this.showMessage(message, 'error');
        },

        showInfo: function(message) {
            this.showMessage(message, 'info');
        },

        showMessage: function(message, type) {
            const container = document.getElementById('messageContainer');
            if (!container) {
                BX.UI.Notification.Center.notify({
                    content: message,
                    position: 'top-right',
                    autoHideDelay: 5000
                });
                return;
            }
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `message message-${type}`;
            messageDiv.textContent = message;
            messageDiv.style.padding = '20px';
            messageDiv.style.margin = '10px 0';
            container.innerHTML = '';
            container.appendChild(messageDiv);
            setTimeout(() => { if (messageDiv.parentNode) messageDiv.remove(); }, 5000);
        }
    };

    window.TimeTracking = TimeTracking;
    console.log('TimeTracking: Компонент инициализирован');

})();