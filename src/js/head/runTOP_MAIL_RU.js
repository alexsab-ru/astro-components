function runTOP_MAIL_RU(top_mail_ru) {
    top_mail_ru.forEach(mail => {
        if (mail.id && mail.id.trim() !== "") {
            var script = document.createElement('script');
            script.innerHTML = `var _tmr = window._tmr || (window._tmr = []); _tmr.push({id: "${mail.id}", type: "pageView", start: (new Date()).getTime()}); (function (d, w, id) { if (d.getElementById(id)) return; var ts = d.createElement("script"); ts.type = "text/javascript"; ts.async = true; ts.id = id; ts.src = "https://top-fwz1.mail.ru/js/code.js"; var f = function () {var s = d.getElementsByTagName("script")[0]; s.parentNode.insertBefore(ts, s);}; if (w.opera == "[object Opera]") { d.addEventListener("DOMContentLoaded", f, false); } else { f(); } })(document, window, "topmailru-code");`;
            document.head.appendChild(script);
        }
    });
} 