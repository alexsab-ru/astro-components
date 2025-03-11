// scrollTop.js
import Alpine from 'alpinejs';

export function scrollTop() {
	Alpine.data('scrollTop', () => ({
		scrolled: false,
		init() {
			this.scrolled = document.documentElement.scrollTop > window.innerHeight;
			document.addEventListener('scroll', () => this.onScroll());
		},
		onScroll() {
			this.scrolled = document.documentElement.scrollTop > window.innerHeight;
		},
		onClick() {
			document.documentElement.scroll({
				top: 0,
				behavior: 'smooth'
			});
		},
	}));
}