export function groupSalonsByCity<T extends { legal_city?: string }>(salons: T[]) {
	const salonsByCity = new Map<string, T[]>();
	const salonsWithoutCity: T[] = [];
	for (const salon of salons) {
		const city = salon.legal_city?.trim();
		if (!city) {
			salonsWithoutCity.push(salon);
			continue;
		}
		const group = salonsByCity.get(city) ?? [];
		group.push(salon);
		salonsByCity.set(city, group);
	}

	const cities = [...salonsByCity.keys()];
	const groups: [string, T[]][] = cities.length > 1 ? [...salonsByCity] : [['', salons]];
	if (cities.length > 1 && salonsWithoutCity.length) groups.push(['', salonsWithoutCity]);
	return { cities, groups };
}
