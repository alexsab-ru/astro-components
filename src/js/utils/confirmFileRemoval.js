import { openModal, closeModal } from '../../ui/modal/modal-controller.js';

const pending = new WeakMap();

/** One local decision per window; every dismissal rejects and releases listeners. */
export function confirmFileRemoval(
	question,
	accepted,
	rejected,
	doc = document
) {
	const modal = doc.getElementById('dropzone-confirm-modal');
	const accept = modal?.querySelector('#dropzone-accept');
	const cancel = modal?.querySelector('#dropzone-cancel');
	if (!modal || !accept || !cancel) {
		rejected?.();
		return;
	}
	pending.get(modal)?.();
	modal.querySelector('.message').textContent = question;
	let settled = false;
	const finish = (confirmed) => {
		if (settled) return;
		settled = true;
		accept.removeEventListener('click', onAccept);
		cancel.removeEventListener('click', onCancel);
		modal.removeEventListener('modal:close', onCancel);
		pending.delete(modal);
		closeModal(modal, 'decision');
		if (confirmed) accepted();
		else rejected?.();
	};
	const onAccept = () => finish(true);
	const onCancel = () => finish(false);
	accept.addEventListener('click', onAccept);
	cancel.addEventListener('click', onCancel);
	modal.addEventListener('modal:close', onCancel);
	pending.set(modal, onCancel);
	openModal(modal);
}
