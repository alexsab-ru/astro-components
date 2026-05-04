#!/usr/bin/env python
import json

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

def load_site_models(json_path: str = "./src/data/site/models.json"):
    """Загружаем собранные модели сайта из site/models.json."""
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print_message(f"Ошибка при загрузке {json_path}: {e}", 'error')
        return []

    if isinstance(data, dict):
        result = []
        seen = set()
        for group in ('models', 'testDrive', 'service'):
            for model in data.get(group, []):
                if not isinstance(model, dict):
                    continue
                brand = get_model_brand_id(model)
                model_id = str(model.get('id') or '').lower()
                key = (brand, model_id)
                if brand and model_id and key not in seen:
                    seen.add(key)
                    result.append(model)
        return result

    if isinstance(data, list):
        return data

    return []


def _append_unique(items: list, value):
    if isinstance(value, str) and value.strip():
        normalized = value.strip()
        if not any(str(item).lower() == normalized.lower() for item in items):
            items.append(normalized)


def _extend_unique(items: list, values):
    if isinstance(values, list):
        for value in values:
            _append_unique(items, value)


def get_model_brand_id(model: dict) -> str:
    brand = model.get('brand') if isinstance(model.get('brand'), dict) else {}
    value = brand.get('id') or model.get('mark_id') or ''
    return str(value).strip().lower()


def get_model_brand_names(model: dict) -> list:
    brand = model.get('brand') if isinstance(model.get('brand'), dict) else {}
    feed = model.get('feed') if isinstance(model.get('feed'), dict) else {}
    names = []

    _append_unique(names, get_model_brand_id(model))
    _append_unique(names, model.get('mark_id'))
    _append_unique(names, brand.get('name'))
    _append_unique(names, brand.get('displayName'))
    _append_unique(names, brand.get('legalName'))
    _extend_unique(names, feed.get('markIds'))
    _extend_unique(names, feed.get('brandNames'))

    return names


def get_model_display_name(model: dict) -> str:
    return model.get('displayName') or model.get('caption') or model.get('name') or ''


def get_model_feed_names(model: dict) -> list:
    feed = model.get('feed') if isinstance(model.get('feed'), dict) else {}
    names = []

    _append_unique(names, model.get('name'))
    _append_unique(names, get_model_display_name(model))
    _extend_unique(names, model.get('feed_names'))
    _extend_unique(names, feed.get('folderIds'))
    _extend_unique(names, feed.get('modelNames'))

    return names


def get_color_aliases(entry: dict) -> list:
    aliases = []

    _append_unique(aliases, entry.get('id'))
    _append_unique(aliases, entry.get('name'))
    _extend_unique(aliases, entry.get('names'))
    _extend_unique(aliases, entry.get('aliases'))

    return aliases


def get_color_image(entry: dict):
    return entry.get('image') or entry.get('carImage')


def normalize_lookup_key(value) -> str:
    return str(value or '').strip().lower()


def build_model_index(models: list) -> dict:
    """Строим индекс для быстрого доступа: { brand_id: { id: model_obj } }"""
    index: dict = {}
    for model in models:
        brand = get_model_brand_id(model)
        model_id = str(model.get('id') or '').lower()
        if not brand or not model_id:
            continue
        index.setdefault(brand, {})[model_id] = model
    return index


# Глобально подгружаем собранные модели сайта и индекс для быстрых запросов
site_models_data = load_site_models()
model_index_by_brand = build_model_index(site_models_data)


def build_model_lookup(models: list):
    """Построение индекса моделей из собранного site/models.json.

    Требуемый результат — компактный объект для быстрого поиска:
        model_lookup[brand][model_name] = { "mark_id": <brand>, "id": <model_id> }

    - brand берём из brand.id / mark_id
    - brand aliases — из feed.markIds / feed.brandNames / brand display fields
    - model_name — из feed.folderIds / feed.modelNames / feed_names / name / displayName

    Такой подход обеспечивает обратную совместимость по функционалу поиска модели.

    Returns:
        dict: Словарь вида { brand: { model_name: { mark_id, id } } }
    """

    lookup: dict = {}

    # Проходим по всем моделям и собираем индекс
    for model in models:
        brand = get_model_brand_id(model)
        model_id = str(model.get('id') or '').lower()
        brand_names = get_model_brand_names(model)
        model_names = get_model_feed_names(model)

        # Если ключевых полей нет — пропускаем запись
        if not brand or not model_id:
            continue

        for brand_name in brand_names:
            brand_key = normalize_lookup_key(brand_name)
            lookup.setdefault(brand_key, {})

            # Записываем все синонимы модели в индекс
            for model_name in model_names:
                lookup[brand_key][normalize_lookup_key(model_name)] = {
                    'mark_id': brand,
                    'id': model_id,
                }

    return lookup

model_lookup = build_model_lookup(site_models_data)



