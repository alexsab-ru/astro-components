export type Viewport = 'mobile' | 'tablet' | 'desktop';
export type TBadge = {
	autoname?: string
	title?: string
	description?: string
	/** @deprecated Используй поле 'description' **/
	descr?: string
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

	videoUrl?: string
	mobileVideoUrl?: string
	imageUrl?: string
	tabletImageUrl?: string
	mobileImageUrl?: string
	imagePosition?: string
	url?: string
	/** @deprecated Используй поле 'url'   **/
	bannerUrl?: string
	openInNewTab?: boolean
	/** @deprecated Используй поле 'openInNewTab' **/
	target?: string
	gradient?: boolean
	title?: string
	description?: string
	/** @deprecated Используй поле 'description' **/
	descr?: string
	disclaimer?: string
	btn?: string
	/** @deprecated Используй поле 'url'   **/
	btnUrl?: string
	btnColor?: string
	dataTitle?: string
	dataFormName?: string
	badge?: TBadge
	autoplay?: number
}