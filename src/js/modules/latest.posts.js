import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';

const postSliders = document.querySelectorAll('.latest-posts-slider');
if(postSliders.length){
	for(let i = 0; i < postSliders.length; i++) {
		const parent = postSliders[i].closest('section');
		const id = parent.getAttribute('id');
		const { loop, navigation, pagination } = parent.dataset;

		window['slider-' + i] = new Swiper(postSliders[i], {
			modules: [Navigation, Pagination],
			loop: Boolean(+loop),
			navigation: Boolean(+navigation) ? {
				nextEl: `.${id}-navigation-next`,
				prevEl: `.${id}-navigation-prev`,
			} : false,
			pagination: Boolean(+pagination) ? {
				el: `.${id}-pagination`,
				clickable: true,
			} : false,
			breakpoints: {
				320: {
					slidesPerView: 1,
					spaceBetween: 20,
				},
				640: {
					slidesPerView: 2,
					spaceBetween: 20,
				},
				1024: {
					slidesPerView: 3,
					spaceBetween: 30,
				},
			},
		});

	}
}
