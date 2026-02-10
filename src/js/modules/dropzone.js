import Dropzone from "dropzone";
import "dropzone/dist/basic.css";
import "dropzone/dist/dropzone.css";
import settings from '@/data/settings.json';

const fileUploads = document.querySelectorAll(".file-upload");
const { connectforms_link } = settings;

window.filesToUpload = [];

window.dropzones = [];

if (fileUploads.length) {
	fileUploads.forEach(function (fileUpload, idx) {
		window.dropzones[idx] = new Dropzone(fileUpload, {
			url: connectforms_link,
			addRemoveLinks: true,
			parallelUploads: 10,
			acceptedFiles: ".jpg,.jpeg,.png",
			maxFiles: 10,
			maxFilesize: 10,
			dictDefaultMessage: '<div class="dz-message text-black text-center my-0! text-sm sm:text-base">Вы можете приложить фотографии, не более 10</div>',
			dictFallbackMessage: "Ваш браузер не поддерживает загрузку перетаскиванием",
			dictFallbackText: "Пожалуйста, используйте резервную форму ниже, чтобы загрузить свои файлы, как в старые добрые времена)",
			dictFileTooBig: "Слишком большой файл ({{filesize}}Мб). Максимальный размер: {{maxFilesize}}Мб.",
			dictInvalidFileType: "Вы не можете загрузить файлы этого типа.",
			dictResponseError: "Сервер вернул ответ {{statusCode}}.",
			dictCancelUpload: "Отменить загрузку",
			dictUploadCanceled: "Загрузка завершена.",
			dictCancelUploadConfirmation: "Вы уверены, что хотите отменить?",
			dictRemoveFile: "Удалить файл",
			dictRemoveFileConfirmation: "Хотите удалить файл?",
			dictMaxFilesExceeded: "Привышен лимит изображений",
			dictFileSizeUnits: {
				tb: "Тб",
				gb: "Гб",
				mb: "Мб",
				kb: "Кб",
				b: "байт",
			},
			removedfile(file) {
				if (file.previewElement != null && file.previewElement.parentNode != null) {
					file.previewElement.parentNode.removeChild(file.previewElement);
				}

				window.filesToUpload = window.filesToUpload.filter(
					(f) => f.upload.uuid != file.upload.uuid
				);

				return this._updateMaxFilesReachedClass();
			},
			thumbnail(file, dataUrl) {
				if(file.status === 'error'){
					this.removeFile(file);
					return;
				}
				if (file.previewElement) {
					file.previewElement.classList.remove("dz-file-preview");
					for (let thumbnailElement of file.previewElement.querySelectorAll(
						"[data-dz-thumbnail]"
					)) {
						thumbnailElement.alt = file.name;
						thumbnailElement.src = dataUrl;
					}

					window.filesToUpload.push(file);

					return setTimeout(() => file.previewElement.classList.add("dz-image-preview"), 1);
				}
			},
		});
	});
}

Dropzone.confirm = function (question, accepted, rejected) {
	const confirmModal = document.getElementById('confirm-modal');
	const acceptBtn = document.getElementById('accept-confirm');
	confirmModal.querySelector('.message').innerText = question
	confirmModal.classList.remove('hidden');
	acceptBtn.addEventListener('click', e => {
		e.preventDefault();
		confirmModal.classList.add('hidden');
		accepted();
	})
};
