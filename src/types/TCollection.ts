export type TDataCollection = {
	h1?: string;
	title?: string;
	caption?: string;
	breadcrumb?: string;
	description?: string;
	image?: string;
	pubDate?: string;
	toDate?: boolean | string;
};

export type TCollection = {
	id: string;
	data: TDataCollection;
	body: string;
	filePath: string;
	digest: string;
	deferredRender: boolean;
	collection: string;
	slug: string;
	render: Function;
};
