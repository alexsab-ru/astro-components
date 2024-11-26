dealer = {
    "city": "Самара",
    "where": "Самаре",
}

def get_model_info(brand: str, model: str, property: str = None, color: str = None) -> str | dict | None:
    """
    Получение информации о модели автомобиля.
    
    Args:
        brand: Название бренда
        model: Название модели
        property: Запрашиваемое свойство ('folder', 'cyrillic' или 'colors')
        color: Цвет автомобиля
        
    Returns:
        Запрошенная информация о модели или None, если информация не найдена
    """
    # Нормализуем входные данные
    normalized_brand = brand.lower()
    normalized_model = model.lower()
    
    # Найдем бренд независимо от регистра
    brand_key = next(
        (key for key in model_mapping if key.lower() == normalized_brand),
        None
    )
    
    if not brand_key:
        return None
    
    # Найдем модель независимо от регистра
    model_key = next(
        (key for key in model_mapping[brand_key] if key.lower() == normalized_model),
        None
    )
    
    if not model_key:
        return None
    
    model_data = model_mapping[brand_key][model_key]
    
    # Если запрашивается конкретный цвет
    if color:
        normalized_color = color.lower()
        color_key = next(
            (key for key in model_data['color'] if key.lower() == normalized_color),
            None
        )
        
        if color_key:
            return model_data['color'][color_key]
        return None
    
    # Если запрашивается конкретное свойство
    if property:
        normalized_property = property.lower()
        if normalized_property in ['folder', 'cyrillic']:
            return model_data[normalized_property]
        if normalized_property == 'colors':
            return model_data['color']
        return None
    
    # Возвращаем все данные модели, если не указаны property и color
    return model_data


def get_folder(brand: str, model: str) -> str | None:
    """Получение названия папки для модели."""
    return get_model_info(brand, model, 'folder')


def get_cyrillic(brand: str, model: str) -> str | None:
    """Получение кириллического названия модели."""
    return get_model_info(brand, model, 'cyrillic')


def get_color_filename(brand: str, model: str, color: str) -> str | None:
    """Получение имени файла для указанного цвета модели."""
    return get_model_info(brand, model, color=color)


def get_available_colors(brand: str, model: str) -> dict | None:
    """Получение словаря доступных цветов для модели."""
    return get_model_info(brand, model, 'colors')


# Примеры использования:
"""
get_folder('Geely', 'Atlas Pro')         # Вернет: "Atlas Pro"
get_cyrillic('Geely', 'Atlas Pro')       # Вернет: "Атлас Про"
get_color_filename('Geely', 'Atlas Pro', 'Черный')  # Вернет: "black-metallic.webp"
get_color_filename('Geely', 'Atlas Pro', 'BLACK')   # Вернет: "black-metallic.webp"
get_available_colors('Geely', 'Atlas Pro')  # Вернет словарь со всеми доступными цветами

# Работает независимо от регистра:
get_folder('GEELY', 'ATLAS PRO')         # Вернет: "Atlas Pro"
get_color_filename('geely', 'atlas pro', 'ЧЕРНЫЙ')  # Вернет: "black-metallic.webp"
"""

