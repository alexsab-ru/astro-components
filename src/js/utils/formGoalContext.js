import { reachGoal, reportClientFormError } from '@alexsab-ru/scripts';

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
