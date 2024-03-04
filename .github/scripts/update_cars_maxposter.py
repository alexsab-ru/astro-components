import os
import re
import yaml
import shutil
import requests
import urllib.parse
from PIL import Image, ImageOps
from io import BytesIO
from config import dealer, model_mapping

# Parsing XML
import xml.etree.ElementTree as ET


def process_unique_id(unique_id, replace = "-"):
    # Удаление специальных символов
    processed_id = re.sub(r'[\/\\?%*:|"<>.,;\'\[\]()&]', '', unique_id)

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

def create_file(car, filename, unique_id):
    vin = car.find('vin').text
    vin_hidden = process_vin_hidden(vin)
    # Преобразование цвета
    color = car.find('color').text.strip().capitalize()
    model = car.find('folder_id').text.strip()

    model_obj = model_mapping.get(model, '../404.jpg?')

    # Проверяем, существует ли 'model' в 'model_mapping' и есть ли соответствующий 'color'
    if model in model_mapping and color in model_mapping[model].get('color', {}):
        folder = model_mapping[model]['folder']
        color_image = model_mapping[model]['color'][color]
        thumb = f"/img/models/{folder}/colors/{color_image}.webp"
    else:
        print(f"{model} {color}")
        with open('output.txt', 'a') as file:
            file.write(f"{model} {color}\n")
        # Если 'model' или 'color' не найдены, используем путь к изображению ошибки 404
        thumb = "/img/404.jpg"
        global error_404_found
        error_404_found = True

    # Forming the YAML frontmatter
    content = "---\n"
    # content += "layout: car-page\n"
    content += "total: 1\n"
    # content += f"permalink: {unique_id}\n"
    content += f"vin_hidden: {vin_hidden}\n"

    h1 = f"{car.find('folder_id').text} {car.find('modification_id').text}"
    content += f"h1: {h1}\n"

    title = f"{car.find('mark_id').text} {car.find('folder_id').text} {car.find('modification_id').text} купить у официального дилера в {dealer.get('where')}"
    content += f"title: {title}\n"

    description = ""

    for elem_name in elements_to_localize:
        elem = car.find(elem_name)
        localize_element_text(elem, translations)

    color = car.find('color').text.strip().capitalize()

    for child in car:
        # Skip nodes with child nodes (except photos) and attributes
        if list(child) and child.tag != 'photos':
            continue
        if child.tag == 'photos':
            images = [img.text for img in child.findall('photo')]
            thumbs_files = createThumbs(images, unique_id)
            content += f"images: {images}\n"
            content += f"thumbs: {thumbs_files}\n"
        elif child.tag == 'color':
            content += f"{child.tag}: {color}\n"
            content += f"image: {thumb}\n"
        elif child.tag == 'extras' and child.text:
            extras = child.text
            flat_extras = extras.replace('\n', '<br>\n')
            content += f"{child.tag}: |\n"
            for line in flat_extras.split("\n"):
                content += f"  {line}\n"
        elif child.tag == 'description' and child.text:
            description = child.text
            flat_description = description.replace('\n', '<br>\n')
            content += f"description: |\n"
            content += f"  Купить автомобиль {car.find('mark_id').text} {car.find('folder_id').text} {car.find('year').text} года выпуска, комплектация {car.find('complectation_name').text}, цвет - {car.find('color').text}, двигатель - {car.find('modification_id').text} у официального дилера в г. {dealer.get('city')}. Стоимость данного автомобиля {car.find('mark_id').text} {car.find('folder_id').text} – {car.find('price').text}\n"
            # for line in flat_description.split("\n"):
                # content += f"  {line}\n"
        else:
            if child.text:  # Only add if there's content
                content += f"{child.tag}: {child.text}\n"

    content += "---\n"
    content += process_description(description)

    with open(filename, 'w') as f:
        f.write(content)

    print(filename);
    existing_files.add(filename)

def update_yaml(car, filename):
    """Increment the 'total' value in the YAML block of an HTML file."""

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

    # Increment the 'total' value
    if 'total' in data:
        data['total'] += 1
    else:
        raise KeyError("'total' key not found in the YAML block.")

    if 'run' in data and 'run' in car:
        data['run'] = min(data['run'], int(car.find('run').text))
    else:
        data['run'] = 0
        # raise KeyError("'run' key not found in the YAML block.")

    # Convert the data back to a YAML string
    updated_yaml_block = yaml.safe_dump(data, default_flow_style=False, allow_unicode=True)

    # Reassemble the content with the updated YAML block
    updated_content = yaml_delimiter.join([parts[0], updated_yaml_block, yaml_delimiter.join(parts[2:])])

    # Save the updated content to the output file
    with open(filename, "w", encoding="utf-8") as f:
        f.write(updated_content)

    return filename

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

import xml.etree.ElementTree as ET

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

# Путь к папке для сохранения уменьшенных изображений
output_dir = "public/img/thumbs/"

# Глобальный список для хранения путей к текущим превьюшкам
current_thumbs = []

# Переменная для отслеживания наличия 404 ошибки
error_404_found = False

filename = 'cars.xml'

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


directory = "src/content/cars"
if os.path.exists(directory):
    shutil.rmtree(directory)
os.makedirs(directory)

existing_files = set()  # для сохранения имен созданных или обновленных файлов

with open('output.txt', 'w') as file:
    file.write("")

# Предполагаем, что у вас есть элементы с именами 'brand', 'engineType', 'driveType' и т.д.
elements_to_localize = ['engineType', 'driveType', 'gearboxType', 'ptsType', 'color', 'body_type', 'wheel']
# , 'bodyColor', 'bodyType', 'steeringWheel'

for car in root:
    rename_child_element(car, 'brand', 'mark_id')
    rename_child_element(car, 'model', 'folder_id')
    rename_child_element(car, 'modification', 'modification_id')
    rename_child_element(car, 'complectation', 'complectation_name')
    rename_child_element(car, 'bodyColor', 'color')
    rename_child_element(car, 'mileage', 'run')
    rename_child_element(car, 'bodyType', 'body_type')
    rename_child_element(car, 'steeringWheel', 'wheel')
    max_discount_tag = "tradeinDiscount"
    if(car.find('creditDiscount').text > car.find('tradeinDiscount').text):
        max_discount_tag = "creditDiscount"
    rename_child_element(car, max_discount_tag, 'max_discount')
    unique_id = f"{car.find('mark_id').text.strip()} {car.find('folder_id').text.strip()} {car.find('modification_id').text.strip()} {car.find('complectation_name').text.strip()} {car.find('color').text.strip()} {car.find('price').text.strip()} {car.find('year').text.strip()}"
    unique_id = f"{process_unique_id(unique_id)}"
    file_name = f"{unique_id}.mdx"
    file_path = os.path.join(directory, file_name)

    if os.path.exists(file_path):
        update_yaml(car, file_path)
    else:
        create_file(car, file_path, unique_id)

# Удаление неиспользуемых превьюшек
cleanup_unused_thumbs()


for existing_file in os.listdir(directory):
    filepath = os.path.join(directory, existing_file)
    if filepath not in existing_files:
        os.remove(filepath)

if error_404_found:
    with open('output.txt', 'a') as file:
        file.write("error 404 found")
else:
    with open('output.txt', 'a') as file:
        file.write("no error")

if error_404_found:
    print("error 404 found")

