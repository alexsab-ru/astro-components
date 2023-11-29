let prevScrollpos = window.scrollY;
let $header = document.querySelector("header");
let $nav = document.getElementById('site_nav');
let hideHeaderPos = $header.offsetHeight;
let hideNavPos = $nav ? $nav.offsetHeight : 0;
let ww = window.innerWidth;

$nav.style.top = hideHeaderPos + "px";

window.addEventListener("resize", () => {
	hideHeaderPos = $header.clientHeight;
	ww = window.innerWidth;
});

document.querySelectorAll('a[href^="#"]:not(.popup-link)').forEach((link) => {
	link.addEventListener("click", function (e) {
		e.preventDefault();

		let href = this.getAttribute("href").substring(1);

		const scrollTarget = document.getElementById(href);

		if(scrollTarget){
			const topOffset = $nav ? $nav.offsetHeight : $header.offsetHeight;
			// const topOffset = 0; // если не нужен отступ сверху
			const elementPosition = scrollTarget.getBoundingClientRect().top;
			const offsetPosition = elementPosition - topOffset;

			window.scrollBy({
				top: offsetPosition,
				behavior: "smooth",
			});
		}
	});
});

window.addEventListener("scroll", () => {
	var currentScrollPos = window.scrollY;
	if (currentScrollPos > hideHeaderPos) {
		if (prevScrollpos > currentScrollPos) {
			$header.style.top = 0;
			$nav.style.top = hideHeaderPos + "px";
		} else {
			$header.style.top = -hideHeaderPos + "px";
            $nav.style.top = 0;
		}
		prevScrollpos = currentScrollPos;
	} else {
		$header.style.top = 0;
        $nav.style.top = hideHeaderPos + "px";
	}
});

window.addEventListener('scroll', () => {
	let scrollDistance = window.scrollY;
	document.querySelectorAll('.section').forEach((el, i) => {
		if (el.offsetTop - $nav.offsetHeight * 2.5 <= scrollDistance) {
			document.querySelectorAll('.scroll-link').forEach((elem) => {
				if (elem.classList.contains('bg-accent-500/50')) {
					elem.classList.remove('bg-accent-500/50');
				}
			});

			document.querySelectorAll('.scroll-link')[i].classList.add('bg-accent-500/50');
		}
		if(scrollDistance < 700){
			document.querySelectorAll('.scroll-link').forEach((elem) => {
				elem.classList.remove('bg-accent-500/50');
			});
		}
	});
})
