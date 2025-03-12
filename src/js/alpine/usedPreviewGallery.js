// usedPreviewGallery.js
import Alpine from 'alpinejs';

export function usedPreviewGallery() {
	Alpine.data("usedPreviewGallery", () => ({
		activeIndex: 0,
		total: 0,
		init() {
			if (this.$refs.wrapper) {
				this.total = this.$refs.wrapper.children.length;
			}
		},
		get activeSlide() {
			return Array.from(this.$refs.wrapper.children).find(e => e.dataset.slide == this.activeIndex);
		},
		get windowWidth() {
			return window.innerWidth || document.documentElement.clientWidth;
		},
		onPrevClick() {
			this.showSlideAt(this.activeIndex === 0 ? this.total - 1 : this.activeIndex - 1);
		},
		onNextClick() {
			const nextIndex = this.activeIndex + 1;
			this.showSlideAt(nextIndex === this.total ? 0 : nextIndex);
		},
		showSlideAt(e) {
			if (e === this.activeIndex) return;
			const initialRect = this.activeSlide.getBoundingClientRect();
			this.activeIndex = e;
			const newRect = this.activeSlide.getBoundingClientRect();
			this.$refs.wrapper.scrollTo({
				left: newRect.x - initialRect.x + this.$refs.wrapper.scrollLeft,
				behavior: "instant"
			});
		}
	}));
}