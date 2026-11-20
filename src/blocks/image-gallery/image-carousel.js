import Swiper from 'swiper';
import { Autoplay } from 'swiper/modules';
import { carouselBuffer } from './carousel-buffer.js';

document.querySelectorAll('[data-image-carousel]').forEach((root) => {
	const element = root.querySelector('.photo-slider');
	if (!element || element.dataset.carouselBound) return;
	element.dataset.carouselBound = 'true';
	const wrapper = element.querySelector('.swiper-wrapper');
	const originals = Array.from(wrapper.children);
	originals.forEach((slide, index) => {
		slide.dataset.carouselSource = String(index);
	});
	let slider = element.swiper,
		signature = '',
		frame;
	const clone = (source) => {
		const copy = source.cloneNode(true);
		copy.classList.remove('glightbox');
		for (const name of [
			'data-gallery',
			'data-gallery-image',
			'data-title',
			'data-description',
			'data-swiper-slide-index',
		])
			copy.removeAttribute(name);
		copy.dataset.carouselClone = 'true';
		copy.setAttribute('aria-hidden', 'true');
		copy.tabIndex = -1;
		return copy;
	};
	const rebuild = () => {
		if (!element.isConnected || !element.clientWidth) return;
		const gap = window.innerWidth >= 640 ? 10 : 5;
		const coverage = Math.max(element.clientWidth, window.innerWidth);
		const height = element.clientHeight || 200;
		const widths = originals.map((slide) => {
			const image = slide.querySelector('img');
			return image.naturalWidth && image.naturalHeight
				? (height * image.naturalWidth) / image.naturalHeight
				: (height * 4) / 3;
		});
		const next = [
			element.clientWidth,
			element.clientHeight,
			coverage,
			gap,
			...widths.map((w) => Math.round(w * 10)),
		].join(':');
		if (next === signature) return;
		signature = next;
		const active = Number(
			slider?.slides[slider.activeIndex]?.dataset.carouselSource || 0
		);
		const focused = document.activeElement;
		slider?.destroy(true, true);
		wrapper.replaceChildren(...originals);
		originals.forEach((source, index) => {
			source.style.width = `${widths[index]}px`;
		});
		const plan = carouselBuffer(widths, coverage, gap);
		const fragment = document.createDocumentFragment();
		plan.before.forEach((index) =>
			fragment.append(clone(originals[index]))
		);
		originals.forEach((source) => fragment.append(source));
		plan.after.forEach((index) => fragment.append(clone(originals[index])));
		wrapper.replaceChildren(fragment);
		slider = new Swiper(element, {
			modules: [Autoplay],
			loop: false,
			initialSlide: plan.before.length + active,
			centeredSlides: true,
			slidesPerView: 'auto',
			spaceBetween: gap,
			speed: 100,
			resizeObserver: false,
			updateOnWindowResize: false,
			autoplay: {
				disableOnInteraction: false,
				waitForTransition: false,
				delay: 5000,
			},
		});
		let rebasing = false;
		slider.on('transitionEnd', (current) => {
			if (rebasing) return;
			const slide = current.slides[current.activeIndex];
			if (!slide?.hasAttribute('data-carousel-clone')) return;
			rebasing = true;
			current.slideTo(
				plan.before.length + Number(slide.dataset.carouselSource),
				0,
				false,
				true
			);
			rebasing = false;
		});
		if (originals.includes(focused)) focused.focus({ preventScroll: true });
	};
	const schedule = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(rebuild);
	};
	originals.forEach((slide) =>
		slide.querySelectorAll('img').forEach((image) => {
			if (!image.complete)
				image.addEventListener('load', schedule, { once: true });
		})
	);
	root.addEventListener('click', (event) => {
		const copy =
			event.target instanceof Element
				? event.target.closest('[data-carousel-clone]')
				: null;
		if (
			!copy ||
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		)
			return;
		event.preventDefault();
		const original = originals[Number(copy.dataset.carouselSource)];
		original?.focus({ preventScroll: true });
		original?.click();
	});
	root.addEventListener('focusin', (event) => {
		const index = originals.indexOf(event.target);
		if (index < 0 || !slider) return;
		slider.slideTo(slider.slides.indexOf(originals[index]), 0);
	});
	new ResizeObserver(schedule).observe(element);
	window.addEventListener('resize', schedule, { passive: true });
	rebuild();
});
// Only original links join GLightbox; visible copies open their original photo.
