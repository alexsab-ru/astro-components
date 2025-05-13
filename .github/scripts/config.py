#!/usr/bin/env python
import json
import os

# Загружаем model_mapping из JSON файла
def load_model_mapping():
    """Загрузка маппинга моделей из JSON файла."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(current_dir, 'model_mapping.json')
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Ошибка при загрузке model_mapping.json: {e}")
        return {}

model_mapping = load_model_mapping()

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
