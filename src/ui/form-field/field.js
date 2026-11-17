import { randomUUID } from 'node:crypto';

export const FIELD_CONTROL_CLASSES =
	'border-2 transition-all focus:border-accent-500 px-4 py-2.5 w-full bg-white text-black xs:text-sm';

/** Keep caller descriptions and create instance-scoped associations, not name IDs. */
export function fieldAccessibility({ id, label, hint, required, describedBy }) {
	const controlId = id ?? (label || hint || required ? `field-${randomUUID()}` : undefined);
	const descriptions = [
		describedBy,
		hint && controlId ? `${controlId}-hint` : undefined,
	].filter(Boolean).flatMap(value => value.trim().split(/\s+/));
	return {
		id: controlId,
		describedBy: [...new Set(descriptions)].join(' ') || undefined,
		errorMessage: required && controlId ? `${controlId}-error` : undefined,
	};
}
