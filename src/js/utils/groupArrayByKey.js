export const groupArrayByKey = (arr, key) => arr.reduce((acc, element) => {	
	const keyValue = element[key] || element.data[key] || '';
	if (!acc[keyValue]) {
		acc[keyValue] = [];
	}
	acc[keyValue].push(element);
	return acc;
}, {});