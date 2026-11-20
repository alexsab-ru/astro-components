import type { TBreadcrumb } from '@/ui/breadcrumbs/types';
import type { CardActionSource } from '@/ui/card-action/types';
export type HeroPoint = CardActionSource & { label: string; icon?: string };
export interface HeroData {
	tag?: 'section' | 'div';
	image?: string | { desktop: string; tablet?: string; mobile?: string };
	breadcrumb?: TBreadcrumb[];
	eyebrow?: string;
	title?: string;
	/** Trusted editorial HTML, including a price or formatted description. */
	subtitle?: string;
	points?: HeroPoint[];
	badge?: { image: string; alt?: string; classes?: string };
	classes?: string;
	contentClass?: string;
	id?: string;
}
