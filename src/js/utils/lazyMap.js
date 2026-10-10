const scripts = new Map();

export function withTimeout(promise, timeoutMs = 20000) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('map_load_timeout')), timeoutMs);
		Promise.resolve(promise).then(resolve, reject).finally(() => clearTimeout(timer));
	});
}

export function loadMapScript(url) {
	if (scripts.has(url)) return scripts.get(url);
	const script = document.createElement('script');
	const request = withTimeout(new Promise((resolve, reject) => {
		script.onload = resolve;
		script.onerror = () => reject(new Error('map_script_error'));
		script.src = url;
		document.head.appendChild(script);
	})).catch((error) => {
		scripts.delete(url);
		script.remove();
		throw error;
	}).finally(() => {
		script.onload = null;
		script.onerror = null;
	});
	scripts.set(url, request);
	return request;
}

export function observeMap(target, load) {
	if (!target) return;
	if (typeof IntersectionObserver !== 'function') {
		load();
		return;
	}
	const observer = new IntersectionObserver((entries) => {
		if (entries.some((entry) => entry.isIntersecting)) {
			observer.disconnect();
			load();
		}
	}, { rootMargin: '200px 0px', threshold: 0 });
	observer.observe(target);
}

export function showMapError(container, retry) {
	const message = document.createElement('div');
	message.className = 'h-full flex flex-col items-center justify-center gap-3 p-5 bg-white/95 text-center text-black';
	message.setAttribute('role', 'alert');
	const text = document.createElement('p');
	text.textContent = 'Не удалось загрузить карту. Проверьте соединение и попробуйте ещё раз.';
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'px-4 py-2 rounded border border-current hover:bg-gray-100 focus-visible:outline focus-visible:outline-2';
	button.textContent = 'Повторить загрузку';
	button.addEventListener('click', (event) => {
		event.stopPropagation();
		retry();
	});
	message.append(text, button);
	container.replaceChildren(message);
}
