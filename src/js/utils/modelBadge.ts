import { getModelTitle } from './modelFields.js';

export type ModelBadgePlacement = 'menu' | 'modelList' | 'modelPage' | 'carList' | 'carPage';

const defaultBadgeClasses: Record<ModelBadgePlacement, string> = {
	menu: 'w-[50px] xl:w-[90px]',
	modelList: 'xs:w-[60px] w-[100px]',
	modelPage: 'max-h-[70px] lg:max-h-[100px] xs:w-[80px] w-[150px] lg:w-[200px]',
	carList: 'w-[50px]! xl:w-[90px]!',
	carPage: 'xs:w-[60px] w-[100px] xl:w-[200px]',
};

export function getModelBadgeData(model: any, placement: ModelBadgePlacement, fallbackAlt = '') {
	const badge = model?.badge;
	const badgeData = badge && typeof badge === 'object' ? badge : null;
	const placementData = badgeData?.[placement];
	const isPlacementObject = placementData && typeof placementData === 'object';
	const alt = badgeData?.alt || getModelTitle(model) || fallbackAlt;

	return {
		image: isPlacementObject ? placementData.image || null : placementData || null,
		alt,
		classes:
			isPlacementObject && placementData.classes
				? placementData.classes
				: defaultBadgeClasses[placement],
	};
}
