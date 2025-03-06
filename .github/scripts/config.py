dealer = {
    "city": "Оренбург",
    "where": "Оренбурге",
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
                "Белый": "white.png",
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
            "cyrillic": "Икс 35",
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
            "cyrillic": "Икс 55",
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
            "cyrillic": "Икс 7",
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
            "cyrillic": "Икс 75",
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
            "cyrillic": "Икс 50",
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
            "cyrillic": "Икс 70",
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
                "Голубой": "blue.webp",
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
        "GS8, II": {
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
            "cyrillic": "Джей 7",
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
            "cyrillic": "Джей Эс 3",
            "color": {
                "Черный": "black.webp",
                "Черный/черный": "black.webp",
                "Серебристо-темно-фиолето": "gray.webp",
                "Серый": "gray.webp",
                "Серый металлик": "gray.webp",
                "Темно-серый": "gray.webp",
                "Серебристый": "silver.webp",
                "Белый": "white.webp",
            }},
        "JS6": {
            "folder": "js6",
            "cyrillic": "Джей Эс 6",
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
        "Dashing, I": {
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
                "Чёрный": "c2b.png",
                "Красный": "c3b.png",
                "Лазурный": "c4b.png",
                "Cиний": "c4b.png",
                "Серый": "c5b.png",
                "Зеленый": "c6b.png",
                "Зелёный": "c6b.png",
                "Светло-серый": "c7b.png",
            }
        },
        "T2": {
            "folder": "t2",
            "cyrillic": "Т2",
            "color": {
                "Black": "c1b.png",
                "Черный": "c1b.png",
                "Чёрный": "c1b.png",
                "Silver": "c2b.png",
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
                "Серый": "c4b.png",
                "Blue": "blue.png",
                "Синий": "blue.png",
            }
        },
        "X50": {
            "folder": "x50",
            "cyrillic": "Икс 50",
            "color": {
                "Black": "black.png",
                "Черный": "black.png",
                "Чёрный": "black.png",
                "Gray": "gray.png",
                "Серый": "gray.png",
                "Lightgray": "light-gray.png",
                "Светло-серый": "light-gray.png",
                "White": "white.png",
                "Белый": "white.png",
            }
        },
        "X70 PLUS, I": {
            "folder": "x70plus",
            "cyrillic": "Икс 70 Плюс",
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
                "Зеленый": "green.png",
                "Зелёный": "green.png",
                "Green": "green.png",
            }
        },
        "X70 PLUS, I Рестайлинг": {
            "folder": "x70plus",
            "cyrillic": "Икс 70 Плюс",
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
                "Чёрный": "c7b.png",
                "Зеленый": "green.png",
                "Зелёный": "green.png",
                "Green": "green.png",
            }
        },
        "X70": {
            "folder": "x70plus",
            "cyrillic": "Икс 70 Плюс",
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
            "cyrillic": "Икс 90 Плюс",
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
            "cyrillic": "Икс 3",
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
                "Серый": "light-gray.png",
                "Темно-серый": "dark-gray.png",
                "Светло-серый": "light-gray.png",
                "Красный": "red.png",
                "Серебристый": "white.png",
                "Белый": "white.png",
            }},
        "X3 PRO": {
            "folder": "x3pro",
            "cyrillic": "Икс 3 Про",
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
            "cyrillic": "Икс 7 Кунлун",
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
            "cyrillic": "Икс 3 Про",
            "color": {
                "Beige": "gold.webp",
                "Золотой": "gold.webp",
                "Бежевый": "gold.webp",
                "Желтый": "gold.webp",
                "White": "white.webp",
                "Белый": "white.webp",
                "Red": "red.webp",
                "Красный": "red.webp",
                "Blue": "blue.webp",
                "Azure": "blue.webp",
                "Лазурный": "blue.webp",
                "Синий": "blue.webp",
                "Голубой": "blue.webp",
                "Gray": "gray.webp",
                "Grey": "gray.webp",
                "Серый": "gray.webp",
            }},
        "X6 Pro": {
            "folder": "x6pro",
            "cyrillic": "Икс 6 Про",
            "color": {
                "White": "white.webp",
                "Белый": "white.webp",
                "Blue": "blue.webp",
                "Синий": "blue.webp",
                "Голубой": "blue.webp",
                "Gray": "gray.webp",
                "Grey": "gray.webp",
                "Dark grey": "gray.webp",
                "Темно-серый": "gray.webp",
                "Серый": "gray.webp",
                "Green": "green.webp",
                "Зеленый": "green.webp",
            }},
        "S6 Pro": {
            "folder": "s6pro",
            "cyrillic": "С6 Про",
            "color": {
                "White": "white.webp",
                "Белый": "white.webp",
                "Blue": "blue.webp",
                "Синий": "blue.webp",
                "Голубой": "blue.webp",
                "Gray": "gray.webp",
                "Grey": "gray.webp",
                "Dark grey": "gray.webp",
                "Темно-серый": "gray.webp",
                "Серый": "gray.webp",
            }},
    },
    "Changan": {
        "Alsvin": {
            "folder": "alsvin",
            "color": {
                "Black": "black.webp",
                "Черный": "black.webp",
                "Blue": "blue.webp",
                "Синий": "blue.webp",
                "Gray": "gray.webp",
                "Серый": "grey.webp",
                "Red": "red.webp",
                "Красный": "red.webp",
                "Silver": "silver.webp",
                "Серебряный": "silver.webp",
                "White": "white.webp",
                "Белый": "white.webp",
            }
        },
        "CS55PLUS, I Рестайлинг": {
            "folder": "cs55plus",
            "color": {
                "Atomic_grey": "cs55plus_atomic_grey.webp",
                "Атомный серый": "cs55plus_atomic_grey.webp",
                "Светло-серый": "cs55plus_atomic_grey.webp",
                "Deep_black": "cs55plus_deep_black.webp",
                "Глубокий черный": "cs55plus_deep_black.webp",
                "Черный": "cs55plus_deep_black.webp",
                "Pearl_white": "cs55plus_pearl_white.webp",
                "Перламутровый белый": "cs55plus_pearl_white.webp",
                "Белый": "cs55plus_pearl_white.webp",
                "Spark_red": "cs55plus_spark_red.webp",
                "Искрящийся красный": "cs55plus_spark_red.webp",
                "Красный": "cs55plus_spark_red.webp",
                "Star_grey": "cs55plus_star_grey.webp",
                "Звездный серый": "cs55plus_star_grey.webp",
                "Серый": "cs55plus_star_grey.webp",
            }
        },
        "CS35PLUS, I Рестайлинг": {
            "folder": "cs35plus new",
            "color": {
                "Crystal_white": "cs35plusnew_crystal_white.webp",
                "Кристально белый": "cs35plusnew_crystal_white.webp",
                "Белый": "cs35plusnew_crystal_white.webp",
                "Ashen_grey": "cs35plusnew_ashen_grey.webp",
                "Серебристый пепел": "cs35plusnew_ashen_grey.webp",
                "Пепел": "cs35plusnew_ashen_grey.webp",
                "Spark_red": "cs35plusnew_spark_red.webp",
                "Искрящийся красный": "cs35plusnew_spark_red.webp",
                "Красный": "cs35plusnew_spark_red.webp",
                "Mountain_grey": "cs35plusnew_mountain_grey.webp",
                "Горный серый": "cs35plusnew_mountain_grey.webp",
                "Серый": "cs35plusnew_mountain_grey.webp",
            }
        },
        "CS75PLUS": {
            "folder": "cs75plus",
            "color": {
                "Atomic_grey": "cs75plus_atomic_grey.webp",
                "Атомный серый": "cs75plus_atomic_grey.webp",
                "Серый": "cs75plus_atomic_grey.webp",
                "Deep_black": "cs75plus_deep_black.webp",
                "Глубокий черный": "cs75plus_deep_black.webp",
                "Черный": "cs75plus_deep_black.webp",
                "Mountain_grey": "cs75plus_mountain_grey.webp",
                "Горный серый": "cs75plus_mountain_grey.webp",
                "Серый": "cs75plus_mountain_grey.webp",
                "Crystal_white": "cs75plus_crystal_white.webp",
                "Кристальный белый": "cs75plus_crystal_white.webp",
                "Белый": "cs75plus_crystal_white.webp",
                "Crystal_blue": "cs75plus_crystal_blue.webp",
                "Кристальный синий": "cs75plus_crystal_blue.webp",
                "Синий": "cs75plus_crystal_blue.webp",
            }
        },
        "CS85COUPE": {
            "folder": "cs85coupe",
            "color": {
                "Black": "cs85_black.webp",
                "Тихий черный": "cs85_black.webp",
                "Черный": "cs85_black.webp",
                "Blue": "cs85_blue.webp",
                "Сияющий синий": "cs85_blue.webp",
                "Синий": "cs85_blue.webp",
                "White": "cs85_white.webp",
                "Полярный белый": "cs85_white.webp",
                "Белый": "cs85_white.webp",
                "Red": "cs85_red.webp",
                "Сияющий красный": "cs85_red.webp",
                "Красный": "cs85_red.webp",
                "Viol": "cs85_viol.webp",
                "Глубокий фиолетовый": "cs85_viol.webp",
                "Фиолетовый": "cs85_viol.webp",
                "Grey": "cs85_grey.webp",
                "Серебристый серый": "cs85_grey.webp",
                "Серый": "cs85_grey.webp",
            }
        },
        "CS95": {
            "folder": "cs95",
            "color": {
                "White": "cs95_white.webp",
                "Полярный белый": "cs95_white.webp",
                "Белый": "cs95_white.webp",
                "Grey": "cs95_grey.webp",
                "Горный серый": "cs95_grey.webp",
                "Серый": "cs95_grey.webp",
                "Black": "cs95_black.webp",
                "Благородный черный": "cs95_black.webp",
                "Черный": "cs95_black.webp",
            }
        },
        "CS95, I Рестайлинг 2": {
            "folder": "cs95",
            "color": {
                "White": "cs95_white.webp",
                "Полярный белый": "cs95_white.webp",
                "Белый": "cs95_white.webp",
                "Grey": "cs95_grey.webp",
                "Горный серый": "cs95_grey.webp",
                "Серый": "cs95_grey.webp",
                "Black": "cs95_black.webp",
                "Благородный черный": "cs95_black.webp",
                "Черный": "cs95_black.webp",
            }
        },
        "CS95PLUS": {
            "folder": "cs95new",
            "color": {
                "Noble_black": "cs95new_noble_black.webp",
                "Благородный черный": "cs95new_noble_black.webp",
                "Черный": "cs95new_noble_black.webp",
                "Mountain_grey": "cs95new_mountain_grey.webp",
                "Горный серый": "cs95new_mountain_grey.webp",
                "Серый": "cs95new_mountain_grey.webp",
                "Polar_white": "cs95new_polar_white.webp",
                "Полярный белый": "cs95new_polar_white.webp",
                "Белый": "cs95new_polar_white.webp",
            }
        },
        "Eado Plus": {
            "folder": "eadoplus",
            "color": {
                "Black": "eadoplus_black.webp",
                "Глубокий черный": "eadoplus_black.webp",
                "Черный": "eadoplus_black.webp",
                "Grey": "eadoplus_grey.webp",
                "Космический серый": "eadoplus_grey.webp",
                "Серый": "eadoplus_grey.webp",
                "White": "eadoplus_white.webp",
                "Звездный белый": "eadoplus_white.webp",
                "Белый": "eadoplus_white.webp",
                "Silver": "eadoplus_silver.webp",
                "Титановый серебристый": "eadoplus_silver.webp",
                "Серебристый": "eadoplus_silver.webp",
                "Red": "eadoplus_red.webp",
                "Искрящийся красный": "eadoplus_red.webp",
                "Красный": "eadoplus_red.webp",
            }
        },
        "Lamore": {
            "folder": "lamore",
            "color": {
                "Deep_black": "lamore_deep_black.webp",
                "Глубокий черный": "lamore_deep_black.webp",
                "Черный": "lamore_deep_black.webp",
                "Mountain_grey": "lamore_mountain_grey.webp",
                "Горный серый": "lamore_mountain_grey.webp",
                "Серый": "lamore_mountain_grey.webp",
                "Shining_red": "lamore_shining_red.webp",
                "Сияющий красный": "lamore_shining_red.webp",
                "Красный": "lamore_shining_red.webp",
                "Starry_white": "lamore_starry_white.webp",
                "Звездный белый": "lamore_starry_white.webp",
                "Белый": "lamore_starry_white.webp",
                "Exquisite_green": "lamore_exquisite_green.webp",
                "Изысканный зеленый": "lamore_exquisite_green.webp",
                "Зеленый": "lamore_exquisite_green.webp",
            }
        },
        "UNI-T, I Рестайлинг": {
            "folder": "uni-t",
            "color": {
                "Air_blue": "uni-t_air_blue.webp",
                "Воздушный голубой": "uni-t_air_blue.webp",
                "Голубой": "uni-t_air_blue.webp",
                "Atomic_grey": "uni-t_atomic_grey.webp",
                "Атомный серый": "uni-t_atomic_grey.webp",
                "Серый": "uni-t_atomic_grey.webp",
                "Star_grey": "uni-t_star_grey.webp",
                "Звездный серый": "uni-t_star_grey.webp",
                "Темно-серый": "uni-t_star_grey.webp",
                "Pearl_white": "uni-t_pearl_white.webp",
                "Перламутровый белый": "uni-t_pearl_white.webp",
                "Белый": "uni-t_pearl_white.webp",
                "Pitch_black": "uni-t_pitch_black.webp",
                "Глубокий черный": "uni-t_pitch_black.webp",
                "Черный": "uni-t_pitch_black.webp",
                "Sky_blue": "uni-t_sky_blue.webp",
                "Небесный синий": "uni-t_sky_blue.webp",
                "Синий": "uni-t_sky_blue.webp",
            }
        },
        "UNI-V": {
            "folder": "uni-v",
            "color": {
                "Atomic_grey": "uni-v_atomic_grey.webp",
                "Атомный серый": "uni-v_atomic_grey.webp",
                "Серый": "uni-v_atomic_grey.webp",
                "Bursting_blue": "uni-v_bursting_blue.webp",
                "Взрывной синий": "uni-v_bursting_blue.webp",
                "Синий": "uni-v_bursting_blue.webp",
                "Moonlight_white": "uni-v_moonlight_white.webp",
                "Лунный белый": "uni-v_moonlight_white.webp",
                "Белый": "uni-v_moonlight_white.webp",
                "Star_dark": "uni-v_star_dark.webp",
                "Звездный черный": "uni-v_star_dark.webp",
                "Черный": "uni-v_star_dark.webp",
                "Dazzling_red": "uni-v_dazzling_red.webp",
                "Ослепительный красный": "uni-v_dazzling_red.webp",
                "Красный": "uni-v_dazzling_red.webp",
                "Sparkling_grey": "uni-v_sparkling_grey.webp",
                "Искрящийся серый": "uni-v_sparkling_grey.webp",
                "Серый": "uni-v_sparkling_grey.webp",
            }
        },
        "UNI-K": {
            "folder": "uni-k",
            "color": {
                "Air-blue": "uni-k_air-blue.webp",
                "Воздушный голубой": "uni-k_air-blue.webp",
                "Голубой": "uni-k_air-blue.webp",
                "Atomic-grey": "uni-k_atomic-grey.webp",
                "Атомный серый": "uni-k_atomic-grey.webp",
                "Серый": "uni-k_atomic-grey.webp",
                "Star-grey": "uni-k_star-grey.webp",
                "Звездный серый": "uni-k_star-grey.webp",
                "Серый": "uni-k_star-grey.webp",
                "Pearl-white": "uni-k_pearl-white.webp",
                "Перламутровый белый": "uni-k_pearl-white.webp",
                "Белый": "uni-k_pearl-white.webp",
                "Pitch-black": "uni-k_pitch-black.webp",
                "Глубокий черный": "uni-k_pitch-black.webp",
                "Черный": "uni-k_pitch-black.webp",
                "Sky-blue": "uni-k_sky-blue.webp",
                "Небесный синий": "uni-k_sky-blue.webp",
                "Синий": "uni-k_sky-blue.webp",
            }
        },
        "UNI-K, IDD": {
            "folder": "uni-k idd",
            "color": {
                "Atomic-gray": "uni-k_idd_atomic-gray.webp",
                "Атомный серый": "uni-k_idd_atomic-gray.webp",
                "Серый": "uni-k_idd_atomic-gray.webp",
                "Deep-black": "uni-k_idd_deep-black.webp",
                "Глубокий черный": "uni-k_idd_deep-black.webp",
                "Черный": "uni-k_idd_deep-black.webp",
                "Star-gray": "uni-k_idd_star-gray.webp",
                "Звездный серый": "uni-k_idd_star-gray.webp",
                "Серый": "uni-k_idd_star-gray.webp",
                "Sky-gray": "uni-k_idd_sky-gray.webp",
                "Небесный синий": "uni-k_idd_sky-gray.webp",
                "Синий": "uni-k_idd_sky-gray.webp",
                "Pearl-white": "uni-k_idd_pearl-white.webp",
                "Перламутровый белый": "uni-k_idd_pearl-white.webp",
                "Белый": "uni-k_idd_pearl-white.webp",
            }
        },
        "Hunter Plus": {
            "folder": "hunterplus",
            "color": {
                "Snowy-white": "hunderplus-snowy-white.webp",
                "Снежный белый": "hunderplus-snowy-white.webp",
                "Белый": "hunderplus-snowy-white.webp",
                "Silver-grey": "hunderplus-silver-grey.webp",
                "Серебристый серый": "hunderplus-silver-grey.webp",
                "Серый": "hunderplus-silver-grey.webp",
                "Mountain-grey": "hunderplus-mountain-grey.webp",
                "Горный серый": "hunderplus-mountain-grey.webp",
                "Серый": "hunderplus-mountain-grey.webp",
                "Cobalt-blue": "hunderplus-cobalt-blue.webp",
                "Кобальтовый синий": "hunderplus-cobalt-blue.webp",
                "Синий": "hunderplus-cobalt-blue.webp",
                "Ruby-red": "hunderplus-ruby-red.webp",
                "Рубиновый красный": "hunderplus-ruby-red.webp",
                "Красный": "hunderplus-ruby-red.webp",
            }
        },
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
            "folder": "sorento2024",
            "cyrillic": "Соренто",
            "color": {
                "Белый": "white.webp",
                "Серый": "gray.webp",
                "Темно-серый": "gray.webp",
                "Черный": "black.webp",
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
    },
    "Haval": {
        "H9": {
            "folder": "h9",
            "cyrillic": "H9",
            "color": {
                "Сумрачный изумруд": "dusky-emerald.webp",
                "Лунный базальт": "lunar-basalt.webp",
                "Снежный оникс": "snow-onyx.webp",
                "Черный нефрит": "black-jade.webp",
            }
        },
        "H3": {
            "folder": "h3",
            "cyrillic": "H3",
            "color": {
                "Неоновый турмалин": "neon-tourmaline.webp",
                "Галактический черный": "galactic-black.webp",
                "Пепельный антрацит": "ashy-anthracite.webp",
                "Благородный агат": "noble-agate.webp",
                "Терракотовый сапфир": "terracotta-sapphire.webp",
            }
        },
        "H5": {
            "folder": "h5",
            "cyrillic": "H5",
            "color": {
                "Черный нефрит": "black-jade.webp",
                "Снежный опал": "snow-opal.webp",
                "Туманный базальт": "foggy-basalt.webp",
                "Сумеречный аметист": "twilight-amethyst.webp",
            }
        },
        "F7": {
            "folder": "f7",
            "cyrillic": "F7",
            "color": {
                "Океанический лазурит": "oceanic-lapis-lazuli.webp",
                "Галактический черный": "galactic-black.webp",
                "Благородный агат": "noble-agate.webp",
                "Дымчатый жемчуг": "smoky-pearls.webp",
            }
        },
        "JOLION": {
            "folder": "jolion",
            "cyrillic": "JOLION",
            "color": {
                "Благородный агат": "noble-agate.webp",
                "Океанический лазурит": "heavenly-topaz.webp",
                "Магматический красный": "magmatic-red.webp",
                "Платиновый неон": "platinum-neon.webp",
                "Галактический черный": "galactic-black.webp",
                "Дымчатый жемчуг": "smoky-pearls.webp",
            }
        },
        "M6": {
            "folder": "m6",
            "cyrillic": "M6",
            "color": {
                "Серый": "gray.webp",
                "Черный": "black.webp",
                "Белый": "white.webp",
            }
        },
        "DARGO X": {
            "folder": "dargo-x",
            "cyrillic": "DARGO X",
            "color": {
                "Терракотовый сапфир": "terracotta-sapphire.webp",
                "Красный": "terracotta-sapphire.webp",
                "Графитовый кварц": "graphite-quartz.webp",
                "Серый": "graphite-quartz.webp",
                "Галактический черный / Черный нефрит": "galactic-black.webp",
                "Черный": "galactic-black.webp",
                "Чёрный": "galactic-black.webp",
                "Благородный агат": "noble-agate.webp",
                "Белый": "noble-agate.webp",
            }
        },
        "DARGO": {
            "folder": "dargo-x",
            "cyrillic": "DARGO",
            "color": {
                "Графитовый кварц": "graphite-quartz.webp",
                "Серый": "graphite-quartz.webp",
                "Терракотовый сапфир": "terracotta-sapphire.webp",
                "Красный": "terracotta-sapphire.webp",
                "Благородный агат": "noble-agate.webp",
                "Белый": "noble-agate.webp",
                "Галактический черный / Черный нефрит": "galactic-black.webp",
                "Черный": "galactic-black.webp",
                "Чёрный": "galactic-black.webp",
            }
        },
        "POER KINGKONG": {
            "folder": "poer-king-kong",
            "cyrillic": "POER KINGKONG",
            "color": {
                "Голубой": "blue.webp",
                "Черный": "black.webp",
                "Красный": "red.webp",
                "Серый": "gray.webp",
                "Серебристый": "silver.webp",
                "Белый": "white.webp",

            }
        },
        "POER": {
            "folder": "poer",
            "cyrillic": "POER",
            "color": {
                "Коричневый": "brown.webp",
                "Черный": "black.webp",
                "Красный": "red.webp",
                "Синий": "blue.webp",
                "Серый": "gray.webp",
                "Белый": "white.webp",
            }
        },
    },
    "Omoda": {
        "C5, I": {
            "folder": "c5",
            "cyrillic": "ЦЕ 5",
            "color": {
                "Black": "black.webp",
                "Черный": "black.webp",
                "Dark-blue": "dark-blue.webp",
                "Темно-синий": "dark-blue.webp",
                "Синий": "dark-blue.webp",
                "Gray": "gray.webp",
                "Серый": "gray.webp",
                "Green": "green.webp",
                "Зеленый": "green.webp",
                "Red": "red.webp",
                "Красный": "red.webp",
                "Silver": "silver.webp",
                "Серебряный": "silver.webp",
                "Vanila Blue": "vanila-blue.webp",
                "Ванильный синий": "vanila-blue.webp",
                "White": "white.webp",
                "Белый": "white.webp"
            }
        },
        "C5, I Рестайлинг": {
            "folder": "c5fl",
            "cyrillic": "ЦЕ 5 ЭФ ЭЛ",
            "color": {
                "Black": "black.webp",
                "Черный": "black.webp",
                "Blue": "blue.webp",
                "Синий": "blue.webp",
                "Gray": "gray.webp",
                "Серый": "gray.webp",
                "Red": "red.webp",
                "Красный": "red.webp",
                "Silver-black": "silver-black.webp",
                "Серебряный-чёрный": "silver-black.webp",
                "Silver": "silver.webp",
                "Серебряный": "silver.webp",
                "White-black": "white-black.webp",
                "Белый-чёрный": "white-black.webp",
                "White": "white.webp",
                "Белый": "white.webp"
            }
        },
        "S5": {
            "folder": "s5",
            "cyrillic": "ЭС 5",
            "color": {
                "Black": "black.webp",
                "Черный": "black.webp",
                "Blue": "blue.webp",
                "Синий": "blue.webp",
                "Gray": "gray.webp",
                "Серый": "gray.webp",
                "Red": "red.webp",
                "Красный": "red.webp",
                "Steel": "steel.webp",
                "Стальной": "steel.webp",
                "White": "white.webp",
                "Белый": "white.webp"
            }
        },
        "S5 GT": {
            "folder": "s5gt",
            "cyrillic": "ЭС 5 ДЖЕЙ ТИ",
            "color": {
                "Black": "black.webp",
                "Черный": "black.webp",
                "Blue": "blue.webp",
                "Синий": "blue.webp",
                "Gray": "gray.webp",
                "Серый": "gray.webp",
                "Green": "green.webp",
                "Зеленый": "green.webp",
                "Red": "red.webp",
                "Красный": "red.webp",
                "Steel": "steel.webp",
                "Стальной": "steel.webp",
                "White": "white.webp",
                "Белый": "white.webp"
            }
        }
    },
    "Jaecoo": {
        "J7": {
            "folder": "j7",
            "cyrillic": "Джей 7",
            "color": {
                "Black": "black.webp",
                "Черный": "black.webp",
                "Gray-blue-black": "gray-blue-black.webp",
                "Серо-голубой-черный": "gray-blue-black.webp",
                "Gray-blue": "gray-blue.webp",
                "Серо-голубой": "gray-blue.webp",
                "Green-black": "green-black.webp",
                "Зеленый-черный": "green-black.webp",
                "Green": "green.webp",
                "Зеленый": "green.webp",
                "Silver-black": "silver-black.webp",
                "Серебристо-черный": "silver-black.webp",
                "Silver": "silver.webp",
                "Серебряный": "silver.webp",
                "White": "white.webp",
                "Белый": "white.webp",
            }
        },
        "J8": {
            "folder": "j8",
            "cyrillic": "Джей 8",
            "color": {
                "Black": "black.webp",
                "Черный": "black.webp",
                "Dark-gray-black": "dark-gray-black.webp",
                "Темно-серый-черный": "dark-gray-black.webp",
                "Dark-gray": "dark-gray.webp",
                "Темно-серый": "dark-gray.webp",
                "Gray-black": "gray-black.webp",
                "Серый-черный": "gray-black.webp",
                "Gray-blue-black": "gray-blue-black.webp",
                "Серо-голубой-черный": "gray-blue-black.webp",
                "Gray-blue": "gray-blue.webp",
                "Серо-голубой": "gray-blue.webp",
                "Gray": "gray.webp",
                "Серый": "gray.webp",
                "White-black": "white-black.webp",
                "Белый-черный": "white-black.webp",
                "White": "white.webp",
                "Белый": "white.webp",
            }
        },
    }
}
