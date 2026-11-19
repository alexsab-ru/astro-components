import type { CardActionSource } from '@/ui/card-action/types';
export type ActionButton = CardActionSource & {
	title: string;
	id?: string;
	classes?: string;
	view?: 'link' | 'scroll-link';
	download?: boolean | string;
	icon?: string;
};
