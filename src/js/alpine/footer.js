// footer.js
import Alpine from 'alpinejs';

export function footer() {
	Alpine.data('footer', () => ({
		showDisclaimer: true,
		onClick() {
			this.showDisclaimer = !this.showDisclaimer;
			this.$nextTick(() => {
				window.scrollTo({
					top: document.body.scrollHeight,
					behavior: 'smooth'
				});
			});
		}
	}));
}