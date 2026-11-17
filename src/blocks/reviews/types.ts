export type TReviewContent = {
	name: string;
	text: string;
	date: string | Date;
};

export type TReviewItem = TReviewContent & {
	show: boolean;
};
