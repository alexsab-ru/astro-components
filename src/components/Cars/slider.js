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

			const normalizeSrc = (src) => {
				try {
					return new URL(src, window.location.href).href;
				} catch (error) {
					return src;
				}
			};

			const images = Array.from(slider.slides)
				.map((slide) => ({
					slide,
					img: slide.querySelector('img'),
				}))
				.filter((item) => item.img);

			if (!images.length) return;

			const shrinkAllAfter = Math.min(SHRINK_ALL_AFTER, images.length);
			let loadedCount = 0;
			let allShrunk = false;

			const isRealImageLoaded = (img) => {
				const targetSrc = normalizeSrc(img.dataset.src || img.src);
				const currentSrc = normalizeSrc(img.currentSrc || img.src);
				return img.complete && img.naturalWidth > 0 && currentSrc === targetSrc;
			};

			const cleanup = () => {
				images.forEach(({ img }) => img.removeEventListener('load', handleLoad));
			};

			const shrinkSlide = (slide) => {
				slide.classList.remove('min-w-[200px]');
				slide.classList.add('min-w-[73px]', '!w-fit');
				refreshSliderLayout(slider);
			};

			const handleLoad = (event) => {
				const img = event.target;
				if (allShrunk || img.dataset.thumbRealLoaded || !isRealImageLoaded(img)) return;

				img.dataset.thumbRealLoaded = "true";
				const slideObj = images.find((item) => item.img === img);
				if (slideObj) shrinkSlide(slideObj.slide);

				loadedCount += 1; // считаем только реальные загрузки

				if (loadedCount >= shrinkAllAfter) {
					allShrunk = true;
					cleanup(); // после массового применения слушатели больше не нужны
					updateSlideClasses(slider); // сжать все слайды
				}
			};

			images.forEach(({ img }) => {
				img.addEventListener('load', handleLoad);
				// Обработаем случай, когда изображение уже загружено (например, из кэша)
				handleLoad({ target: img });
			});
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
