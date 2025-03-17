function runGA4(scripts_json_ga4) {
    scripts_json_ga4.forEach(ga => {
        var script = document.createElement('script');
        script.src = `https://www.googletagmanager.com/gtag/js?id=${ga.id}`;
        script.async = true;
        document.head.appendChild(script);
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', ga.id);
    });
}