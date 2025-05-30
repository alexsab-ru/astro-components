interface ScriptsData {
    [key: string]: any;
}

interface ScriptConfig {
    value: any;
    fn: string;
    prod: boolean;
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

    function cleanScriptConfig(config: ScriptConfig): ScriptConfig | null {
        const cleanedValue = cleanValue(config.value);
        
        // Если value пустое, удаляем весь блок
        if (cleanedValue === null) {
            return null;
        }
        
        return {
            value: cleanedValue,
            fn: config.fn,
            prod: config.prod
        };
    }

    const cleanedData: ScriptsData = {};
    
    for (const [key, val] of Object.entries(data)) {
        // Для служебных ключей используем обычную очистку
        if (key === 'site') {
            const cleanedVal = cleanValue(val);
            if (cleanedVal !== null) {
                cleanedData[key] = cleanedVal;
            }
            continue;
        }
        
        // Для конфигураций скриптов используем специальную очистку
        if (val && typeof val === 'object' && 'value' in val && 'fn' in val && 'prod' in val) {
            const cleanedConfig = cleanScriptConfig(val as ScriptConfig);
            if (cleanedConfig !== null) {
                cleanedData[key] = cleanedConfig;
            }
        }
    }

    const jsonString = JSON.stringify(cleanedData);
    return jsonString.replace(/<\/script>/gi, '<\\/script>');
}