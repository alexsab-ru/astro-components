function runVK_RTRG(vk_rtrg) {
    vk_rtrg.forEach(vk => {
        if (vk.id && vk.id.trim() !== "") {
            var script = document.createElement('script');
            script.innerHTML = `!function(){var t=document.createElement("script");t.type="text/javascript",t.async=!0,t.src="https://vk.com/js/api/openapi.js?169",t.onload=function(){VK.Retargeting.Init("${vk.id}"),VK.Retargeting.Hit()},document.head.appendChild(t)}();`;
            document.head.appendChild(script);
        }
    });
} 