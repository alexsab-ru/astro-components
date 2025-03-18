function runKONGET(konget) {
    var script = document.createElement('script');
    script.src = `//app.konget.ru/inject?token=${konget}`;
    script.async = true;
    document.head.appendChild(script);
} 