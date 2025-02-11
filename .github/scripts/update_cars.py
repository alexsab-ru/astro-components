import os
import argparse
from utils import *
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional

class CarProcessor:
    def __init__(self, source_type: str):
        self.source_type = source_type
        self.setup_source_config()

    def setup_source_config(self):
        """Настройка конфигурации в зависимости от типа источника"""
        configs = {
            'data_cars_car': {
                'root_element': 'cars',
                'rename_map': {},
                'elements_to_localize': []
            },
            'maxposter': {
                'root_element': None,  # корневой элемент
                'rename_map': {
                    'brand': 'mark_id',
                    'model': 'folder_id',
                    'modification': 'modification_id',
                    'complectation': 'complectation_name',
                    'bodyColor': 'color',
                    'mileage': 'run',
                    'bodyType': 'body_type',
                    'steeringWheel': 'wheel'
                },
                'elements_to_localize': [
                    'engineType', 'driveType', 'gearboxType', 'ptsType', 'color', 'body_type', 'wheel'
                ]
            },
            'carcopy': {
                'root_element': 'offers',
                'rename_map': {
                    'make': 'mark_id',
                    'model': 'folder_id',
                    'version': 'modification_id',
                    'complectation': 'complectation_name',
                    'body-type': 'body_type',
                    'drive-type': 'drive_type',
                    'steering-wheel': 'wheel',
                    'max-discount': 'max_discount'
                },
                'elements_to_localize': [
                    'engineType', 'drive_type', 'gearboxType', 'ptsType', 'color', 'body_type', 'wheel'
                ]
            },
            'vehicles_vehicle': {
                'root_element': 'vehicles',
                'rename_map': {
                    'mark': 'mark_id',
                    'model': 'folder_id',
                    'modification': 'modification_id',
                    'сomplectation-name': 'complectation_name',
                    'complectation-code': 'complectation_code',
                    'engine-type': 'engineType',
                    'body-type': 'body_type',
                    'drive-type': 'drive_type',
                    'steering-wheel': 'wheel',
                    'max-discount': 'max_discount',
                    'tradein-discount': 'tradeinDiscount',
                    'credit-discount': 'creditDiscount',
                    'insurance-discount': 'insuranceDiscount'
                },
                'elements_to_localize': [
                    'engineType', 'drive_type', 'gearboxType', 'ptsType', 'color', 'body_type', 'wheel'
                ]
            }
        }
        
        self.config = configs.get(self.source_type)
        if not self.config:
            raise ValueError(f"Неизвестный тип источника: {self.source_type}")

    def calculate_max_discount(self, car: ET.Element) -> int:
        """Расчёт максимальной скидки в зависимости от типа источника"""
        if self.source_type in ['maxposter', 'vehicles_vehicle']:
            credit_discount = int(car.find('creditDiscount').text or 0)
            tradein_discount = int(car.find('tradeinDiscount').text or 0)
            return credit_discount + tradein_discount
        else:
            return int(car.find('max_discount').text or 0)

    def process_car(self, car: ET.Element, existing_files: set, current_thumbs: List[str], 
                   prices_data: Dict, config: Dict) -> None:
        """Обработка отдельного автомобиля"""
        # Базовые расчёты цены и скидки
        price = int(car.find('price').text or 0)
        max_discount = self.calculate_max_discount(car)
        
        # Создание/обновление элементов
        create_child_element(car, 'max_discount', max_discount)
        sale_price = price - max_discount
        
        # Обработка priceWithDiscount в зависимости от источника
        if self.source_type == 'maxposter' and car.find('priceWithDiscount').text is not None:
            sale_price = int(car.find('priceWithDiscount').text)
        create_child_element(car, 'priceWithDiscount', sale_price)
        create_child_element(car, 'sale_price', sale_price)

        for elem_name in self.config['elements_to_localize']:
            elem = car.find(elem_name)
            localize_element_text(elem)
        
        # Создание URL
        friendly_url = process_friendly_url(
            join_car_data(car, 'mark_id', 'folder_id', 'modification_id',
                         'complectation_name', 'color', 'year')
        )
        print(f"Уникальный идентификатор: {friendly_url}")
        
        url = f"https://{config['repo_name']}{config['path_car_page']}{friendly_url}/"
        create_child_element(car, 'url', url)
        if self.source_type in ['carcopy', 'vehicles_vehicle']:
            update_element_text(car, 'url_link', url)
        
        # Обработка файла
        file_name = f"{friendly_url}.mdx"
        file_path = os.path.join(config['cars_dir'], file_name)

        update_car_prices(car, prices_data)

        if os.path.exists(file_path):
            update_yaml(car, file_path, friendly_url, current_thumbs, config)
        else:
            create_file(car, file_path, friendly_url, current_thumbs,
                       existing_files, config)

    def rename_elements(self, car: ET.Element) -> None:
        """Переименование элементов согласно карте переименований"""
        for old_name, new_name in self.config['rename_map'].items():
            rename_child_element(car, old_name, new_name)

    def get_cars_element(self, root: ET.Element) -> ET.Element:
        """Получение элемента, содержащего список машин"""
        return root if self.config['root_element'] is None else root.find(self.config['root_element'])

