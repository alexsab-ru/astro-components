# utils.py

import os
import re
import requests
import xml.etree.ElementTree as ET
from PIL import Image, ImageOps
from io import BytesIO


def process_unique_id(unique_id, replace = "-"):
    # Удаление специальных символов
    processed_id = re.sub(r'[\/\\?%*:|"<>.,;\'\[\]()&]', '', unique_id)

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


# Helper function to process description and add it to the body
def process_description(desc_text):
    lines = desc_text.split('\n')
    processed_lines = []
    for line in lines:
        if line.strip() == '':
            processed_lines.append("<p>&nbsp;</p>")
        else:
            processed_lines.append(f"<p>{line}</p>")
    return '\n'.join(processed_lines)


def createThumbs(image_urls, unique_id):
    global current_thumbs
    global output_dir

    # Определение относительного пути для возврата
    relative_output_dir = "/img/thumbs/"

    # Проверка наличия папки, если нет - создаем
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Список для хранения путей к новым или существующим файлам
    new_or_existing_files = []

    # Обработка первых 5 изображений
    for index, img_url in enumerate(image_urls[:5]):
        try:
            output_filename = f"thumb_{unique_id}_{index}.webp"
            output_path = os.path.join(output_dir, output_filename)
            relative_output_path = os.path.join(relative_output_dir, output_filename)

            # Проверка существования файла
            if not os.path.exists(output_path):
                # Загрузка и обработка изображения, если файла нет
                response = requests.get(img_url)
                image = Image.open(BytesIO(response.content))
                aspect_ratio = image.width / image.height
                new_width = 360
                new_height = int(new_width / aspect_ratio)
                resized_image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                resized_image.save(output_path, "WEBP")
                print(f"Создано превью: {relative_output_path}")
            # else:
                # print(f"Файл уже существует: {relative_output_path}")

            # Добавление относительного пути файла в списки
            new_or_existing_files.append(relative_output_path)
            current_thumbs.append(output_path)  # Здесь сохраняем полный путь для дальнейшего использования
        except Exception as e:
            print(f"Ошибка при обработке изображения {img_url}: {e}")

    return new_or_existing_files


def cleanup_unused_thumbs():
    global current_thumbs
    all_thumbs = [os.path.join(output_dir, f) for f in os.listdir(output_dir)]
    unused_thumbs = [thumb for thumb in all_thumbs if thumb not in current_thumbs]

    for thumb in unused_thumbs:
        os.remove(thumb)
        print(f"Удалено неиспользуемое превью: {thumb}")


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


def rename_child_element(parent, old_element_name, new_element_name):
    old_element = parent.find(old_element_name)
    if old_element is not None:
        # Создаем новый элемент с нужным именем и текстом старого элемента
        new_element = ET.Element(new_element_name)
        new_element.text = old_element.text

        # Заменяем старый элемент новым
        parent.insert(list(parent).index(old_element), new_element)
        parent.remove(old_element)


def update_element_text(parent, element_name, new_text):
    element = parent.find(element_name)
    if element is not None:
        element.text = new_text
    else:
        # Ваш код для обработки случая, когда элемент не найден
        print(f"Элемент '{element_name}' не найден.")


def localize_element_text(element, translations):
    if element is not None and element.text in translations:
        element.text = translations[element.text]


def build_unique_id(car, *elements):
    """
    Builds a unique ID string by extracting specified elements from the XML car data.

    Args:
        car (Element): The XML element representing a car.
        *elements (str): Variable number of element names to extract.

    Returns:
        str: The unique ID string containing extracted elements (joined by spaces).
    """
    unique_id_parts = []

    for element_name in elements:
        element = car.find(element_name)
        if element is not None and element.text is not None:
            unique_id_parts.append(element.text.strip())

    return " ".join(unique_id_parts)


filename = 'cars.xml'
# repo_name = os.environ('REPO_NAME')
repo_name = os.getenv('REPO_NAME', 'localhost')


if os.path.exists(filename):
    tree = ET.parse(filename)
    root = tree.getroot()
else:
    XML_URL = os.environ['XML_URL']

    response = requests.get(XML_URL)
    response.raise_for_status()  # Если возникла ошибка, будет выброшено исключение
    content = response.content

    # Убрать BOM, если он присутствует
    if content.startswith(b'\xef\xbb\xbf'):
        content = content[3:]

    # Декодируем содержимое из байтов в строку
    xml_content = content.decode('utf-8')

    # Parsing the provided XML data
    root = ET.fromstring(xml_content)

# Путь к папке для сохранения уменьшенных изображений
output_dir = "public/img/thumbs/"

# Глобальный список для хранения путей к текущим превьюшкам
current_thumbs = []

# Перевод некоторых свойств, для читабельности
translations = {
     # engineType
    "hybrid": "Гибрид",
    "petrol": "Бензин",
    "diesel": "Дизель",
    "petrol_and_gas": "Бензин и газ",
    "electric": "Электро",

     # driveType
    "full_4wd": "Постоянный полный",
    "optional_4wd": "Подключаемый полный",
    "front": "Передний",
    "rear": "Задний",

     # gearboxType
    "robotized": "Робот",
    "variator": "Вариатор",
    "manual": "Механика",
    "automatic": "Автомат",

     # transmission
    "RT": "Робот",
    "CVT": "Вариатор",
    "MT": "Механика",
    "AT": "Автомат",

    # ptsType
    "duplicate": "Дубликат",
    "original": "Оригинал",
    "electronic": "Электронный",

    # bodyColor
    "black": "Черный",
    "white": "Белый",
    "blue": "Синий",
    "gray": "Серый",
    "silver": "Серебристый",
    "brown": "Коричневый",
    "red": "Красный",
    "grey": "Серый",
    "azure": "Лазурный",
    "beige": "Бежевый",

    # steeringWheel
    "left": "Левый",
    "right": "Правый",
    "L": "Левый",
    "R": "Правый",

    # bodyType
    "suv": "SUV",

}
