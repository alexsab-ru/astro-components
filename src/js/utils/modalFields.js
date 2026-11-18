const initialValues = new WeakMap();

/** Restore absent trigger metadata instead of reusing a previous card's values. */
export function syncModalFields(modal, metadata = {}) {
	const form = modal.querySelector('input[name="form"]');
	const comment = modal.querySelector('input[name="comment"]');
	if (!initialValues.has(modal)) {
		// Hidden .value writes can also change defaultValue, so DOM attributes are
		// not a reliable place to recover the original values after the first open.
		initialValues.set(modal, { form: form?.value || '', comment: comment?.value || '' });
	}
	const defaults = initialValues.get(modal);
	if (form) form.value = metadata.form_name ?? defaults.form;
	if (comment) comment.value = metadata.comment ?? defaults.comment;
}
