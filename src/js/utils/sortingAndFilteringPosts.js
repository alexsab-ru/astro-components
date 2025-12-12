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
		.sort((a, b) => a.data.pubDate && b.data.pubDate ? b.data.pubDate.valueOf() - a.data.pubDate.valueOf() : getFileNumber(a) - getFileNumber(b))
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