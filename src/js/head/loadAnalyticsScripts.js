(function() {
    const e = document.querySelector("#scripts_json");

    var scripts_json = {};
    if (e && e.textContent) {
        scripts_json = JSON.parse(e.textContent)
    }

    var analyticsLoaded = false;
    var startTime = Date.now();

    function loadAnalyticsScripts() {
        console.log("loadAnalyticsScripts", (Date.now() - startTime));
        if (!analyticsLoaded) {
            analyticsLoaded = true;
            window.removeEventListener('scroll', loadAnalyticsScripts);
            document.removeEventListener('mousemove', loadAnalyticsScripts);

            // Google Tag Manager
            process.env.NODE_ENV === "production" && scripts_json.gtm && scripts_json.gtm.length > 0 && runGTM(scripts_json.gtm);

            // Яндекс Метрика - только если GTM не используется и метрика настроена
            process.env.NODE_ENV === "production" && scripts_json.gtm == "" && scripts_json.metrika && scripts_json.metrika.length > 0 && runMETRIKA(scripts_json.metrika);

            // Google Analytics 4 - только если GTM не используется и GA4 настроен
            process.env.NODE_ENV === "production" && scripts_json.gtm == "" && scripts_json.ga4 && scripts_json.ga4.length > 0 && runGA4(scripts_json.ga4);

            // reCAPTCHA
            process.env.NODE_ENV === "production" && scripts_json.re && scripts_json.re.trim() !== "" && runRE(scripts_json.re);

            // VK Retargeting - только если GTM не используется и VK настроен
            process.env.NODE_ENV === "production" && scripts_json.gtm == "" && scripts_json['vk-rtrg'] && scripts_json['vk-rtrg'].length > 0 && runVK_RTRG(scripts_json['vk-rtrg']);

            // Top Mail.ru - только если GTM не используется и Mail.ru настроен
            process.env.NODE_ENV === "production" && scripts_json.gtm == "" && scripts_json['top.mail.ru'] && scripts_json['top.mail.ru'].length > 0 && runTOP_MAIL_RU(scripts_json['top.mail.ru']);

            // Calltouch - только если GTM не используется и Calltouch настроен
            process.env.NODE_ENV === "production" && scripts_json.gtm == "" && scripts_json.calltouch && scripts_json.calltouch.client_id && scripts_json.calltouch.site_id && runCALLTOUCH(scripts_json.calltouch);

            // Konget - только если GTM не используется и Konget настроен
            process.env.NODE_ENV === "production" && scripts_json.gtm == "" && scripts_json.konget && scripts_json.konget.trim() !== "" && runKONGET(scripts_json.konget);

            // Streamwood - только если GTM не используется и Streamwood настроен
            process.env.NODE_ENV === "production" && scripts_json.gtm == "" && scripts_json.streamwood && scripts_json.streamwood.swKey && scripts_json.streamwood.swDomainKey && runSTREAMWOOD(scripts_json.streamwood);

            // Smartpoint - только если GTM не используется и Smartpoint настроен
            process.env.NODE_ENV === "production" && scripts_json.gtm == "" && scripts_json.smartpoint && runSMARTPOINT(scripts_json.smartpoint);

            // Widgets - только если GTM не используется и виджеты настроены
            process.env.NODE_ENV === "production" && scripts_json.gtm == "" && scripts_json.widgets && scripts_json.widgets.length > 0 && runWIDGETS(scripts_json.widgets);
        }
    }

    function initializeEventListeners() {
        window.addEventListener('scroll', loadAnalyticsScripts);
        document.addEventListener('mousemove', loadAnalyticsScripts);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEventListeners);
    } else {
        initializeEventListeners();
    }
})();