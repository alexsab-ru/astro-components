// main.js
import Alpine from 'alpinejs';
import { usedPreviewGallery } from './alpine/usedPreviewGallery.js';
import { headerComponent } from './alpine/header.js';
import { scrollTop } from './alpine/scrollTop.js';
import { footer } from './alpine/footer.js';
import { sorting } from './alpine/sorting.js';
import { complectation } from './alpine/complectation.js';
import { store } from './alpine/store.js';

document.addEventListener('alpine:init', () => {
	usedPreviewGallery();
	headerComponent();
	scrollTop();
	footer();
	sorting();
	complectation();
	store();
});

// window.Alpine = Alpine;
// Alpine.start();
