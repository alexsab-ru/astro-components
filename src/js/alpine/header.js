// header.js
import Alpine from 'alpinejs';

export function headerComponent() {
	Alpine.data('header', () => ({
		open: false,
		scrolling: false,
		showTopLine: localStorage.getItem('show-top-line') || 1,
		hideTopLine() {
			localStorage.setItem('show-top-line', 0);
			this.showTopLine = 0;
		},
		init() {
			this.$nextTick(() => {
				const $siteHeader = this.$root;
				let hideHeaderPos = $siteHeader.querySelector('header').offsetHeight;
				let prevScrollpos = window.scrollY;

				if (document.body.getBoundingClientRect().top !== 0) {
					this.scrolling = true;
					$siteHeader.style.top = -hideHeaderPos + 'px';
				}

				window.addEventListener('resize', () => {
					this.open = false;
					hideHeaderPos = $siteHeader.querySelector('header').clientHeight;
				});

				document.addEventListener('scroll', () => {
					this.scrolling = document.body.getBoundingClientRect().top !== 0;
					this.open = false;
					const currentScrollPos = window.scrollY;
					if (currentScrollPos > hideHeaderPos) {
						$siteHeader.style.top = prevScrollpos > currentScrollPos ? '0' : -hideHeaderPos + 'px';
						prevScrollpos = currentScrollPos;
					} else {
						$siteHeader.style.top = '0';
					}
				});
			});
		},
	}));
}