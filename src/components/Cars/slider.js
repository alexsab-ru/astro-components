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
});

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