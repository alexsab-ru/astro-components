import os
import argparse
import json
from utils import *
import xml.etree.ElementTree as ET
from typing import Dict, Any



def load_config(config_path: str, source_type: str) -> Dict[str, Any]:
    """
    Загружает конфигурацию из JSON файла.
    """
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
            return config.get(source_type, {
                "elements_to_localize": [],
                "remove_cars_after_duplicate": [],
                "remove_mark_ids": [],
                "remove_folder_ids": []
            })
    except FileNotFoundError:
        print(f"Конфигурационный файл {config_path} не найден. Используются значения по умолчанию.")
        return {
            "elements_to_localize": [],
            "remove_cars_after_duplicate": [],
            "remove_mark_ids": [],
            "remove_folder_ids": []
        }
    except json.JSONDecodeError:
        print(f"Ошибка при чтении {config_path}. Используются значения по умолчанию.")
        return {
            "elements_to_localize": [],
            "remove_cars_after_duplicate": [],
            "remove_mark_ids": [],
            "remove_folder_ids": []
        }

def process_car(car: ET.Element, config, all_duplicates, air_storage_data, elements_to_localize) -> None:
    """
    Обрабатывает отдельный автомобиль в XML.
    """
    if config.get('generate_friendly_url', False):
        friendly_url = f"{join_car_data(car, 'mark_id', 'folder_id', 'modification_id', 'complectation_name', 'color', 'year')}"
        friendly_url = f"{process_friendly_url(friendly_url)}"
        print(f"Уникальный идентификатор: {friendly_url}")
        create_child_element(car, 'url', f"https://{config['repo_name']}/cars/{friendly_url}/")
    
    # Заменяем цвет фида на цвет для Avito
    color = car.find('Color').text if car.find('Color') is not None else None
    if color:
        update_element_text(car, 'Color', avitoColor(car.find('Color').text))
    
    # Получаем VIN автомобиля
    vin = car.find('VIN').text if car.find('VIN') is not None else None
    
    if vin and vin in air_storage_data and air_storage_data.get(vin):
        # Создаем указанное количество дубликатов для машин из JSON
        duplicates = duplicate_car(car, config, air_storage_data[vin], "в наличии", 0)
        all_duplicates.extend(duplicates)


def main():
    """
    Основная функция программы.
    """
    parser = argparse.ArgumentParser(description='Download and merge XML files.')
    parser.add_argument('--input_file', default='cars.xml', help='Input file')
    parser.add_argument('--output_path', default='./public/cars.xml', help='Output path/file')
    parser.add_argument('--repo_name', default=os.getenv('REPO_NAME', 'localhost'), help='Repository name')
    parser.add_argument('--xml_url', default=os.getenv('XML_URL'), help='XML URL')
    parser.add_argument('--vin_tag', default='VIN', help='VIN tag name')
    parser.add_argument('--availability_tag', default='Availability', help='Availability tag name')
    parser.add_argument('--unique_id_tag', default='Id', help='Unique_id tag name')
    parser.add_argument('--source_type', choices=['autoru', 'avito'], required=True, help='Source type')
    parser.add_argument('--config_path', default='./.github/scripts/config_air_storage.json', help='Path to configuration file')
    args = parser.parse_args()
    config = vars(args)
    
    # Добавляем специфичные настройки в зависимости от типа источника
    config['generate_friendly_url'] = (args.source_type == 'autoru')

    # Загружаем дополнительные параметры из конфигурационного файла
    source_config = load_config(args.config_path, args.source_type)
    
    elements_to_localize = source_config['elements_to_localize']
    remove_cars_after_duplicate = source_config['remove_cars_after_duplicate']
    remove_mark_ids = source_config['remove_mark_ids']
    remove_folder_ids = source_config['remove_folder_ids']
    config['move_vin_id_up'] = source_config['move_vin_id_up']

    root = get_xml_content(args.input_file, args.xml_url)
    tree = ET.ElementTree(root)

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

    # Список для хранения всех дубликатов
    all_duplicates = [
    ]
    # Создаем список машин для удаления
    cars_to_remove = [
    ]
        
    # Определяем корневой элемент в зависимости от типа источника
    cars_element = root.find('cars') if args.source_type == 'autoru' else root
    
    # Обработка машин
    for car in cars_element:
        if should_remove_car(car, remove_mark_ids, remove_folder_ids):
            cars_to_remove.append(car)
            continue
        
        process_car(car, config, all_duplicates, air_storage_data, elements_to_localize)
        
        vin = car.find('VIN').text if car.find('VIN') is not None else None
        if vin and vin in remove_cars_after_duplicate:
            cars_to_remove.append(car)

    # Удаление ненужных машин
    for car in cars_to_remove:
        cars_element.remove(car)

    # После окончания основного цикла добавляем все дубликаты в cars_element
    for new_car in all_duplicates:
        cars_element.append(new_car)

    convert_to_string(root)
    tree.write(args.output_path, encoding='utf-8', xml_declaration=True)


if __name__ == "__main__":
    main()
