import { createFocusTrap } from 'focus-trap';

const controllers = new WeakMap();

/** One controller per document; SDK class toggles keep the same visibility contract. */
export function initModals(doc = document) {
	if (controllers.has(doc)) {
		const existing = controllers.get(doc);
		existing.registerAll();
		return existing;
	}
	const states = new Map();
	const stack = [];
	const trapStack = [];
	let ownsScrollLock = false;
	let previousScrollLock = false;
	const updateLayers = () => {
		let top = 0;
		for (const modal of stack) {
			top = Math.max(top + 1, states.get(modal).baseZ);
			modal.style.zIndex = String(top);
		}
	};
	const emit = (modal, name, detail) =>
		modal.dispatchEvent(
			new doc.defaultView.CustomEvent(name, { bubbles: true, detail })
		);
	const visibleModal = () => doc.querySelector('.modal-overlay:not(.hidden)');
	const updateScrollLock = () => {
		if (visibleModal()) {
			if (!ownsScrollLock)
				previousScrollLock =
					doc.body.classList.contains('overflow-hidden');
			doc.body.classList.add('overflow-hidden');
			ownsScrollLock = true;
		} else if (ownsScrollLock) {
			if (!previousScrollLock)
				doc.body.classList.remove('overflow-hidden');
			ownsScrollLock = false;
		}
	};
	const sync = (modal, detail = { reason: 'external' }) => {
		const state = states.get(modal);
		const visible = !modal.classList.contains('hidden');
		if (visible === state.open) return;
		state.open = visible;
		if (visible) {
			stack.push(modal);
			updateLayers();
			state.trap.activate();
		} else {
			stack.splice(stack.indexOf(modal), 1);
			modal.style.zIndex = state.inlineZ;
			updateLayers();
			state.trap.deactivate({ returnFocus: !visibleModal() });
		}
		updateScrollLock();
		emit(modal, visible ? 'modal:open' : 'modal:close', detail);
	};
	const register = (modal) => {
		if (!modal?.matches('.modal-overlay')) return false;
		if (states.has(modal)) return true;
		const panel = modal.querySelector('.modal-content') || modal;
		if (!panel.hasAttribute('tabindex')) panel.tabIndex = -1;
		const trap = createFocusTrap(panel, {
			document: doc,
			trapStack,
			escapeDeactivates: false,
			allowOutsideClick: true,
			delayReturnFocus: false,
			initialFocus: () =>
				panel.querySelector(
					'[autofocus], input:not([type="hidden"]):not([tabindex="-1"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
				) || panel,
			fallbackFocus: panel,
			setReturnFocus: (previous) =>
				previous?.isConnected &&
				!previous.closest('.modal-overlay.hidden')
					? previous
					: false,
		});
		const observer = new doc.defaultView.MutationObserver(() =>
			sync(modal)
		);
		states.set(modal, {
			open: false,
			trap,
			observer,
			inlineZ: modal.style.zIndex,
			baseZ:
				Number.parseInt(
					doc.defaultView.getComputedStyle(modal).zIndex,
					10
				) || 300000000,
		});
		observer.observe(modal, {
			attributes: true,
			attributeFilter: ['class'],
		});
		sync(modal);
		return true;
	};
	const registerAll = () =>
		doc.querySelectorAll('.modal-overlay').forEach(register);
	const open = (modal, trigger = null) => {
		if (!register(modal)) return false;
		const wasHidden = modal.classList.contains('hidden');
		const detail = { trigger, reason: trigger ? 'trigger' : 'api' };
		emit(modal, 'modal:beforeopen', detail);
		modal.classList.remove('hidden');
		sync(modal, detail);
		return wasHidden;
	};
	const close = (modal, reason = 'dismiss') => {
		if (!register(modal)) return false;
		if (modal.classList.contains('hidden')) {
			sync(modal);
			return false;
		}
		emit(modal, 'modal:beforeclose', { reason });
		modal.classList.add('hidden');
		sync(modal, { reason });
		return true;
	};
	const onClick = (event) => {
		if (event.defaultPrevented || !event.target?.closest) return;
		const trigger = event.target.closest('.popup-link');
		const href = trigger?.getAttribute('href');
		if (href?.startsWith('#') && href.length > 1) {
			const modal = doc.getElementById(href.slice(1));
			if (modal?.matches('.modal-overlay')) {
				event.preventDefault();
				open(modal, trigger);
				return;
			}
		}
		const control = event.target.closest('[data-close]');
		const modal = control?.closest('.modal-overlay');
		// The overlay is also data-close; clicks on its content are not backdrop clicks.
		if (modal && (control !== modal || event.target === modal))
			close(modal);
	};
	const onKeydown = (event) => {
		if (event.defaultPrevented || event.key !== 'Escape') return;
		const modal = [...stack]
			.reverse()
			.find(
				(node) => node.isConnected && !node.classList.contains('hidden')
			);
		if (modal) {
			event.preventDefault();
			close(modal);
		}
	};
	const controller = {
		registerAll,
		open,
		close,
		destroy() {
			doc.removeEventListener('click', onClick);
			doc.removeEventListener('keydown', onKeydown);
			states.forEach(({ observer, trap, inlineZ }, modal) => {
				observer.disconnect();
				trap.deactivate({ returnFocus: false });
				modal.style.zIndex = inlineZ;
			});
			if (ownsScrollLock && !previousScrollLock)
				doc.body.classList.remove('overflow-hidden');
			controllers.delete(doc);
		},
	};
	controllers.set(doc, controller);
	doc.addEventListener('click', onClick);
	doc.addEventListener('keydown', onKeydown);
	registerAll();
	return controller;
}

export function openModal(modal, trigger = null) {
	return modal ? initModals(modal.ownerDocument).open(modal, trigger) : false;
}

export function closeModal(modal, reason = 'dismiss') {
	return modal ? initModals(modal.ownerDocument).close(modal, reason) : false;
}
