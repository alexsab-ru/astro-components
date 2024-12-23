import Swiper from "swiper";
import { Navigation, Autoplay } from "swiper/modules";

import "swiper/css/bundle";

const stockSlider = new Swiper(".stock-slider", {
	modules: [Navigation, Autoplay],
	autoplay: {
		delay: 1000,
		disableOnInteraction: false,
		pauseOnMouseEnter: true,
		// waitForTransition: false,
	},
	navigation: {
		nextEl: ".stock-slider-next",
		prevEl: ".stock-slider-prev",
	},
	on: {
		slideChangeTransitionEnd(s){
			s.params.loop = true;
		}
	}
});
