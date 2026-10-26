const hasOwn = (value, key) =>
	value !== null &&
	typeof value === 'object' &&
	Object.prototype.hasOwnProperty.call(value, key);

export function getFeatureFlag(settings = {}, featureName, defaultValue = true) {
	if (hasOwn(settings.features, featureName)) {
		return settings.features[featureName];
	}

	if (hasOwn(settings, featureName)) {
		return settings[featureName];
	}

	return defaultValue;
}

export function isCreditEnabled(settings = {}) {
	return getFeatureFlag(settings, 'credit', true) !== false;
}

export function isHeaderTransparentEnabled(settings = {}) {
	return getFeatureFlag(settings, 'is_header_transparent', false) === true;
}

/** @returns {'both' | 'only_phone' | 'only_callback'} */
export function getHeaderCallbackMode(settings = {}) {
	const mode = getFeatureFlag(settings, 'header_callback', 'both');

	// Keep older dealer data working while template updates propagate to forks.
	if (mode === false || mode === 'only_phone') return 'only_phone';
	if (mode === true || mode === 'only_callback') return 'only_callback';

	return 'both';
}
