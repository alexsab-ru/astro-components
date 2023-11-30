import Alpine from 'alpinejs';

document.addEventListener('alpine:init', () => {
	Alpine.data('header', () => ({
		open: false,
		scrolling: false,
		init() {
			const $siteHeader = this.$root;
			let hideHeaderPos = $siteHeader.querySelector('header').offsetHeight;
			let prevScrollpos = window.scrollY;

			if (document.body.getBoundingClientRect().top != 0) {
				this.scrolling = true;
				$siteHeader.style.top = -hideHeaderPos + 'px';
			}

			window.addEventListener('resize', () => {
				this.open = false;
				hideHeaderPos = $siteHeader.querySelector('header').clientHeight;
			});

			document.addEventListener('scroll', (e) => {
				if (document.body.getBoundingClientRect().top != 0) {
					this.scrolling = true;
				} else {
					this.scrolling = false;
				}
				this.open = false;

				// Показ/скрытие шапки при скролинге
				let currentScrollPos = window.scrollY;
				if (currentScrollPos > hideHeaderPos) {
					if (prevScrollpos > currentScrollPos) {
						$siteHeader.style.top = 0;
					} else {
						$siteHeader.style.top = -hideHeaderPos + 'px';
					}
					prevScrollpos = currentScrollPos;
				} else {
					$siteHeader.style.top = 0;
				}
				// // //
			});
		},
	}));
	Alpine.data('scrollTop', (t) => ({
		scrolled: !1,
		init() {
			(this.scrolled =
				document.documentElement.scrollTop > window.innerHeight / 1),
				document.addEventListener('scroll', (e) => this.onScroll(e));
		},
		onScroll(e) {
			this.scrolled = document.documentElement.scrollTop > window.innerHeight / 1;
		},
		onClick() {
			document.documentElement.scroll({
				top: 0,
				behavior: 'smooth',
			});
		},
	}));
	Alpine.data('footer', (t) => ({
		showDisclaimer: true,
		onClick(e) {
			this.showDisclaimer = !this.showDisclaimer;
			this.$nextTick(() => {
				window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
			});
		}
	}));
});

// window.Alpine = Alpine;
// Alpine.start();
