import Swiper from "swiper";
import { Navigation, Thumbs, Keyboard, FreeMode } from "swiper/modules";

const carThumbSlider = new Swiper('.car-thumb-slider', {
	modules: [FreeMode],
	spaceBetween: 10, 
	slidesPerView: 'auto',
	slideToClickedSlide: true,
	watchSlidesProgress: true,
});

const carImageSlider = new Swiper('.car-image-slider', {
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