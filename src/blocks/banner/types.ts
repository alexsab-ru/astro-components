export type Viewport = 'mobile' | 'tablet' | 'desktop';
export type TBadge = {
	autoname?: string
	title?: string
	descr?: string
	image?: string
	position?: string
	colorText?: string
	bg?: boolean
}
export type TMediaKeys = {
	desktop: string
	tablet: string
	mobile: string
}
export type TBanner = {
	id?: number
	show?: boolean
	type?: string
	view?: string

	image?: TMediaKeys
	video?: TMediaKeys
	position?: TMediaKeys

	videoUrl?: string
	mobileVideoUrl?: string
	imageUrl?: string
	tabletImageUrl?: string
	mobileImageUrl?: string
	imagePosition?: string
	bannerUrl?: string
	target?: string
	gradient?: boolean
	title?: string
	descr?: string
	btn?: string
	btnUrl?: string
	btnColor?: string
	dataTitle?: string
	dataFormName?: string
	badge?: TBadge
	autoplay?: number
}