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
				nextEl: ".banner-button-next",
				prevEl: ".banner-button-prev",
			},
			// pagination: {
			// 	el: '.banner-pagination',
			// 	type: 'bullets',
			// 	clickable: true,
			// },
			breakpoints: {
				// when window width is >= 320px
				320: {
				  slidesPerView: 1,
				},
				640: {
				  slidesPerView: 2,
				},
				1024: {
				  slidesPerView: 3,				  
				}
			 }
		})
	})
}