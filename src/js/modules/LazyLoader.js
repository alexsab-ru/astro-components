class LazyLoader {
    constructor(selector = '.lazy', options = { threshold: 0.5 }) {
        this.selector = selector;
        this.elements = document.querySelectorAll(this.selector);
        this.observer = new IntersectionObserver(this.handleIntersect.bind(this), options);
        this.init();
    }

    init() {
        if (this.elements.length) {
            this.elements.forEach((element) => {
                const mediaElements = element.querySelectorAll('img, video');
                if (mediaElements.length) {
                    mediaElements.forEach((media) => {                          
                        this.observer.observe(media);
                    });
                }
            });
        }
    }

    handleIntersect(entries, observer) {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const lazyElement = entry.target;

                if (!lazyElement.dataset.loaded) {

                    // Если это видео с тегом <source>
                    if (lazyElement.tagName === 'VIDEO') {
                        const sources = lazyElement.querySelectorAll('source[data-src]');
                        sources.forEach((source) => {
                            source.src = source.dataset.src;
                            source.closest(this.selector)?.classList.remove(this.selector.replace('.', ''));
                        });
                        lazyElement.load(); // Перезагрузка видео с новыми источниками
                        lazyElement.closest(this.selector)?.classList.remove(this.selector.replace('.', ''));
                    }

                    // Если это изображение
                    if (lazyElement.tagName === 'IMG') {
                        lazyElement.src = lazyElement.dataset.src;
                    }                

                    // Удаляем класс "lazy" после загрузки
                    lazyElement.onload = () => {
                        lazyElement.classList.remove('opacity-0');
                        lazyElement.closest(this.selector)?.classList.remove(this.selector.replace('.', ''));
                    };

                    observer.unobserve(lazyElement);

                    lazyElement.dataset.loaded = "true";
                }
                
            }

        });
    }
}

export default LazyLoader;