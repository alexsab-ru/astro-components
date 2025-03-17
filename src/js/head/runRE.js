function runRE(scripts_json_re) {
    var script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${scripts_json_re}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
} 