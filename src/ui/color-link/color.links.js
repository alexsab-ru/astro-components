document.querySelectorAll(".color-link").forEach(function (link) {
	link.addEventListener("click", function (e) {
		e.preventDefault();
		if (this.classList.contains("active")) return false;
		const parent = this.closest("section");
		const dir = parent.getAttribute("data-dir");
		const color = this.getAttribute("data-color");
		const colorName = this.getAttribute("title");
		const carImagePath = this.getAttribute("data-car-image") ? this.getAttribute("data-car-image") : `img/${dir}/${color}.png`
		let img = new Image();
		img.onload = function () {
			// console.log(`Изображение загружено, размеры ${img.width}x${img.height}`);
			parent.querySelectorAll(".color-link.active").forEach((el) => {
				el.classList.remove("active");
			});
			parent.querySelectorAll(`[data-color="${color}"]`).forEach((el) => {
				el.classList.add("active");
			});
			parent.querySelectorAll(".color-img-preview").forEach((el) => {
				el.setAttribute("src", carImagePath);
			});
			parent.querySelectorAll(".color-name").forEach((el) => {
				el.textContent = colorName;
			});
		}
		img.src = carImagePath;
	});
});
