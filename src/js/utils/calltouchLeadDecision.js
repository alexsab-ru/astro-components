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

export const getCalltouchGoalPayload = (
	response,
	clientResult,
	leadPayload
) => shouldSendCalltouchLead(response, clientResult) ? leadPayload : {};
