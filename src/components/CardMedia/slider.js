import Swiper from "swiper";
import { Navigation, Pagination } from "swiper/modules";

const modelGallerySliders = document.querySelectorAll('.model-gallery-slider');

if(modelGallerySliders.length){
    Array.from(modelGallerySliders).map(s => {
        new Swiper(s, {
            modules: [Navigation, Pagination],
            loop: true,
            navigation: {
                nextEl: ".model-gallery-slider-button-next",
                prevEl: ".model-gallery-slider-button-prev",
            },
            pagination: {
				el: '.simple-slider-pagination',
				type: 'bullets',
				clickable: true,
			},
        });
    })
}