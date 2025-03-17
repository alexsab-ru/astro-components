function runCALLTOUCH(calltouch) {
    var script = document.createElement('script');
    script.src = `https://mod.calltouch.ru/init.js?id=${calltouch.client_id}`;
    script.async = true;
    document.head.appendChild(script);
    window.calltouch_params = {
        site_id: calltouch.site_id
    };
} 