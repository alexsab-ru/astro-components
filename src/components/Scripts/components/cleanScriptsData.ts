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

export function cleanScriptsData(data: ScriptsData): string {
    
    function cleanValue(value: any): any {
        if (isEmpty(value)) {
            return null;
        }

        if (Array.isArray(value)) {
            const cleanedArray = value
                .map(item => cleanValue(item))
                .filter(item => item !== null);
            return cleanedArray.length > 0 ? cleanedArray : null;
        }

        if (typeof value === 'object' && value !== null) {
            const cleanedObject: ScriptsData = {};
            
            for (const [key, val] of Object.entries(value)) {
                const cleanedVal = cleanValue(val);
                if (cleanedVal !== null) {
                    cleanedObject[key] = cleanedVal;
                }
            }
            
            return Object.keys(cleanedObject).length > 0 ? cleanedObject : null;
        }

        return value;
    }

    const cleanedData = cleanValue(data);
    const jsonString = JSON.stringify(cleanedData || {});
    return jsonString.replace(/<\/script>/gi, '<\\/script>');
}
