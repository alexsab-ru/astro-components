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
