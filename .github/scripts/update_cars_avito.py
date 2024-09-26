# python3 .github/scripts/update_cars_avito.py
import os
import yaml
import shutil
import copy
import string
from PIL import Image, ImageOps
from io import BytesIO
from config import dealer, model_mapping
from utils import *
import xml.etree.ElementTree as ET

# Создаем последовательность a-z + 0-9
chars = string.ascii_lowercase + string.digits
base = len(chars)  # Основание для системы исчисления (36)

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

def duplicate_car(car, n, status = "в пути", offset = 0):
    """Функция для дублирования элемента 'car' N раз с изменением vin."""
    duplicates = []
    for i in range(n):
        new_car = copy.deepcopy(car)  # Клонируем текущий элемент car

        # Обрабатываем VIN
        vin = new_car.find('vin').text
        new_vin = increment_str(vin.lower(), offset+i+1)
        new_car.find('vin').text = new_vin.upper()  # Меняем текст VIN

        # Обрабатываем unique_id
        unique_id = new_car.find('unique_id').text
        new_unique_id = increment_str(unique_id, offset+i+1)  # Изменяем последний символ на i
        new_car.find('unique_id').text = new_unique_id  # Меняем текст unique_id

        print(unique_id, new_unique_id)
        
        # Обновляем статус
        new_car.find('availability').text = status  # Меняем статус Наличие автомобиля
        duplicates.append(new_car)
    
    return duplicates



# Переменная для отслеживания наличия 404 ошибки
error_404_found = False

with open('output.txt', 'w') as file:
    file.write("")

# Предполагаем, что у вас есть элементы с именами
elements_to_localize = []
# Предполагаем, что cars_element уже определён
all_duplicates = []  # Список для хранения всех дубликатов

cars_element = root.find('cars')

for car in cars_element:
    unique_id = f"{build_unique_id(car, 'mark_id', 'folder_id', 'modification_id', 'complectation_name', 'color', 'year')}"
    unique_id = f"{process_unique_id(unique_id)}"
    print(f"Уникальный идентификатор: {unique_id}")
    create_child_element(car, 'url', f"https://{repo_name}/cars/{unique_id}/")
    
    # Создаем дубликаты, но не добавляем их сразу в cars_element
    duplicates = duplicate_car(car, 0, "в наличии", len(all_duplicates))
    all_duplicates.extend(duplicates)  # Добавляем дубликаты в отдельный список
    
    duplicates = duplicate_car(car, 0, "в пути", len(all_duplicates))
    all_duplicates.extend(duplicates)  # Добавляем дубликаты в отдельный список
    
    duplicates = duplicate_car(car, 0, "на заказ", len(all_duplicates))
    all_duplicates.extend(duplicates)  # Добавляем дубликаты в отдельный список
    
    # Добавляем дубликаты в отдельный список

# После окончания основного цикла добавляем все дубликаты в cars_element
for new_car in all_duplicates:
    cars_element.append(new_car)


output_path = './public/avito.xml'
convert_to_string(root)
tree.write(output_path, encoding='utf-8', xml_declaration=True)

if error_404_found:
    print("error 404 found")

