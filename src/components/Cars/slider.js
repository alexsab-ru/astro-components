import Swiper from "swiper";
import { Navigation, Thumbs, Keyboard } from "swiper/modules";
import "swiper/css/bundle";

const refreshSliderLayout = (slider) => {
	slider.updateSlides();
	slider.updateProgress();
	slider.updateSlidesClasses();
	slider.updateSize();
	slider.update();
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
			let observer = null;

			const shrinkSlide = (slide) => {
				slide.classList.remove('min-w-[200px]');
				slide.classList.add('min-w-[73px]', '!w-fit');
				refreshSliderLayout(slider);
			};

			const processQueue = () => {
				if (isLoading || !loadQueue.length) return;
				const nextIndex = loadQueue.shift();
				const item = images[nextIndex];
				if (!item || item.loaded) {
					processQueue();
					return;
				}

				isLoading = true;
				item.loading = true;
				const img = item.img;

				const handleLoaded = () => {
					img.removeEventListener('load', handleLoaded);
					item.loading = false;
					item.loaded = true;
					isLoading = false;

					shrinkSlide(item.slide);
					loadedCount += 1;

					if (observer) {
						observer.unobserve(item.slide);
					}

					if (!allShrunk && loadedCount >= shrinkAllAfter) {
						allShrunk = true;
						updateSlideClasses(slider); // сжать все слайды
					}

					processQueue();
				};

				img.addEventListener('load', handleLoaded);
				img.src = img.dataset.src;

				if (img.complete && img.naturalWidth > 0) {
					handleLoaded();
				}
			};

			const enqueueLoad = (index) => {
				if (index < 0 || index >= images.length) return;
				const item = images[index];
				if (!item || item.loaded || item.loading) return;
				if (!loadQueue.includes(index)) loadQueue.push(index);
				processQueue();
			};

			// грузим первые слайды по одному
			for (let i = 0; i < shrinkAllAfter; i += 1) {
				enqueueLoad(i);
			}

			// при смене активного добавляем его в очередь
			slider.on('slideChange', () => {
				enqueueLoad(slider.activeIndex);
			});

			// грузим слайды при появлении в зоне видимости по одному
			observer = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const slideEl = entry.target;
						const item = images.find((it) => it.slide === slideEl);
						if (item) enqueueLoad(item.index);
					}
				});
			}, { root: slider.el, threshold: 0.01 });

			images.forEach(({ slide }) => observer.observe(slide));
		},
	},
});

// Функция для обновления классов слайдов
function updateSlideClasses(slider) {
    slider.slides.forEach((slide) => {
        slide.classList.remove('min-w-[200px]');
        slide.classList.add('min-w-[73px]', '!w-fit');
    });
	refreshSliderLayout(slider);
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
	}
})
