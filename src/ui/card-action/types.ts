export type PopupMetadata = {
	title?: string;
	subtitle?: string;
	formName?: string;
	comment?: string;
	chooseDepartment?: string | boolean;
	filtering?: string;
	sorting?: string;
	dealerName?: string;
};

export type CardAction =
	| { type: 'none' }
	| ({ type: 'popup'; id?: string } & PopupMetadata)
	| { type: 'link'; url: string; target?: string; rel?: string }
	| { type: 'new-tab'; url: string; rel?: string };

export type CardActionSource = {
	title?: string;
	action?: CardAction;
	/** Existing data remains supported; prefer action in new data. */
	url?: string;
	target?: string;
	rel?: string;
};

export type ResolvedCardAction =
	| { type: 'none' }
	| { type: 'popup'; id: string; href: string; popup: PopupMetadata }
	| { type: 'link' | 'new-tab'; href: string; target?: string; rel?: string };