def main():
    """
    Основная функция программы.
    """
    parser = argparse.ArgumentParser(description='Process cars from different sources')
    parser.add_argument('--source_type', required=True, choices=['data_cars_car', 'maxposter', 'carcopy', 'vehicles_vehicle'], help='Type of source data')
    parser.add_argument('--path_car_page', default='/cars/', help='Default path to cars pages')
    parser.add_argument('--thumbs_dir', default='public/img/thumbs/', help='Default output directory for thumbnails')
    parser.add_argument('--cars_dir', default='src/content/cars', help='Default cars directory')
    parser.add_argument('--input_file', default='cars.xml', help='Input file')
    parser.add_argument('--output_path', default='./public/cars.xml', help='Output path/file')
    parser.add_argument('--repo_name', default=os.getenv('REPO_NAME', 'localhost'), help='Repository name')
    parser.add_argument('--xml_url', default=os.getenv('XML_URL'), help='XML URL')
    parser.add_argument('--skip_thumbs', action="store_true", help='Skip create thumbnails')
    parser.add_argument('--image_tag', default='image', help='Image tag name')
    parser.add_argument('--description_tag', default='description', help='Description tag name')
    parser.add_argument('--config_source', 
                    choices=['env', 'file', 'github'], 
                    default='file',
                    help='Config source type (file, env, or github)')
    parser.add_argument('--config_path', default='./.github/scripts/config_air_storage.json', help='Path to configuration file')
    parser.add_argument('--github_repo', help='GitHub repository in format owner/repo')
    parser.add_argument('--github_path', default='config', help='Path to config directory in GitHub repository')
    parser.add_argument('--gist_id', help='GitHub Gist ID with configuration')
    
    args = parser.parse_args()
    config = vars(args)

    default_config = {
        "move_vin_id_up": 0,
        "new_address": "",
        "new_phone": "",
        "replacements": {},
        "elements_to_localize": [],
        "remove_cars_after_duplicate": [],
        "remove_mark_ids": [],
        "remove_folder_ids": []
    }
    # Загружаем конфигурацию в зависимости от источника
    if args.config_source == 'file':
        source_config = load_file_config(args.config_path, args.source_type, default_config)  # Существующая функция загрузки из файла
    elif args.config_source == 'env':
        source_config = load_env_config(args.source_type, default_config)
    elif args.config_source == 'github':
        github_config = {}
        if args.gist_id:
            github_config['gist_id'] = args.gist_id
        elif args.github_repo:
            github_config['repo'] = args.github_repo
            github_config['path'] = args.github_path
        else:
            print("Для использования GitHub необходимо указать --gist_id или --github_repo")
            return

        source_config = load_github_config(args.source_type, github_config, default_config)
    else:
        raise ValueError(f"Неподдерживаемый источник конфигурации: {args.config_source}")
    
    replacements = source_config['replacements']
    elements_to_localize = source_config['elements_to_localize']
    remove_cars_after_duplicate = source_config['remove_cars_after_duplicate']
    remove_mark_ids = source_config['remove_mark_ids']
    remove_folder_ids = source_config['remove_folder_ids']
    config['move_vin_id_up'] = source_config['move_vin_id_up']
    config['new_address'] = source_config['new_address']
    config['new_phone'] = source_config['new_phone']
    
    # Инициализация процессора для конкретного источника
    processor = CarProcessor(args.source_type)
    
    prices_data = load_price_data()

    # Инициализация
    root = get_xml_content(args.input_file, args.xml_url)
    tree = ET.ElementTree(root)
    setup_directories(config['thumbs_dir'], args.cars_dir)
    
    existing_files = set()
    # Список для хранения путей к текущим превьюшкам
    current_thumbs = []

    with open('output.txt', 'w') as file:
        file.write("")

    cars_to_remove = [
    ]
    
    # Обработка машин
    # cars_element = root.find('cars')
    cars_element = processor.get_cars_element(root)
    for car in cars_element:
        processor.rename_elements(car)

        if should_remove_car(car, remove_mark_ids, remove_folder_ids):
            cars_to_remove.append(car)
            continue
        
        processor.process_car(car, existing_files, current_thumbs, prices_data, config)
    
    # Удаление ненужных машин
    for car in cars_to_remove:
        cars_element.remove(car)
    
    convert_to_string(root)
    tree.write(args.output_path, encoding='utf-8', xml_declaration=True)
    
    # Очистка
    cleanup_unused_thumbs(current_thumbs, config['thumbs_dir'])
    
    for existing_file in os.listdir(args.cars_dir):
        filepath = os.path.join(args.cars_dir, existing_file)
        if filepath not in existing_files:
            os.remove(filepath)
    
    if os.path.exists('output.txt') and os.path.getsize('output.txt') > 0:
        print("error 404 found")

if __name__ == "__main__":
    main()
