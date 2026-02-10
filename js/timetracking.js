(function() {
    'use strict';
    
    function showTimeTracking() {
        console.log('Открываем SidePanel с учетом времени');
        
        if (typeof BX !== 'undefined' && BX.SidePanel && BX.SidePanel.Instance) {
            BX.SidePanel.Instance.open('/timer/index.php', {
                width: 1200,
                cacheable: false,
                allowChangeHistory: false,
                events: {
                    onClose: function() {
                        console.log('SidePanel закрыт');
                    }
                }
            });
        }
    }
    
    function initTimeTracking() {
        // Перехват XMLHttpRequest
        var originalOpen = XMLHttpRequest.prototype.open;
        var originalSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            return originalOpen.apply(this, arguments);
        };
        
        XMLHttpRequest.prototype.send = function() {
            var xhr = this;
            
            if (xhr._url && xhr._url.includes('timeman.php') && xhr._url.includes('action=close')) {
                console.log('Перехвачен запрос закрытия дня:', xhr._url);
                
                xhr.addEventListener('load', function() {
                    if (xhr.status === 200) {
                        console.log('День закрыт успешно, показываем форму через 500мс');
                        setTimeout(showTimeTracking, 500);
                    }
                });
            }
            
            return originalSend.apply(this, arguments);
        };
    }
    
    // Инициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof BX === 'undefined') {
                setTimeout(initTimeTracking, 1000);
            } else {
                BX.ready(initTimeTracking);
            }
        });
    } else {
        if (typeof BX === 'undefined') {
            setTimeout(initTimeTracking, 100);
        } else {
            BX.ready(initTimeTracking);
        }
    }
})();