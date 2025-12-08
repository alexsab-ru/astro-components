import Swiper from "swiper";
import { Navigation, Thumbs, Keyboard } from "swiper/modules";
import "swiper/css/bundle";

const DEBUG_THUMBS = false;
const dbg = (...args) => {
	if (DEBUG_THUMBS) {
		console.log('[thumbs]', ...args);
	}
};

const refreshSliderLayout = (slider) => {
	slider.updateSlides();
	slider.updateProgress();
	slider.updateSlidesClasses();
	slider.updateSize();
	slider.update();
};

const applyThumbSize = (slide) => {
	slide.classList.remove('min-w-[200px]');
	slide.classList.add('min-w-[73px]', '!w-fit');
};

const syncThumbFromMain = (activeIndex) => {
	const helpers = carThumbSlider?.__thumbHelpers;
	if (!helpers) return;
	helpers.enqueueLoad(activeIndex);
	helpers.enqueueVisibleSlides();
	helpers.ensureInView(activeIndex);
};

const ensureSlideInView = (slider, index) => {
	const slide = slider.slides[index];
	if (!slide) return;
	const sliderRect = slider.el.getBoundingClientRect();
	const slideRect = slide.getBoundingClientRect();
	const hiddenLeft = slideRect.left < sliderRect.left;
	const hiddenRight = slideRect.right > sliderRect.right;
	if (hiddenLeft || hiddenRight) {
		dbg('ensureSlideInView slideTo', index, { hiddenLeft, hiddenRight, slideRect, sliderRect });
		slider.slideTo(index);
	}
};

