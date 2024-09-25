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
			keyboard: {
				enabled: true,
				onlyInViewport: true,
			},
			// pagination: {
			// 	el: ".banner-pagination",
			// 	clickable: true,
			// },
			navigation: {
				nextEl: ".banner-button-next",
				prevEl: ".banner-button-prev",
			},
		})
	})
}