import os
import re
import yaml
import shutil
import requests
import urllib.parse
from PIL import Image, ImageOps
from io import BytesIO

# Parsing XML
import xml.etree.ElementTree as ET


def process_unique_id(unique_id, replace = "-"):
    # Удаление специальных символов
    processed_id = re.sub(r'[.,()"\']', '', unique_id)

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
    permalink = unique_id
    vin_hidden = process_vin_hidden(vin)
    # Преобразование цвета
    color = car.find('color').text.strip().capitalize()
    model = car.find('folder_id').text.strip()

    thumb = f"/img/models/{model_mapping.get(model, '../404.jpg?').get('folder')}/colors/{model_mapping.get(model, '../404.jpg?').get('color').get(color, '../../../404.jpg?')}.webp"


    # Forming the YAML frontmatter
    content = "---\n"
    # content += "layout: car-page\n"
    content += "total: 1\n"
    # content += f"permalink: {permalink}\n"
    content += f"vin_hidden: {vin_hidden}\n"

    h1 = f"{car.find('folder_id').text} {car.find('modification_id').text}"
    content += f"h1: {h1}\n"

    title = f"{car.find('mark_id').text} {car.find('folder_id').text} {car.find('modification_id').text} купить у официального дилера в Оренбурге"
    content += f"title: {title}\n"

    description = ""

    for child in car:
        # Skip nodes with child nodes (except images) and attributes
        if list(child) and child.tag != 'images':
            continue
        if child.tag == 'images':
            images = [img.text for img in child.findall('image')]
            thumbs_files = createThumbs(images)
            content += f"{child.tag}: {images}\n"
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
            content += f"{child.tag}: |\n"
            content += f"  Купить автомобиль {car.find('mark_id').text} {car.find('folder_id').text} {car.find('year').text} года выпуска, комплектация {car.find('complectation_name').text}, цвет - {car.find('color').text}, двигатель - {car.find('modification_id').text} у официального дилера в г. Оренбург. Стоимость данного автомобиля {car.find('mark_id').text} {car.find('folder_id').text} – {car.find('price').text}\n"
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

    if 'run' in data:
        data['run'] = min(data['run'], int(car.find('run').text))
    else:
        raise KeyError("'run' key not found in the YAML block.")

    # Convert the data back to a YAML string
    updated_yaml_block = yaml.safe_dump(data, default_flow_style=False, allow_unicode=True)

    # Reassemble the content with the updated YAML block
    updated_content = yaml_delimiter.join([parts[0], updated_yaml_block, yaml_delimiter.join(parts[2:])])

    # Save the updated content to the output file
    with open(filename, "w", encoding="utf-8") as f:
        f.write(updated_content)

    return filename

def createThumbs(image_urls):
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
    for img_url in image_urls[:5]:
        try:
            original_filename = os.path.basename(urllib.parse.urlparse(img_url).path)
            filename_without_extension, _ = os.path.splitext(original_filename)
            output_filename = f"thumb_{filename_without_extension}.webp"
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
            else:
                print(f"Файл уже существует: {relative_output_path}")

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

# Путь к папке для сохранения уменьшенных изображений
output_dir = "public/img/thumbs/"

# Глобальный список для хранения путей к текущим превьюшкам
current_thumbs = []

