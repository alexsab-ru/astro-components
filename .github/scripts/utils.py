#!/usr/bin/env python
import os
import re
import copy
import string
import yaml
import json
import shutil
import requests
import xml.etree.ElementTree as ET
from PIL import Image, ImageOps
from io import BytesIO
import urllib.parse
from pathlib import Path
from typing import Dict, Any
from functools import lru_cache
from config import *
from bs4 import BeautifulSoup


def process_friendly_url(friendly_url, replace = "-"):
    # Удаление специальных символов
    processed_id = re.sub(r'[\/\\?%*:|"<>.,;\'\[\]()&]', '', friendly_url)

    # Замена '+' на '-plus'
    processed_id = processed_id.replace("+", "-plus")

    # Удаление пробелов и приведение к нижнему регистру
    processed_id = processed_id.replace(" ", replace).lower()

    return processed_id


def process_vin_hidden(vin):
    return f"{vin[:5]}-{vin[-4:]}"


# Helper function to process permalink
def process_permalink(vin):
    return f"/cars/{vin[:5]}-{vin[-4:]}/"


def format_html_for_mdx(raw_html):
    """
    Форматирует HTML для MDX, учитывая особенности MDX-парсера:
    - Удаляет теги <p>, так как MDX сам их добавляет
    - Заменяет <br/> на перенос строки
    - Сохраняет форматирующие теги
    - Добавляет пробелы после закрывающих тегов
    - Добавляет пробелы перед открывающими тегами
    - Добавляет пробелы между тегами
    - Добавляет переносы между списками и жирным текстом
    """
    # Проверяем корректность HTML с помощью BeautifulSoup
    soup = BeautifulSoup(raw_html, "html.parser")
    
    # Получаем HTML без форматирования (сохраняет &nbsp;)
    html_output = str(soup)

    # ВАЖНО: MDX воспринимает одиночную звёздочку '*' как начало курсива.
    # Это приводит к ошибкам парсинга ("Expected closing </p>...") в наших <p>..
    # На практике у нас звёздочка используется как маркер оговорки: 1₽*;
    # Делаем именно замену, а не удаление, чтобы сохранить визуальную семантику.
    # Под "одиночной" понимаем символ '*', который не является частью '**' или '***'.
    # Используем HTML-сущность, чтобы не конфликтовать с последующей экранизацией обратных слешей ниже.
    html_output = re.sub(r'(?<!\*)\*(?!\*)', '&#42;', html_output)

    # print(html_output)
    
    # Экранируем проблемные символы для MDX
    html_output = html_output.replace('\\', '\\\\')  # Экранируем обратные слеши
    html_output = html_output.replace('{', '\\{')    # Экранируем фигурные скобки
    html_output = html_output.replace('}', '\\}')
    
    # Удаляем теги <p> и </p>, так как MDX сам их добавит
    html_output = re.sub(r'</?p>', '', html_output)
    
    # Заменяем <br/> и <br> на перенос строки
    html_output = re.sub(r'(<br/?>)', r'\1\n', html_output)
    
    # Добавляем <br/> между закрывающим списком и тегом жирности
    html_output = re.sub(r'(</ul>)(<strong>)', r'\1<br/>\2', html_output)
    
    # Добавляем пробел после закрывающего тега, если после него идет буква
    html_output = re.sub(r'(</[^>]+>)([а-яА-Яa-zA-Z])', r'\1 \2', html_output)
    
    # Добавляем пробел перед открывающим тегом, если перед ним буква
    html_output = re.sub(r'([а-яА-Яa-zA-Z])(<[^/][^>]*>)', r'\1 \2', html_output)
    
    # Добавляем пробел между двумя тегами
    html_output = re.sub(r'(>)(<)', r'\1 \2', html_output)
    
    # Добавляем переносы строк для лучшей читаемости
    # 1. Разбиваем на строки по закрывающим тегам </ul>, </li>
    html_output = re.sub(r'(</ul>|</li>)', r'\1\n', html_output)
    
    # 2. Разбиваем на строки по открывающим тегам <ul>, <li>
    html_output = re.sub(r'(<ul>|<li>)', r'\n\1', html_output)
    
    # 3. Удаляем лишние пустые строки
    # html_output = re.sub(r'\n\s*\n', '\n', html_output)
    
    # 4. Удаляем пробелы в начале и конце каждой строки
    html_output = '\n'.join(line.strip() for line in html_output.split('\n'))
    
    return html_output


# Helper function to process description and add it to the body
def process_description(desc_text):
    """
    Обрабатывает текст описания, добавляя HTML-разметку.
    Предотвращает вложенные p-теги и проверяет корректность HTML.
    
    Args:
        desc_text (str): Исходный текст описания
        
    Returns:
        str: Обработанный HTML-текст
    """
    if not desc_text:
        return ""
    
    pretty_html = format_html_for_mdx(desc_text)
    # Разбиваем результат на строки
    lines = pretty_html.split('\n')
    wrapped_lines = []
    for line in lines:
        # Если строка пустая или состоит только из пробелов, добавляем <p>&nbsp;</p>
        if not line.strip():
            wrapped_lines.append('<p>&nbsp;</p>')
            continue
        # Если строка начинается с <ul>, <li>, </ul>, </li>, не оборачиваем в <p>
        if line.lstrip().startswith('<ul>') or line.lstrip().startswith('<li>') or \
           line.lstrip().startswith('</ul>') or line.lstrip().startswith('</li>'):
            wrapped_lines.append(line)
        else:
            # Оборачиваем в <p>...</p>
            wrapped_lines.append(f'<p> {line} </p>')
    # Склеиваем обратно в одну строку с переносами
    result_html = '\n'.join(wrapped_lines)
    return result_html


