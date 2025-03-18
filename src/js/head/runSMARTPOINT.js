function runSMARTPOINT(smartpoint) {
    (function(w, p) {
        var a, s;
        (w[p] = w[p] || []).push(
            `uid=${smartpoint}`,
            `site=${encodeURIComponent(window.location.href)}`
        );
        a = document.createElement('script');
        a.type = 'text/javascript';
        a.async = true;
        a.charset = 'utf-8';
        a.src = 'https://panel.smartpoint.pro/collectwidgets/?'+window.SMP_params.join('&');
        s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(a, s);
    })(window, 'SMP_params');
}