def get_model_info(
    brand: str,
    model: str,
    property: str = None,
    color: str = None,
    vin: str = None,
    log_errors: bool = True
) -> str | dict | None:
    """
    Получение информации о модели автомобиля на основе нового мэпинга.

    Теперь поддерживаются только свойства мэпинга:
      - 'mark_id' — бренд из site/models.json
      - 'id' — идентификатор модели (slug) из site/models.json
      - 'color_id' — идентификатор цвета (при указании color)

    Поиск модели идёт по feed.folderIds / feed.modelNames / feed_names / name / displayName.

    Args:
        brand: Название бренда (любая регистровая форма)
        model: Название модели (значение из feed_names или name)
        property: Запрашиваемое свойство ('mark_id', 'id' или 'color_id' при указании color)
        color: Цвет автомобиля (для поиска carImage или id цвета)
        vin: VIN автомобиля (для удобства логирования)
        log_errors: Писать ли ошибки в output.txt через print_message

    Returns:
        str | dict | None: Значение свойства, словарь модели или None, если не найдено
    """
    if vin:
        vin = vin.upper()
    normalized_property = property.lower() if property else None

    # Нормализуем входные данные
    normalized_brand = normalize_lookup_key(brand)
    normalized_model = normalize_lookup_key(model)
    brand_bucket = model_lookup.get(normalized_brand)
    
    if not brand_bucket:
        errorText = f"\nvin: <code>{vin}</code>\n<b>Не найден бренд</b> <code>{brand}</code> в site/models.json (модель {normalized_model})"
        if log_errors:
            print_message(errorText, 'error')
        return None
    
    model_ref = brand_bucket.get(normalized_model)

    if not model_ref:
        errorText = f"\nvin: <code>{vin}</code>\n<b>Не найдено название модели</b> <code>{model}</code> в feed.folderIds/feed.modelNames бренда <code>{brand}</code> в site/models.json (ищем {property or color})"
        if log_errors:
            print_message(errorText, 'error')
        return None

    # Получаем фактический объект модели из индекса all-models
    target_brand = model_ref.get('mark_id')
    target_id = model_ref.get('id')

    model_obj = None
    brand_bucket = model_index_by_brand.get(target_brand)
    if isinstance(brand_bucket, dict):
        model_obj = brand_bucket.get(target_id)

    # На случай рассинхронизации попробуем найти линейным поиском
    if not model_obj:
        for m in site_models_data:
            if get_model_brand_id(m) == target_brand and m.get('id') == target_id:
                model_obj = m
                break

    if not model_obj:
        errorText = (
            f"\nvin: <code>{vin}</code>\n"
            f"<b>Не найдены данные модели</b> <code>{model}</code> бренда <code>{brand}</code> в site/models.json"
        )
        if log_errors:
            print_message(errorText, 'error')
        return None
    
    # Поиск информации о цвете по списку colors[].names / id / name
    if color:
        normalized_color = color.lower().strip()
        colors = model_obj.get('colors') or []

        def match_color(entry: dict) -> bool:
            for n in get_color_aliases(entry):
                if isinstance(n, str) and n.lower() == normalized_color:
                    return True
            return False

        for entry in colors:
            if isinstance(entry, dict) and match_color(entry):
                if normalized_property in (None, 'carimage', 'color_image'):
                    return get_color_image(entry)
                if normalized_property in ('color_id', 'colorid'):
                    return entry.get('id')
                if normalized_property in ('color', 'color_entry'):
                    return entry
                # Если передано свойство, но оно не связано с цветом — возвращаем carImage для обратной совместимости
                return get_color_image(entry)

        errorText = (
            f"\nvin: <code>{vin}</code>\n"
            f"<b>Не найден цвет</b> <code>{color}</code> модели <code>{model}</code> бренда <code>{brand}</code> в site/models.json"
        )
        if log_errors:
            print_message(errorText, 'error')
        return None
    
    # Если запрашивается конкретное свойство
    if property:
        if normalized_property == 'mark_id':
            return target_brand
        if normalized_property == 'id':
            return target_id
        if normalized_property == 'folder':
            # По новой схеме folder = id
            return target_id
        if normalized_property == 'color_id':
            errorText = (
                f"\nvin: <code>{vin}</code>\n"
                f"<b>Для получения color_id необходимо указать цвет</b> для модели <code>{model}</code> бренда <code>{brand}</code>"
            )
            if log_errors:
                print_message(errorText, 'error')
            return None
        if normalized_property == 'cyrillic':
            value = model_obj.get('cyrillic')
            if value:
                return value
            errorText = (
                f"\nvin: <code>{vin}</code>\n"
                f"<b>Не найдено кириллическое имя</b> для модели <code>{model}</code> бренда <code>{brand}</code>"
            )
            if log_errors:
                print_message(errorText, 'error')
            return None
        if normalized_property == 'name':
            value = get_model_display_name(model_obj) or model_obj.get('name')
            if value:
                return value
            errorText = (
                f"\nvin: <code>{vin}</code>\n"
                f"<b>Не найдено поле name</b> для модели <code>{model}</code> бренда <code>{brand}</code>"
            )
            if log_errors:
                print_message(errorText, 'error')
            return None

        errorText = (
            f"\nvin: <code>{vin}</code>\n"
            f"<b>Неизвестное свойство</b> <code>{property}</code> для модели <code>{model}</code> бренда <code>{brand}</code>. "
            f"Поддерживаются: <code>mark_id</code>, <code>id</code>, <code>folder</code>, <code>cyrillic</code>, <code>name</code>."
        )
        if log_errors:
            print_message(errorText, 'error')
        return None
    
    # Возвращаем полезный минимум, если не указаны property и color
    return {
        'mark_id': target_brand,
        'id': target_id,
        'name': get_model_display_name(model_obj) or model_obj.get('name'),
        'cyrillic': model_obj.get('cyrillic'),
    }


def get_folder(brand: str, model: str, vin: str = None) -> str | None:
    """Получение названия папки для модели (folder = id по новой схеме)."""
    return get_model_info(brand, model, 'folder', vin=vin)


def get_cyrillic(brand: str, model: str, vin: str = None) -> str | None:
    """Получение кириллического названия модели из site/models.json."""
    return get_model_info(brand, model, 'cyrillic', vin=vin)


def get_color_filename(brand: str, model: str, color: str, vin: str = None, log_errors: bool = True) -> str | None:
    """Получение URL изображения для указанного цвета модели.

    Возвращает поле carImage из подходящего элемента colors.
    """
    return get_model_info(brand, model, color=color, vin=vin, log_errors=log_errors)


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
