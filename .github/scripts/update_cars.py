#!/usr/bin/env python
import os
import json
import argparse
import glob
from pathlib import Path
from utils import *
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Tuple

class CarProcessor:
    def __init__(self, source_type: str):
        self.source_type = source_type
        self.setup_source_config()
        self.existing_files = set()
        self.current_thumbs = []
        self.prices_data = load_price_data()
        
        # Прямое хранение агрегированных данных в готовом формате
        # Ключ: (brand, model), Значение: полный объект для JSON
        self.cars_price_data = {}
        
        self.sort_storage_data = {}
        if os.path.exists('./src/data/sort_storage.json'):
            try:
                with open('./src/data/sort_storage.json', 'r', encoding='utf-8') as f:
                    self.sort_storage_data = json.load(f)
            except json.JSONDecodeError:
                print("Ошибка при чтении ./src/data/sort_storage.json")
            except Exception as e:
                print(f"Произошла ошибка при работе с файлом: {e}")
        
        self.dealer_photos_for_cars_avito = {}
        if os.path.exists('dealer_photos_for_cars_avito.xml'):
            try:
                avito_root = get_xml_content('dealer_photos_for_cars_avito.xml', '')
                for car in avito_root.findall('Ad'):
                    vin = car.find('VIN').text
                    self.dealer_photos_for_cars_avito[vin] = {
                        'images': [],
                        'description': ''
                    }
                    # Обработка изображений
                    for image in car.find('Images').findall('Image'):
                        self.dealer_photos_for_cars_avito[vin]['images'].append(image.get('url'))
                    # Обработка описания
                    description_elem = car.find('Description')
                    if description_elem is not None and description_elem.text:
                        # Извлекаем текст из CDATA
                        description_text = description_elem.text
                        if description_text.startswith('<![CDATA[') and description_text.endswith(']]>'):
                            description_text = description_text[9:-3]  # Удаляем CDATA обертку
                        self.dealer_photos_for_cars_avito[vin]['description'] = description_text
            except json.JSONDecodeError:
                print("Ошибка при чтении dealer_photos_for_cars_avito.xml")
            except Exception as e:
                print(f"Произошла ошибка при работе с файлом: {e}")

    def setup_source_config(self):
        """Настройка конфигурации в зависимости от типа источника"""
        configs = {
            'data_cars_car': {
                'root_element': 'cars',
                'image_tag': 'image',
                'description_tag': 'description',
                'rename_map': {},
                'elements_to_localize': []
            },
            'ads_ad': {
                'root_element': None,
                'image_tag': 'photo',
                'description_tag': 'description',
                'rename_map': {
                    'VIN': 'vin',
                    'Make': 'mark_id',
                    'Model': 'folder_id',
                    'Modification': 'modification_id',
                    'Complectation': 'complectation_name',
                    'BodyType': 'body_type',
                    'DriveType': 'drive_type',
                    'Transmission': 'gearboxType',
                    'WheelType': 'wheel',
                    'FuelType': 'engineType',
                    'Color': 'color',
                    'Price': 'price',
                    'MaxDiscount': 'max_discount',
                    'TradeinDiscount': 'tradeinDiscount',
                    'Year': 'year',
                    'Availability': 'availability',
                    'Description': 'description',
                    'url': 'image_url_attr'
                },
                'elements_to_localize': [
                    'engineType', 'drive_type', 'gearboxType', 'color', 'body_type', 'wheel'
                ]
            },
            'maxposter': {
                'root_element': None,  # корневой элемент
                'image_tag': 'photo',
                'description_tag': 'description',
                'rename_map': {
                    'brand': 'mark_id',
                    'model': 'folder_id',
                    'Model': 'folder_id',
                    'Make': 'mark_id',
                    'Year': 'year',
                    'modification': 'modification_id',
                    'Modification': 'modification_id',
                    'complectation': 'complectation_name',
                    'Complectation': 'complectation_name',
                    'bodyColor': 'color',
                    'mileage': 'run',
                    'bodyType': 'body_type',
                    'BodyType': 'body_type',
                    'steeringWheel': 'wheel',
                    'WheelType': 'wheel',
                    'DriveType': 'drive_type',
                    'Transmission': 'gearboxType',
                    'Price': 'price',
                    'Description': 'description',
                    'MaxDiscount': 'max_discount',
                    'TradeinDiscount': 'tradeinDiscount',
                    'CreditDiscount': 'creditDiscount',
                    'InsuranceDiscount': 'insuranceDiscount',
                    'VIN': 'vin',
                    'Color': 'color'
                },
                'elements_to_localize': [
                    'engineType', 'driveType', 'gearboxType', 'ptsType', 'color', 'body_type', 'wheel'
                ]
            },
            'carcopy': {
                'root_element': 'offers',
                'image_tag': 'photo',
                'description_tag': 'comment',
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
                'root_element': None,
                'image_tag': 'photo',
                'description_tag': 'description',
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

    def auto_detect_source_type(self, xml_file_path: str) -> Optional[str]:
        """
        Автоматически определяет тип источника на основе структуры XML.
        
        Args:
            xml_file_path: Путь к XML файлу
            
        Returns:
            str: Определенный тип источника или None
        """
        try:
            root = get_xml_content(xml_file_path, '')
            root_tag = root.tag
            
            # Проверяем корневой элемент
            if root_tag == 'data':
                cars_elem = root.find('cars')
                if cars_elem is not None:
                    return 'data_cars_car'
            
            if root_tag == 'vehicles':
                return 'vehicles_vehicle'
            
            if root_tag in ['maxposter', 'Maxposter']:
                return 'maxposter'
                
            if root_tag == 'carcopy':
                offers_elem = root.find('offers')
                if offers_elem is not None:
                    return 'carcopy'
            
            # Проверяем структуру Ads-Ad
            if len(root) > 0:
                first_child = root[0]
                if first_child.tag == 'Ad':
                    return 'ads_ad'
            
            print(f"Предупреждение: Не удалось определить тип для файла {xml_file_path}, корневой элемент: {root_tag}")
            return None
            
        except Exception as e:
            print(f"Ошибка при автоопределении типа для {xml_file_path}: {e}")
            return None

    def calculate_max_discount(self, car: ET.Element) -> int:
        """Расчёт максимальной скидки в зависимости от типа источника"""
        if self.source_type in ['maxposter', 'vehicles_vehicle']:
            credit_discount_elem = car.find('creditDiscount')
            tradein_discount_elem = car.find('tradeinDiscount')
            
            credit_discount = int(credit_discount_elem.text or 0) if credit_discount_elem is not None and credit_discount_elem.text else 0
            tradein_discount = int(tradein_discount_elem.text or 0) if tradein_discount_elem is not None and tradein_discount_elem.text else 0

            return credit_discount + tradein_discount
        else:
            max_discount_elem = car.find('max_discount')
            if max_discount_elem is not None and max_discount_elem.text:
                print("max_discount: " + max_discount_elem.text)
                return int(max_discount_elem.text)
            else:
                print("Элемент max_discount отсутствует или пустой")
                return 0

    def process_car(self, car: ET.Element, config: Dict) -> None:
        """Обработка отдельного автомобиля"""
        # Создание URL
        friendly_url = process_friendly_url(
            join_car_data(car, 'mark_id', 'folder_id', 'modification_id',
                         'complectation_name', 'color', 'year')
        )
        print(f"\nУникальный идентификатор: {friendly_url}")
        
        # Базовые расчёты цены и скидки
        price = int(car.find('price').text or 0)
        max_discount = self.calculate_max_discount(car)
        
        # Создание/обновление элементов
        create_child_element(car, 'max_discount', max_discount)
        sale_price = price - max_discount
        
        # Обработка priceWithDiscount в зависимости от источника
        price_with_discount_elem = car.find('priceWithDiscount')
        if self.source_type == 'maxposter' and price_with_discount_elem is not None and price_with_discount_elem.text is not None:
            sale_price = int(price_with_discount_elem.text)
        create_child_element(car, 'priceWithDiscount', sale_price)
        create_child_element(car, 'sale_price', sale_price)
        
        for elem_name in self.config['elements_to_localize']:
            elem = car.find(elem_name)
            localize_element_text(elem)
        
        url = f"https://{config['domain']}{config['path_car_page']}{friendly_url}/"
        create_child_element(car, 'url', url)
        if self.source_type in ['carcopy', 'vehicles_vehicle']:
            update_element_text(car, 'url_link', url)
        
        # Обработка файла
        file_name = f"{friendly_url}.mdx"
        file_path = os.path.join(config['cars_dir'], file_name)

        update_car_prices(car, self.prices_data)

        # --- Формирование данных для JSON с ценами и скидками из фида ---
        # Группировка и агрегация данных сразу в готовом формате
        brand = join_car_data(car, 'mark_id')
        model = join_car_data(car, 'folder_id')
        key = (brand, model)
        
        if key in self.cars_price_data:
            # Обновляем минимальную цену и максимальную скидку
            self.cars_price_data[key]['price'] = min(self.cars_price_data[key]['price'], sale_price)
            self.cars_price_data[key]['benefit'] = max(self.cars_price_data[key]['benefit'], max_discount)
        else:
            # Создаем новый объект в готовом для JSON формате
            self.cars_price_data[key] = {
                'brand': brand,
                'model': model,
                'price': sale_price,
                'benefit': max_discount
            }
        # --- конец блока ---

        # get info from ./src/data/settings.json
        settings = {
            'legal_city': 'Город',
            'legal_city_where': 'Городе'
        }

        if os.path.exists('./src/data/settings.json'):
            try:
                with open('./src/data/settings.json', 'r', encoding='utf-8') as f:
                    settings = json.load(f)
            except json.JSONDecodeError:
                print("Ошибка при чтении ./src/data/settings.json")
            except Exception as e:
                print(f"Произошла ошибка при работе с файлом: {e}")

        config['legal_city'] = settings['legal_city']
        config['legal_city_where'] = settings['legal_city_where']

        if os.path.exists(file_path):
            update_yaml(car, file_path, friendly_url, self.current_thumbs, self.sort_storage_data, self.dealer_photos_for_cars_avito, self.config, config)
        else:
            create_file(car, file_path, friendly_url, self.current_thumbs, self.sort_storage_data, self.dealer_photos_for_cars_avito, self.config, config, self.existing_files)

    def rename_elements(self, car: ET.Element) -> None:
        """Переименование элементов согласно карте переименований"""
        for old_name, new_name in self.config['rename_map'].items():
            rename_child_element(car, old_name, new_name)

    def get_cars_element(self, root: ET.Element) -> ET.Element:
        """Получение элемента, содержащего список машин"""
        return root if self.config['root_element'] is None else root.find(self.config['root_element'])

    def update_source_type(self, new_source_type: str) -> None:
        """Обновляет тип источника и перенастраивает конфигурацию"""
        self.source_type = new_source_type
        self.setup_source_config()

def find_xml_files(base_dir: str) -> List[Tuple[str, str, str]]:
    """
    Находит все XML файлы в подпапках базовой директории.
    
    Args:
        base_dir: Базовая директория для поиска
        
    Returns:
        List[Tuple[str, str, str]]: Список кортежей (путь_к_файлу, имя_подпапки, тип_категории)
    """
    xml_files = []
    
    if not os.path.exists(base_dir):
        print(f"Директория {base_dir} не существует")
        return xml_files
    
    # Определяем тип категории по имени базовой директории
    category_type = "used" if "used" in base_dir else "new"
    
    # Проходим по всем подпапкам
    for subdir in os.listdir(base_dir):
        subdir_path = os.path.join(base_dir, subdir)
        if os.path.isdir(subdir_path):
            # Ищем XML файлы в подпапке
            for xml_file in glob.glob(os.path.join(subdir_path, "*.xml")):
                xml_files.append((xml_file, subdir, category_type))
                print(f"Найден XML файл: {xml_file} в папке {subdir} (тип: {category_type})")
    
    return xml_files

def determine_output_config(category_type: str, source_type: str, base_config: Dict) -> Dict:
    """
    Определяет конфигурацию путей в зависимости от типа категории.
    
    Args:
        category_type: Тип категории ("new" или "used")
        source_type: Тип источника данных
        base_config: Базовая конфигурация
        
    Returns:
        Dict: Обновленная конфигурация
    """
    config = base_config.copy()
    
    if category_type == "used":
        config['cars_dir'] = 'src/content/used_cars'
        config['thumbs_dir'] = 'public/img/thumbs_used/'
        config['path_car_page'] = '/used_cars/'
        config['output_path'] = './public/used_cars.xml'
    else:
        config['cars_dir'] = 'src/content/cars'
        config['thumbs_dir'] = 'public/img/thumbs/'
        config['path_car_page'] = '/cars/'
        config['output_path'] = './public/cars.xml'
    
    return config

def normalize_source_type(folder_name: str) -> str:
    """
    Нормализует имя папки к стандартному типу источника.
    
    Args:
        folder_name: Имя папки
        
    Returns:
        str: Нормализованный тип источника
    """
    # Маппинг имен папок к типам источников
    folder_mapping = {
        'data-cars-car': 'data_cars_car',
        'vehicles-vehicle': 'vehicles_vehicle',
        'ads-ad': 'ads_ad',
        'maxposter': 'maxposter',
        'carcopy': 'carcopy'
    }
    
    return folder_mapping.get(folder_name.lower(), folder_name.lower())

def main():
    """
    Основная функция программы.
    """
    parser = argparse.ArgumentParser(description='Process cars from different sources')
    parser.add_argument('--source_type', choices=['data_cars_car', 'maxposter', 'carcopy', 'vehicles_vehicle', 'ads_ad'], help='Type of source data (auto-detected if not specified)')
    parser.add_argument('--path_car_page', default='/cars/', help='Default path to cars pages')
    parser.add_argument('--thumbs_dir', default='public/img/thumbs/', help='Default output directory for thumbnails')
    parser.add_argument('--cars_dir', default='src/content/cars', help='Default cars directory')
    parser.add_argument('--input_file', default='cars.xml', help='Input file')
    parser.add_argument('--output_path', default='./public/cars.xml', help='Output path/file')
    parser.add_argument('--domain', default=os.getenv('DOMAIN', 'localhost'), help='Repository name')
    parser.add_argument('--xml_url', default=os.getenv('XML_URL'), help='XML URL')
    parser.add_argument('--skip_thumbs', action="store_true", help='Skip create thumbnails')
    parser.add_argument('--skip_check_thumb', action="store_true", help='Skip check thumbnails')
    parser.add_argument('--count_thumbs', default=5, help='Count thumbs for create')
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
    parser.add_argument('--auto_scan', action="store_true", help='Automatically scan ./tmp/new and ./tmp/used_cars directories')
    parser.add_argument('--base_dirs', nargs='*', default=['./tmp/new', './tmp/used_cars'], help='Base directories to scan for XML files')
    
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

    # Определяем режим работы
    if args.auto_scan or not args.source_type:
        # Режим автосканирования
        print("🔍 Режим автосканирования активирован")
        
        # Собираем все XML файлы из указанных директорий
        all_xml_files = []
        for base_dir in args.base_dirs:
            xml_files = find_xml_files(base_dir)
            all_xml_files.extend(xml_files)
        
        if not all_xml_files:
            print("❌ XML файлы не найдены в указанных директориях")
            return
        
        print(f"📁 Найдено {len(all_xml_files)} XML файлов для обработки")
        
        # Создаем единый процессор (начинаем с первого найденного типа)
        first_file_path, first_folder, first_category = all_xml_files[0]
        first_source_type = normalize_source_type(first_folder)
        
        # Пробуем автоопределить тип для первого файла
        processor = CarProcessor(first_source_type)
        detected_type = processor.auto_detect_source_type(first_file_path)
        if detected_type:
            processor.update_source_type(detected_type)
            print(f"✅ Автоопределен тип для первого файла: {detected_type}")
        
        # Группируем файлы по типам для пакетной обработки XML
        files_by_category = {'new': [], 'used': []}
        trees_by_category = {'new': [], 'used': []}
        
        with open('output.txt', 'w') as file:
            file.write("")

        # Обрабатываем каждый файл
        for xml_file_path, folder_name, category_type in all_xml_files:
            print(f"\n🚗 Обработка файла: {xml_file_path}")
            print(f"📂 Папка: {folder_name}, Категория: {category_type}")
            
            # Определяем тип источника
            source_type = normalize_source_type(folder_name)
            detected_type = processor.auto_detect_source_type(xml_file_path)
            if detected_type:
                source_type = detected_type
                print(f"✅ Автоопределен тип: {source_type}")
            
            # Обновляем конфигурацию процессора
            processor.update_source_type(source_type)
            
            # Загружаем конфигурацию для данного типа источника
            if args.config_source == 'file':
                source_config = load_file_config(args.config_path, source_type, default_config)
            elif args.config_source == 'env':
                source_config = load_env_config(source_type, default_config)
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
                source_config = load_github_config(source_type, github_config, default_config)
            else:
                raise ValueError(f"Неподдерживаемый источник конфигурации: {args.config_source}")
            
            # Применяем настройки из конфигурации
            replacements = source_config['replacements']
            elements_to_localize = source_config['elements_to_localize']
            remove_cars_after_duplicate = source_config['remove_cars_after_duplicate']
            remove_mark_ids = source_config['remove_mark_ids']
            remove_folder_ids = source_config['remove_folder_ids']
            
            # Обновляем конфигурацию путей в зависимости от категории
            current_config = determine_output_config(category_type, source_type, config)
            current_config['move_vin_id_up'] = source_config['move_vin_id_up']
            current_config['new_address'] = source_config['new_address']
            current_config['new_phone'] = source_config['new_phone']
            
            # Настройка директорий для текущей категории
            setup_directories(current_config['thumbs_dir'], current_config['cars_dir'])
            
            # Инициализация XML
            root = get_xml_content(xml_file_path, args.xml_url)
            tree = ET.ElementTree(root)
            
            cars_to_remove = []
            
            # Обработка машин
            cars_element = processor.get_cars_element(root)
            if cars_element is not None:
                for car in cars_element:
                    processor.rename_elements(car)

                    if should_remove_car(car, remove_mark_ids, remove_folder_ids):
                        cars_to_remove.append(car)
                        continue
                    
                    processor.process_car(car, current_config)
            
            # Удаление ненужных машин
            for car in cars_to_remove:
                cars_element.remove(car)
            
            # Сохраняем дерево для последующего объединения
            files_by_category[category_type].append(xml_file_path)
            trees_by_category[category_type].append(tree)
        
        # Записываем объединенные XML файлы по категориям
        for category_type in ['new', 'used']:
            if trees_by_category[category_type]:
                # Определяем путь вывода для категории
                if category_type == 'used':
                    output_path = './public/used_cars.xml'
                    thumbs_dir = 'public/img/thumbs_used/'
                else:
                    output_path = './public/cars.xml'
                    thumbs_dir = config['thumbs_dir']
                
                # Если есть только одно дерево, просто сохраняем его
                if len(trees_by_category[category_type]) == 1:
                    tree = trees_by_category[category_type][0]
                    root = tree.getroot()
                else:
                    # Объединяем несколько деревьев
                    # Создаем корневой элемент для объединения
                    merged_root = ET.Element('data')
                    cars_container = ET.SubElement(merged_root, 'cars')
                    
                    for tree in trees_by_category[category_type]:
                        root = tree.getroot()
                        # Ищем все элементы car во всех возможных местах
                        cars = root.findall('.//car') or root.findall('.//vehicle') or root.findall('.//Ad') or root.findall('.//offer')
                        for car in cars:
                            cars_container.append(car)
                    
                    root = merged_root
                
                convert_to_string(root)
                tree = ET.ElementTree(root)
                tree.write(output_path, encoding='utf-8', xml_declaration=True)
                print(f"✅ Сохранен объединенный XML для категории {category_type}: {output_path}")
                
                # Очистка превью для категории
                cleanup_unused_thumbs(processor.current_thumbs, thumbs_dir)
        
        # Очистка неиспользуемых файлов для каждой категории
        for category_type in ['new', 'used']:
            if category_type == 'used':
                cars_dir = 'src/content/used_cars'
            else:
                cars_dir = 'src/content/cars'
            
            if os.path.exists(cars_dir):
                for existing_file in os.listdir(cars_dir):
                    filepath = os.path.join(cars_dir, existing_file)
                    if filepath not in processor.existing_files:
                        os.remove(filepath)
                        print(f"🗑️ Удален неиспользуемый файл: {filepath}")
        
        if os.path.exists('output.txt') and os.path.getsize('output.txt') > 0:
            print("❌ Найдены ошибки 404")

        # --- Сохранение данных в JSON с ценами и скидками из фида ---
        # Данные уже в нужном формате, просто берем values() из словаря
        os.makedirs('src/data', exist_ok=True)
        with open('src/data/dealer-models_cars_price.json', 'w', encoding='utf-8') as f:
            json.dump(list(processor.cars_price_data.values()), f, ensure_ascii=False, indent=2)
        print("✅ Сохранены данные о ценах в src/data/dealer-models_cars_price.json")
        # --- конец блока ---
        
    else:
        # Режим обработки одного файла (оригинальная логика)
        print(f"📄 Режим обработки одного файла: {args.input_file}")
        
        # Загружаем конфигурацию в зависимости от источника
        if args.config_source == 'file':
            source_config = load_file_config(args.config_path, args.source_type, default_config)
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
        
        # Инициализация
        root = get_xml_content(args.input_file, args.xml_url)
        tree = ET.ElementTree(root)
        setup_directories(config['thumbs_dir'], args.cars_dir)
        
        with open('output.txt', 'w') as file:
            file.write("")

        cars_to_remove = []
        
        # Обработка машин
        cars_element = processor.get_cars_element(root)
        for car in cars_element:
            processor.rename_elements(car)

            if should_remove_car(car, remove_mark_ids, remove_folder_ids):
                cars_to_remove.append(car)
                continue
            
            processor.process_car(car, config)
        
        # Удаление ненужных машин
        for car in cars_to_remove:
            cars_element.remove(car)
        
        convert_to_string(root)
        tree.write(args.output_path, encoding='utf-8', xml_declaration=True)
        
        # Очистка
        cleanup_unused_thumbs(processor.current_thumbs, config['thumbs_dir'])
        
        for existing_file in os.listdir(args.cars_dir):
            filepath = os.path.join(args.cars_dir, existing_file)
            if filepath not in processor.existing_files:
                os.remove(filepath)
        
        if os.path.exists('output.txt') and os.path.getsize('output.txt') > 0:
            print("❌ Найдены ошибки 404")

        # --- Сохранение данных в JSON с ценами и скидками из фида ---
        # Данные уже в нужном формате, просто берем values() из словаря
        os.makedirs('src/data', exist_ok=True)
        with open('src/data/dealer-models_cars_price.json', 'w', encoding='utf-8') as f:
            json.dump(list(processor.cars_price_data.values()), f, ensure_ascii=False, indent=2)
        # --- конец блока ---

if __name__ == "__main__":
    main()