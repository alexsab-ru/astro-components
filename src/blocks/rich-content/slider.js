import Swiper from "swiper";
import { Navigation, Pagination, Keyboard } from "swiper/modules";
import { alignImageControls } from './image-controls';

const sliders = document.querySelectorAll(".rich-content-images-slider");
if(sliders.length){
	Array.from(sliders).map(slider => {
		const swiper = new Swiper(slider, {
			modules: [Navigation, Pagination, Keyboard],
			loop: false,
			speed: 1000,
			spaceBetween: 20,
			keyboard: {
				enabled: true,
				onlyInViewport: true,
			},
			navigation: {
				nextEl: slider.querySelector('.simple-slider-button-next'),
				prevEl: slider.querySelector('.simple-slider-button-prev'),
			},
			pagination: {
				el: slider.querySelector('.simple-slider-pagination'),
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
		});
		alignImageControls(slider, swiper);
	})
}
