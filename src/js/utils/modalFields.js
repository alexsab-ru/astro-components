const initialValues = new WeakMap();
const initialHeadings = new WeakMap();

/** Keep a custom dialog's own heading when the next trigger omits metadata. */
export function syncModalHeadings(modal, metadata = {}) {
	const title = modal.querySelector('.title');
	const subtitle = modal.querySelector('.subtitle');
	if (!initialHeadings.has(modal)) {
		initialHeadings.set(modal, {
			title: title?.innerHTML || 'Обратная связь',
			subtitle:
				subtitle?.innerHTML ||
				'Оставьте свои данные и мы свяжемся с Вами в ближайшее время!',
		});
	}
	const defaults = initialHeadings.get(modal);
	if (title) title.innerHTML = metadata.title || defaults.title;
	if (subtitle) subtitle.innerHTML = metadata.subtitle || defaults.subtitle;
}

/** Restore absent trigger metadata instead of reusing a previous card's values. */
export function syncModalFields(modal, metadata = {}) {
	const form = modal.querySelector('input[name="form"]');
	const comment = modal.querySelector('input[name="comment"]');
	if (!initialValues.has(modal)) {
		// Hidden .value writes can also change defaultValue, so DOM attributes are
		// not a reliable place to recover the original values after the first open.
		initialValues.set(modal, {
			form: form?.value || '',
			comment: comment?.value || '',
		});
	}
	const defaults = initialValues.get(modal);
	if (form) form.value = metadata.form_name ?? defaults.form;
	if (comment) comment.value = metadata.comment ?? defaults.comment;
}
