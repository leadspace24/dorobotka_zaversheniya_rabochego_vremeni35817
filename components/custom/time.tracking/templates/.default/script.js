(function () {
    'use strict';

    const TimeTracking = {
        config: {},
        deals: [],
        isLoading: false,
        container: null,
        additionalRows: [],
        rowCounter: 0,

        init: function () {
            this.config = Object.assign({}, window.TimeTrackingConfig || {});

            if (!this.config.AJAX_URL) {
                console.error('TimeTracking: AJAX_URL не определен');
                this.showError('Ошибка конфигурации');
                return;
            }

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

        loadUserDeals: function () {
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
                        if (response.success) {
                            this.deals = response.data.deals || [];
                            // Добавляем каждой сделке массив подстрок с одной базовой строкой
                            this.deals.forEach(deal => {
                                deal.subRows = [];
                                deal.subRowCounter = 1;
                                // Добавляем одну базовую строку, которую нельзя удалить
                                deal.subRows.push({
                                    id: 1,
                                    timeType: '',
                                    minutes: 0,
                                    comment: '',
                                    isBase: true // флаг, что это базовая строка
                                });
                            });
                            resolve();
                        } else {
                            reject(new Error(response.message || 'Ошибка загрузки'));
                        }
                    },
                    onfailure: (error) => {
                        reject(new Error('Ошибка соединения с сервером'));
                    }
                });
            });
        },

        renderTimeTypeSelect: function (name, selectedValue = '') {
            const types = this.config.TIME_TYPES_LIST || [];
            let html = '<select name="' + name + '" class="ui-select">';
            html += '<option value="">-- Выберите тип --</option>';

            for (let i = 0; i < types.length; i++) {
                const selected = selectedValue == types[i].ID ? 'selected' : '';
                html += '<option value="' + types[i].ID + '" ' + selected + '>' + types[i].VALUE + '</option>';
            }

            html += '</select>';
            return html;
        },

        renderContent: function () {
            if (this.deals.length === 0) {
                this.container.innerHTML = '<div class="time-tracking-info">У вас нет активных сделок в указанных воронках</div>';
                return;
            }

            const content = document.createElement('div');
            content.className = 'time-tracking-content';

            const header = document.createElement('div');
            header.className = 'time-tracking-header';
            header.innerHTML = `
                <h2>Учет трудозатрат за ${this.getCurrentDate()}</h2>
                <p class="time-tracking-description">Укажите время, затраченное на каждую сделку</p>
            `;
            content.appendChild(header);

            const body = document.createElement('div');
            body.className = 'time-tracking-body';
            body.appendChild(this.buildDealsBlock());
            body.appendChild(this.buildAdditionalBlock());
            content.appendChild(body);

            const footer = document.createElement('div');
            footer.className = 'time-tracking-footer';

            const submitBtn = document.createElement('button');
            submitBtn.className = 'ui-btn ui-btn-success';
            submitBtn.textContent = 'Отправить';
            submitBtn.onclick = () => this.submitData();
            footer.appendChild(submitBtn);

            content.appendChild(footer);

            const messageContainer = document.createElement('div');
            messageContainer.id = 'messageContainer';
            messageContainer.className = 'message-container';
            content.appendChild(messageContainer);

            this.container.innerHTML = '';
            this.container.appendChild(content);
        },

        buildDealsBlock: function () {
            const container = document.createElement('div');
            container.className = 'deals-block';
            
            this.deals.forEach((deal, dealIndex) => {
                const dealCard = document.createElement('div');
                dealCard.className = 'deal-card';
                dealCard.style.marginBottom = '20px';
                dealCard.style.border = '1px solid #dee2e6';
                dealCard.style.borderRadius = '8px';
                dealCard.style.overflow = 'hidden';
                
                // Заголовок сделки
                const dealHeader = document.createElement('div');
                dealHeader.className = 'deal-header';
                dealHeader.style.padding = '12px 16px';
                dealHeader.style.backgroundColor = '#f8f9fa';
                dealHeader.style.borderBottom = '1px solid #dee2e6';
                dealHeader.style.display = 'flex';
                dealHeader.style.justifyContent = 'space-between';
                dealHeader.style.alignItems = 'center';
                dealHeader.innerHTML = `
                    <div>
                        <strong>${deal.TITLE}</strong>
                        <span style="margin-left: 12px; color: #333; font-size: 14px; font-weight: bold;">
                          <b style="color: #6c757d"> Воронка: </b>${deal.FUNNEL_NAME || 'Не указана'} | 
                           <b style="color: #6c757d">  Статус: </b>${deal.STAGE_NAME}
                        </span>
                    </div>
                    <a href="/crm/deal/details/${deal.ID}/" target="_blank" style="color: #2067b0; text-decoration: none;font-weight: bold;">Открыть сделку</a>
                `;
                dealCard.appendChild(dealHeader);
                
                // Таблица подстрок
                const table = document.createElement('table');
                table.className = 'deals-table';
                table.style.width = '100%';
                
                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr>
                        <th style="width: 20%">Тип списания</th>
                        <th style="width: 15%">Трудозатраты (минуты)</th>
                        <th style="width: 55%">Комментарий</th>
                        <th style="width: 10%"></th>
                    </tr>
                `;
                table.appendChild(thead);
                
                const tbody = document.createElement('tbody');
                tbody.id = `deal-subrows-${deal.ID}`;
                tbody.className = 'deal-subrows-container';
                
                // Добавляем существующие подстроки
                deal.subRows.forEach((subRow, subIndex) => {
                    tbody.appendChild(this.renderSubRow(deal, subRow, subIndex));
                });
                
                table.appendChild(tbody);
                dealCard.appendChild(table);
                
                // Кнопка добавления подстроки
                const addBtn = document.createElement('button');
                addBtn.type = 'button';
                addBtn.className = 'ui-btn ui-btn-primary ui-btn-sm';
                addBtn.textContent = '+ Добавить строку';
                addBtn.style.margin = '12px 16px';
                addBtn.onclick = () => this.addSubRow(deal.ID);
                dealCard.appendChild(addBtn);
                
                container.appendChild(dealCard);
            });
            
            return container;
        },

        renderSubRow: function (deal, subRow, index) {
            const row = document.createElement('tr');
            row.dataset.subRowId = subRow.id;
            row.dataset.isBase = subRow.isBase ? 'true' : 'false';
            
            // Тип списания
            const typeCell = document.createElement('td');
            typeCell.style.padding = '8px';
            const select = document.createElement('select');
            select.className = 'ui-select subrow-time-type';
            select.name = `subrow_type_${deal.ID}_${subRow.id}`;
            
            const types = this.config.TIME_TYPES_LIST || [];
            let optionHtml = '<option value="">-- Выберите тип --</option>';
            for (let i = 0; i < types.length; i++) {
                const selected = subRow.timeType == types[i].ID ? 'selected' : '';
                optionHtml += `<option value="${types[i].ID}" ${selected}>${types[i].VALUE}</option>`;
            }
            select.innerHTML = optionHtml;
            typeCell.appendChild(select);
            row.appendChild(typeCell);
            
            // Время
            const timeCell = document.createElement('td');
            timeCell.style.padding = '8px';
            const timeInput = document.createElement('input');
            timeInput.type = 'number';
            timeInput.className = 'time-input subrow-minutes';
            timeInput.min = '0';
            timeInput.step = '1';
            timeInput.value = subRow.minutes || 0;
            timeInput.placeholder = 'минуты';
            timeInput.style.width = '100px';
            timeCell.appendChild(timeInput);
            row.appendChild(timeCell);
            
            // Комментарий - TEXTAREA с автоматическим расширением
            const commentCell = document.createElement('td');
            commentCell.style.padding = '8px';
            const commentTextarea = document.createElement('textarea');
            commentTextarea.className = 'ui-input subrow-comment';
            commentTextarea.placeholder = 'Комментарий (необязательно)';
            commentTextarea.value = subRow.comment || '';
            commentTextarea.style.width = '100%';
            commentTextarea.style.minHeight = '36px';
            commentTextarea.style.maxHeight = '150px';
            commentTextarea.style.resize = 'vertical';
            commentTextarea.style.fontFamily = 'inherit';
            commentTextarea.style.padding = '8px';
            commentTextarea.style.boxSizing = 'border-box';
            commentTextarea.style.lineHeight = '1.4';
            
            // Автоматическое расширение textarea
            commentTextarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 150) + 'px';
            });
            
            commentCell.appendChild(commentTextarea);
            row.appendChild(commentCell);
            
            // Кнопка удаления (для базовой строки не показываем)
            const actionCell = document.createElement('td');
            actionCell.style.padding = '8px';
            actionCell.style.textAlign = 'center';
            
            if (!subRow.isBase) {
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'ui-btn ui-btn-link';
                removeBtn.textContent = '×';
                removeBtn.style.color = '#f44336';
                removeBtn.style.fontSize = '20px';
                removeBtn.onclick = () => this.removeSubRow(deal.ID, subRow.id);
                actionCell.appendChild(removeBtn);
            }
            
            row.appendChild(actionCell);
            
            return row;
        },

        addSubRow: function (dealId) {
            const deal = this.deals.find(d => d.ID == dealId);
            if (!deal) return;
            
            const newId = ++deal.subRowCounter;
            const newSubRow = {
                id: newId,
                timeType: '',
                minutes: 0,
                comment: '',
                isBase: false
            };
            deal.subRows.push(newSubRow);
            
            const container = document.getElementById(`deal-subrows-${dealId}`);
            if (container) {
                const newRow = this.renderSubRow(deal, newSubRow, deal.subRows.length - 1);
                container.appendChild(newRow);
            }
        },

        removeSubRow: function (dealId, subRowId) {
            const deal = this.deals.find(d => d.ID == dealId);
            if (!deal) return;
            
            const index = deal.subRows.findIndex(row => row.id == subRowId);
            if (index !== -1 && !deal.subRows[index].isBase) {
                deal.subRows.splice(index, 1);
            }
            
            const row = document.querySelector(`tr[data-sub-row-id="${subRowId}"]`);
            if (row) {
                row.remove();
            }
        },

        getSubRowsData: function () {
            const records = [];
            
            this.deals.forEach(deal => {
                const container = document.getElementById(`deal-subrows-${deal.ID}`);
                if (!container) return;
                
                const rows = container.querySelectorAll('tr');
                rows.forEach((row, index) => {
                    const typeSelect = row.querySelector('.subrow-time-type');
                    const minutesInput = row.querySelector('.subrow-minutes');
                    const commentTextarea = row.querySelector('.subrow-comment');
                    
                    const minutes = minutesInput ? parseInt(minutesInput.value) || 0 : 0;
                    
                    if (minutes > 0) {
                        records.push({
                            dealId: deal.ID,
                            dealTitle: deal.TITLE,
                            stageName: deal.STAGE_NAME,
                            funnelName: deal.FUNNEL_NAME,
                            timeInMinutes: minutes,
                            timeInHours: (minutes / 60).toFixed(2),
                            comment: commentTextarea ? commentTextarea.value.trim() : '',
                            timeType: typeSelect ? typeSelect.value : ''
                        });
                    }
                });
            });
            
            return records;
        },

        buildAdditionalBlock: function () {
            const block = document.createElement('div');
            block.className = 'additional-works-block';
            block.style.marginTop = '30px';
            block.style.paddingTop = '20px';
            block.style.borderTop = '2px solid #e0e0e0';

            const title = document.createElement('h3');
            title.textContent = 'Дополнительные трудозатраты';
            title.style.marginBottom = '15px';
            block.appendChild(title);

            const table = document.createElement('table');
            table.className = 'additional-works-table deals-table';

            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th style="width: 30%">Наименование работ</th>
                    <th style="width: 25%">Тип списания</th>
                    <th style="width: 15%">Трудозатраты (минуты)</th>
                    <th style="width: 25%">Комментарий</th>
                    <th style="width: 5%"></th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            tbody.id = 'additional-rows-container';
            table.appendChild(tbody);
            block.appendChild(table);

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'ui-btn ui-btn-primary';
            addBtn.textContent = '+ Добавить строку';
            addBtn.style.marginTop = '15px';
            addBtn.style.marginBottom = '15px';
            addBtn.onclick = () => this.addAdditionalRow();
            block.appendChild(addBtn);

            return block;
        },

        addAdditionalRow: function () {
            const rowId = ++this.rowCounter;
            this.additionalRows.push({
                id: rowId,
                name: '',
                timeType: '',
                minutes: 0,
                comment: ''
            });

            const container = document.getElementById('additional-rows-container');
            if (container) {
                const row = this.renderAdditionalRow(rowId);
                container.insertAdjacentHTML('beforeend', row);
                this.attachRemoveRowHandler();
            }
        },

        renderAdditionalRow: function (rowId) {
            return `
                <tr data-row-id="${rowId}">
                    <td style="padding: 8px;">
                        <input type="text" class="work-name ui-input" placeholder="Наименование работ" style="width: 100%;">
                    </td>
                    <td style="padding: 8px;">
                        ${this.renderTimeTypeSelect(`additional_type_${rowId}`, '')}
                    </td>
                    <td style="padding: 8px;">
                        <input type="number" class="work-minutes ui-input" value="0" min="0" step="1" style="width: 100px;">
                    </td>
                    <td style="padding: 8px;">
                        <textarea class="work-comment ui-input" placeholder="Комментарий" style="width: 100%; min-height: 36px; resize: vertical; padding: 8px; box-sizing: border-box; font-family: inherit;"></textarea>
                    </td>
                    <td style="padding: 8px; text-align: center;">
                        <button type="button" class="ui-btn ui-btn-link btn-remove-row" data-row-id="${rowId}" style="color: #f44336;">×</button>
                    </td>
                </tr>
            `;
        },

        removeAdditionalRow: function (rowId) {
            const index = this.additionalRows.findIndex(row => row.id == rowId);
            if (index !== -1) {
                this.additionalRows.splice(index, 1);
            }

            const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
            if (row) {
                row.remove();
            }
        },

        attachRemoveRowHandler: function () {
            const removeButtons = document.querySelectorAll('.btn-remove-row');
            removeButtons.forEach(btn => {
                btn.removeEventListener('click', btn._handler);
                btn._handler = () => {
                    const rowId = btn.getAttribute('data-row-id');
                    this.removeAdditionalRow(rowId);
                };
                btn.addEventListener('click', btn._handler);
            });
        },

        getAdditionalWorksData: function () {
            const works = [];
            const rows = document.querySelectorAll('#additional-rows-container tr');

            rows.forEach(row => {
                const nameInput = row.querySelector('.work-name');
                const typeSelect = row.querySelector('select');
                const minutesInput = row.querySelector('.work-minutes');
                const commentTextarea = row.querySelector('.work-comment');

                const minutes = minutesInput ? parseInt(minutesInput.value) || 0 : 0;

                if (minutes > 0) {
                    works.push({
                        name: nameInput ? nameInput.value : '',
                        timeType: typeSelect ? typeSelect.value : '',
                        minutes: minutes,
                        comment: commentTextarea ? commentTextarea.value : ''
                    });
                }
            });

            return works;
        },

        submitData: function () {
            if (this.isLoading) return;

            const subRowsData = this.getSubRowsData();
            const additionalWorks = this.getAdditionalWorksData();

            if (subRowsData.length === 0 && additionalWorks.length === 0) {
                this.showWarning('Не указано ни одного значения времени');
                return;
            }

            console.log('Отправляемые данные:', { records: subRowsData, additionalWorks });

            this.isLoading = true;
            this.showLoader('Сохранение данных...');

            BX.ajax({
                url: this.config.AJAX_URL,
                method: 'POST',
                dataType: 'json',
                data: {
                    action: 'saveTimeRecords',
                    records: subRowsData,
                    additionalWorks: additionalWorks,
                    sessid: BX.bitrix_sessid(),
                    departmentId: this.config.DEPARTMENT_ID,
                    smartProcessTypeId: this.config.SMART_PROCESS_TYPE_ID,
                    fieldDeal: this.config.FIELD_DEAL,
                    fieldTimeSpent: this.config.FIELD_TIME_SPENT,
                    fieldComment: this.config.FIELD_COMMENT,
                    fieldDealStage: this.config.FIELD_DEAL_STAGE,
                    fieldFunnel: this.config.FIELD_FUNNEL,
                    fieldTimeType: this.config.FIELD_TIME_TYPE
                },
                onsuccess: (response) => {
                    this.isLoading = false;
                    this.hideLoader();
                    if (response.success) {
                        this.showSuccess(response.message || `Успешно отправлено записей: ${response.data.created}`);
                        // Очищаем все подстроки, но оставляем базовую
                        this.deals.forEach(deal => {
                            // Оставляем только базовую строку, очищаем ее значения
                            const baseRow = deal.subRows.find(row => row.isBase === true);
                            if (baseRow) {
                                baseRow.timeType = '';
                                baseRow.minutes = 0;
                                baseRow.comment = '';
                            }
                            // Удаляем все дополнительные строки
                            deal.subRows = deal.subRows.filter(row => row.isBase === true);
                            deal.subRowCounter = 1;
                            
                            const container = document.getElementById(`deal-subrows-${deal.ID}`);
                            if (container) {
                                container.innerHTML = '';
                                const newBaseRow = this.renderSubRow(deal, baseRow, 0);
                                container.appendChild(newBaseRow);
                            }
                        });
                        // Очищаем дополнительные работы
                        const container = document.getElementById('additional-rows-container');
                        if (container) container.innerHTML = '';
                        this.additionalRows = [];
                        this.rowCounter = 0;
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

        showLoader: function (text) {
            BX.showWait(this.container, text);
        },

        hideLoader: function () {
            BX.closeWait(this.container);
        },

        getCurrentDate: function () {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            return `${day}.${month}.${year}`;
        },

        showSuccess: function (message) {
            this.showMessage(message, 'success');
        },

        showWarning: function (message) {
            this.showMessage(message, 'warning');
        },

        showError: function (message) {
            this.showMessage(message, 'error');
        },

        showMessage: function (message, type) {
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
            container.innerHTML = '';
            container.appendChild(messageDiv);
            setTimeout(() => { if (messageDiv.parentNode) messageDiv.remove(); }, 5000);
        }
    };

    window.TimeTracking = TimeTracking;
    console.log('TimeTracking: Компонент инициализирован');

})();