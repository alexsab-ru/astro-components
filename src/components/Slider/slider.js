import Swiper from "swiper";
import { Navigation, Pagination, Keyboard } from "swiper/modules";

import "swiper/css/bundle";
const sliders = document.querySelectorAll(".simple-slider");
if(sliders.length){
	Array.from(sliders).map(slider => {
		new Swiper(slider, {
			modules: [Navigation, Pagination, Keyboard],
			loop: false,
			speed: 1000,
			spaceBetween: 20,
			keyboard: {
				enabled: true,
				onlyInViewport: true,
			},
			navigation: {
				nextEl: ".simple-slider-button-next",
				prevEl: ".simple-slider-button-prev",
			},
			pagination: {
				el: '.simple-slider-pagination',
				type: 'bullets',
				clickable: true,
			},
			breakpoints: {
				// when window width is >= 320px
				320: {
				  slidesPerView: 1.2,
				  centeredSlides: true,
				  spaceBetween: 15,
				},
				640: {
				  slidesPerView: 2,
				  centeredSlides: false,
				  spaceBetween: 20,
				},
				1024: {
				  slidesPerView: 3,
				  centeredSlides: false,		  
				  spaceBetween: 20,
				}
			 }
		})
	})
}