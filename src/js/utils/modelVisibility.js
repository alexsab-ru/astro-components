export const isModelVisible = (model) => {
	// Visible if status is set and not explicitly hidden/disabled, or forced via `show`
	return (model?.status && model.status !== 'disable' && model.status !== 'hide') || model?.show;
};