const carThumbSlider = new Swiper('.car-thumb-slider', {
	rewind: true,
	modules: [],
	freeMode: false,
	spaceBetween: 10, 
	slidesPerView: 'auto',
	slidesPerGroup: 1,
	slideToClickedSlide: true,
	watchSlidesProgress: true,
	on: {
		init: function (slider) {
			if (!slider.slides.length) return;
			const SHRINK_ALL_AFTER = 4; // поменяй на 4, если нужно дождаться четырех
			dbg('init', { slides: slider.slides.length, SHRINK_ALL_AFTER });

			const images = Array.from(slider.slides)
				.map((slide, index) => ({
					slide,
					img: slide.querySelector('img'),
					loaded: false,
					loading: false,
					index,
				}))
				.filter((item) => item.img && item.img.dataset.src);

			if (!images.length) return;

			const shrinkAllAfter = Math.min(SHRINK_ALL_AFTER, images.length);
			let loadedCount = 0;
			let allShrunk = false;

			const loadQueue = [];
			let isLoading = false;
			let lastActive = slider.activeIndex ?? 0;
			const FAILSAFE_TIMEOUT = 5000;

			const shrinkSlide = (slide) => {
				applyThumbSize(slide);
				refreshSliderLayout(slider);
			};

			const enqueueLoad = (index) => {
				if (index < 0 || index >= images.length) return;
				const item = images[index];
				if (!item || item.loaded || item.loading) return;
				if (!loadQueue.includes(index)) loadQueue.push(index);
				dbg('enqueueLoad', { index, queue: [...loadQueue] });
				processQueue();
			};

			const enqueueVisibleSlides = () => {
				const sliderRect = slider.el.getBoundingClientRect();
				images.forEach((item) => {
					if (item.loaded || item.loading) return;
					const rect = item.slide.getBoundingClientRect();
					const isVisible = rect.right > sliderRect.left && rect.left < sliderRect.right;
					if (isVisible) {
						dbg('visible -> enqueue', { index: item.index, rect, sliderRect });
						enqueueLoad(item.index);
					}
				});
			};

			const processQueue = () => {
				if (isLoading || !loadQueue.length) return;
				const nextIndex = loadQueue.shift();
				const item = images[nextIndex];
				if (!item || item.loaded) {
					processQueue();
					return;
				}
				dbg('processQueue start', { index: nextIndex, queue: [...loadQueue] });

				isLoading = true;
				item.loading = true;
				const img = item.img;

				const cleanup = (handlers) => {
					img.removeEventListener('load', handlers.onLoad);
					img.removeEventListener('error', handlers.onFail);
					img.removeEventListener('abort', handlers.onFail);
					clearTimeout(handlers.timeoutId);
				};

				const settle = (status) => {
					if (!isLoading) return;
					isLoading = false;
					item.loading = false;
					if (status === 'loaded') {
						item.loaded = true;
						shrinkSlide(item.slide);
						loadedCount += 1;
						dbg('loaded', { index: item.index, loadedCount, shrinkAllAfter, allShrunk });
					} else {
						dbg('failed', { index: item.index, status });
					}

					if (!allShrunk && loadedCount >= shrinkAllAfter) {
						allShrunk = true;
						dbg('mass shrink all slides');
						updateSlideClasses(slider); // сжать все слайды
						enqueueVisibleSlides();
					}

					processQueue();
				};

				const handlers = {
					onLoad: () => {
						cleanup(handlers);
						settle('loaded');
					},
					onFail: (event) => {
						cleanup(handlers);
						settle(event?.type || 'failed');
					},
					timeoutId: setTimeout(() => {
						cleanup(handlers);
						settle('timeout');
					}, FAILSAFE_TIMEOUT),
				};

				img.addEventListener('load', handlers.onLoad);
				img.addEventListener('error', handlers.onFail);
				img.addEventListener('abort', handlers.onFail);

				img.src = img.dataset.src;

				if (img.complete && img.naturalWidth > 0) {
					handlers.onLoad();
				}
			};

			// грузим первые слайды по одному
			for (let i = 0; i < shrinkAllAfter; i += 1) {
				enqueueLoad(i);
			}
			enqueueVisibleSlides();

			// делаем методы доступными снаружи (для основного слайдера)
			slider.__thumbHelpers = {
				enqueueLoad,
				enqueueVisibleSlides,
				ensureInView: (index) => ensureSlideInView(slider, index),
			};

			// при смене активного добавляем его в очередь
			slider.on('slideChange', () => {
				const prev = lastActive;
				const next = slider.activeIndex;
				const direction = next > prev ? 'forward' : next < prev ? 'backward' : 'stay';
				lastActive = next;
				dbg('slideChange', { active: next, previous: prev, direction });
				enqueueLoad(slider.activeIndex);
				enqueueVisibleSlides();
				ensureSlideInView(slider, slider.activeIndex);
			});
			slider.on('slideChangeTransitionEnd', () => {
				dbg('slideChangeTransitionEnd', { active: slider.activeIndex });
				enqueueVisibleSlides();
			});
			slider.on('resize', enqueueVisibleSlides);
			slider.on('update', enqueueVisibleSlides);
		},
	},
});

// Функция для обновления классов слайдов
function updateSlideClasses(slider) {
    slider.slides.forEach((slide) => {
        applyThumbSize(slide);
    });
	refreshSliderLayout(slider);
	ensureSlideInView(slider, slider.activeIndex);
}

const carImageSlider = new Swiper('.car-image-slider', {
	rewind: true,
	modules: [Navigation, Keyboard, Thumbs],
	spaceBetween: 10,
	keyboard: {
		enabled: true,
		onlyInViewport: true,
	},
	navigation: {
		nextEl: ".car-image-slider-next",
		prevEl: ".car-image-slider-prev",
	},
	breakpoints: {
		320: {
			slidesPerView: 'auto',
			spaceBetween: 5,
		},
		640: {
			slidesPerView: 1,
			spaceBetween: 10,
		}
	},
	thumbs: {
		swiper: carThumbSlider,
	},
	on: {
		init(swiper) {
			syncThumbFromMain(swiper.activeIndex);
		},
		slideChange(swiper) {
			syncThumbFromMain(swiper.activeIndex);
		},
		slideChangeTransitionEnd(swiper) {
			syncThumbFromMain(swiper.activeIndex);
		},
	},
});
