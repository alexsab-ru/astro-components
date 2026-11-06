export function resolveFormDepartments(value) {
	if (value === undefined) return ['Отдел продаж', 'Сервис'];
	if (
		!Array.isArray(value) ||
		value.length === 0 ||
		value.some((department) => typeof department !== 'string' || !department.trim())
	) {
		throw new Error('settings.form_departments must be a non-empty array of department names');
	}
	return [...new Set(value.map((department) => department.trim()))];
}

export function syncFormDepartments(modal, chooseDepartment) {
	const block = modal.querySelector('[data-departament-block]');
	if (!block) return;
	const enabled = String(chooseDepartment).toLowerCase() === 'true';
	const fallback = modal.querySelector('[data-departament-default]');
	block.classList.toggle('hidden', !enabled);
	modal.querySelectorAll('input[type="radio"][name="departament"]').forEach((radio) => {
		radio.disabled = !enabled;
		if (!enabled) radio.checked = false;
	});
	if (fallback) fallback.disabled = enabled;
}
