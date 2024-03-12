import Swiper from "swiper";
import { Navigation, Thumbs, Keyboard } from "swiper/modules";

const carThumbSlider = new Swiper('.car-thumb-slider', {
	spaceBetween: 10,
	slidesPerView: 4.5,
	slideToClickedSlide: true,
	watchSlidesProgress: true,
	centeredSlides: true,
	loop: true
});

const carImageSlider = new Swiper('.car-image-slider', {
	modules: [Navigation, Thumbs, Keyboard],
	spaceBetween: 20,
	loop: true,
	keyboard: {
		enabled: true,
		onlyInViewport: true,
	},
	centeredSlides: true,
	loopAdditionalSlides: 5,
	navigation: {
		nextEl: ".car-image-slider-next",
		prevEl: ".car-image-slider-prev",
	},
	breakpoints: {
		320: {
		  slidesPerView: 1.08,
		  spaceBetween: 5,
		  centeredSlides: false,
		  navigation: false
		},
		640: {
		  slidesPerView: 1,
		  spaceBetween: 20,
		  centeredSlides: true,
		}
	},
	thumbs: {
		swiper: carThumbSlider,
	}
})
