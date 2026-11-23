export default class ResponsiveMenu {
	constructor(menuSelector, maxWidth = 1024) {
		this.menu = document.querySelector(menuSelector);
		this.items = [...this.menu.children];
		this.moreButton = document.createElement('button');
		this.moreButton.type = 'button';
		this.moreButton.setAttribute('aria-label', 'Ещё пункты меню');
		this.moreButton.setAttribute('aria-expanded', 'false');
		this.moreButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-8"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>';
		this.moreButton.classList.add('menu-more-btn', 'bg-transparent', 'border-0', 'cursor-pointer', 'px-[13px]', 'items-center', 'h-full', 'transition-colors', 'text-header-text', 'hover:text-header-text', 'focus-visible:outline-none');
		this.moreMenu = document.createElement('ul');
		this.moreMenu.classList.add('more-menu', 'hidden', 'absolute', 'bg-submenu-bg', 'text-submenu-text', 'list-none', 'p-0', 'top-full', 'right-0', 'shadow-2xl', 'z-50', 'min-w-[10rem]', 'border', 'border-border', 'flex-col');
		this.moreItem = document.createElement('li');
		this.moreItem.classList.add('clone-menu');
		this.moreItem.appendChild(this.moreButton);
		this.moreItem.appendChild(this.moreMenu);
		this.menu.appendChild(this.moreItem);
		this.menu.classList.remove('overflow-hidden');
		this.maxWidth = maxWidth;
		this.handleMoreClick = this.toggleMoreMenu.bind(this);
		this.handleDocumentClick = this.handleOutsideClick.bind(this);
		this.handleEscapeKey = this.handleKeyPress.bind(this);
		this.init();
	}

	init() {
		this.updateMenu();
		document.fonts.ready.then(() => this.updateMenu());
		window.addEventListener('resize', () => this.updateMenu());
		this.moreButton.addEventListener("click", this.handleMoreClick);
		document.addEventListener("click", this.handleDocumentClick);
		document.addEventListener("keydown", this.handleEscapeKey);
	}

	setMoreMenuVisibility(show) {
		this.moreButton.setAttribute('aria-expanded', String(show));
		this.moreMenu.classList.toggle('hidden', !show);
		this.moreMenu.classList.toggle('inline-flex', show);
	}

	updateMenu() {
		this.setMoreMenuVisibility(false);
		if (window.innerWidth < this.maxWidth) {
			this.moreButton.classList.add('hidden');
			this.moreMenu.innerHTML = '';
			this.items.forEach((item) => (item.style.display = ''));
			return;
		}

		this.moreMenu.innerHTML = '';
		this.items.forEach((item) => (item.style.display = ''));
		const itemWidths = this.items.map(item => item.getBoundingClientRect().width);
		const totalWidth = itemWidths.reduce((width, itemWidth) => width + itemWidth, 0);
		const menuWidth = this.menu.clientWidth;
		this.moreButton.classList.toggle('hidden', totalWidth <= menuWidth);
		if (totalWidth <= menuWidth) return;

		const availableWidth = menuWidth - this.moreButton.offsetWidth;
		let usedWidth = 0;
		for (const [index, item] of this.items.entries()) {
			usedWidth += itemWidths[index];
			if (usedWidth <= availableWidth) continue;

			item.style.display = 'none';
			const clone = item.cloneNode(true);
			clone.style.display = 'block';
			this.moreMenu.appendChild(clone);
		}
	}

	toggleMoreMenu() {
		this.setMoreMenuVisibility(this.moreMenu.classList.contains('hidden'));
	}

	handleOutsideClick(event) {
		if (!this.menu.contains(event.target)) {
			this.setMoreMenuVisibility(false);
		}
	}
  
	handleKeyPress(event) {
		if (event.key === "Escape") {
			this.setMoreMenuVisibility(false);
		}
	}
}
