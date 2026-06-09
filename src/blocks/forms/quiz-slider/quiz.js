import Swiper from "swiper";
import { Parallax } from "swiper/modules";

const checked = (element) => element.checked;

const quizSlider = new Swiper(".quiz-slider", {
	modules: [Parallax],
	speed: 1400,
	loop: false,
	allowTouchMove: false,
	autoHeight: true,
	simulateTouch: false,
	on: {
		init(slider){
			setTimeout(() => {
				slider.el.style.opacity = 1;
				document.querySelector('.spinner').style.display = 'none';
			}, 500);
		},
		afterInit(slider){
			slider.slides.map((slide, idx) => {
				slide.querySelector('.quiz-step')
				? slide.querySelector('.quiz-step').innerHTML = `${idx}/${slider.slides.length - 2}`
				: null;

				const inputs = [...slide.querySelectorAll('input')];
				const prevBtn = slide.querySelector('.slide-prev');
				const nextBtn = slide.querySelector('.slide-next');
				if(inputs.length){
					inputs.forEach(input => {
						input.addEventListener('change', e => {
							if(nextBtn){
								inputs.some(checked) ? nextBtn.disabled = false : nextBtn.disabled = true;
							}
							if(input.type === 'radio'){
								slider.slideNext();
							}
						});
					});
				}
				if(nextBtn){
					nextBtn.addEventListener('click', (e) => {
						if(nextBtn.disabled || !inputs.some(checked)) return;
						slider.slideNext();
					})
				}
				if(prevBtn){
					prevBtn.addEventListener('click', (e) => {
						slider.slidePrev();
					})
				}

			})
		},
		slideNextTransitionStart(slider){
			// console.log('NEXT');
		}
	}
});

const startBtn = document.querySelector('.start-quiz')
if(startBtn){
	startBtn.addEventListener('click', () => quizSlider.slideNext())
}