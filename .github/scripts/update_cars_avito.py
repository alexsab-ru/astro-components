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

def increment_char(c):
    """Увеличивает символ по правилу a-z0-9. Если достигнута 'z', идет к '0', и так далее."""
    index = chars.index(c)
    return chars[(index + 1) % len(chars)]  # Циклически перемещаемся по последовательности

def modify_unique_id(unique_id, i):
    """Изменяет последний символ unique_id с учетом правила a-z0-9."""
    last_char = unique_id[-1]
    print(last_char, i, range(i))
    for k in range(i):
        last_char = increment_char(last_char)  # Увеличиваем последний символ i раз
        print(last_char)
    return unique_id[:-1] + last_char  # Собираем новый unique_id

def duplicate_car(car, n, status = "в пути", num=9):
    """Функция для дублирования элемента 'car' N раз с изменением vin."""
    duplicates = []
    for i in range(n):
        new_car = copy.deepcopy(car)  # Клонируем текущий элемент car
        vin = new_car.find('vin').text

        # Извлекаем последние 5 символов
        vin_suffix = vin[-5:]
        # Меняем пятую цифру с конца на 9
        vin_suffix = int(num) + int(vin_suffix[1:])
        # Преобразуем последние 5 символов в число и уменьшаем на i
        new_suffix = str(int(vin_suffix) - i).zfill(5)  # zfill добавляет ведущие нули, если нужно
        # Собираем новый VIN
        new_vin = vin[:-5] + new_suffix
        # new_vin = f"VIN_{i+1:05d}"    # Генерация уникального значения VIN (заглушка)
        new_car.find('vin').text = new_vin  # Меняем текст VIN

        # Обрабатываем unique_id
        unique_id = new_car.find('unique_id').text
        new_unique_id = modify_unique_id(unique_id, i+1)  # Изменяем последний символ на i
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
    duplicates = duplicate_car(car, 1)
    all_duplicates.extend(duplicates)  # Добавляем дубликаты в отдельный список

# После окончания основного цикла добавляем все дубликаты в cars_element
for new_car in all_duplicates:
    cars_element.append(new_car)


output_path = './public/avito.xml'
convert_to_string(root)
tree.write(output_path, encoding='utf-8', xml_declaration=True)

if error_404_found:
    print("error 404 found")

