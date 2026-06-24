export type Viewport = 'mobile' | 'tablet' | 'desktop';
export type TBadge = {
	autoname?: string
	title?: string
	description?: string
	image?: string
	position?: string
	colorText?: string
	bg?: boolean
}
export type TMediaKeys = {
	desktop: string
	tablet?: string
	mobile: string
}
export type TBanner = {
	id?: number
	show?: boolean

	image?: TMediaKeys
	video?: TMediaKeys
	position?: TMediaKeys

	url?: string
	gradient?: boolean
	title?: string
	description?: string
	disclaimer?: string
	btn?: string
	btnColor?: string
	dataTitle?: string
	dataFormName?: string
	badge?: TBadge
	autoplay?: number
}
