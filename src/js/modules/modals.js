import { reachGoal } from '@alexsab-ru/scripts';

document.querySelectorAll(".popup-link").forEach(
	(link) =>
		(link.onclick = (e) => {
			e.preventDefault();
			let id = link.getAttribute("href");
			if (id === "#" || !id) return;
			const targetModal = document.getElementById(id.replace("#", ""));
			if (!targetModal) return;
			targetModal.classList.remove("hidden");

			const captionEl = targetModal.querySelector(".caption");
			if (captionEl) {
				captionEl.innerText = link.dataset.title;
			}
			const formName = link.dataset.form_name;
			const formInput = targetModal.querySelector('input[name="form"]');
			if (formName && formInput) {
				formInput.value = formName;
			}
			reachGoal("form_open");
			document.body.classList.add("overflow-hidden");
		})
);

document.querySelectorAll(".modal-overlay").forEach((el) => {
	document.addEventListener("keydown", (event) => {
		if (event.key == "Escape") {
			closeModal(el);
		}
	});

	el.addEventListener("click", (event) => {
		if (typeof event.target.dataset.close != "undefined") {
			closeModal(el);
		}
	});
});

function closeModal(modal) {
	reachGoal("form_close");

	const form = modal.querySelector("form");
	if (form) {
		form.reset();
	}
	document.querySelectorAll(".error-message").forEach((mes) => {
		mes.classList.add("hidden");
	});
	modal.classList.add("hidden");
	document.body.classList.remove("overflow-hidden");
}
