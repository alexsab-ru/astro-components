export type TSalonMap = {
	zoom?: number;
	balloon?: string;
	coordinates?: [number, number];
	ya_link?: string;
};

export type TSalonStaff = {
	name?: string;
	position?: string;
	photo?: string;
	phone?: string;
	email?: string;
	[key: string]: unknown;
};

export type TSalonCalltouch = {
	mod_id?: string;
	site_id?: string;
	routeKey?: string;
};

export type TSalonScripts = {
	calltouch?: TSalonCalltouch;
};

export interface ISalon {
	name?: string;
	brands?: string;
	type?: string;
	address?: string;
	phone?: string;
	email?: string;
	schedule?: string;
	legal_entity?: string;
	legal_inn?: number;
	map?: TSalonMap;
	staff?: TSalonStaff[];
	hidden_in?: string[];
	scripts?: TSalonScripts;
}
