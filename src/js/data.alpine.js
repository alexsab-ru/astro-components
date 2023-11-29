import Alpine from "alpinejs";

document.addEventListener("alpine:init", () => {
	Alpine.data("header", () => ({
		open: false,
		scrolling: false,
        init() {
			if(document.body.getBoundingClientRect().top != 0){
				this.scrolling = true
			}
			document.addEventListener("scroll", (e) => {
				if(document.body.getBoundingClientRect().top != 0){
					this.scrolling = true
				}else{
					this.scrolling = false
				}
				this.open = false
			});
		},
	}));
	Alpine.data("scrollTop", (t) => ({
		scrolled: !1,
		init() {
			(this.scrolled =
				document.documentElement.scrollTop > window.innerHeight / 1),
				document.addEventListener("scroll", (e) => this.onScroll(e));
		},
		onScroll(e) {
			this.scrolled = document.documentElement.scrollTop > window.innerHeight / 1;
		},
		onClick() {
			document.documentElement.scroll({
				top: 0,
				behavior: "smooth",
			});
		},
	}));
});

// window.Alpine = Alpine;
// Alpine.start();