# Словарь соответствия цветов
model_mapping = {
    "Baic": {
        "BJ40": {
            "folder": "bj40",
            "cyrillic": "БДЖ40",
            "color": {
                "Black": "black.png",
                "Blue": "blue.png",
                "Green": "green.png",
                "Light-blue": "light-blue.png",
                "Red": "red.png",
                "White": "white.png",
                "Черный": "black.png",
                "Синий": "blue.png",
                "Зеленый": "green.png",
                "Светло-синий": "light-blue.png",
                "Голубой": "light-blue.png",
                "Красный": "red.png",
                "Белый": ".pngwhite",
            }
        },
        "U5 Plus": {
            "folder": "u5-plus",
            "cyrillic": "Ю5 Плюс",
            "color": {
                "Black": "black.png",
                "Gray": "gray.png",
                "Grey": "gray.png",
                "Red": "red.png",
                "White": "white.png",
                "Черный": "black.png",
                "Серый": "gray.png",
                "Красный": "red.png",
                "Белый": "white.png",
            }
        },
        "X35": {
            "folder": "x35",
            "cyrillic": "Х35",
            "color": {
                "Blue": "blue.png",
                "Bronze": "bronze.png",
                "Red": "red.png",
                "Silver": "silver.png",
                "White": "white.png",
                "Синий": "blue.png",
                "Коричневый": "bronze.png",
                "Серебрисный": "silver.png",
                "Серебряный": "silver.png",
                "Красный": "red.png",
                "Белый": "white.png",
            }
        },
        "X55": {
            "folder": "x55",
            "cyrillic": "Х55",
            "color": {
                "Gray-with-black-roof": "gray-with-black-roof.png",
                "Gray": "gray.png",
                "Grey": "gray.png",
                "Light-gray-with-black-roof": "light-gray-with-black-roof.png",
                "Light-gray": "light-gray.png",
                "Red-with-black-roof": "red-with-black-roof.png",
                "Red": "red.png",
                "White-with-black-roof": "white-with-black-roof.png",
                "White": "white.png",
                "Yellow-with-black-roof": "yellow-with-black-roof.png",
                "Yellow": "yellow.png",
                "Серый": "gray.png",
                "Серый/черный": "gray-with-black-roof.png",
                "Светло-серый/черный": "light-gray-with-black-roof.png",
                "Светло-серый": "light-gray.png",
                "Красный/черный": "red-with-black-roof.png",
                "Красный": "red.png",
                "Белый/черный": "white-with-black-roof.png",
                "Белый": "white.png",
                "Желтый/черный": "yellow-with-black-roof.png",
                "Желтый": "yellow.png",
            }
        },
        "X7": {
            "folder": "x7",
            "cyrillic": "Х7",
            "color": {
                "Black": "black.png",
                "Gray": "gray.png",
                "Grey": "gray.png",
                "Silver": "silver.png",
                "White": "white.png",
                "Черный": "black.png",
                "Серый": "gray.png",
                "Серебристый": "silver.png",
                "Белый": "white.png",
            }
        },
        "X75": {
            "folder": "x75",
            "cyrillic": "Х75",
            "color": {
                "Black": "black.webp",
                "Черный": "black.webp",
                "Blue-black": "blue-black.webp",
                "Сине-черный": "blue-black.webp",
                "Blue": "blue.webp",
                "Голубой": "blue.webp",
                "Dark-gray-black": "dark-gray-black.webp",
                "Темно-серо-черный": "dark-gray-black.webp",
                "Dark-gray": "dark-gray.webp",
                "Темно-серый": "dark-gray.webp",
                "Серый": "dark-gray.webp",
                "Red-black": "red-black.webp",
                "Красно-черный": "red-black.webp",
                "Red": "red.webp",
                "Красный": "red.webp",
                "Silver-black": "silver-black.webp",
                "Серебристо-черный": "silver-black.webp",
                "Silver": "silver.webp",
                "Серебристый": "silver.webp",
                "White-black": "white-black.webp",
                "Бело-черный": "white-black.webp",
                "White": "white.webp",
                "Белый": "white.webp",
            }
        },
    },
    "Geely": {
        "001": {
            "folder": "001",
            "cyrillic": "001",
            "color": {
                "Black": "black.webp",
                "Gray": "gray.webp",
                "White": "white.webp",
                "Red": "red.webp",
                "Красный": "red.webp",
                "Черный": "black.webp",
                "Серый": "gray.webp",
                "Белый": "white.webp",
            }
        },
        "Atlas Pro": {
            "folder": "Atlas Pro",
            "cyrillic": "Атлас Про",
            "color": {
                "Черный": "black-metallic.webp",
                "Черный/черный": "black-metallic.webp",
                "Серый": "gray-metallic.webp",
                "Серый металлик": "gray-metallic.webp",
                "Красный": "red-metallic.webp",
                "Серебристый": "silver-metallic.webp",
                "Белый": "white.webp",
            }
        },
        "Atlas, I": {
            "folder": "Atlas Pro",
            "cyrillic": "Атлас Про",
            "color": {

            }
        },
        "Atlas, II": {
            "folder": "Atlas-2024",
            "cyrillic": "Атлас",
            "color": {
                "Черный": "black-metallic.webp",
                "Черный/черный": "black-metallic.webp",
                "Серебристый": "silver-metallic.webp",
                "Серый": "silver-metallic.webp",
                "Синий": "starry-blue-metallic.webp",
                "Серо-голубой": "starry-blue-metallic.webp",
                "Белый": "white.webp",
                "Зелёный": "racing-green.webp",
                "Зеленый": "racing-green.webp",
            }
        },
        "Coolray, I Рестайлинг": {
            "folder": "New Coolray",
            "cyrillic": "Кулрей",
            "color": {
                "Красный": "bright-vermilion.webp",
                "Белый": "crystal-white.webp",
                "Синий": "cyber-blue.webp",
                "Голубой": "cyber-blue.webp",
                "Серый": "magnetic-grey.webp",
                "Серый металлик": "magnetic-grey.webp",
                "Серебристый": "unicorn-grey.webp",
            }
        },
        "Coolray, I": {
            "folder": "Coolray",
            "cyrillic": "Кулрей",
            "color": {
                "Синий": "blue-metallic.webp",
                "Серый": "grey.webp",
                "Красный": "red.webp",
                "Серебристый": "silver-metallic.webp",
                "Белый": "white.webp",
            }
        },
        "Emgrand L": {
            "folder": "Emgrand",
            "cyrillic": "Эмгранд",
            "color": {
                "Черный": "black-metallic.webp",
                "Синий": "blue-metallic.webp",
                "Золотой": "gold-metallic.webp",
                "Серый": "gray-metallic.webp",
                "Белый": "white-metallic.webp",
            }
        },
        "Emgrand, II": {
            "folder": "Emgrand",
            "cyrillic": "Эмгранд",
            "color": {
                "Черный": "black-metallic.webp",
                "Темно-синий": "blue-metallic.webp",
                "Синий": "blue-metallic.webp",
                "Желтый": "gold-metallic.webp",
                "Золотой": "gold-metallic.webp",
                "Бежевый": "gold-metallic.webp",
                "Оранжевый": "gold-metallic.webp",
                "Серый": "gray-metallic.webp",
                "Серо-голубой": "gray-blue-metallic.webp",
                "Белый": "white-metallic.webp",
            }
        },
        "Geometry G6": {
            "folder": "Geometry G6",
            "cyrillic": "Геометрия Г6",
            "color": {
                "Серый": "gray.webp",
            }
        },
        "Monjaro": {
            "folder": "Monjaro",
            "cyrillic": "Монджаро",
            "color": {
                "Черный": "black-metallic.webp",
                "Черный/черный": "black-metallic.webp",
                "Зеленый": "emerald-metallic.webp",
                "Синий": "emerald-metallic.webp",
                "Серый": "gray-metallic.webp",
                "Серый металлик": "gray-metallic.webp",
                "Серебристый": "silver-metallic.webp",
                "Белый": "white-metallic.webp",
            }
        },
        "Okavango": {
            "folder": "Okavango",
            "cyrillic": "Окаванго",
            "color": {
                "Синий": "indigo-blue.webp",
                "Синий металлик": "indigo-blue.webp",
                "Черный/черный": "ink-black.webp",
                "Черный": "ink-black.webp",
                "Черный металик": "ink-black.webp",
                "Серый металлик": "basalt-gray.webp",
                "Серый": "basalt-gray.webp",
                "Белый": "crystal-white.webp",
            }
        },
        "Okavango, I Рестайлинг": {
            "folder": "Okavango",
            "cyrillic": "Окаванго",
            "color": {
                "Синий": "indigo-blue.webp",
                "Синий металлик": "indigo-blue.webp",
                "Черный/черный": "ink-black.webp",
                "Черный": "ink-black.webp",
                "Черный металик": "ink-black.webp",
                "Серый металлик": "basalt-gray.webp",
                "Серый": "basalt-gray.webp",
                "Белый": "crystal-white.webp",
            }
        },
        "Tugella, I Рестайлинг": {
            "folder": "Tugella",
            "cyrillic": "Тугелла",
            "color": {
                "Черный": "black-metallic.webp",
                "Черный/черный": "black-metallic.webp",
                "Серо-голубой": "gray-blue-metallic.webp",
                "Серый": "gray-metallic.webp",
                "Серый металлик": "gray-metallic.webp",
                "Белый": "white-metallic.webp",
            }
        },
        "Preface, I Рестайлинг 2": {
            "folder": "Preface",
            "cyrillic": "Префейс",
            "color": {
                "Black": "black.webp",
                "Черный": "black.webp",
                "Gray-blue": "gray-blue.webp",
                "Серо-голубой": "gray-blue.webp",
                "Голубой": "gray-blue.webp",
                "Gray-purple": "gray-purple.webp",
                "Серо-фиолетовый": "gray-purple.webp",
                "Gray": "gray.webp",
                "Серый": "gray.webp",
                "Green": "green.webp",
                "Зеленый": "green.webp",
                "White": "white.webp",
                "Белый": "white.webp",
            }
        },
        "X50": {
            "folder": "Belgee X50",
            "cyrillic": "Белджи Х50",
            "color": {
                "Черный": "black.webp",
                "Черный/черный": "black.webp",
                "Серый": "gray.webp",
                "Серый металлик": "gray.webp",
                "Красный": "red.webp",
                "Синий": "blue.webp",
                "Серебристый": "silver.webp",
                "Белый": "white.webp",
            }
        },
        "X70": {
            "folder": "Belgee X70",
            "cyrillic": "Белджи Х70",
            "color": {
                "Black": "black.webp",
                "Черный": "black.webp",
                "Черный/черный": "black.webp",
                "Blue": "blue.webp",
                "Синий": "blue.webp",
                "Gray": "gray.webp",
                "Серый": "gray.webp",
                "Red": "red.webp",
                "Красный": "red.webp",
                "Silver": "silver.webp",
                "Серебристый": "silver.webp",
                "White": "white.webp",
                "Белый": "white.webp",
            }
        },
        "Cityray": {
            "folder": "Cityray",
            "cyrillic": "Ситирей",
            "color": {
                "Gray": "gray.webp",
                "Серый": "gray.webp",
                "Blue": "light-blue.webp",
                "Синий": "light-blue.webp",
                "Голубой": "light-blue.webp",
                "White": "white.webp",
                "Белый": "white.webp",
            }
        },
    },
    "Belgee": {
        "001": {
            "folder": "001",
            "cyrillic": "001",
            "color": {
                "Black": "black.webp",
                "Gray": "gray.webp",
                "White": "white.webp",
                "Red": "red.webp",
                "Красный": "red.webp",
                "Черный": "black.webp",
                "Серый": "gray.webp",
                "Белый": "white.webp",
            }
        },
        "X50": {
            "folder": "x50",
            "cyrillic": "Х50",
            "color": {
                "Black": "black.webp",
                "Черный": "black.webp",
                "Чёрный (ink black)": "black.webp",
                "Gray": "gray.webp",
                "Серый": "gray.webp",
                "Серый (magnetic grey)": "gray.webp",
                "Red": "red.webp",
                "Красный": "red.webp",
                "Ярко-алый, красный (bright vermilion)": "red.webp",
                "Silver": "silver.webp",
                "Серебристый": "silver.webp",
                "Серебристый (satin silver)": "silver.webp",
                "White": "white.webp",
                "Белый": "white.webp",
                "Белый (crystal white)": "white.webp",
            }
        },
        "X70": {
            "folder": "x70",
            "cyrillic": "Х70",
            "color": {
                "Black": "black.webp",
                "Черный": "black.webp",
                "Чёрный (ink black)": "black.webp",
                "Blue": "blue.webp",
                "Синий": "blue.webp",
                "Gray": "gray.webp",
                "Серый": "gray.webp",
                "Серый (titanium grey)": "gray.webp",
                "Red": "red.webp",
                "Красный": "red.webp",
                "Ярко-алый, красный (bright vermilion)": "red.webp",
                "Silver": "silver.webp",
                "Серебристый": "silver.webp",
                "Серебристый (pearl silver)": "silver.webp",
                "White": "white.webp",
                "Белый": "white.webp",
                "Белый (crystal white)": "white.webp",
            }
        },
    },
    "Gac": {
        "GN8": {
            "folder": "gn8",
            "cyrillic": "ГН8",
            "color": {
                "Черный": "black.webp",
                "Чёрный": "black.webp",
                "Синий": "blue.webp",
                "Коричневый": "brown.webp",
                "Белый": "white.webp",
            }
        },
        "GS3": {
            "folder": "gs3",
            "cyrillic": "ГС3",
            "color": {
                "Синий": "blue.webp",
                "Серый": "gray.webp",
                "Графитовый": "grey-graphite.webp",
                "Графеновый серый": "grey-graphite.webp",
                "Серебристый": "silver.webp",
                "Серебряный": "silver.webp",
                "Белый": "white.webp",
            }
        },
        "GS5": {
            "folder": "gs5",
            "cyrillic": "ГС5",
            "color": {
                "Черный": "black.webp",
                "Чёрный": "black.webp",
                "Коричневый": "brown.webp",
                "Серый": "gray.webp",
                "Голубой": "ice-blue.webp",
                "Серебристый": "silver.webp",
                "Серебряный": "silver.webp",
                "Белый": "white.webp",
            }
        },
        "GS8, I поколение": {
            "folder": "gs8",
            "cyrillic": "ГС8",
            "color": {
                "Черный": "black.webp",
                "Чёрный": "black.webp",
                "Синий": "blue.webp",
                "Коричневый": "brown.webp",
                "Серый": "gray.webp",
                "Голубой": "ice-blue.webp",
                "Белый": "white.webp",
            }
        },
        "GS8": {
            "folder": "gs8ii",
            "cyrillic": "ГС8",
            "color": {
                "Черный": "black.webp",
                "Чёрный": "black.webp",
                "Серый": "gray.webp",
                "Зеленый": "green.webp",
                "Зелёный": "green.webp",
                "Серебристый": "silver.webp",
                "Серебряный": "silver.webp",
                "Белый": "white.webp",
            }
        },
        "M8": {
            "folder": "m8",
            "cyrillic": "М8",
            "color": {
                "Черный": "black.webp",
                "Чёрный": "black.webp",
                "Синий": "blue.webp",
                "Зеленый": "green.webp",
                "Зелёный": "green.webp",
                "Золотой": "gold.webp",
                "Белый": "white.webp",
            }
        },
    },
    "KNEWSTAR": {
        "001": {
            "folder": "001",
            "cyrillic": "001",
            "color": {
                "Black": "black.webp",
                "Gray": "gray.webp",
                "White": "white.webp",
                "Red": "red.webp",
                "Красный": "red.webp",
                "Черный": "black.webp",
                "Серый": "gray.webp",
                "Белый": "white.webp",
            }
        },
    },
    "Jac": {
        "J7, I": {
            "folder": "j7",
            "cyrillic": "Джей7",
            "color": {
                "Черный": "black.webp",
                "Черный/черный": "black.webp",
                "Синий": "blue.webp",
                "Темно-серый": "gray.webp",
                "Серый": "gray.webp",
                "Серый металлик": "gray.webp",
                "Красный": "red.webp",
                "Белый": "white.webp",
            }},
        "JS3": {
            "folder": "js3",
            "cyrillic": "ДжейС3",
            "color": {
                "Черный": "black.webp",
                "Черный/черный": "black.webp",
                "Серебристо-темно-фиолето": "gray.webp",
                "Серый": "gray.webp",
                "Серый металлик": "gray.webp",
                "Серебристый": "silver.webp",
                "Белый": "white.webp",
            }},
        "JS6": {
            "folder": "js6",
            "cyrillic": "ДжейС6",
            "color": {
                "Черный": "black.webp",
                "Коричневый": "brown.webp",
                "Серый": "gray.webp",
                "Красный": "red.webp",
                "Белый": "white.webp",
            }},
        "T6": {
            "folder": "t6",
            "cyrillic": "Т6",
            "color": {
                "Черный": "black.webp",
                "Синий": "blue.webp",
                "Красный": "red.webp",
                "Серебристый": "silver.webp",
                "Серебристо-темно-фиолето": "silver.webp",
                "Белый": "white.webp",
            }},
        "T8": {
            "folder": "t8-pro",
            "cyrillic": "Т8 Про",
            "color": {
                "Белый": "white.webp",
                "Серый": "gray.webp",
                "Черный": "black.webp",
                "Красный": "red.webp",
                "Синий": "blue.webp",
            }},
        "T9": {
            "folder": "t9",
            "cyrillic": "Т9",
            "color": {
                "Черный": "black.webp",
                "Синий": "blue.webp",
                "Серый": "gray.webp",
                "Темно-серый": "gray.webp",
                "Светло-серый": "silver.webp",
                "Красный": "red.webp",
                "Серебристый": "silver.webp",
                "Белый": "white.webp",
            }},
    },
    "Jetour": {
        "Dashing": {
            "folder": "dashing",
            "cyrillic": "Дашинг",
            "color": {
                "White": "c1b.png",
                "Black": "c2b.png",
                "Red": "c3b.png",
                "Azure": "c4b.png",
                "Grey": "c5b.png",
                "Green": "c6b.png",
                "Lightgray": "c7b.png",
                "Белый": "c1b.png",
                "Черный": "c2b.png",
                "Красный": "c3b.png",
                "Лазурный": "c4b.png",
                "Серый": "c5b.png",
                "Зеленый": "c6b.png",
                "Светло-серый": "c7b.png",
            }
        },
        "T2": {
            "folder": "t2",
            "cyrillic": "Т2",
            "color": {
                "Black": "c1b.png",
                "Черный": "c1b.png",
                "Lightgray": "c2b.png",
                "Серебряный": "c2b.png",
                "Светло-серый": "c2b.png",
                "Золотой": "c3b.png",
                "Бежевый": "c3b.png",
                "Коричневый": "c3b.png",
                "Gold": "c3b.png",
                "Brown": "c3b.png",
                "Gray": "c4b.png",
                "Grey": "c4b.png",
                "Blue": "blue.png",
                "Серый": "c4b.png",
            }
        },
        "X50": {
            "folder": "x50",
            "cyrillic": "Х50",
            "color": {
                "Black": "black.png",
                "Черный": "black.png",
                "Gray": "gray.png",
                "Серый": "gray.png",
                "Lightgray": "light-gray.png",
                "Светло-серый": "light-gray.png",
                "White": "white.png",
                "Белый": "white.png",
            }
        },
        "X70 PLUS": {
            "folder": "x70plus",
            "cyrillic": "Х70 Плюс",
            "color": {
                "White": "c1b.png",
                "Белый": "c1b.png",
                "Grey": "c2b.png",
                "Silver": "c2b.png",
                "Серый": "c2b.png",
                "Red": "c3b.png",
                "Красный": "c3b.png",
                "Gray": "c4b.png",
                "Серый": "c4b.png",
                "Blue": "c5b.png",
                "Синий": "c5b.png",
                "Darkblue": "c6b.png",
                "Темно-синий": "c6b.png",
                "Black": "c7b.png",
                "Черный": "c7b.png",
                "Зеленый": "green.png",
                "Green": "green.png",
            }
        },
        "X70": {
            "folder": "x70plus",
            "cyrillic": "Х70 Плюс",
            "color": {
                "White": "c1b.png",
                "Белый": "c1b.png",
                "Grey": "c2b.png",
                "Silver": "c2b.png",
                "Серебряный": "c2b.png",
                "Серый": "c2b.png",
                "Red": "c3b.png",
                "Красный": "c3b.png",
                "Gray": "c4b.png",
                "Серый": "c4b.png",
                "Blue": "c5b.png",
                "Синий": "c5b.png",
                "Darkblue": "c6b.png",
                "Темно-синий": "c6b.png",
                "Black": "c7b.png",
                "Черный": "c7b.png",
            }
        },
        "X90 PLUS": {
            "folder": "x90plus",
            "cyrillic": "Х90 Плюс",
            "color": {
                "White": "c1b.png",
                "Black": "c2b.png",
                "Blue": "c3b.png",
                "Violet": "c4b.png",
                "Grey": "c5b.png",
                "Белый": "c1b.png",
                "Черный": "c2b.png",
                "Синий": "c3b.png",
                "Фиолетовый": "c4b.png",
                "Серый": "c5b.png",
            }
        }
    },
    "Kaiyi": {
        "E5": {
            "folder": "e5",
            "cyrillic": "Е5",
            "color": {
                "Black": "black.png",
                "Черный": "black.png",
                "Gray": "gray.png",
                "Grey": "gray.png",
                "Серый": "gray.png",
                "Red": "red.png",
                "Красный": "red.png",
                "Silver": "white.png",
                "Серебристый": "white.png",
                "Серебряный": "white.png",
                "White": "white.png",
                "Белый": "white.png",
            }},
        "X3": {
            "folder": "x3",
            "cyrillic": "Х3",
            "color": {
                "Black": "black.png",
                "Blue": "blue.png",
                "Dark-gray": "dark-gray.png",
                "Light-gray": "light-gray.png",
                "Grey": "light-gray.png",
                "Red": "red.png",
                "White": "white.png",
                "Черный": "black.png",
                "Синий": "blue.png",
                "Серый": "dark-gray.png",
                "Темно-серый": "dark-gray.png",
                "Светло-серый": "light-gray.png",
                "Красный": "red.png",
                "Серебристый": "white.png",
                "Белый": "white.png",
            }},
        "X3 PRO": {
            "folder": "x3pro",
            "cyrillic": "Х3 Про",
            "color": {
                "Black": "black.png",
                "Blue": "blue.png",
                "Dark-gray": "dark-gray.png",
                "Light-gray": "light-gray.png",
                "Grey": "light-gray.png",
                "Red": "red.png",
                "White": "white.png",
                "Черный": "black.png",
                "Синий": "blue.png",
                "Серый": "dark-gray.png",
                "Темно-серый": "dark-gray.png",
                "Светло-серый": "light-gray.png",
                "Красный": "red.png",
                "Серебристый": "white.png",
                "Белый": "white.png",
            }},
        "X7 Kunlun": {
            "folder": "x7-kunlun",
            "cyrillic": "Х7 Кунлун",
            "color": {
                "Black": "black.png",
                "Dark-blue": "dark-blue.png",
                "Dark-gray": "dark-gray.png",
                "Light-gray": "light-gray.png",
                "Grey": "light-gray.png",
                "Purple": "purple.png",
                "White": "white.png",
                "Черный": "black.png",
                "Серый": "dark-gray.png",
                "Темно-серый": "dark-gray.png",
                "Светло-серый": "light-gray.png",
                "Синий": "dark-blue.png",
                "Темно-синий": "dark-blue.png",
                "Фиолетовый": "purple.png",
                "Серебристый": "white.png",
                "Белый": "white.png",
            }},
    },
    "Livan": {
        "X3 Pro": {
            "folder": "x3pro",
            "cyrillic": "Х3 Про",
            "color": {
                "Beige": "gold.webp",
                "White": "white.webp",
                "Red": "red.webp",
                "Blue": "blue.webp",
                "Azure": "blue.webp",
                "Gray": "gray.webp",
                "Grey": "gray.webp",
            }},
        "X6 Pro": {
            "folder": "x6pro",
            "cyrillic": "Х6 Про",
            "color": {
                "White": "white.webp",
                "Blue": "blue.webp",
                "Gray": "gray.webp",
                "Grey": "gray.webp",
                "Green": "green.webp",
            }},
        "S6 Pro": {
            "folder": "s6pro",
            "cyrillic": "С6 Про",
            "color": {
                "White": "white.webp",
                "Blue": "blue.webp",
                "Gray": "gray.webp",
                "Grey": "gray.webp",
            }},
    },
    "Kia": {
        "K5, III": {
            "folder": "k5",
            "cyrillic": "К5",
            "color": {
                "Черный": "aurora-black-pearl.webp",
            }
        },
        "Seltos, I Рестайлинг": {
            "folder": "seltos",
            "cyrillic": "Селтос",
            "color": {
                "Темно-серый": "glittering-metal.webp",
                "Серый": "silky-silver.webp",
                "Белый": "snow-white.webp",
            }
        },
        "Seltos, I": {
            "folder": "seltos",
            "cyrillic": "Селтос",
            "color": {
                "Серый": "silky-silver.webp",
            }
        },
        "Sorento, IV Рестайлинг": {
            "folder": "sorento",
            "cyrillic": "Соренто",
            "color": {
                "Белый": "snow-white.webp",
                "Серый": "steel-gray.webp",
                "Темно-серый": "platinum-graphite.webp",
                "Черный": "aurora-black-pearl.webp",
            }
        },
        "Sportage, V": {
            "folder": "sportage",
            "cyrillic": "Спортаж",
            "color": {
                "Белый": "snow-white.webp",
                "Серый": "steel-gray.webp",
                "Серый (basalt gray)": "steel-gray.webp",
                "Темно-серый": "gravity-gray.webp",
                "Черный": "modern-black.webp",
            }
        },
    }
}
