let $nav = document.getElementById('site_nav');

const hashURL = window.location.hash.substring(1);
window.location.hash = '';

if (hashURL) {
	window.scrollTo(0, 0);
	setTimeout(() => {
		window.scrollTo(0, 0);
	}, 1);
	setTimeout(() => {
		scroll(hashURL);
	}, 300);
	window.location.hash = hashURL;
}

document.querySelectorAll('a[href^="#"]:not(.popup-link)').forEach((link) => {
	link.addEventListener('click', function (e) {
		e.preventDefault();
		let hash = this.getAttribute('href').substring(1);
		scroll(hash);
	});
});

export function scroll(hash) {
	const scrollTarget = document.getElementById(hash);
	if (scrollTarget) {
		const topOffset = $nav ? $nav.offsetHeight : 0;
		// const topOffset = 0; // если не нужен отступ сверху
		const elementPosition = scrollTarget.getBoundingClientRect().top;
		const offsetPosition = elementPosition - topOffset;
		window.scrollBy({
			top: offsetPosition,
			behavior: 'smooth',
		});
	}
}
const navOffset = $nav ? $nav.offsetHeight * 2.5 : 0;
const sections = document.querySelectorAll('.section');
const scrollLinks = document.querySelectorAll('.scroll-link');
if(sections.length && scrollLinks.length){
	window.addEventListener('scroll', () => {
		let scrollDistance = window.scrollY;
		sections.forEach((el, i) => {
			if (el.offsetTop - navOffset <= scrollDistance) {
				scrollLinks.forEach((elem) => {
					if (elem.classList.contains('active')) {
						elem.classList.remove('active');
					}
				});
	
				scrollLinks[i].classList.add('active');
			}
			if (scrollDistance < sections[0].offsetTop - navOffset) {
				scrollLinks.forEach((elem) => {
					elem.classList.remove('active');
				});
			}
		});
	});
}
