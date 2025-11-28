export default class ResponsiveMenu {
	constructor(menuSelector, maxWidth = 1024) {
		this.menu = document.querySelector(menuSelector);
		this.items = [...this.menu.children];
		this.moreButton = document.createElement('button');
		this.moreButton.type = 'button';
		this.moreButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-8"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>';
		this.moreButton.classList.add('menu-more-btn', 'bg-transparent', 'border-0', 'cursor-pointer', 'px-[13px]', 'items-center', 'h-full', 'transition-colors', 'text-header-text', 'hover:text-header-text', 'focus-visible:outline-none');
		this.moreMenu = document.createElement('ul');
		this.moreMenu.classList.add('more-menu', 'hidden', 'absolute', 'bg-submenu-bg', 'text-submenu-text', 'list-none', 'p-0', 'top-full', 'right-0', 'shadow-2xl', 'z-50', 'min-w-[10rem]', 'border', 'border-border', 'flex-col');
		this.div = document.createElement('div');
		this.div.classList.add('clone-menu');
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

	setMoreMenuVisibility(show) {
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
				clone.classList.add('block');
				clone.querySelectorAll('ul').forEach((submenu) => {
					submenu.classList.add('top-0', 'right-full');
				});
				this.moreMenu.appendChild(clone);
			});
			this.moreButton.classList.remove('hidden');
		} else {
			this.moreButton.classList.add('hidden');
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
