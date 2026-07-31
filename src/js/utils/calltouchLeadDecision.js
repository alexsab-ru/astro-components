const CALLBACK_CREATED_STATUSES = new Set([
	'client_success',
	'server_success',
]);

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

export const getServerCallbackStatus = (response) =>
	normalizeStatus(response?.calltouch_callback?.status);

export const isCalltouchCallbackCreated = (response, clientResult) => {
	if (normalizeStatus(clientResult?.status) === 'success') {
		return true;
	}

	const serverStatus = getServerCallbackStatus(response);

	if (serverStatus) {
		return CALLBACK_CREATED_STATUSES.has(serverStatus);
	}

	return false;
};

export const shouldSendCalltouchLead = (response, clientResult) => {
	if (response?.attention === true) {
		return false;
	}

	return !isCalltouchCallbackCreated(response, clientResult);
};

// sendToCallTouch внутри reachGoal реагирует строго на eventCategory === 'Lead'.
// Чтобы не отправить второй лид, достаточно подменить категорию — обнулять весь
// payload нельзя: eventProperties и sourceName нужны GA4, Метрике и GTM.
export const CALLBACK_LEAD_CATEGORY = 'CallbackLead';

export const getCalltouchGoalPayload = (
	response,
	clientResult,
	leadPayload
) => shouldSendCalltouchLead(response, clientResult)
	? leadPayload
	: { ...leadPayload, eventCategory: CALLBACK_LEAD_CATEGORY };
