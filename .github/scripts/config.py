#!/usr/bin/env python
import json
import os

COLOROFF='\033[0m'
BGYELLOW='\033[30;43m'
BGGREEN='\033[30;42m'
BGRED='\033[30;41m'
TEXTRED='\033[30;31m'

def print_message(message, type='info'):
    if type == 'info':
        print(message)
    elif type == 'warning':
        print(f"{BGYELLOW}{message}{COLOROFF}")
    elif type == 'error':
        print(f"{BGRED}{message}{COLOROFF}")
    elif type == 'success':
        print(f"{BGGREEN}{message}{COLOROFF}")

    with open('output.txt', 'a') as file:
        file.write(f"{message}\n")

def load_all_models(json_path: str = "./src/data/all-models.json"):
    """Загружаем полный список моделей из all-models.json.

    Возвращает список объектов моделей, как есть в файле.
    """
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print_message(f"Ошибка при загрузке {json_path}: {e}", 'error')
        return []


def build_all_models_index(all_models: list) -> dict:
    """Строим индекс для быстрого доступа: { mark_id: { id: model_obj } }"""
    index: dict = {}
    for model in all_models:
        brand = model.get('mark_id').lower()
        model_id = model.get('id').lower()
        if not brand or not model_id:
            continue
        index.setdefault(brand, {})[model_id] = model
    return index


# Глобально подгружаем all-models и индекс для быстрых запросов
all_models_data = load_all_models()
# Строим индекс моделей по бренду и сохраняем результат в файл для тестирования
all_models_index_by_brand = build_all_models_index(all_models_data)
with open('src/data/all_models_index_by_brand.json', 'w', encoding='utf-8') as f:
    # Документируем: сохраняем файл с группировкой по бренду и ID, для ознакомления
    # Это поможет быстро анализировать структуру и использовать её в других скриптах
    json.dump(all_models_index_by_brand, f, ensure_ascii=False, indent=2)


# Генерация model_mapping из файла all-models.json
def load_model_mapping(json_path: str = "./src/data/all-models.json"):
    """Загрузка и построение мэпинга моделей из all-models.json.

    ВАЖНО: Раньше мы читали готовый объект из model_mapping.json. Теперь источник данных —
    большой файл all-models.json, где каждая запись описывает модель.

    Требуемый результат — компактный объект для быстрого поиска:
        model_mapping[brand][model_name] = { "mark_id": <brand>, "id": <model_id> }

    - brand берём из поля "mark_id"
    - model_name — из всех значений массива "feed_names"
    - если у конкретной записи нет feed_names, используем поле "name" как резервный ключ

    Такой подход обеспечивает обратную совместимость по функционалу поиска модели,
    при этом сам объект теперь минимальный и быстрый в работе.

    Args:
        json_path (str): Путь к файлу all-models.json

    Returns:
        dict: Словарь вида { brand: { model_name: { mark_id, id } } }
    """

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            all_models = json.load(f)
    except Exception as e:
        print_message(f"Ошибка при загрузке {json_path}: {e}", 'error')
        return {}

    mapping: dict = {}

    # Проходим по всем моделям и собираем мэпинг
    for model in all_models:
        # Безопасно читаем ключевые поля
        brand = model.get('mark_id').lower()
        model_id = model.get('id').lower()
        feed_names = model.get('feed_names') or []

        # Если ключевых полей нет — пропускаем запись
        if not brand or not model_id:
            continue

        # Создаём ветку бренда при необходимости
        if brand not in mapping:
            mapping[brand] = {}

        # Если feed_names пуст, используем основное имя модели как ключ
        model_names = [name for name in feed_names if isinstance(name, str) and name.strip()]
        if not model_names:
            fallback_name = model.get('name')
            if isinstance(fallback_name, str) and fallback_name.strip():
                model_names = [fallback_name]

        # Записываем все синонимы модели в мэпинг
        for model_name in model_names:
            mapping[brand][model_name.lower()] = {
                'mark_id': brand,
                'id': model_id,
            }

    return mapping

model_mapping = load_model_mapping()

# Сохраняем model_mapping в JSON для отладки и повторного использования
with open('src/data/model_mapping.json', 'w', encoding='utf-8') as f:
    # Документируем: сохраняем мэпинг моделей в файл model_mapping.json
    # Это поможет быстро анализировать структуру и использовать её в других скриптах
    json.dump(model_mapping, f, ensure_ascii=False, indent=2)



