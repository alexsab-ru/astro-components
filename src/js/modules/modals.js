import { reachGoal } from '@alexsab-ru/scripts';

document.querySelectorAll(".popup-link").forEach(
	(link) =>
		(link.onclick = (e) => {
			e.preventDefault();
			let id = link.getAttribute("href");
			if (id === "#" || !id) return;
			const targetModal = document.getElementById(id.replace("#", ""));
			if (!targetModal) return;

			const img = link.dataset.img;
			const imgPosition = link.dataset.img_position || 'right';

			if(imgPosition && img){
				const modalGridContent = targetModal.querySelector('.modal-grid-content');
				const modalImgBlock = modalGridContent.querySelector('.'+imgPosition);
				const flexColClass = imgPosition === 'right' ? 'flex-col-reverse' : 'flex-col';
				modalGridContent.classList.add(flexColClass);
				if(modalImgBlock){
					modalImgBlock.innerHTML = '';
					const myImage = new Image();
					myImage.classList.add('modal-img');
					myImage.src = img;
					myImage.alt = imgPosition;
					modalImgBlock.classList.remove('hidden');
					modalImgBlock.append(myImage);
				}
			}

			const captionEl = targetModal.querySelector(".caption");
			if (captionEl) {
				captionEl.innerHTML = link.dataset.title;
			}
			const formName = link.dataset.form_name;
			const formInput = targetModal.querySelector('input[name="form"]');
			if (formName && formInput) {
				formInput.value = formName;
			}
			reachGoal("form_open");
			targetModal.classList.remove("hidden");
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
