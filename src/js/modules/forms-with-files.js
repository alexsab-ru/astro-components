import {
	reachGoal,
	showErrorMes,
	showMessageModal,
	setAgreeCookie,
	getCookie,
	setCookie,
	deleteCookie,
	createRequest,
	getFormDataObject,
	errorIcon,
	errorText,
	successIcon,
	successText,
	messageModal,
	phoneChecker,
} from '@alexsab-ru/scripts';
import FormsValidation from './FormsValidation';

const defaultProps = {
	validation: FormsValidation,
	ct_routeKey: '',
	confirmModalText: '',
	verbose: false,
	agreeSelector: 'agree',
	sendMailCookie: 'SEND_MAIL',
};

const stateBtn = (btn, value, disable = false) => {
	if (!btn) return;
	if (btn.tagName === 'INPUT') {
		btn.value = value;
		btn.disabled = disable;
	} else {
		btn.innerText = value;
		disable ? btn.setAttribute('disabled', true) : btn.removeAttribute('disabled');
	}
};

const runValidation = async (form, validation) => {
	if (!validation) return { isValid: true };
	try {
		let instance;
		let result;
		try {
			instance = new validation(form);
		} catch (e) {
			result = validation(form);
		}
		if (instance) {
			if (typeof instance.validate === 'function') {
				result = await instance.validate();
			} else if (typeof instance.run === 'function') {
				result = await instance.run();
			} else if (typeof instance.isValid !== 'undefined') {
				result = { isValid: instance.isValid };
			}
		}
		if (typeof result === 'boolean') return { isValid: result };
		if (result && typeof result === 'object' && 'isValid' in result) {
			return { isValid: Boolean(result.isValid) };
		}
		if (instance && typeof instance.isValid !== 'undefined') {
			return { isValid: Boolean(instance.isValid) };
		}
		return { isValid: false };
	} catch (err) {
		console.error('Validation error:', err);
		return { isValid: false };
	}
};

const appendDropzoneFiles = (formData) => {
	if (!Array.isArray(window.filesToUpload)) return;
	window.filesToUpload.forEach((file) => {
		// если бэкенд ждёт другое имя поля — поменяйте 'file[]'
		formData.append('file[]', file);
	});
};

const resetDropzones = () => {
	if (Array.isArray(window.dropzones) && window.dropzones.length) {
		window.dropzones.forEach((d) => d.removeAllFiles());
	}
	window.filesToUpload = [];
};

