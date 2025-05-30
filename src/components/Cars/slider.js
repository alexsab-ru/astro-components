import Swiper from "swiper";
import { Navigation, Thumbs, Keyboard, FreeMode } from "swiper/modules";
import "swiper/css/bundle";

const carThumbSlider = new Swiper('.car-thumb-slider', {
	rewind: true,
	modules: [FreeMode],
	freeMode: true,
	spaceBetween: 10, 
	slidesPerView: 'auto',
	slideToClickedSlide: true,
	watchSlidesProgress: true,
	on: {
		init: function (slider) {
			if (slider.slides.length) {
				// Отслеживаем загрузку первых трех изображений
				const firstThreeSlides = Array.from(slider.slides).slice(0, 3);
				const images = firstThreeSlides.map(slide => slide.querySelector('img'));
				let loadedCount = 0;
	
				images.forEach(img => {
					if (img.complete) {
						// Если изображение уже загружено
						loadedCount++;
					} else {
						// Если изображение еще не загружено, добавляем обработчик
						img.onload = () => {
							loadedCount++;
							if (loadedCount === 3) {
								updateSlideClasses(slider);
							}
						};
					}
				});
	
				// Если все три изображения уже загружены
				if (loadedCount === 3) {
					updateSlideClasses(slider);
				}
			}
		},
	},
});

// Функция для обновления классов слайдов
function updateSlideClasses(slider) {
    slider.slides.forEach(slide => {
        slide.classList.remove('min-w-[200px]');
        slide.classList.add('min-w-[73px]', '!w-fit');
    });
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