def createThumbs(image_urls, friendly_url, current_thumbs, thumbs_dir, temp_thumbs_dir, skip_thumbs=False, count_thumbs=5):
    # Ensure count_thumbs is an integer
    # Convert string or other types to integer, with fallback to default value
    try:
        count_thumbs = int(count_thumbs)
    except (ValueError, TypeError):
        count_thumbs = 5  # Default fallback value
        print(f"⚠️ Warning: count_thumbs could not be converted to integer, using default value 5")

    # print(f"🔍 Отладка создания превью:")
    # print(f"   Количество изображений: {len(image_urls)}")
    # print(f"   Пропуск превью: {skip_thumbs}")
    # print(f"   Директория превью: {thumbs_dir}")

    # Определение относительного пути для возврата
    relative_thumbs_dir = thumbs_dir.replace("public", "")

    # Список для хранения путей к новым или существующим файлам
    new_or_existing_files = []

    # Обработка первых count_thumbs изображений
    for index, img_url in enumerate(image_urls[:count_thumbs]):
        try:
            # print(f"   🔄 Обрабатываю изображение {index + 1}: {img_url}")
            
            # Извлечение имени файла из URL и удаление расширения
            original_filename = os.path.basename(urllib.parse.urlparse(img_url).path)
            filename_without_extension, _ = os.path.splitext(original_filename)
            
            # Получение последних 5 символов имени файла (без расширения)
            last_5_chars = filename_without_extension[-5:]
            
            # Формирование имени файла с учетом последних 5 символов
            output_filename = f"thumb_{friendly_url}_{last_5_chars}_{index}.webp"
            output_path = os.path.join(thumbs_dir, output_filename)
            temp_output_path = os.path.join(temp_thumbs_dir, output_filename)
            relative_output_path = os.path.join(relative_thumbs_dir, output_filename)

            # print(f"   📁 Путь к превью: {output_path}")

            # Проверка существования файла
            if not os.path.exists(output_path) and not skip_thumbs:
                # print(f"   ⬇️ Загружаю изображение...")
                # Загрузка и обработка изображения, если файла нет
                response = requests.get(img_url)
                image = Image.open(BytesIO(response.content))
                aspect_ratio = image.width / image.height
                new_width = 360
                new_height = int(new_width / aspect_ratio)
                resized_image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                resized_image.save(output_path, "WEBP")
                print(f"   ✅ Создано превью: {relative_output_path}")
            else:
                print(f"   ⚠️ Файл уже существует: {relative_output_path} или пропущен флагом skip_thumbs: {skip_thumbs}")

            # Добавление относительного пути файла в списки
            new_or_existing_files.append(relative_output_path)
            current_thumbs.append(output_path)  # Здесь сохраняем полный путь для дальнейшего использования
        except Exception as e:
            error_message = f"❌ Ошибка при обработке изображения {img_url}: {e}"
            print_message(error_message, "error")

    return new_or_existing_files


def cleanup_unused_thumbs(current_thumbs, thumbs_dir):
    all_thumbs = [os.path.join(thumbs_dir, f) for f in os.listdir(thumbs_dir)]
    unused_thumbs = [thumb for thumb in all_thumbs if thumb not in current_thumbs]

    for thumb in unused_thumbs:
        os.remove(thumb)
        print(f"Удалено неиспользуемое превью: {thumb}")


# используется в air
def create_child_element(parent, new_element_name, text):
    # Поиск существующего элемента
    old_element = parent.find(new_element_name)
    if old_element is not None:
        parent.remove(old_element)

    # Создаем новый элемент с нужным именем и текстом старого элемента
    new_element = ET.Element(new_element_name)
    new_element.text = str(text)

    # Добавление нового элемента в конец списка дочерних элементов родителя
    parent.append(new_element)


# не используется
def rename_child_element(parent, old_element_name, new_element_name):
    old_element = parent.find(old_element_name)
    if old_element is not None:
        # Создаем новый элемент с нужным именем и текстом старого элемента
        new_element = ET.Element(new_element_name)
        new_element.text = old_element.text

        # Заменяем старый элемент новым
        parent.insert(list(parent).index(old_element), new_element)
        parent.remove(old_element)


# используется в air
def update_element_text(parent, element_name, new_text):
    element = parent.find(element_name)
    if element is not None:
        element.text = new_text
    else:
        # Ваш код для обработки случая, когда элемент не найден
        print(f"Элемент '{element_name}' не найден.")


def join_car_data(car, *elements):
    """
    Builds a string by extracting specified elements from the XML car data.

    Args:
        car (Element): The XML element representing a car.
        *elements (str): Variable number of element names to extract.

    Returns:
        str: The string containing extracted elements (joined by spaces).
    """
    car_parts = []

    for element_name in elements:
        element = car.find(element_name)
        if element is not None and element.text is not None:
            car_parts.append(element.text.strip())

    return " ".join(car_parts)


def convert_to_string(element):
    if element.text is not None:
        element.text = str(element.text)
    for child in element:
        convert_to_string(child)


_AVITO_COLOR_MAPPING_FALLBACK: Dict[str, str] = {
    'бежевый': 'бежевый',
    'белый': 'белый',
    'бордовый': 'бордовый',
    'голубой': 'голубой',
    'желтый': 'желтый',
    'зеленый': 'зеленый',
    'зелёный': 'зеленый',
    'золотой': 'золотой',
    'коричневый': 'коричневый',
    'красный': 'красный',
    'оранжевый': 'оранжевый',
    'пурпурный': 'пурпурный',
    'розовый': 'розовый',
    'серебристый': 'серебряный',
    'серебряный': 'серебряный',
    'серо-фиолетовый': 'серо-фиолетовый',
    'серый': 'серый',
    'синий': 'синий',
    'фиолетовый': 'фиолетовый',
    'черный': 'черный',
    'чёрный': 'черный',
}


