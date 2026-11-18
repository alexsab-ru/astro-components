import type { CardActionSource } from '@/ui/card-action/types';

export type CompactFeatureCardData = CardActionSource & {
	title: string;
	icon?: string;
};

export type IconFeatureCardData = CompactFeatureCardData & { img?: string };

export type ImageFeatureCardData = CardActionSource & {
	title: string;
	subtitle?: string;
	img: string;
};

export type BenefitCardData = CardActionSource & {
	title: string;
	iconName?: string;
	iconClass?: string;
	iconColor?: string;
	titleClass?: string;
	text?: string;
	textClass?: string;
	classes?: string;
};

export type InfoCardData = CardActionSource & {
	icon?: string;
	iconClasses?: string;
};
