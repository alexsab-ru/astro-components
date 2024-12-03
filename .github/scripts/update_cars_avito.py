import argparse
import os
import yaml
import shutil
import copy
import json
import string
from PIL import Image, ImageOps
from io import BytesIO
from config import *
from utils import *
import xml.etree.ElementTree as ET

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

def duplicate_car(car, n, status="в пути", offset=0):
    """Функция для дублирования элемента 'car' N раз с изменением vin."""
    duplicates = []
    
    # Проверка наличия обязательных полей 'vin' и 'availability'
    try:
        if car.find('vin') is None:
            raise ValueError("Элемент 'car' не содержит обязательного поля 'vin'")
        if car.find('availability') is None:
            raise ValueError("Элемент 'car' не содержит обязательного поля 'availability'")
    except ValueError as e:
        print(f"Ошибка: {e}")
        return duplicates  # Вернем пустой список и продолжим выполнение скрипта
    
    for i in range(n):
        try:
            new_car = copy.deepcopy(car)  # Клонируем текущий элемент car
            
            # Обрабатываем VIN
            vin_element = new_car.find('vin')
            vin = vin_element.text
            new_vin = modify_vin(vin.lower(), offset + i + 1)
            vin_element.text = new_vin.upper()  # Меняем текст VIN
            
            # Обрабатываем unique_id, если он существует
            unique_id_element = new_car.find('unique_id')
            if unique_id_element is not None:
                unique_id = unique_id_element.text
                new_unique_id = increment_str(unique_id, offset + i + 1)  # Изменяем последний символ на i
                unique_id_element.text = new_unique_id  # Меняем текст unique_id
                print(vin, new_vin, unique_id, new_unique_id)
            else:
                print(vin, new_vin, "unique_id отсутствует")
            
            # Обновляем статус
            availability_element = new_car.find('availability')
            availability_element.text = status  # Меняем статус Наличие автомобиля

            duplicates.append(new_car)

        except AttributeError as e:
            print(f"Ошибка при обработке элемента: {e}")
    
    return duplicates

parser = argparse.ArgumentParser(description='Download and merge XML files.')
parser.add_argument('--output', default='./public/avito.xml', help='Output file path/name')
args = parser.parse_args()

# Загружаем данные из JSON файла
air_storage_data = {}
if os.path.exists('air_storage.json'):
    try:
        with open('air_storage.json', 'r', encoding='utf-8') as f:
            air_storage_data = json.load(f)
    except json.JSONDecodeError:
        print("Ошибка при чтении air_storage.json")
    except Exception as e:
        print(f"Произошла ошибка при работе с файлом: {e}")

# Предполагаем, что у вас есть элементы с именами
elements_to_localize = []
# Предполагаем, что cars_element уже определён
all_duplicates = []  # Список для хранения всех дубликатов
# Создаем список машин для удаления
cars_to_remove = []
remove_mark_ids = [
]
remove_folder_ids = [
]
cars_element = root.find('cars')

for car in cars_element:
    should_remove = False
    
    # Проверяем mark_id только если список не пустой
    if remove_mark_ids:
        car_mark = car.find('mark_id').text
        if car_mark in remove_mark_ids:
            should_remove = True
    
    # Проверяем folder_id только если список не пустой
    if remove_folder_ids:
        car_folder = car.find('folder_id').text
        if car_folder in remove_folder_ids:
            should_remove = True
    
    if should_remove:
        cars_to_remove.append(car)
        continue  # Пропускаем остальные операции для этой машины

    friendly_url = f"{join_car_data(car, 'mark_id', 'folder_id', 'modification_id', 'complectation_name', 'color', 'year')}"
    friendly_url = f"{process_friendly_url(friendly_url)}"
    print(f"Уникальный идентификатор: {friendly_url}")
    create_child_element(car, 'url', f"https://{repo_name}/cars/{friendly_url}/")
    update_element_text(car, 'color', avitoColor(car.find('color').text))
    
    # Получаем VIN автомобиля
    vin = car.find('vin').text if car.find('vin') is not None else None
    
    if vin and vin in air_storage_data and air_storage_data.get(vin):
        # Создаем указанное количество дубликатов для машин из JSON
        duplicates = duplicate_car(car, air_storage_data[vin], "в наличии", 0)
        all_duplicates.extend(duplicates)
    
    # Добавляем дубликаты в отдельный список

# Удаляем все не-BelGee машины
for car in cars_to_remove:
    cars_element.remove(car)

# После окончания основного цикла добавляем все дубликаты в cars_element
for new_car in all_duplicates:
    cars_element.append(new_car)

convert_to_string(root)
tree.write(args.output, encoding='utf-8', xml_declaration=True)

