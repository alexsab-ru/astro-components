import { reachGoal } from '@alexsab-ru/scripts';

const clientErrorEndpoint = 'https://l.alexsab.ru/lead/client-error/';
const allowedErrorSources = new Set(['client', 'network', 'server']);
const allowedErrorStages = new Set([
	'lead_request',
	'lead_response',
	'maxposter_request',
	'maxposter_response',
	'response_parse',
	'response_read',
	'success_handler',
]);

const normalizeInvalidFieldNames = (fields = []) => [...new Set(
	fields
		.map((field) => String(field || '').replace(/^[.#]+/, '').trim())
		.filter((field) => /^[A-Za-zА-Яа-яЁё0-9_-]{1,80}$/.test(field))
)].slice(0, 20);

export const getFormRequiredGoalPayload = ({
	formID = '',
	validationSource = 'client',
	invalidFields = [],
} = {}) => {
	const fields = normalizeInvalidFieldNames(invalidFields);
	return {
		eventProperties: {
			validationSource,
			formID: String(formID || '').slice(0, 100),
			invalidFields: fields.join(','),
			invalidCount: fields.length,
		},
	};
};

export const emitFormRequired = (context) => {
	reachGoal('form_required', getFormRequiredGoalPayload(context));
};

export const getFormErrorGoalPayload = ({
	formID = '',
	errorSource,
	errorStage,
	httpStatus,
} = {}) => {
	const eventProperties = {
		errorSource,
		errorStage,
		formID: String(formID || '').slice(0, 100),
	};
	if (Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599) {
		eventProperties.httpStatus = httpStatus;
	}
	return { eventProperties };
};

export const emitFormError = (context) => {
	reachGoal('form_error', getFormErrorGoalPayload(context));
	void reportClientFormError(context);
};

export const reportClientFormError = async (context = {}) => {
	if (
		typeof window === 'undefined'
		|| typeof fetch !== 'function'
		|| !allowedErrorSources.has(context.errorSource)
		|| !allowedErrorStages.has(context.errorStage)
	) return false;

	const payload = {
		version: 1,
		goal: 'form_error',
		errorSource: context.errorSource,
		errorStage: context.errorStage,
		formID: String(context.formID || '').slice(0, 100),
		pagePath: String(window.location.pathname || '/')
			.split(/[?#]/, 1)[0]
			.slice(0, 200),
	};
	if (Number.isInteger(context.httpStatus) && context.httpStatus >= 100 && context.httpStatus <= 599) {
		payload.httpStatus = context.httpStatus;
	}

	const dedupeKey = 'alexsab:client-form-error:' + [
		payload.formID,
		payload.errorSource,
		payload.errorStage,
		payload.httpStatus || '',
		payload.pagePath,
	].join(':');
	try {
		if (window.sessionStorage?.getItem(dedupeKey)) return false;
		window.sessionStorage?.setItem(dedupeKey, '1');
	} catch (error) {
		// Storage can be unavailable in private mode; server limits still apply.
	}

	try {
		await fetch(clientErrorEndpoint, {
			method: 'POST',
			mode: 'no-cors',
			credentials: 'omit',
			keepalive: true,
			headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
			body: JSON.stringify(payload),
		});
		return true;
	} catch (error) {
		return false;
	}
};