const submitFormWithFiles = async (form, url, props) => {
	const btn = form.querySelector('[type="submit"]');
	const btnText = btn?.value || btn?.innerText || 'Отправить';
	const agree = form.querySelector(`[name="${props.agreeSelector}"]`);
	const phone = form.querySelector('[name="phone"]');
	const name = form.querySelector('[name="name"]');
	const dealer = form.querySelector('[name="dealer"]');

	let validate = await runValidation(form, props.validation);
	if (!props.validation) {
		if (!phoneChecker(phone)) return;
		if (dealer && dealer.hasAttribute('required') && !dealer.value) {
			showErrorMes(form, '.dealer', 'Выберите дилерский центр');
			return;
		}
		if (!agree || !agree.checked) {
			showErrorMes(form, `.${props.agreeSelector}`, 'Чтобы продолжить, установите флажок');
			return;
		}
		validate = { isValid: true };
	}

	if (!validate.isValid) return;
	if (agree && agree.checked) setAgreeCookie(90);

	stateBtn(btn, 'Отправляем...', true);
	reachGoal('form_submit');

	let formData = new FormData(form);
	appendDropzoneFiles(formData);

	let sendMailCookie = props.sendMailCookie;
	if (formData.get('dealer')) {
		sendMailCookie += '_' + formData.get('dealer');
	}
	if (getCookie('fta')) {
		formData.append('fta', true);
	}
	if (getCookie('__gtm_campaign_url')) {
		const source = new URL(getCookie('__gtm_campaign_url'));
		source.search.slice(1).split('&').forEach((pair) => {
			const param = pair.split('=');
			formData.append(param[0], param[1]);
		});
	}
	formData.append('page_url', window.location.origin + window.location.pathname);
	if (typeof window.re !== 'undefined') {
		formData.append('re', window.re);
	}
	window.location.search
		.slice(1)
		.split('&')
		.forEach((pair) => {
			const param = pair.split('=');
			if (!param[0]) return;
			if (formData.get(param[0])) {
				formData.set(param[0], decodeURIComponent(param[1]));
			} else {
				formData.append(param[0], decodeURIComponent(param[1]));
			}
		});

	let formDataObj = {};
	try {
		if (props.ct_routeKey !== '') {
			const requestData = await createRequest(
				props.ct_routeKey,
				phone?.value || '',
				name?.value || '',
				props.verbose
			);
			formData.append('ct_callback', true);
			formData.append('ctw_createRequest', JSON.stringify(requestData));
		} else {
			throw new Error('Empty ct_routeKey');
		}
	} catch (error) {
		if (props.ct_routeKey !== '') {
			formData.append('ctw_createRequest', error);
		}
		props.verbose && console.error('Error during request Calltouch callback:', error);
		formDataObj = getFormDataObject(formData, form.id);
	}

	try {
		const res = await fetch(url, {
			method: 'POST',
			body: formData,
		});
		const text = await res.text();
		let data;
		try {
			data = JSON.parse(text);
		} catch (e) {
			throw new Error('Ошибка обработки данных');
		}
		stateBtn(btn, btnText);
		if (data.answer === 'required') {
			reachGoal('form_required');
			showErrorMes(form, data.field, data.message);
			return;
		}
		if (data.answer === 'error') {
			reachGoal('form_error');
			showMessageModal(messageModal, errorIcon, errorText + '<br>' + data.error);
			return;
		}
		if (data.attention !== true) {
			reachGoal('form_success', formDataObj);
		}
		setCookie(sendMailCookie, true, {
			domain: window.location.hostname,
			path: '/',
			expires: 600,
		});
		showMessageModal(messageModal, successIcon, successText);
		form.reset();
		resetDropzones();
	} catch (error) {
		reachGoal('form_error');
		console.error('Ошибка отправки данных формы: ' + error);
		deleteCookie(sendMailCookie);
		showMessageModal(messageModal, errorIcon, errorText + '<br>' + error);
		stateBtn(btn, btnText);
	}
};

const sendForm = async (form, url, props) => {
	const formData = new FormData(form);
	let sendMailCookie = props.sendMailCookie;
	if (formData.get('dealer')) {
		sendMailCookie += '_' + formData.get('dealer');
	}
	if (getCookie(sendMailCookie)) {
		const confirmModal = document.getElementById('confirm-modal');
		if (confirmModal) {
			confirmModal.querySelector('p').innerHTML =
				props.confirmModalText ||
				'<span style="color: tomato; font-weight: bold">ПЕРЕДАЙ ТЕКСТ В ОБЪЕКТЕ <br><pre style="color: black; font-weight: 400">props = {confirmModalText: <i>"text"</i>}</pre></span>';
			confirmModal.classList.remove('hidden');
			const accept = confirmModal.querySelector('#accept-confirm');
			const acceptClose = confirmModal.querySelector('#accept-close');
			if (!accept.dataset.listenerAdded) {
				accept.dataset.listenerAdded = 'true';
				accept.addEventListener('click', async () => {
					confirmModal.classList.add('hidden');
					deleteCookie(sendMailCookie);
					await submitFormWithFiles(form, url, props);
				});
			}
			if (!acceptClose.dataset.listenerAdded) {
				acceptClose.dataset.listenerAdded = 'true';
				acceptClose.addEventListener('click', () => {
					const modals = document.querySelectorAll('.modal-overlay');
					form.reset();
					if (modals.length) {
						modals.forEach((modal) => modal.classList.add('hidden'));
					}
					confirmModal.classList.add('hidden');
				});
			}
			return;
		}
	}
	await submitFormWithFiles(form, url, props);
};

export const initFormsWithFiles = (url, props = {}) => {
	if (!url) return;
	const config = { ...defaultProps, ...props };
	document.querySelectorAll('form:not(.vue-form)').forEach((form) => {
		if (!form.querySelector('.file-upload')) return;
		form.addEventListener(
			'submit',
			async (event) => {
				event.preventDefault();
				event.stopImmediatePropagation();
				await sendForm(form, url, config);
			},
			true
		);
	});
};
