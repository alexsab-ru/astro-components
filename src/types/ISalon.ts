export type TSalonMap = {
    zoom?: number;
    balloon?: string;
    coords?: number[],
    ya_link?: string;
}

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
	work_hours?: string;
	legal_entity?: string;
	legal_inn?: number;
	map?: TSalonMap;
	hidden_in?: string[];
	scripts?: TSalonScripts;
}