filename = 'cars.xml'

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
# Словарь соответствия цветов
model_mapping = {
    "Atlas Pro": {
        "folder": "Atlas Pro",
        "color": {
            "Черный": "black-metallic",
            "Серый": "gray-metallic",
            "Красный": "red-metallic",
            "Серебристый": "silver-metallic",
        }},
    "Atlas, I": {
        "folder": "Atlas Pro",
        "color": {

        }},
    "Atlas, II": {
        "folder": "Atlas-2024",
        "color": {
            "Черный": "black-metallic",
            "Серебристый": "silver-metallic",
            "Серый": "starry-blue-metallic",
            "Белый": "white",
        }},
    "Azkarra": {
        "folder": "Azkarra",
        "color": {

        }},
    "Binrui Cool": {
        "folder": "Binrui",
        "color": {

        }},
    "Binrui, I Рестайлинг": {
        "folder": "Binrui",
        "color": {

        }},
    "Binyue Cool": {
        "folder": "Binyue",
        "color": {

        }},
    "Binyue, I Рестайлинг 2": {
        "folder": "Binyue",
        "color": {

        }},
    "Boyue Cool": {
        "folder": "Boyue",
        "color": {

        }},
    "Boyue Pro": {
        "folder": "Boyue",
        "color": {

        }},
    "Boyue, II": {
        "folder": "Boyue",
        "color": {

        }},
    "Coolray, I Рестайлинг": {
        "folder": "New Coolray",
        "color": {

        }},
    "Coolray, I": {
        "folder": "Coolray",
        "color": {
            "Синий": "blue-metallic",
            "Серый": "grey",
            "Красный": "red",
            "Серебристый": "silver-metallic",
            "Белый": "white",
        }},
    "Emgrand L": {
        "folder": "Emgrand",
        "color": {
            "Черный": "black-metallic",
            "Синий": "blue-metallic",
            "Золотой": "gold-metallic",
            "Серый": "gray-metallic",
            "Белый": "white-metallic",
        }},
    "Emgrand, II": {
        "folder": "Emgrand",
        "color": {
            "Черный": "black-metallic",
            "Синий": "blue-metallic",
            "Золотой": "gold-metallic",
            "Серый": "gray-metallic",
            "Белый": "white-metallic",
        }},
    "Galaxy E8": {
        "folder": "Galaxy",
        "color": {

        }},
    "Galaxy L6": {
        "folder": "Galaxy",
        "color": {

        }},
    "Galaxy L7": {
        "folder": "Galaxy",
        "color": {

        }},
    "Geometry A": {
        "folder": "Geometry",
        "color": {

        }},
    "Geometry C": {
        "folder": "Geometry",
        "color": {

        }},
    "Geometry E": {
        "folder": "Geometry",
        "color": {

        }},
    "Geometry G6": {
        "folder": "Geometry",
        "color": {

        }},
    "Geometry M6": {
        "folder": "Geometry",
        "color": {

        }},
    "Haoyue L": {
        "folder": "Haoyue",
        "color": {

        }},
    "Icon": {
        "folder": "Icon",
        "color": {

        }},
    "Jiaji, I Рестайлинг": {
        "folder": "Jiaji",
        "color": {

        }},
    "Monjaro": {
        "folder": "Monjaro",
        "color": {
            "Черный": "black-metallic",
            "Зеленый": "emerald-metallic",
            "Серый": "gray-metallic",
            "Серебристый": "silver-metallic",
            "Белый": "white-metallic",
        }},
    "Okavango": {
        "folder": "Okavango",
        "color": {

        }},
    "Preface, I Рестайлинг": {
        "folder": "Preface",
        "color": {

        }},
    "Tugella, I Рестайлинг": {
        "folder": "Tugella",
        "color": {
            "Черный": "black-metallic",
            "Серо-голубой": "gray-blue-metallic",
            "Серый": "gray-metallic",
            "Белый": "white-metallic",
        }},
    "Vision X3 Pro": {
        "folder": "Vision",
        "color": {

        }},
    "Vision X6 Pro": {
        "folder": "Vision",
        "color": {

        }},
    "Xingyue L": {
        "folder": "Xingyue",
        "color": {

        }},
    "Xingyue, I Рестайлинг (S)": {
        "folder": "Xingyue",
        "color": {

        }},
    # ... добавьте другие модели по мере необходимости
}


for car in root.find('cars'):
    unique_id = f"{car.find('mark_id').text} {car.find('folder_id').text} {car.find('modification_id').text} {car.find('complectation_name').text} {car.find('color').text} {car.find('price').text} {car.find('year').text}"
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
