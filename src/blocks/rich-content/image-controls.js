/** Position navigation against the fixed-aspect photo, not its caption below. */
export function updateImageControlPosition(slider) {
	const frame = slider.querySelector('.swiper-slide-active .aspect-video') || slider.querySelector('.aspect-video');
	if (!frame || frame.offsetHeight <= 0) return;
	slider.style.setProperty('--rich-images-control-top', `${frame.offsetHeight / 2}px`);
}

export function alignImageControls(slider, swiper) {
	const update = () => updateImageControlPosition(slider);
	const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
	for (const frame of slider.querySelectorAll('.aspect-video')) observer?.observe(frame);
	const events = ['resize', 'breakpoint', 'slideChange'];
	for (const event of events) swiper.on(event, update);
	let cleaned = false;
	const cleanup = () => {
		if (cleaned) return;
		cleaned = true;
		observer?.disconnect();
		for (const event of events) swiper.off(event, update);
		swiper.off('destroy', cleanup);
	};
	swiper.on('destroy', cleanup);
	update();
	return cleanup;
}
