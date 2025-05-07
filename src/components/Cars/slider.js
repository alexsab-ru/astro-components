import Swiper from "swiper";
import { Navigation, Thumbs, Keyboard, FreeMode } from "swiper/modules";
import "swiper/css/bundle";
import LazyLoader from '@/js/modules/LazyLoader';

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
				
				// Создаем массив промисов для отслеживания загрузки изображений
				const imageLoadPromises = images.map(img => {					
					return new Promise(resolve => {						
						img.src = img.dataset.src;
						if (img.complete) {
							// Если изображение уже загружено
							resolve();
						} else {
							// Если изображение еще не загружено, добавляем обработчик
							img.onload = () => resolve();
						}
					});
				});
	
				// Ждем загрузки всех изображений
				Promise.all(imageLoadPromises)
					.then(() => {
						console.log('Все изображения загружены');
						updateSlideClasses(slider, images.length-1);
					})
					.then(() => new LazyLoader());
			}
		},
	},
});

// Функция для обновления классов слайдов
function updateSlideClasses(slider, length) {
    slider.slides.forEach((slide, idx) => {
        slide.classList.add('min-w-[73px]');
        slide.classList.remove('min-w-[200px]');
		if(idx > length) {
			slide.classList.add('lazy');
		}
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
	},
	// on: {
	// 	init: function (slider) {
	// 		new LazyLoader('.lazy-image-slider', {threshold: 0.1})
	// 	}
	// }
})