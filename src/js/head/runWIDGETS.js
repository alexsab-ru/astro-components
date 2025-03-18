function runWIDGETS(widgets) {
    widgets.forEach(widget => {
        if (widget && widget.trim() !== "") {
            // Создаем временный div для парсинга HTML
            var div = document.createElement('div');
            div.innerHTML = widget.trim();
            
            // Получаем элемент script из временного div
            var scriptTag = div.querySelector('script');
            
            if (scriptTag) {
                // Создаем новый script элемент
                var script = document.createElement('script');
                
                // Копируем все атрибуты из исходного тега
                Array.from(scriptTag.attributes).forEach(attr => {
                    script.setAttribute(attr.name, attr.value);
                });
                
                // Если есть внутренний текст скрипта, копируем его
                if (scriptTag.innerHTML) {
                    script.innerHTML = scriptTag.innerHTML;
                }
                
                document.head.appendChild(script);
            }
        }
    });
}