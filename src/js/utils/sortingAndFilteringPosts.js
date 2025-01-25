const now = new Date();

export function sortingAndFilteringPosts(posts) {
	return posts
		.sort((a, b) => {
			return a.data.pubDate && b.data.pubDate
				? b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
				: 0;
		})
		.filter((post) => !post.data.draft)
		.filter((post) => {
			if (post.data?.toDate && typeof post.data?.toDate === 'object') {
				return now < post.data?.toDate ? post : null;
			}
			return post;
		});
}
