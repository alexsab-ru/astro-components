// footer.js
import Alpine from 'alpinejs';

export function footer() {
	Alpine.data('footer', () => ({
		showDisclaimer: true,
		onClick(el) {
			const parent = el.srcElement.parentElement;
			this.showDisclaimer = !this.showDisclaimer;
			this.$nextTick(() => {
				if(parent){
					const siteNav = document.getElementById('site_nav');
					const topOffset = siteNav ? siteNav.offsetHeight : 0;
					const elementPosition = parent.getBoundingClientRect().top;
					const offsetPosition = elementPosition - topOffset;	
					window.scrollBy({
						top: offsetPosition,
						behavior: 'smooth',
					});
				}
			});
		}
	}));
}