import type { TBreadcrumb } from '@/ui/breadcrumbs/types';
import type { TStatus } from '@/types/TStatus';

export type ModelPart =
	'hero' | 'media' | 'colors' | 'characteristics' | 'actions';
export type ModelHeroPart =
	'breadcrumb' | 'heading' | 'slogan' | 'price' | 'benefits';
export type ModelParts = Partial<
	Record<ModelPart | ModelHeroPart | 'badge', boolean>
>;
export interface ModelOptions {
	parts?: ModelParts;
	partOrder?: ModelPart[];
	eyebrow?: string;
	actionPreset?: 'default' | 'purchase' | 'contact';
	actions?: (string | import('@/blocks/action-group/types').ActionButton)[];
	excludeActions?: string[];
	testDriveEnabled?: boolean;
	creditEnabled?: boolean;
}
export interface ModelProps extends ModelOptions {
	model: any;
	breadcrumb?: TBreadcrumb[];
	status?: TStatus;
	/** Override the section anchor when repeating a model on the same page. */
	id?: string;
	/** Optional supplied photographs; otherwise model.photos is fetched when visible. */
	photos?: string[];
}
