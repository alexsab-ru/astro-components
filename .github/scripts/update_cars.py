# python3 .github/scripts/update_cars.py
import os
import yaml
import shutil
from PIL import Image, ImageOps
from io import BytesIO
from config import dealer, model_mapping
from utils import *
import xml.etree.ElementTree as ET


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
        thumb = f"/img/models/{folder}/colors/{color_image}"
    else:
        print("")
        errorText = f"VIN: {vin}. Не хватает модели: {model} или цвета: {color}"
        print(errorText)
        print("")
        with open('output.txt', 'a') as file:
            file.write(f"{errorText}\n")
        # Если 'model' или 'color' не найдены, используем путь к изображению ошибки 404
        thumb = "/img/404.jpg"
        global error_404_found
        error_404_found = True

    # Forming the YAML frontmatter
    content = "---\n"
    # content += "layout: car-page\n"
    total_element = car.find('total')
    if total_element is not None:
        content += f"total: {int(total_element.text)}\n"
    else:
        content += "total: 1\n"
    # content += f"permalink: {unique_id}\n"
    content += f"vin_hidden: {vin_hidden}\n"

    h1 = build_unique_id(car, 'folder_id', 'modification_id')
    content += f"h1: {h1}\n"

    content += f"breadcrumb: {build_unique_id(car, 'mark_id', 'folder_id', 'complectation_name')}\n"

    title = f"{build_unique_id(car, 'mark_id', 'folder_id', 'modification_id')} купить у официального дилера в {dealer.get('where')}"
    content += f"title: {title}\n"

    description = ""

    for elem_name in elements_to_localize:
        elem = car.find(elem_name)
        localize_element_text(elem, translations)

    color = car.find('color').text.strip().capitalize()
    encountered_tags = set()  # Создаем множество для отслеживания встреченных тегов

    for child in car:
        # Skip nodes with child nodes (except images) and attributes
        if list(child) and child.tag != 'images':
            continue
        if child.tag == 'total':
            continue
        if child.tag == 'images':
            images = [img.text for img in child.findall('image')]
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
            content += f"""  Купить автомобиль {build_unique_id(car, 'mark_id', 'folder_id')}{f' {car.find("year").text} года выпуска' if car.find("year").text else ''}{f', комплектация {car.find("complectation_name").text}' if car.find("complectation_name").text != None else ''}{f', цвет - {car.find("color").text}' if car.find("color").text != None else ''}{f', двигатель - {car.find("modification_id").text}' if car.find("modification_id").text != None else ''} у официального дилера в г. {dealer.get('city')}. Стоимость данного автомобиля {build_unique_id(car, 'mark_id', 'folder_id')} – {car.find('priceWithDiscount').text}\n"""

            # for line in flat_description.split("\n"):
                # content += f"  {line}\n"
        else:
            if child.tag in encountered_tags:  # Проверяем, встречался ли уже такой тег
                continue  # Если встречался, переходим к следующей итерации цикла
            encountered_tags.add(child.tag)  # Добавляем встреченный тег в множество
            if child.text:  # Only add if there's content
                content += f"{child.tag}: {child.text}\n"

    content += "---\n"
    content += process_description(description)

    with open(filename, 'w') as f:
        f.write(content)

    print(filename);
    existing_files.add(filename)