@lru_cache(maxsize=1)
def load_avito_color_mapping() -> Dict[str, str]:
    """
    Загружает мэпинг цветов для Avito из общего JSON.

    Приоритет источников:
    1) AVITO_COLOR_MAPPING_PATH (env)
    2) src/data/all-avito-colors.json
    3) src/data/avito-colors.json
    4) ../astro-json/src/avito-colors.json (локальная разработка в mono-workspace)
    5) Встроенный fallback-словарь
    """
    repo_root = Path(__file__).resolve().parents[2]
    env_path = os.getenv('AVITO_COLOR_MAPPING_PATH')

    candidates = []
    if env_path:
        candidates.append(Path(env_path))

    candidates.extend([
        repo_root / 'src/data/all-avito-colors.json',
        repo_root / 'src/data/avito-colors.json',
        repo_root.parent / 'astro-json/src/avito-colors.json',
        Path('./src/data/all-avito-colors.json'),
        Path('./src/data/avito-colors.json'),
    ])

    seen_paths = set()
    for candidate in candidates:
        normalized_path = str(candidate.expanduser())
        if normalized_path in seen_paths:
            continue
        seen_paths.add(normalized_path)

        if not os.path.exists(normalized_path):
            continue

        try:
            with open(normalized_path, 'r', encoding='utf-8') as file:
                file_data = json.load(file)
        except Exception as e:
            print_message(f"Ошибка при загрузке файла цветов Avito ({normalized_path}): {e}", 'warning')
            continue

        if not isinstance(file_data, dict):
            print_message(f"Некорректный формат файла цветов Avito ({normalized_path}): ожидался объект", 'warning')
            continue

        mapping = {}
        for source_color, avito_color in file_data.items():
            if isinstance(source_color, str) and isinstance(avito_color, str):
                mapping[source_color.lower().strip()] = avito_color.lower().strip()

        if mapping:
            return mapping

        print_message(f"Файл цветов Avito пустой или содержит некорректные значения: {normalized_path}", 'warning')

    return _AVITO_COLOR_MAPPING_FALLBACK


def avitoColor(color):
    if not color:
        return color

    # Обязательно приводим к нижнему регистру, чтобы не было ошибок при сравнении.
    mapping = load_avito_color_mapping()
    normalized_color = color.lower().strip()
    if normalized_color in mapping:
        return mapping[normalized_color].capitalize()
    else:
        # Логирование ошибки в файл
        error_text = f"Не удается обработать цвет для Avito: <code>{color}</code>"
        with open('output.txt', 'a') as file:
            file.write(f"{error_text}\n")
        return color  # Возвращаем оригинальный ключ, если он не найден


_LOCALIZED_VALUE_TRANSLATIONS_FALLBACK: Dict[str, str] = {
    'hybrid': 'Гибрид',
    'petrol': 'Бензин',
    'diesel': 'Дизель',
    'petrol_and_gas': 'Бензин и газ',
    'electric': 'Электро',
    'full_4wd': 'Постоянный полный',
    'optional_4wd': 'Подключаемый полный',
    'front': 'Передний',
    'rear': 'Задний',
    'robotized': 'Робот',
    'variator': 'Вариатор',
    'manual': 'Механика',
    'automatic': 'Автомат',
    'rt': 'Робот',
    'dct': 'Робот',
    'cvt': 'Вариатор',
    'mt': 'Механика',
    'at': 'Автомат',
    'duplicate': 'Дубликат',
    'original': 'Оригинал',
    'electronic': 'Электронный',
    'black': 'Черный',
    'white': 'Белый',
    'blue': 'Синий',
    'gray': 'Серый',
    'silver': 'Серебристый',
    'brown': 'Коричневый',
    'red': 'Красный',
    'suv': 'SUV',
    'left': 'Левый',
    'right': 'Правый',
    'l': 'Левый',
    'r': 'Правый',
    'bodytype': 'Кузов',
    'body_type': 'Кузов',
    'engine': 'Объем двигателя',
    'engine_volume': 'Объем двигателя',
    'gear_rus': 'Трансмиссия',
    'gear_box': 'Коробка передач',
    'engine_power': 'Мощность',
    'drive': 'Привод',
    'fuel': 'Тип топлива',
    'engine_type': 'Тип топлива',
    'year': 'Год выпуска',
    'color_rus': 'Цвет кузова',
    'color_simple': 'Цвет кузова',
    'caption': 'Название',
}


@lru_cache(maxsize=1)
def load_localized_value_translations() -> Dict[str, str]:
    """
    Загружает общий словарь локализации значений для Python/JS.

    Приоритет источников:
    1) LOCALIZED_VALUE_TRANSLATIONS_PATH / TRANSLATIONS_MAPPING_PATH (env)
    2) src/data/all-translations.json
    3) src/data/translations.json
    4) ../astro-json/src/translations.json (локальная разработка в mono-workspace)
    5) Встроенный fallback-словарь
    """
    repo_root = Path(__file__).resolve().parents[2]
    env_path = os.getenv('LOCALIZED_VALUE_TRANSLATIONS_PATH') or os.getenv('TRANSLATIONS_MAPPING_PATH')

    candidates = []
    if env_path:
        candidates.append(Path(env_path))

    candidates.extend([
        repo_root / 'src/data/all-translations.json',
        repo_root / 'src/data/translations.json',
        repo_root.parent / 'astro-json/src/translations.json',
        Path('./src/data/all-translations.json'),
        Path('./src/data/translations.json'),
    ])

    seen_paths = set()
    for candidate in candidates:
        normalized_path = str(candidate.expanduser())
        if normalized_path in seen_paths:
            continue
        seen_paths.add(normalized_path)

        if not os.path.exists(normalized_path):
            continue

        try:
            with open(normalized_path, 'r', encoding='utf-8') as file:
                file_data = json.load(file)
        except Exception as e:
            print_message(f"Ошибка при загрузке файла переводов ({normalized_path}): {e}", 'warning')
            continue

        if not isinstance(file_data, dict):
            print_message(f"Некорректный формат файла переводов ({normalized_path}): ожидался объект", 'warning')
            continue

        mapping = {}
        for source_key, translated_value in file_data.items():
            if not isinstance(source_key, str) or not isinstance(translated_value, str):
                continue

            clean_key = source_key.strip()
            clean_value = translated_value.strip()
            if not clean_key:
                continue

            mapping[clean_key] = clean_value
            normalized_key = clean_key.lower()
            if normalized_key not in mapping:
                mapping[normalized_key] = clean_value

        if mapping:
            return mapping

        print_message(f"Файл переводов пустой или содержит некорректные значения: {normalized_path}", 'warning')

    return _LOCALIZED_VALUE_TRANSLATIONS_FALLBACK


