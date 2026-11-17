/** Native reset does not clear custom validity or the external validator's UI. */
export function resetFieldErrors(form) {
	form.querySelectorAll(
		'[data-form-field] > input, [data-form-field] > textarea, [data-form-field] > select'
	).forEach(control => {
		control.removeAttribute('aria-invalid');
		control.setCustomValidity('');
		control.parentElement.querySelector(':scope > .error-message')?.classList.add('hidden');
	});
}
