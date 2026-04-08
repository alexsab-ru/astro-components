const nowWithTime = new Date();
const nowWithoutTime = new Date();
nowWithoutTime.setHours(0, 0, 0, 0);

/**
 * Извлекает номер из имени файла в filePath
 * Например: "src/content/special-offers/1_novyy-haval-h3.mdx" -> 1
 */
function getFileNumber(post) {
	if (!post?.filePath) return 0;
	// Извлекаем имя файла из пути (последняя часть после '/')
	const fileName = post.filePath.split('/').pop();
	// Убираем расширение и берем первую часть до '_'
	const fileNameWithoutExt = fileName.replace(/\.\w+$/, '');
	const numberPart = fileNameWithoutExt.split('_')[0];
	return parseInt(numberPart, 10) || 0;
}

export function sortingAndFilteringPosts(posts) {
	return posts
		// Исключаем файлы начинающиеся с '__'
		.filter(post => !(typeof post?.id === 'string' && post.id.startsWith('__')))
		// Сначала порядок по префиксу в имени файла (getFileNumber: без цифры = 0, идут первыми).
		// Внутри одной «группы» номера — по дате публикации, новее выше.
		.sort((a, b) => {
			const byNumber = getFileNumber(a) - getFileNumber(b);
			if (byNumber !== 0) return byNumber;

			const dateA = a.data?.pubDate;
			const dateB = b.data?.pubDate;
			// Оба с датой — сравниваем по убыванию (свежие сверху).
			if (dateA && dateB) {
				return dateB.valueOf() - dateA.valueOf();
			}
			// У кого даты нет — в конец подгруппы с тем же номером файла.
			if (dateA && !dateB) return -1;
			if (!dateA && dateB) return 1;
			return 0;
		})
		.filter(post => !post.data.draft)
		.filter(post => {
			if (post.data?.toDate && typeof post.data?.toDate === 'object') {
				return nowWithoutTime <= post.data?.toDate ? post : null;
			}
			if (post.data?.pubDate && typeof post.data?.pubDate === 'object') {
				return nowWithTime < post.data?.pubDate ? null : post;
			}
			return post;
		});
}