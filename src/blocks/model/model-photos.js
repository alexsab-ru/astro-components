/** Preserve the original one-level flattening of the remote grouped photo feed. */
export async function loadModelPhotos(source, fetcher = fetch) {
	if (!source) return [];
	const data = await fetcher(source).then((response) => response.json());
	return [].concat(...Object.values(data));
}
