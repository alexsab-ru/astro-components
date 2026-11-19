import Swiper from 'swiper';
import { Autoplay } from 'swiper/modules';

const sliders = document.querySelectorAll('.photo-slider');
sliders.forEach((element) => {
	if (element.swiper) return;
	new Swiper(element, {
		modules: [Autoplay],
		loop: element.querySelectorAll('.swiper-slide').length > 1,
		centeredSlides: true,
		slidesPerView: 'auto',
		speed: 100,
		autoplay: {
			disableOnInteraction: false,
			waitForTransition: false,
			delay: 5000,
		},
		breakpoints: {
			320: { spaceBetween: 5 },
			640: { spaceBetween: 10 },
			1280: { spaceBetween: 10 },
		},
	});
});
// GLightbox belongs to the site's shared bootstrap (and the guide preview shell).
