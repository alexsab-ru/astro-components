// Декларация блока страницы.
// JSON-блоки модели (page.blocks) приходят в "сыром" виде: { type, id, content, ... }.
// Структурные блоки (собираются в роуте) имеют форму { type, props }.
export interface TBlock {
	type: string;
	id?: string;
	props?: Record<string, any>;
	content?: Record<string, any>;
	contentOrder?: string[];
	sectionClass?: string;
	show?: boolean;
	[key: string]: any;
}
