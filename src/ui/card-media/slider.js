import Swiper from "swiper";
import { Navigation, Pagination } from "swiper/modules";

const modelGallerySliders = document.querySelectorAll('.model-gallery-slider');

if(modelGallerySliders.length){
    Array.from(modelGallerySliders).map(s => {
        // Если слайд один, кнопки и пагинация не выводятся в разметке.
        // Тогда слайдер инициализируем без навигации.
        const hasControls = s.querySelectorAll('.swiper-slide').length > 1;

        new Swiper(s, {
            modules: [Navigation, Pagination],
            loop: true,
            // Ищем элементы управления внутри текущего слайдера,
            // иначе несколько галерей на странице делят одни и те же кнопки.
            navigation: hasControls ? {
                nextEl: s.querySelector(".model-gallery-slider-button-next"),
                prevEl: s.querySelector(".model-gallery-slider-button-prev"),
            } : false,
            pagination: hasControls ? {
				el: s.querySelector('.simple-slider-pagination'),
				type: 'bullets',
				clickable: true,
			} : false,
        });
    })
}