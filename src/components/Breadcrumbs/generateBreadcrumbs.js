export function generateBreadcrumbs(url, titlesMapping = {}) {
	const segments = url.split("/").filter(Boolean); // Разделение URL и фильтрация пустых сегментов
	const breadcrumbs = [];

	let accumulatedPath = "";
	for (const segment of segments) {
		accumulatedPath = `/${segment}`;
		const name = titlesMapping[accumulatedPath] || segment; // Использование маппинга или сегмента как названия
		breadcrumbs.push({ name, href: accumulatedPath });
	}

	// Добавление 'Главная' в начало
	breadcrumbs.unshift({ name: "Главная", href: "/" });

	// Установка href последнего элемента в null, т.к. это текущая страница
	breadcrumbs[breadcrumbs.length - 1].href = null;

	return breadcrumbs;
}