def update_yaml(car, filename, unique_id):

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

    total_element = car.find('total')
    if 'total' in data and total_element is not None:
        try:
            car_total_value = int(total_element.text)
            data_total_value = int(data['total'])
            data['total'] = data_total_value + car_total_value
        except ValueError:
            # В случае, если не удается преобразовать значения в int,
            # можно оставить текущее значение data['total'] или установить его в 0,
            # либо выполнить другое действие по вашему выбору
            pass
    else:
        # Если элемент 'total' отсутствует в одном из источников,
        # можно установить значение по умолчанию для 'total' в data или обработать этот случай иначе
        data['total'] += 1

    run_element = car.find('run')
    if 'run' in data and run_element is not None:
        try:
            car_run_value = int(run_element.text)
            data_run_value = int(data['run'])
            data['run'] = min(data_run_value, car_run_value)
        except ValueError:
            # В случае, если не удается преобразовать значения в int,
            # можно оставить текущее значение data['run'] или установить его в 0,
            # либо выполнить другое действие по вашему выбору
            pass
    else:
        # Если элемент 'run' отсутствует в одном из источников,
        # можно установить значение по умолчанию для 'run' в data или обработать этот случай иначе
        data.setdefault('run', 0)

    priceWithDiscount_element = car.find('priceWithDiscount')
    if 'priceWithDiscount' in data and priceWithDiscount_element is not None:
        try:
            car_priceWithDiscount_value = int(priceWithDiscount_element.text)
            data_priceWithDiscount_value = int(data['priceWithDiscount'])
            data['priceWithDiscount'] = min(data_priceWithDiscount_value, car_priceWithDiscount_value)
        except ValueError:
            # В случае, если не удается преобразовать значения в int,
            # можно оставить текущее значение data['priceWithDiscount'] или установить его в 0,
            # либо выполнить другое действие по вашему выбору
            pass
    # else:
        # Если элемент 'priceWithDiscount' отсутствует в одном из источников,
        # можно установить значение по умолчанию для 'priceWithDiscount' в data или обработать этот случай иначе
        # data.setdefault('priceWithDiscount', 0)

    images_container = car.find('images')
    if images_container is not None:
        images = [img.text for img in images_container.findall('image')]
        if len(images) > 0:
            data.setdefault('images', []).extend(images)
            # Проверяем, нужно ли добавлять эскизы
            if 'thumbs' not in data or (len(data['thumbs']) < 5):
                thumbs_files = createThumbs(images, unique_id)  # Убедитесь, что эта функция реализована
                data.setdefault('thumbs', []).extend(thumbs_files)

    # Convert the data back to a YAML string
    updated_yaml_block = yaml.safe_dump(data, default_flow_style=False, allow_unicode=True)

    # Reassemble the content with the updated YAML block
    updated_content = yaml_delimiter.join([parts[0], updated_yaml_block, yaml_delimiter.join(parts[2:])])

    # Save the updated content to the output file
    with open(filename, "w", encoding="utf-8") as f:
        f.write(updated_content)

    return filename


# Переменная для отслеживания наличия 404 ошибки
error_404_found = False

# Создание директории для автомобилей
directory = "src/content/cars"
if os.path.exists(directory):
    shutil.rmtree(directory)
os.makedirs(directory)

# для сохранения имен созданных или обновленных файлов
existing_files = set()

with open('output.txt', 'w') as file:
    file.write("")

# Предполагаем, что у вас есть элементы с именами
elements_to_localize = []

for car in root.find('cars'):

    price = int(car.find('price').text or 0)
    max_discount = int(car.find('max_discount').text or 0)
    create_child_element(car, 'priceWithDiscount', price - max_discount)
    create_child_element(car, 'sale_price', price - max_discount)
    unique_id = f"{build_unique_id(car, 'mark_id', 'folder_id', 'modification_id', 'complectation_name', 'color', 'year')}"
    unique_id = f"{process_unique_id(unique_id)}"
    print(f"Уникальный идентификатор: {unique_id}")
    create_child_element(car, 'url', f"https://{repo_name}/cars/{unique_id}/")
    file_name = f"{unique_id}.mdx"
    file_path = os.path.join(directory, file_name)

    if os.path.exists(file_path):
        update_yaml(car, file_path, unique_id)
    else:
        create_file(car, file_path, unique_id)

output_path = './public/cars.xml'
tree.write(output_path, encoding='utf-8', xml_declaration=True)

# Удаление неиспользуемых превьюшек
cleanup_unused_thumbs()


for existing_file in os.listdir(directory):
    filepath = os.path.join(directory, existing_file)
    if filepath not in existing_files:
        os.remove(filepath)

if error_404_found:
    print("error 404 found")

