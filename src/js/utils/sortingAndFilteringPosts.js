const nowWithTime = new Date();
const nowWithoutTime = new Date();
nowWithoutTime.setHours(0, 0, 0, 0);

export function sortingAndFilteringPosts(posts) {
	return posts
		.sort((a, b) => a.data.pubDate && b.data.pubDate ? b.data.pubDate.valueOf() - a.data.pubDate.valueOf() : 0)
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