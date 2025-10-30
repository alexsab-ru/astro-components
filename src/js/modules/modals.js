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

			const formTitle = targetModal.querySelector(".title");
			if (formTitle) {
				formTitle.innerHTML = link.dataset.title || 'Обратная связь';
			}
			const formSubtitle = targetModal.querySelector(".subtitle");
			if (formSubtitle) {
				formSubtitle.innerHTML = link.dataset.subtitle || 'Оставьте свои данные и мы свяжемся с Вами в ближайшее время!';
			}
			const formName = link.dataset.form_name;
			const formInput = targetModal.querySelector('input[name="form"]');
			if (formName && formInput) {
				formInput.value = formName;
			}
			const chooseDepartment = link.dataset.choose_department;
			// Если выбор отдела не разрешён (choose_department !== 'true') —
			// 1) устанавливаем по умолчанию "Отдел продаж"
			// 2) блокируем радио-инпуты, чтобы пользователь не менял
			// 3) скрываем весь блок выбора отдела для визуальной чистоты
			// Если разрешён — возвращаем блок в исходное состояние
			const departamentBlock = targetModal.querySelector('[data-departament-block]');
			const departamentRadios = targetModal.querySelectorAll('input[name="departament"]');
			const isChooseDeptEnabled = String(chooseDepartment).toLowerCase() === 'true';
			if (departamentBlock && departamentRadios && departamentRadios.length) {
				if (!isChooseDeptEnabled) {
					// Выбираем по умолчанию "Отдел продаж"
					departamentRadios.forEach((radio) => {
						if (radio.value === 'Отдел продаж') {
							radio.checked = true;
						}
						// Блокируем возможность изменения
						radio.disabled = true;
					});
					// Скрываем сам блок
					departamentBlock.classList.add('hidden');
				} else {
					// Разрешён выбор отдела — показываем блок и разблокируем радио
					departamentBlock.classList.remove('hidden');
					departamentRadios.forEach((radio) => {
						radio.disabled = false;
					});
				}
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
