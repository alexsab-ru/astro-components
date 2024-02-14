import Swiper from "swiper";
import { Navigation, Pagination, Autoplay, Parallax, Keyboard } from "swiper/modules";

import "swiper/css/bundle";

const progressCircle = document.querySelector(".autoplay-progress svg");
const progressContent = document.querySelector(".autoplay-progress span");
let bannerSlider;
let loop = false;
let autoplay = {
	enabled: false,
	disableOnInteraction: false,
};
let videoPrev = null;
let videoActive = null;

if (progressCircle) {
	progressCircle.closest(".autoplay-progress").style.display = "none";
}

const slides = document.querySelectorAll(".banner-slide");

const initSlider = () => {
	bannerSlider = new Swiper(".banner-slider", {
		modules: [Navigation, Pagination, Autoplay, Parallax, Keyboard],
		loop,
		speed: 1000,
		keyboard: {
			enabled: true,
			onlyInViewport: true,
		},
		parallax: {
			enabled: true,
		},
		autoplay,
		pagination: {
			el: ".banner-pagination",
			clickable: true,
		},
		navigation: {
			nextEl: ".banner-button-next",
			prevEl: ".banner-button-prev",
		},
		on: {
			init(s) {
				if (slides.length > 1) {
					progressCircle.closest('.autoplay-progress').style.display = 'flex';
					if (this.slides[0].querySelector('video')) {
						videoPrev.play();
					}
				}
			},
			autoplayTimeLeft(s, time, progress) {
				progressCircle.style.setProperty("--progress", 1 - progress);
				progressContent.textContent = `${Math.ceil(time / 1000)}с.`;
			},
			slideChange(s) {
				const prevIdx = this.activeIndex - 1 < 0 ? 0 : this.activeIndex - 1;
				videoPrev = this.slides[prevIdx].querySelector("video");
				if (videoPrev) {
					videoPrev.pause();
				}
				videoActive = this.slides[this.activeIndex].querySelector("video");
				if (videoActive) {
					this.params.autoplay.delay = Math.ceil(videoActive.duration) * 1000;
				}
				progressCircle.closest(".autoplay-progress").style.display = "none";
			},
			slideChangeTransitionEnd(s) {
				if (videoPrev) {
					videoPrev.currentTime = 0;
				}
				if (videoActive) {
					videoActive.play();
				}
				progressCircle.closest(".autoplay-progress").style.display = "flex";
			},
		},
	});
};

if (slides.length > 1) {
	loop = true;
	autoplay.enabled = true;
	progressCircle.closest(".autoplay-progress").style.display = "flex";
}

initSlider();