def get_model_info(brand: str, model: str, property: str = None, color: str = None, vin: str = None) -> str | dict | None:
    """
    Получение информации о модели автомобиля на основе нового мэпинга.

    Теперь поддерживаются только свойства мэпинга:
      - 'mark_id' — бренд из all-models.json
      - 'id' — идентификатор модели (slug) из all-models.json

    Поиск модели идёт по любому имени из массива feed_names (или по name, если feed_names пуст).

    Args:
        brand: Название бренда (любая регистровая форма)
        model: Название модели (значение из feed_names или name)
        property: Запрашиваемое свойство ('mark_id' или 'id')
        color: Цвет автомобиля (не поддерживается в новой схеме)
        vin: VIN автомобиля (для удобства логирования)

    Returns:
        str | dict | None: Значение свойства, словарь модели или None, если не найдено
    """
    if vin:
        vin = vin.upper()

    # Нормализуем входные данные
    normalized_brand = brand.lower()
    normalized_model = model.lower()
    
    # Найдем бренд независимо от регистра
    brand_key = next(
        (key for key in model_mapping if key.lower() == normalized_brand),
        None
    )
    
    if not brand_key:
        errorText = f"\nvin: <code>{vin}</code>\n<b>Не найден бренд</b> <code>{brand}</code> в models.json (модель {normalized_model})"
        print_message(errorText, 'error')
        return None
    
    # Найдем модель независимо от регистра
    model_key = next(
        (key for key in model_mapping[brand_key] if key.lower() == normalized_model),
        None
    )
    
    if not model_key:
        errorText = f"\nvin: <code>{vin}</code>\n<b>Не найдено название модели</b> <code>{model}</code> в \"feed_names\" бренда <code>{brand}</code> в models.json (ищем {property or color})"
        print_message(errorText, 'error')
        return None
    
    model_ref = model_mapping[brand_key][model_key]

    # Получаем фактический объект модели из индекса all-models
    target_brand = model_ref.get('mark_id')
    target_id = model_ref.get('id')

    model_obj = None
    brand_bucket = all_models_index_by_brand.get(target_brand)
    if isinstance(brand_bucket, dict):
        model_obj = brand_bucket.get(target_id)

    # На случай рассинхронизации попробуем найти линейным поиском
    if not model_obj:
        for m in all_models_data:
            if m.get('mark_id') == target_brand and m.get('id') == target_id:
                model_obj = m
                break

    if not model_obj:
        errorText = (
            f"\nvin: <code>{vin}</code>\n"
            f"<b>Не найдены данные модели</b> <code>{model}</code> бренда <code>{brand}</code> в models.json"
        )
        print_message(errorText, 'error')
        return None
    
    # Поиск изображения цвета по списку colors[].names / id / name
    if color:
        normalized_color = color.lower().strip()
        colors = model_obj.get('colors') or []

        def match_color(entry: dict) -> bool:
            names = entry.get('names') or []
            entry_id = entry.get('id')
            entry_name = entry.get('name')
            if isinstance(entry_id, str) and entry_id.lower() == normalized_color:
                return True
            if isinstance(entry_name, str) and entry_name.lower() == normalized_color:
                return True
            for n in names:
                if isinstance(n, str) and n.lower() == normalized_color:
                    return True
            return False

        for entry in colors:
            if isinstance(entry, dict) and match_color(entry):
                return entry.get('carImage')

        errorText = (
            f"\nvin: <code>{vin}</code>\n"
            f"<b>Не найден цвет</b> <code>{color}</code> модели <code>{model}</code> бренда <code>{brand}</code> в models.json"
        )
        print_message(errorText, 'error')
        return None
    
    # Если запрашивается конкретное свойство
    if property:
        normalized_property = property.lower()
        if normalized_property == 'mark_id':
            return target_brand
        if normalized_property == 'id':
            return target_id
        if normalized_property == 'folder':
            # По новой схеме folder = id
            return target_id
        if normalized_property == 'cyrillic':
            value = model_obj.get('cyrillic')
            if value:
                return value
            errorText = (
                f"\nvin: <code>{vin}</code>\n"
                f"<b>Не найдено кириллическое имя</b> для модели <code>{model}</code> бренда <code>{brand}</code>"
            )
            print_message(errorText, 'error')
            return None
        if normalized_property == 'name':
            value = model_obj.get('name')
            if value:
                return value
            errorText = (
                f"\nvin: <code>{vin}</code>\n"
                f"<b>Не найдено поле name</b> для модели <code>{model}</code> бренда <code>{brand}</code>"
            )
            print_message(errorText, 'error')
            return None

        errorText = (
            f"\nvin: <code>{vin}</code>\n"
            f"<b>Неизвестное свойство</b> <code>{property}</code> для модели <code>{model}</code> бренда <code>{brand}</code>. "
            f"Поддерживаются: <code>mark_id</code>, <code>id</code>, <code>folder</code>, <code>cyrillic</code>, <code>name</code>."
        )
        print_message(errorText, 'error')
        return None
    
    # Возвращаем полезный минимум, если не указаны property и color
    return {
        'mark_id': target_brand,
        'id': target_id,
        'name': model_obj.get('name'),
        'cyrillic': model_obj.get('cyrillic'),
    }


def get_folder(brand: str, model: str, vin: str = None) -> str | None:
    """Получение названия папки для модели (folder = id по новой схеме)."""
    return get_model_info(brand, model, 'folder', vin=vin)


def get_cyrillic(brand: str, model: str, vin: str = None) -> str | None:
    """Получение кириллического названия модели из all-models.json."""
    return get_model_info(brand, model, 'cyrillic', vin=vin)


def get_color_filename(brand: str, model: str, color: str, vin: str = None) -> str | None:
    """Получение URL изображения для указанного цвета модели.

    Возвращает поле carImage из подходящего элемента colors.
    """
    return get_model_info(brand, model, color=color, vin=vin)


# ВНИМАНИЕ: get_available_colors удалена — используем точечный поиск через color


# Примеры использования (новая схема мэпинга):
"""
# Вернёт минимальный объект { 'mark_id': 'Geely', 'id': 'coolray', 'name': 'Coolray', 'cyrillic': '...' }
get_model_info('Geely', 'Coolray')

# Вернёт 'coolray'
get_model_info('GEELY', 'COOLRAY', property='id')

# Вернёт кириллическое имя
get_model_info('Geely', 'Coolray', property='cyrillic')

# Вернёт URL изображения цвета (carImage), если найдёт соответствие по id/name/names
get_color_filename('Geely', 'Coolray', 'Белый')
"""
