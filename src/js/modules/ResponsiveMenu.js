export default class ResponsiveMenu {
	constructor(menuSelector, maxWidth = 1024) {
		this.menu = document.querySelector(menuSelector);
		this.items = [...this.menu.children];
		this.moreButton = document.createElement('button');
		this.moreButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-8"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>';
		this.moreButton.classList.add('menu-more-btn');
		this.moreMenu = document.createElement('ul');
		this.moreMenu.classList.add('more-menu');
		this.div = document.createElement('div');
		this.div.classList.add('relative');
		this.div.appendChild(this.moreButton);
		this.div.appendChild(this.moreMenu);
		this.menu.appendChild(this.div);
		this.menu.classList.remove('overflow-hidden');
		this.maxWidth = maxWidth;
		this.handleMoreClick = this.toggleMoreMenu.bind(this);
		this.handleDocumentClick = this.handleOutsideClick.bind(this);
    	this.handleEscapeKey = this.handleKeyPress.bind(this);
		this.init();
	}

	init() {
		this.updateMenu();
		window.addEventListener('resize', () => this.updateMenu());
		this.moreButton.addEventListener("click", this.handleMoreClick);
		document.addEventListener("click", this.handleDocumentClick);
    	document.addEventListener("keydown", this.handleEscapeKey);
	}

	updateMenu() {
		if (window.innerWidth < this.maxWidth) {
			this.moreButton.style.display = 'none';
			this.moreMenu.innerHTML = '';
			this.items.forEach((item) => (item.style.display = ''));
			return;
		}

		this.moreMenu.innerHTML = '';
		this.items.forEach((item) => (item.style.display = ''));
		let availableWidth = this.menu.clientWidth - this.moreButton.offsetWidth;
		let usedWidth = 0;
		let hiddenItems = [];

		for (let item of this.items) {
			usedWidth += item.offsetWidth;
			if (usedWidth > availableWidth) {
				hiddenItems.push(item);
			}
		}

		if (hiddenItems.length) {
			hiddenItems.forEach((item) => {
				item.style.display = 'none';
				let clone = item.cloneNode(true);
				clone.style.display = 'block';
				this.moreMenu.appendChild(clone);
			});
			this.moreButton.style.display = 'flex';
		} else {
			this.moreButton.style.display = 'none';
		}
	}

	toggleMoreMenu() {
		this.moreMenu.classList.toggle("visible");
	}

	handleOutsideClick(event) {
		if (!this.menu.contains(event.target)) {
		  	this.moreMenu.classList.remove("visible");
		}
	}
  
	 handleKeyPress(event) {
		if (event.key === "Escape") {
			this.moreMenu.classList.remove("visible");
		}
	}
}