export type TSalonMap = {
    zoom?: number;
    balloon?: string;
    coords?: number[],
    ya_link?: string;
}

export interface ISalon {
	name?: string;
	type?: string;
	address?: string;
	phone?: string;
	work_hours?: string;
	legal_entity?: string;
	legal_inn?: number;
	map?: TSalonMap;
}