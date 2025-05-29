interface ScriptsData {
    [key: string]: any;
}

function isEmpty(value: any): boolean {
    if (value === null || value === undefined || value === '') return true;
    if (Array.isArray(value)) {
        if (value.length === 0) return true;
        return value.every(item => isEmpty(item));
    }
    if (typeof value === 'object') {
        return Object.values(value).every(item => isEmpty(item));
    }
    return false;
}

export function cleanScriptsData(data: ScriptsData): ScriptsData {
    const cleanedData: ScriptsData = {};

    for (const [key, value] of Object.entries(data)) {
        if (!isEmpty(value)) {
            if (Array.isArray(value)) {
                const cleanedArray = value.filter(item => !isEmpty(item));
                if (cleanedArray.length > 0) {
                    cleanedData[key] = cleanedArray;
                }
            } else if (typeof value === 'object') {
                const cleanedObject = cleanScriptsData(value);
                if (Object.keys(cleanedObject).length > 0) {
                    cleanedData[key] = cleanedObject;
                }
            } else {
                cleanedData[key] = value;
            }
        }
    }

    return cleanedData;
} 