def load_price_data(file_path: str = "./src/data/dealer-cars_price.json") -> Dict[str, Dict[str, int]]:
    """
    Загружает данные о ценах из JSON файла.
    
    Args:
        file_path (str): Путь к JSON файлу
        
    Returns:
        Dict[str, Dict[str, int]]: Словарь с ценами по VIN
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except Exception as e:
        print(f"Ошибка при загрузке файла цен: {str(e)}")
        return {}


def update_car_prices(car_data: dict, prices_data: Dict[str, Dict[str, int]]) -> None:
    """
    Обновляет цены в словаре данных автомобиля (car_data).
    
    Args:
        car_data: Словарь с данными автомобиля (ключи: vin, priceWithDiscount, sale_price, max_discount, price)
        prices_data: Данные о ценах из JSON (ключи: VIN, значения: словарь с ценами)
    """
    # Получаем VIN из словаря
    vin = car_data.get('vin')
    if not vin:
        print("Ключ 'vin' отсутствует или пустой в car_data")
        return
    print(f"🔑 Обрабатываю автомобиль с VIN: {vin}")

    # Получаем текущую цену со скидкой
    try:
        current_sale_price = int(car_data.get('priceWithDiscount', 0) or 0)
    except ValueError:
        print(f"Не удалось преобразовать 'priceWithDiscount' в число для VIN: {vin}")
        return

    # Проверяем наличие VIN в данных о ценах
    if vin not in prices_data:
        return
    car_prices = prices_data[vin]

    # Проверяем наличие необходимых ключей в данных о ценах
    required_keys = ["Конечная цена", "Скидка", "РРЦ"]
    if not all(key in car_prices for key in required_keys):
        print(f"Отсутствуют необходимые ключи в данных о ценах для VIN: {vin}")
        return

    final_price = car_prices["Конечная цена"]
    if final_price <= current_sale_price:
        discount = car_prices["Скидка"]
        rrp = car_prices["РРЦ"]
        # Обновляем значения в словаре car_data
        car_data['priceWithDiscount'] = final_price
        car_data['sale_price'] = final_price
        car_data['max_discount'] = discount
        car_data['price'] = rrp


def get_xml_content(filename: str, xml_url: str) -> ET.Element:
    """
    Получает XML контент либо из локального файла, либо по URL.
    Если файл и ссылка недоступны — возвращает None и печатает предупреждение.
    
    Args:
        filename: Путь к локальному XML файлу
        xml_url: URL для загрузки XML если локальный файл отсутствует
    
    Returns:
        ET.Element: Корневой элемент XML или None, если не удалось получить
    """
    if os.path.exists(filename):
        tree = ET.parse(filename)
        return tree.getroot()
    
    # Проверяем, что xml_url задан и не пустой
    if not xml_url:
        print(f"[get_xml_content] Не найден локальный файл '{filename}' и не указана ссылка xml_url. Возвращаю None.")
        return None
    try:
        import requests
        response = requests.get(xml_url, timeout=10)
        response.raise_for_status()
        content = response.content

        # Убрать BOM, если он присутствует
        if content.startswith(b'\xef\xbb\xbf'):
            content = content[3:]

        xml_content = content.decode('utf-8')
        return ET.fromstring(xml_content)
    except Exception as e:
        print(f"[get_xml_content] Не удалось получить XML по ссылке '{xml_url}': {e}. Возвращаю None.")
        return None


def setup_directories(thumbs_dir: str, cars_dir: str) -> None:
    """
    Создает необходимые директории для работы программы.
    
    Args:
        thumbs_dir: Путь к директории для уменьшенных изображений
        cars_dir: Путь к директории для файлов машин
    """
    if not os.path.exists(thumbs_dir):
        os.makedirs(thumbs_dir)
    
    if not os.path.exists(cars_dir):
        os.makedirs(cars_dir)
        # shutil.rmtree(cars_dir)


def should_remove_car(car: ET.Element, mark_ids: list, folder_ids: list) -> bool:
    """
    Проверяет, нужно ли удалить машину по заданным критериям.
    
    Args:
        car (ET.Element): XML элемент машины.
        mark_ids (list): Список ID марок для удаления.
        folder_ids (list): Список ID папок для удаления.
    
    Returns:
        bool: True если машину нужно удалить, иначе False.
    """
    def element_in_list(element_names, check_list):
        """
        Проверяет, есть ли значение элемента в заданном списке.
        
        Args:
            element_names (list): Список имен элементов для проверки.
            check_list (list): Список значений для сравнения.
        
        Returns:
            bool: True, если значение элемента есть в check_list.
        """
        for name in element_names:
            try:
                value = car.find(name)
                if value is not None and value.text in check_list:
                    return True
            except Exception as e:
                print(f"Ошибка при обработке элемента '{name}': {e}")
        return False
    
    # Проверяем наличие марки автомобиля
    if mark_ids and element_in_list(['mark_id', 'Make', 'brand'], mark_ids):
        return True
    
    # Проверяем наличие папки автомобиля
    if folder_ids and element_in_list(['folder_id', 'Model', 'model'], folder_ids):
        return True
    
    # Если ни одно условие не выполнено, автомобиль оставляем
    return False

def check_local_files(brand, model, color, vin):
    """Проверяет наличие локальных файлов изображений."""
    folder = get_folder(brand, model, vin)
    if folder:
        color_image = get_color_filename(brand, model, color, vin)
        if color_image:

            thumb_path = os.path.join("img", "models", folder, "colors", color_image)
            thumb_brand_path = os.path.join("img", "models", brand.lower(), folder, "colors", color_image)
        
            # Проверяем, существует ли файл
            if os.path.exists(f"public/{thumb_path}"):
                return f"/{thumb_path}"
            elif os.path.exists(f"public/{thumb_brand_path}"):
                return f"/{thumb_brand_path}"
            else:
                errorText = f"\nvin: <code>{vin}</code>\n<b>Не найден локальный файл</b>\n<pre>{color_image}</pre>\n<code>public/{thumb_path}</code>\n<code>public/{thumb_brand_path}</code>"
                print_message(errorText)
                return "https://cdn.alexsab.ru/errors/404.webp"
        else:
            return "https://cdn.alexsab.ru/errors/404.webp"
    else:
        return "https://cdn.alexsab.ru/errors/404.webp"


def create_file(car_data, filename, friendly_url, current_thumbs, sort_storage_data, dealer_photos_for_cars_avito, config, existing_files):
    """
    Создает файл с frontmatter в формате YAML и контентом, используя car_data (dict).
    Args:
        car_data: dict с данными автомобиля
        filename: путь к файлу
        ... остальные параметры без изменений ...
    """
    # Получаем основные значения из словаря
    vin = car_data.get('vin')
    if not vin:
        return
    vin_hidden = process_vin_hidden(vin)
    color = str(car_data.get('color', '')).capitalize()
    model = car_data.get('folder_id', '')
    brand = car_data.get('mark_id', '')
    run = car_data.get('run', 0)

    # Сначала получаем изображения из car_data
    images = car_data.get('images', [])
    # Добавляем фото дилера, если есть
    if vin in dealer_photos_for_cars_avito:
        new_images = [img for img in dealer_photos_for_cars_avito[vin]['images'] if img not in images]
        images.extend(new_images)
    
    # Проверяем, есть ли у машины свои превью
    has_own_images = len(images) > 0

    thumb = "https://cdn.alexsab.ru/errors/404.webp"
    
    # Логика выбора изображения для thumb:
    # 1. Если у машины есть свои превью - используем первое из них
    # 2. Если нет своих превью - ищем заглушку по цвету модели на CDN
    # 3. Если заглушка на CDN не найдена - выводим ошибку
    
    if has_own_images:
        # У машины есть свои превью - используем первое изображение
        thumb = images[0]
    elif not config['skip_check_thumb']:
        # Своих превью нет - ищем заглушку по цвету модели на CDN
        color_image = get_color_filename(brand, model, color, vin, log_errors=False)
        
        if color_image:
            cdn_path = f"{color_image}"
            try:
                response = requests.head(cdn_path)
                if response.status_code == 200:
                    thumb = cdn_path
                else:
                    # Заглушка на CDN не найдена - выводим ошибку
                    errorText = f"\n<b>Не удалось найти файл на CDN</b>. Статус <b>{response.status_code}</b>\n<pre>{color_image}</pre>\n<a href='{cdn_path}'>{cdn_path}</a>"
                    print_message(errorText, 'error')
            except requests.RequestException as e:
                # Ошибка при проверке CDN
                errorText = f"\nОшибка при проверке CDN: {str(e)}"
                print_message(errorText, 'error')

    data = dict(car_data)  # Копируем все поля из car_data
    # Определяем порядок (order)
    if vin in sort_storage_data:
        order = sort_storage_data[vin]
    else:
        sort_storage_data['order'] = sort_storage_data.get('order', 0) + 1
        order = sort_storage_data['order']
    data['order'] = order
    data['vin_list'] = vin
    data['vin_hidden'] = vin_hidden
    data['color'] = color
    data['image'] = thumb
    data['run'] = run

    # Корректно формируем total
    data['total'] = int(car_data.get('total', 1))

    # Обработка extras
    if 'extras' in car_data and car_data['extras']:
        data['extras'] = str(car_data['extras']).replace('\n', '<br>\n')
    # Обработка equipment
    if 'equipment' in car_data and car_data['equipment']:
        equipment = str(car_data['equipment']).replace('\n', '<br>\n').replace(':', '').replace('📞', '')
        data['equipment'] = equipment

    # Используем шаблоны для h1, breadcrumb, title, description
    data['h1'] = get_h1(car_data, config)
    data['breadcrumb'] = get_breadcrumb(car_data, config)
    data['title'] = get_title(car_data, config)
    data['description'] = get_description(car_data, config)

    # Описание для контента
    description_for_content = car_data.get('description', '')
    if vin in dealer_photos_for_cars_avito and dealer_photos_for_cars_avito[vin]['description'] and not description_for_content:
        description_for_content = dealer_photos_for_cars_avito[vin]['description']

    # Обработка изображений (images уже получены и обработаны выше)
    data['images'] = images
    thumbs_files = createThumbs(images, friendly_url, current_thumbs, config['thumbs_dir'], config['temp_thumbs_dir'], config['skip_thumbs'], config['count_thumbs'])
    data['thumbs'] = thumbs_files

    # Приводим определённые числовые поля к int, если они есть
    for key in ["max_discount", "price", "priceWithDiscount", "run", "sale_price", "year", "credit_discount", "optional_discount", "insurance_discount", "tradein_discount"]:
        if key in data and data[key] is not None:
            try:
                data[key] = int(str(data[key]).replace(" ", "").replace("\u00a0", ""))
            except Exception:
                pass  # Если не удалось привести к числу, оставляем как есть

    # Сериализация в YAML
    content = "---\n"
    content += yaml.safe_dump(data, default_flow_style=False, allow_unicode=True)
    content += "---\n"

    # Добавление description и остального контента
    content += process_description(description_for_content)

    # Запись в файл
    with open(filename, 'w') as f:
        f.write(content)
    print(f"Создан файл: {filename}")
    existing_files.add(filename)

def format_value(value: str) -> str:
    """
    Форматирует значение в зависимости от наличия специальных символов.
    
    Args:
        value (str): Исходное значение.
        
    Returns:
        str: Отформатированное значение.
    """
    if "'" in value:  # Если есть одинарная кавычка, используем двойные кавычки
        return f'"{value}"'
    elif ":" in value:  # Если есть двоеточие, используем одинарные кавычки
        return f"'{value}'"
    return value

def update_yaml(car_data, filename, friendly_url, current_thumbs, sort_storage_data, dealer_photos_for_cars_avito, config, existing_files):
    """
    Обновляет YAML-файл, используя car_data (dict) вместо XML-элемента.
    """
    print(f"Обновление файла: {filename}")
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()

    # Split the content by the YAML delimiter
    yaml_delimiter = "---\n"
    parts = content.split(yaml_delimiter)

    # If there's no valid YAML block, raise an exception
    if len(parts) < 3:
        raise ValueError("No valid YAML block found in the provided file.")

    # Parse the YAML block
    yaml_block = parts[1].strip()
    data = yaml.safe_load(yaml_block)
    vin = car_data.get('vin')
    # Проверка: если vin уже есть в vin_list, не обновляем файл (логика на dict)
    if vin and 'vin_list' in data and vin in [v.strip() for v in data['vin_list'].split(',')]:
        for thumb in data.get('thumbs', []):
            if thumb not in current_thumbs:
                current_thumbs.append(f"public{thumb}")
        existing_files.add(filename)
        print(f"Такой VIN {vin} уже есть в файле")
        return filename
    if vin:
        data['vin_list'] += ", " + vin

    vin_hidden = process_vin_hidden(vin)
    if vin_hidden:
        data['vin_hidden'] += ", " + vin_hidden
    if 'unique_id' in car_data:
        if not isinstance(data.get('unique_id', ''), str):
            data['unique_id'] = str(data.get('unique_id', ''))
        data['unique_id'] += ", " + str(car_data['unique_id'])
    elif 'id' in car_data:
        if not isinstance(data.get('id', ''), str):
            data['id'] = str(data.get('id', ''))
        data['id'] += ", " + str(car_data['id'])

    if 'total' in data and 'total' in car_data:
        try:
            car_total_value = int(car_data['total'])
            data_total_value = int(data['total'])
            data['total'] = data_total_value + car_total_value
        except ValueError:
            pass  # Если не удается преобразовать значения в int, оставляем текущее значение
    else:
        data['total'] = data.get('total', 1) + 1

    if 'run' in data and 'run' in car_data:
        try:
            car_run_value = int(car_data['run'])
            data_run_value = int(data['run'])
            data['run'] = min(data_run_value, car_run_value)
        except ValueError:
            pass
    else:
        data.setdefault('run', 0)

    if 'priceWithDiscount' in data and 'priceWithDiscount' in car_data:
        try:
            car_priceWithDiscount_value = int(car_data['priceWithDiscount'])
            data_priceWithDiscount_value = int(data['priceWithDiscount'])
            data['priceWithDiscount'] = min(data_priceWithDiscount_value, car_priceWithDiscount_value)
            data['sale_price'] = min(data_priceWithDiscount_value, car_priceWithDiscount_value)
            # Используем get_description для генерации description
            data["description"] = get_description(car_data, config)
        except ValueError:
            pass

    if 'max_discount' in data and 'max_discount' in car_data:
        try:
            car_max_discount_value = int(car_data['max_discount'])
            data_max_discount_value = int(data['max_discount'])
            data['max_discount'] = max(data_max_discount_value, car_max_discount_value)
        except ValueError:
            pass

    if 'order' not in data:
        if vin in sort_storage_data:
            order = sort_storage_data[vin]
        else:
            # If VIN doesn't exist, increment the current order and use it
            sort_storage_data['order'] = sort_storage_data.get('order', 0) + 1
            order = sort_storage_data['order']
        data['order'] = order

    images = car_data.get('images', [])
    if vin in dealer_photos_for_cars_avito:
        new_images = [img for img in dealer_photos_for_cars_avito[vin]['images'] if img not in images]
        images.extend(new_images)
    if images:
        existing_images = data.get('images', [])
        unique_images = list(dict.fromkeys(existing_images + images))
        data['images'] = unique_images
        if 'thumbs' not in data or (len(data['thumbs']) < 5):
            thumbs_files = createThumbs(images, friendly_url, current_thumbs, config['thumbs_dir'], config['temp_thumbs_dir'], config['skip_thumbs'], config['count_thumbs'])
            data.setdefault('thumbs', []).extend(thumbs_files)
    updated_yaml_block = yaml.safe_dump(data, default_flow_style=False, allow_unicode=True)

    # Reassemble the content with the updated YAML block
    updated_content = yaml_delimiter.join([parts[0], updated_yaml_block, yaml_delimiter.join(parts[2:])])

    existing_files.add(filename)
    # Save the updated content to the output file
    with open(filename, "w", encoding="utf-8") as f:
        f.write(updated_content)

    return filename


# Создаем последовательность a-z + 0-9
chars = string.ascii_lowercase + string.digits
base = len(chars)  # Основание для системы исчисления (36)

def vin_to_number(vin):
    """Конвертирует последние цифры VIN в число."""
    if not vin[-5:].isdigit():
        raise ValueError("Последние 5 символов VIN должны быть цифрами.")
    
    return int(vin[-5:])  # Преобразуем последние 5 символов VIN в число

def number_to_vin(vin, number):
    """Преобразует число обратно в VIN."""
    new_suffix = str(number).zfill(5)  # Преобразуем число обратно в строку с ведущими нулями
    return vin[:-5] + new_suffix  # Собираем новый VIN

def modify_vin(vin, increment):
    """Изменяет VIN путем увеличения последних цифр."""
    vin_number = vin_to_number(vin)  # Получаем числовое значение последних 5 цифр VIN
    new_vin_number = vin_number + increment  # Увеличиваем на заданное значение
    return number_to_vin(vin, new_vin_number)  # Преобразуем обратно в VIN

def str_to_base36(str):
    """Конвертирует строку STR в число на основе системы с основанием 36."""
    value = 0
    for char in str:
        value = value * base + chars.index(char)  # Преобразуем каждый символ в число
    return value

def base36_to_str(value, length):
    """Конвертирует число обратно в строку STR на основе системы с основанием 36."""
    str = []
    while value > 0:
        str.append(chars[value % base])
        value //= base
    return ''.join(reversed(str)).zfill(length)  # Добавляем нули в начало, если нужно

def increment_str(str, increment):
    """Изменяет STR путем увеличения всей строки на значение increment."""
    str_value = str_to_base36(str)  # Конвертируем STRING в число
    new_str_value = str_value + increment  # Увеличиваем на заданное значение
    return base36_to_str(new_str_value, len(str))  # Преобразуем обратно в строку

def duplicate_car(car, config, n, status="в пути", offset=0):
    """Функция для дублирования элемента 'car' N раз с изменением vin."""
    duplicates = []

    # Проверка наличия обязательных полей 'VIN' и 'Availability'
    try:
        if car.find(config['vin_tag']) is None:
            raise ValueError(f"Элемент 'car' не содержит обязательного поля '{config['vin_tag']}'")
        if car.find(config['availability_tag']) is None:
            raise ValueError(f"Элемент 'car' не содержит обязательного поля '{config['availability_tag']}'")
    except ValueError as e:
        print(f"Ошибка: {e}")
        return duplicates  # Вернем пустой список и продолжим выполнение скрипта
    
    for i in range(n):
        try:
            new_car = copy.deepcopy(car)  # Клонируем текущий элемент car
            
            # Обрабатываем VIN
            vin = new_car.find(config['vin_tag']).text
            new_vin = modify_vin(vin.lower(), offset+i+1)
            new_car.find(config['vin_tag']).text = new_vin.upper()  # Меняем текст VIN
            
            # Обрабатываем unique_id, если он существует
            unique_id_element = new_car.find(config['unique_id_tag'])
            if unique_id_element is not None:
                unique_id = unique_id_element.text
                new_unique_id = increment_str(unique_id, offset + i + 1)  # Изменяем последний символ на i
                unique_id_element.text = new_unique_id  # Меняем текст unique_id
                print(vin, new_vin, unique_id, new_unique_id)
            else:
                print(vin, new_vin, f"${config['unique_id_tag']} отсутствует")
            
            # Обновляем статус
            new_car.find(config['availability_tag']).text = status  # Меняем статус Наличие автомобиля
            duplicates.append(new_car)
        
        except AttributeError as e:
            print(f"Ошибка при обработке элемента: {e}")
    
    return duplicates

def load_env_config(source_type: str, default_config) -> Dict[str, Any]:
    """
    Загружает конфигурацию из переменных окружения.
    Формат переменных:
    CARS_[SOURCE_TYPE]_[PARAM_NAME] = value
    
    Например:
    CARS_AUTORU_REMOVE_MARK_IDS = '["mark1", "mark2"]'
    CARS_AVITO_ELEMENTS_TO_LOCALIZE = '["elem1", "elem2"]'
    """
    prefix = f"CARS_{source_type.upper()}_"
    
    # Маппинг переменных окружения на ключи конфигурации
    env_mapping = {
        f"{prefix}MOVE_VIN_ID_UP": "move_vin_id_up",
        f"{prefix}NEW_ADDRESS": "new_address",
        f"{prefix}NEW_PHONE": "new_phone",
        f"{prefix}REPLACEMENTS": "replacements",
        f"{prefix}ELEMENTS_TO_LOCALIZE": "elements_to_localize",
        f"{prefix}REMOVE_CARS_AFTER_DUPLICATE": "remove_cars_after_duplicate",
        f"{prefix}REMOVE_MARK_IDS": "remove_mark_ids",
        f"{prefix}REMOVE_FOLDER_IDS": "remove_folder_ids"
    }
    
    for env_var, config_key in env_mapping.items():
        if env_var in os.environ:
            try:
                value = json.loads(os.environ[env_var])
                default_config[config_key] = value
            except json.JSONDecodeError:
                print(f"Ошибка при парсинге значения переменной {env_var}")
                # Оставляем значение по умолчанию
    
    return default_config

def load_github_config(source_type: str, github_config: Dict[str, str], default_config) -> Dict[str, Any]:
    """
    Загружает конфигурацию из GitHub репозитория или Gist.
    
    :param source_type: Тип источника (autoru или avito)
    :param github_config: Словарь с настройками GitHub
    :return: Загруженная конфигурация
    """
    if 'GITHUB_TOKEN' in os.environ:
        headers = {'Authorization': f'token {os.environ["GITHUB_TOKEN"]}'}
    else:
        headers = {}

    try:
        if 'gist_id' in github_config:
            # Загрузка из Gist
            gist_url = f"https://api.github.com/gists/{github_config['gist_id']}"
            response = requests.get(gist_url, headers=headers)
            response.raise_for_status()
            gist_data = response.json()
            
            # Ищем файл конфигурации для нужного источника
            for filename, file_data in gist_data['files'].items():
                if source_type in filename.lower():
                    return json.loads(file_data['content'])
                    
        elif 'repo' in github_config and 'path' in github_config:
            # Загрузка из репозитория
            repo = github_config['repo']
            path = github_config['path']
            file_url = f"https://api.github.com/repos/{repo}/contents/{path}/{source_type}.json"
            
            response = requests.get(file_url, headers=headers)
            response.raise_for_status()
            
            content = response.json()['content']
            import base64
            decoded_content = base64.b64decode(content).decode('utf-8')
            return json.loads(decoded_content)
            
    except requests.RequestException as e:
        print(f"Ошибка при загрузке конфигурации из GitHub: {e}")
    except json.JSONDecodeError:
        print("Ошибка при парсинге JSON конфигурации")
    except KeyError as e:
        print(f"Отсутствует обязательный параметр в конфигурации: {e}")
        
    # Возвращаем конфигурацию по умолчанию в случае ошибки
    return default_config

def load_file_config(config_path: str, source_type: str, default_config) -> Dict[str, Any]:
    """
    Загружает конфигурацию из JSON файла.
    """
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
            return config.get(source_type, default_config)
    except FileNotFoundError:
        print(f"Конфигурационный файл {config_path} не найден. Используются значения по умолчанию.")
        return default_config
    except json.JSONDecodeError:
        print(f"Ошибка при чтении {config_path}. Используются значения по умолчанию.")
        return default_config

def extract_image_urls(images_container, image_tag):
    """
    Универсальная функция для извлечения URL изображений.
    Проверяет сначала атрибут 'url', затем текст элемента.
    
    Args:
        images_container: Контейнер с изображениями
        image_tag: Тег изображения
        
    Returns:
        list: Список URL изображений
    """
    images = []
    for i, img in enumerate(images_container.findall(image_tag)):
        # Сначала пробуем получить URL из атрибута 'url'
        url = img.get('url')
        if url:
            images.append(url)
        else:
            # Если атрибута нет, пробуем получить из текста элемента
            if img.text and img.text.strip():
                url = img.text.strip()
                images.append(url)
            else:
                print(f"  ⚠️ Изображение {i+1}: Не удалось извлечь URL (нет атрибута 'url' и текста)")
    return images

def render_template_string(template: str, car, config):
    """
    Заменяет плейсхолдеры вида {{car.field}} и {{config.field}} на значения из car (dict) и config соответственно.
    Теперь поддерживает только dict для car.
    Пример: '{{car.mark_id}} {{car.folder_id}} у {{config.legal_city_where}}'
    """
    def get_car_value(field):
        # Теперь car - это dict, а не XML
        return str(car.get(field, ''))
    def get_config_value(field):
        return config.get(field, '')

    def replacer(match):
        expr = match.group(1).strip()
        if expr.startswith('car.'):
            return get_car_value(expr[4:])
        elif expr.startswith('config.'):
            return str(get_config_value(expr[7:]))
        else:
            return match.group(0)  # не меняем, если не car/config

    # Заменяем все плейсхолдеры вида {{...}}
    return re.sub(r'\{\{\s*([^}]+)\s*\}\}', replacer, template)

def get_h1(car, config):
    """Генерирует h1 для автомобиля по шаблону (car - dict)."""
    template = config.get('h1_template') or '{{car.mark_id}} {{car.folder_id}} {{car.modification_id}} {{car.complectation_name}} {{car.color}}'
    return render_template_string(template, car, config).strip()

def get_breadcrumb(car, config):
    """Генерирует breadcrumb для автомобиля по шаблону (car - dict)."""
    template = config.get('breadcrumb_template') or '{{car.mark_id}} {{car.folder_id}} {{car.complectation_name}}'
    return render_template_string(template, car, config).strip()

def get_title(car, config):
    """Генерирует title для автомобиля по шаблону (car - dict)."""
    template = config.get('title_template') or 'Купить {{car.mark_id}} {{car.folder_id}} {{car.modification_id}} {{car.complectation_name}} {{car.color}} у официального дилера в {{config.legal_city_where}}'
    return render_template_string(template, car, config).strip()

def get_description(car, config):
    """Генерирует description для автомобиля по шаблону (car - dict)."""
    template = config.get('description_template') or (
        'Купить автомобиль {{car.mark_id}} {{car.folder_id}}'
        '{% if car.year %} {{car.year}} года выпуска{% endif %}'
        '{% if car.complectation_name %}, комплектация {{car.complectation_name}}{% endif %}'
        '{% if car.color %}, цвет - {{car.color}}{% endif %}'
        '{% if car.modification_id %}, двигатель - {{car.modification_id}}{% endif %}'
        ' у официального дилера в г. {{config.legal_city}}. Стоимость данного автомобиля {{car.mark_id}} {{car.folder_id}} – {{car.priceWithDiscount}}'
    )
    # Удаляем все конструкции {% if ... %} ... {% endif %}, если поля пустые
    def if_replacer(match):
        expr = match.group(1).strip()
        # Пример: car.year
        if expr.startswith('car.'):
            field = expr[4:]
            if car.get(field):
                return match.group(2)
            else:
                return ''
        return ''
    template = re.sub(r'\{% if ([^%]+)%\}([\s\S]*?)\{% endif %\}', if_replacer, template)
    return render_template_string(template, car, config).strip()
