#!/usr/bin/env python
import os
import argparse
from utils import *
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional

class CarDataExtractor:
    """
    Класс для извлечения данных из различных форматов XML фидов автомобилей.
    Не изменяет исходный фид, только извлекает данные для генерации MDX страниц.
    """
    
    def __init__(self, source_type: str = None, input_file: str = None):
        self.source_type = source_type
        self.input_file = input_file
        
        # Если тип источника не указан, пытаемся определить автоматически
        if not self.source_type and self.input_file:
            try:
                root = get_xml_content(self.input_file, '')
                detected_type = self.auto_detect_source_type(root)
                if detected_type:
                    self.source_type = detected_type
                    print(f"Автоопределен тип фида: {self.source_type}")
                else:
                    print("Предупреждение: Не удалось определить тип фида автоматически. Укажите source_type явно.")
            except Exception as e:
                print(f"Ошибка при автоопределении типа фида: {e}")
        
        # Устанавливаем конфигурацию только если тип источника определен
        if self.source_type:
            self.setup_source_config()
        
        self.existing_files = set()
        self.current_thumbs = []
        self.prices_data = load_price_data()
        
        # Загружаем данные сортировки
        self.sort_storage_data = {}
        if os.path.exists('sort_storage.json'):
            try:
                with open('sort_storage.json', 'r', encoding='utf-8') as f:
                    self.sort_storage_data = json.load(f)
            except json.JSONDecodeError:
                print("Ошибка при чтении sort_storage.json")
            except Exception as e:
                print(f"Произошла ошибка при работе с файлом: {e}")
        
        # Загружаем дополнительные фотографии для Avito
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
                        description_text = description_elem.text
                        if description_text.startswith('<![CDATA[') and description_text.endswith(']]>'):
                            description_text = description_text[9:-3]
                        self.dealer_photos_for_cars_avito[vin]['description'] = description_text
            except Exception as e:
                print(f"Произошла ошибка при работе с dealer_photos_for_cars_avito.xml: {e}")

    def setup_source_config(self):
        """
        Настройка конфигурации в зависимости от типа источника.
        Определяет структуру XML и маппинг полей для каждого формата.
        """
        configs = {
            'Ads-Ad': {
                'root_element': 'Ads',
                'car_element': 'Ad',
                'field_mapping': {
                    'vin': 'VIN',
                    'mark_id': 'Make',
                    'folder_id': 'Model',
                    'modification_id': 'Modification',
                    'complectation_name': 'Complectation',
                    'body_type': 'BodyType',
                    'drive_type': 'DriveType',
                    'gearboxType': 'Transmission',
                    'wheel': 'WheelType',
                    'engineType': 'FuelType',
                    'color': 'Color',
                    'price': 'Price',
                    'max_discount': 'MaxDiscount',
                    'tradeinDiscount': 'TradeinDiscount',
                    'year': 'Year',
                    'availability': 'Availability',
                    'description': 'Description',
                    'images': 'Images',
                    'image_tag': 'Image',
                    'image_url_attr': 'url'
                },
                'elements_to_localize': [
                    'engineType', 'drive_type', 'gearboxType', 'color', 'body_type', 'wheel'
                ]
            },
            'data-cars-car': {
                'root_element': 'data',
                'car_element': 'car',
                'field_mapping': {
                    'vin': 'vin',
                    'mark_id': 'mark_id',
                    'folder_id': 'folder_id',
                    'modification_id': 'modification_id',
                    'complectation_name': 'complectation_name',
                    'year': 'year',
                    'color': 'color',
                    'price': 'price',
                    'max_discount': 'max_discount',
                    'tradein_discount': 'tradein_discount',
                    'credit_discount': 'credit_discount',
                    'insurance_discount': 'insurance_discount',
                    'description': 'description',
                    'body_type': 'body_type',
                    'drive_type': 'drive',
                    'gearboxType': 'gearbox',
                    'wheel': 'wheel',
                    'engineType': 'engine_type',
                    'run': 'run',
                    'availability': 'availability',
                    'images': 'images',
                    'image_tag': 'image',
                    'image_url_attr': None
                },
                'elements_to_localize': [
                    'engineType', 'drive_type', 'gearboxType', 'ptsType', 'color', 'body_type', 'wheel'
                ]
            },
            'vehicles-vehicle': {
                'root_element': 'vehicles',
                'car_element': 'vehicle',
                'field_mapping': {
                    'vin': 'vin',
                    'mark_id': 'brand',
                    'folder_id': 'model',
                    'modification_id': 'modification',
                    'complectation_name': 'complectation',
                    'year': 'year',
                    'color': 'bodyColor',
                    'price': 'price',
                    'max_discount': 'maxDiscount',
                    'tradein_discount': 'tradeinDiscount',
                    'credit_discount': 'creditDiscount',
                    'insurance_discount': 'insuranceDiscount',
                    'description': 'description',
                    'body_type': 'bodyType',
                    'drive_type': 'driveType',
                    'gearboxType': 'gearboxType',
                    'wheel': 'steeringWheel',
                    'engineType': 'engineType',
                    'run': 'mileage',
                    'availability': 'availability',
                    'images': 'photos',
                    'image_tag': 'photo',
                    'image_url_attr': None
                },
                'elements_to_localize': [
                    'engineType', 'driveType', 'gearboxType', 'ptsType', 'color', 'body_type', 'wheel'
                ]
            },
            'yml_catalog-shop-offers-offer': {
                'root_element': 'yml_catalog',
                'car_element': 'offer',
                'field_mapping': {
                    'vin': None,  # В YML нет VIN, будем генерировать из других полей
                    'mark_id': 'vendor',
                    'folder_id': 'model',  # Будем извлекать название модели из параметра "Модель"
                    'modification_id': 'model',  # Будем извлекать модификацию из model
                    'complectation_name': None,  # В YML нет комплектации
                    'year': None,  # Будем извлекать из параметра "Год выпуска"
                    'color': None,  # Будем извлекать из параметра "Цвет"
                    'price': 'price',
                    'max_discount': None,  # Будем рассчитывать из sales_notes
                    'tradein_discount': None,
                    'credit_discount': None,
                    'insurance_discount': None,
                    'description': 'description',
                    'body_type': None,  # Будем извлекать из параметра "Кузов"
                    'drive_type': None,  # Будем извлекать из параметра "Привод"
                    'gearboxType': None,  # Будем извлекать из параметра "КПП"
                    'wheel': None,  # Будем извлекать из параметра "Руль"
                    'engineType': None,  # Будем извлекать из параметра "Двигатель"
                    'run': '0',  # Новые автомобили
                    'availability': 'available',
                    'images': 'picture',
                    'image_tag': 'picture',
                    'image_url_attr': None
                },
                'elements_to_localize': [
                    'engineType', 'driveType', 'gearboxType', 'ptsType', 'color', 'body_type', 'wheel'
                ]
            }
        }
        
        self.config = configs.get(self.source_type)
        if not self.config:
            raise ValueError(f"Неизвестный тип источника: {self.source_type}")

    def extract_car_data(self, car: ET.Element) -> Dict[str, any]:
        """
        Извлекает данные автомобиля из XML элемента согласно конфигурации.
        
        Args:
            car: XML элемент автомобиля
            
        Returns:
            Dict: Словарь с данными автомобиля
        """
        car_data = {}
        field_mapping = self.config['field_mapping']
        
        # Извлекаем основные поля
        for internal_name, xml_field in field_mapping.items():
            # Пропускаем служебные поля, которые не являются XML тегами
            if xml_field in ['image_tag', 'image_url_attr'] or xml_field is None:
                continue
                
            if internal_name == 'images':
                # Особая обработка для изображений
                images_container = car.find(xml_field)
                if images_container is not None:
                    car_data['images'] = self.extract_images(images_container)
                continue
                
            # Ищем элемент в XML
            element = car.find(xml_field)
            if element is not None and element.text:
                car_data[internal_name] = element.text.strip()
        
        # Обработка специальных случаев для разных форматов
        if self.source_type == 'yml_catalog-shop-offers-offer':
            # В YML некоторые данные могут быть в параметрах
            yml_params = self.extract_yml_params(car)
            car_data.update(yml_params)
            
            # Извлекаем название модели из параметра "Модель"
            if 'model_name' in car_data:
                car_data['folder_id'] = car_data['model_name']
            
            # Извлекаем модификацию из поля model
            model_elem = car.find('model')
            if model_elem is not None and model_elem.text:
                car_data['modification_id'] = model_elem.text.strip()
        
        return car_data

    def extract_images(self, images_container: ET.Element) -> List[str]:
        """
        Извлекает URL изображений из контейнера.
        
        Args:
            images_container: Контейнер с изображениями
            
        Returns:
            List[str]: Список URL изображений
        """
        images = []
        image_tag = self.config['field_mapping'].get('image_tag', 'image')
        image_url_attr = self.config['field_mapping'].get('image_url_attr')
        
        for img in images_container.findall(image_tag):
            if image_url_attr:
                # URL в атрибуте
                url = img.get(image_url_attr)
                if url:
                    images.append(url)
            else:
                # URL в тексте элемента
                if img.text and img.text.strip():
                    images.append(img.text.strip())
        
        return images

    def extract_yml_params(self, car: ET.Element) -> Dict[str, str]:
        """
        Извлекает параметры из YML формата.
        
        Args:
            car: XML элемент автомобиля
            
        Returns:
            Dict: Дополнительные параметры
        """
        params = {}
        for param in car.findall('param'):
            name = param.get('name')
            if name and param.text:
                # Маппинг названий параметров на внутренние имена
                param_mapping = {
                    'Год выпуска': 'year',
                    'Кузов': 'body_type',
                    'Руль': 'wheel',
                    'Цвет': 'color',
                    'ПТС': 'pts_type',
                    'Двигатель': 'engine_info',
                    'Привод': 'drive_type',
                    'КПП': 'gearbox_type',
                    'Поколение': 'generation',
                    'Модель': 'model_name'
                }
                if name in param_mapping:
                    params[param_mapping[name]] = param.text.strip()
        
        # Генерируем VIN из доступных данных
        vendor = car.find('vendor')
        model_name = params.get('model_name', '')
        year = params.get('year', '')
        if vendor is not None and vendor.text and model_name and year:
            # Создаем псевдо-VIN из марки, модели и года
            vin_base = f"{vendor.text}{model_name}{year}".replace(' ', '').upper()
            # Добавляем случайные символы для уникальности
            import random
            import string
            random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            params['vin'] = f"{vin_base}{random_chars}"
        
        # Извлекаем скидки из sales_notes
        sales_notes = car.find('sales_notes')
        if sales_notes is not None and sales_notes.text:
            notes_text = sales_notes.text
            # Парсим скидки из текста
            import re
            
            # Ищем максимальную скидку
            max_discount_match = re.search(r'Максимальная скидка: (\d+)', notes_text)
            if max_discount_match:
                params['max_discount'] = max_discount_match.group(1)
            
            # Ищем скидки по программам
            tradein_match = re.search(r'trade-in до (\d+)', notes_text)
            if tradein_match:
                params['tradein_discount'] = tradein_match.group(1)
            
            credit_match = re.search(r'в кредит до (\d+)', notes_text)
            if credit_match:
                params['credit_discount'] = credit_match.group(1)
            
            insurance_match = re.search(r'страховки до (\d+)', notes_text)
            if insurance_match:
                params['insurance_discount'] = insurance_match.group(1)
        
        return params

    def calculate_max_discount(self, car_data: Dict[str, any]) -> int:
        """
        Рассчитывает максимальную скидку на основе данных автомобиля.
        
        Args:
            car_data: Данные автомобиля
            
        Returns:
            int: Максимальная скидка
        """
        if self.source_type in ['vehicles-vehicle', 'data-cars-car']:
            credit_discount = int(car_data.get('credit_discount', 0) or 0)
            tradein_discount = int(car_data.get('tradein_discount', 0) or 0)
            return credit_discount + tradein_discount
        else:
            return int(car_data.get('max_discount', 0) or 0)

    def process_car(self, car: ET.Element, config: Dict) -> None:
        """
        Обрабатывает отдельный автомобиль: извлекает данные и создает MDX файл.
        
        Args:
            car: XML элемент автомобиля
            config: Конфигурация обработки
        """
        # Извлекаем данные автомобиля
        car_data = self.extract_car_data(car)
        
        # Проверяем наличие обязательных полей
        if not car_data.get('vin') or not car_data.get('mark_id') or not car_data.get('folder_id'):
            print(f"Пропущен автомобиль: отсутствуют обязательные поля VIN, mark_id или folder_id")
            return
        
        # Создание URL
        friendly_url = process_friendly_url(
            self.join_car_data_from_dict(car_data, 'mark_id', 'folder_id', 'modification_id',
                                   'complectation_name', 'color', 'year')
        )
        print(f"\nУникальный идентификатор: {friendly_url}")
        
        # Базовые расчёты цены и скидки
        price = int(car_data.get('price', 0) or 0)
        max_discount = self.calculate_max_discount(car_data)
        sale_price = price - max_discount
        
        # Добавляем рассчитанные поля в данные
        car_data['max_discount'] = max_discount
        car_data['priceWithDiscount'] = sale_price
        car_data['sale_price'] = sale_price
        
        # Локализация элементов
        for elem_name in self.config['elements_to_localize']:
            if elem_name in car_data:
                car_data[elem_name] = self.localize_value(car_data[elem_name])
        
        # Создание URL страницы
        url = f"https://{config['domain']}{config['path_car_page']}{friendly_url}/"
        car_data['url'] = url
        
        # Обработка файла
        file_name = f"{friendly_url}.mdx"
        file_path = os.path.join(config['cars_dir'], file_name)

        # Обновление цен из внешнего источника
        self.update_car_prices_from_data(car_data)

        # Загружаем настройки
        settings = self.load_settings()
        config.update(settings)

        if os.path.exists(file_path):
            self.update_mdx_file(car_data, file_path, friendly_url, config)
        else:
            self.create_mdx_file(car_data, file_path, friendly_url, config)

    def join_car_data_from_dict(self, car_data: Dict[str, any], *fields: str) -> str:
        """
        Объединяет данные автомобиля из словаря в строку.
        
        Args:
            car_data: Данные автомобиля
            *fields: Поля для объединения
            
        Returns:
            str: Объединенная строка
        """
        parts = []
        for field in fields:
            if field in car_data and car_data[field]:
                parts.append(str(car_data[field]).strip())
        return " ".join(parts)

    def localize_value(self, value: str) -> str:
        """
        Локализует значение согласно словарю переводов.
        
        Args:
            value: Исходное значение
            
        Returns:
            str: Локализованное значение
        """
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
            # bodyType
            "suv": "SUV",
        }
        
        return translations.get(value, value)

    def update_car_prices_from_data(self, car_data: Dict[str, any]) -> None:
        """
        Обновляет цены в данных автомобиля из внешнего источника.
        
        Args:
            car_data: Данные автомобиля
        """
        vin = car_data.get('vin')
        if not vin or vin not in self.prices_data:
            return
        
        car_prices = self.prices_data[vin]
        required_keys = ["Конечная цена", "Скидка", "РРЦ"]
        
        if not all(key in car_prices for key in required_keys):
            return
        
        current_sale_price = int(car_data.get('priceWithDiscount', 0) or 0)
        final_price = car_prices["Конечная цена"]
        
        if final_price <= current_sale_price:
            car_data['priceWithDiscount'] = final_price
            car_data['sale_price'] = final_price
            car_data['max_discount'] = car_prices["Скидка"]
            car_data['price'] = car_prices["РРЦ"]

    def load_settings(self) -> Dict[str, str]:
        """
        Загружает настройки из файла.
        
        Returns:
            Dict: Настройки
        """
        settings = {
            'legal_city': 'Город',
            'legal_city_where': 'Городе'
        }

        if os.path.exists('./src/data/settings.json'):
            try:
                with open('./src/data/settings.json', 'r', encoding='utf-8') as f:
                    settings.update(json.load(f))
            except Exception as e:
                print(f"Произошла ошибка при работе с settings.json: {e}")

        return settings

    def create_mdx_file(self, car_data: Dict[str, any], file_path: str, friendly_url: str, config: Dict) -> None:
        """
        Создает новый MDX файл для автомобиля на основе словаря car_data.
        Args:
            car_data: Данные автомобиля (dict)
            file_path: Путь к файлу
            friendly_url: Дружественный URL
            config: Конфигурация
        """
        # Формируем YAML frontmatter
        content = "---\n"
        # Порядок (order)
        order = self.sort_storage_data.get(car_data['vin'], self.sort_storage_data.get('order', 1))
        content += f"order: {order}\n"
        content += f"total: 1\n"
        content += f"vin_list: {car_data['vin']}\n"
        content += f"vin_hidden: {car_data['vin'][:5]}-{car_data['vin'][-4:]}\n"
        h1 = self.join_car_data_from_dict(car_data, 'mark_id', 'folder_id', 'modification_id')
        content += f"h1: {h1}\n"
        content += f"breadcrumb: {self.join_car_data_from_dict(car_data, 'mark_id', 'folder_id', 'complectation_name')}\n"
        content += f"title: 'Купить {self.join_car_data_from_dict(car_data, 'mark_id', 'folder_id', 'modification_id', 'color')} у официального дилера в {config['legal_city_where']}'\n"
        description = (
            f'Купить автомобиль {self.join_car_data_from_dict(car_data, "mark_id", "folder_id")}'
            f'{" " + str(car_data["year"]) + " года выпуска" if car_data.get("year") else ""}'
            f'{", комплектация " + str(car_data["complectation_name"]) if car_data.get("complectation_name") else ""}'
            f'{", цвет - " + str(car_data["color"]) if car_data.get("color") else ""}'
            f'{", двигатель - " + str(car_data["modification_id"]) if car_data.get("modification_id") else ""}'
            f' у официального дилера в г. {config["legal_city"]}. Стоимость данного автомобиля {self.join_car_data_from_dict(car_data, "mark_id", "folder_id")} – {car_data.get("priceWithDiscount", car_data.get("price", ""))}'
        )
        content += f"description: '{description}'\n"
        # Основные поля
        for key, value in car_data.items():
            if key in ['vin', 'vin_hidden', 'h1', 'breadcrumb', 'title', 'description', 'order', 'total', 'images', 'thumbs', 'url']:
                continue
            if isinstance(value, str):
                # Экранируем кавычки
                if "'" in value:
                    value = f'"{value}"'
                elif ":" in value:
                    value = f"'{value}'"
            content += f"{key}: {value}\n"
        # Изображения
        images = car_data.get('images', [])
        if images:
            content += f"images: {images}\n"
            # Превью
            thumbs_files = createThumbs(images, friendly_url, self.current_thumbs, config['thumbs_dir'], config['skip_thumbs'])
            content += f"thumbs: {thumbs_files}\n"
        # Основное изображение
        if car_data.get('color'):
            content += f"image: {images[0] if images else ''}\n"
        # URL страницы
        if car_data.get('url'):
            content += f"url: {car_data['url']}\n"
        content += "---\n"
        # Описание (если есть)
        if car_data.get('description'):
            content += process_description(car_data['description'])
        # Сохраняем файл
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Создан файл: {file_path}")
        self.existing_files.add(file_path)

    def update_mdx_file(self, car_data: Dict[str, any], file_path: str, friendly_url: str, config: Dict) -> None:
        """
        Обновляет существующий MDX файл для автомобиля на основе словаря car_data.
        Args:
            car_data: Данные автомобиля (dict)
            file_path: Путь к файлу
            friendly_url: Дружественный URL
            config: Конфигурация
        """
        import yaml
        # Читаем существующий файл
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        # Разделяем YAML frontmatter и тело
        yaml_delimiter = "---\n"
        parts = content.split(yaml_delimiter)
        if len(parts) < 3:
            print(f"Ошибка: не найден YAML frontmatter в {file_path}")
            return
        yaml_block = parts[1].strip()
        data = yaml.safe_load(yaml_block)
        # Обновляем поля из car_data
        for key, value in car_data.items():
            data[key] = value
        # Пересобираем YAML
        updated_yaml_block = yaml.safe_dump(data, default_flow_style=False, allow_unicode=True)
        updated_content = yaml_delimiter.join([parts[0], updated_yaml_block, yaml_delimiter.join(parts[2:])])
        # Сохраняем файл
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        print(f"Обновлен файл: {file_path}")
        self.existing_files.add(file_path)

    def get_cars_element(self, root: ET.Element) -> ET.Element:
        """
        Получает элемент, содержащий список машин.
        Обрабатывает различную вложенность элементов в зависимости от типа источника.
        
        Args:
            root: Корневой элемент XML
            
        Returns:
            ET.Element: Элемент со списком машин
        """
        # Определяем путь к элементу с автомобилями в зависимости от типа источника
        element_paths = {
            'Ads-Ad': 'Ads',  # Корневой элемент уже содержит Ad
            'data-cars-car': 'data/cars',  # Нужно пройти через data -> cars
            'vehicles-vehicle': 'vehicles',  # Корневой элемент уже содержит vehicle
            'yml_catalog-shop-offers-offer': 'yml_catalog/shop/offers'  # Нужно пройти через yml_catalog -> shop -> offers
        }
        
        path = element_paths.get(self.source_type)
        if not path:
            # Если путь не определен, используем старую логику
            root_element = self.config['root_element']
            if root_element:
                if root.tag == root_element:
                    return root
                else:
                    return root.find(root_element)
            return root
        
        # Разбиваем путь на части
        path_parts = path.split('/')
        current_element = root
        
        # Проходим по пути к нужному элементу
        for part in path_parts:
            if current_element is None:
                print(f"Не найден элемент: {part}")
                return None
            
            # Если это первый элемент и он совпадает с корневым
            if part == current_element.tag:
                continue
            else:
                current_element = current_element.find(part)
        
        return current_element

    def process_feed(self, config: Dict) -> None:
        """
        Обрабатывает весь фид.
        
        Args:
            config: Конфигурация обработки
        """
        # Проверяем, что тип источника определен
        if not self.source_type:
            print("Ошибка: Тип источника не определен. Укажите --source_type явно или убедитесь, что файл поддерживается для автоопределения.")
            return
        
        # Получаем XML контент
        root = get_xml_content(config['input_file'], config.get('xml_url'))
        
        # Получаем элемент со списком машин
        cars_element = self.get_cars_element(root)
        if cars_element is None:
            print(f"Не найден элемент со списком машин: {self.config['root_element']}")
            return

        # Обрабатываем каждую машину
        car_element_name = self.config['car_element']
        for car in cars_element.findall(car_element_name):
            self.process_car(car, config)
        
        # Сохраняем обновленный XML (только с добавленными полями)
        self.save_updated_xml(root, config['output_path'])

    def save_updated_xml(self, root: ET.Element, output_path: str) -> None:
        """
        Сохраняет обновленный XML файл.
        
        Args:
            root: Корневой элемент XML
            output_path: Путь для сохранения
        """
        tree = ET.ElementTree(root)
        convert_to_string(root)
        tree.write(output_path, encoding='utf-8', xml_declaration=True)
        print(f"Обновленный XML сохранен: {output_path}")

    def auto_detect_source_type(self, root: ET.Element) -> str:
        """
        Автоматически определяет тип источника на основе структуры XML.
        
        Args:
            root: Корневой элемент XML
            
        Returns:
            str: Определенный тип источника
        """
        # Проверяем корневой элемент
        root_tag = root.tag
        
        # Проверяем наличие характерных элементов для каждого формата
        if root_tag == 'Ads':
            return 'Ads-Ad'
        
        if root_tag == 'data':
            cars_elem = root.find('cars')
            if cars_elem is not None:
                return 'data-cars-car'
        
        if root_tag == 'vehicles':
            return 'vehicles-vehicle'
        
        if root_tag == 'yml_catalog':
            shop_elem = root.find('shop')
            if shop_elem is not None:
                offers_elem = shop_elem.find('offers')
                if offers_elem is not None:
                    return 'yml_catalog-shop-offers-offer'
        
        # Если не удалось определить, возвращаем None
        return None

def main():
    """
    Основная функция программы.
    """
    parser = argparse.ArgumentParser(description='Extract car data from XML feeds and generate MDX pages')
    parser.add_argument('--source_type', 
                       choices=['Ads-Ad', 'data-cars-car', 'vehicles-vehicle', 'yml_catalog-shop-offers-offer'], 
                       help='Type of source data (auto-detected if not specified)')
    parser.add_argument('--path_car_page', default='/cars/', help='Default path to cars pages')
    parser.add_argument('--thumbs_dir', default='public/img/thumbs/', help='Default output directory for thumbnails')
    parser.add_argument('--cars_dir', default='src/content/cars', help='Default cars directory')
    parser.add_argument('--input_file', default='cars.xml', help='Input file')
    parser.add_argument('--output_path', default='./public/cars.xml', help='Output path/file')
    parser.add_argument('--domain', default=os.getenv('DOMAIN', 'localhost'), help='Domain name')
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

    # Инициализация экстрактора данных
    extractor = CarDataExtractor(args.source_type, args.input_file)
    
    # Настройка директорий
    setup_directories(config['thumbs_dir'], args.cars_dir)
    
    # Создаем директорию для результатов, если её нет
    output_dir = os.path.dirname(config['output_path'])
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Очистка output.txt
    with open('output.txt', 'w') as file:
        file.write("")

    # Обработка фида
    extractor.process_feed(config)
    
    # Очистка неиспользуемых превью
    cleanup_unused_thumbs(extractor.current_thumbs, config['thumbs_dir'])
    
    # Удаление неиспользуемых файлов
    for existing_file in os.listdir(args.cars_dir):
        filepath = os.path.join(args.cars_dir, existing_file)
        if filepath not in extractor.existing_files:
            os.remove(filepath)
    
    if os.path.exists('output.txt') and os.path.getsize('output.txt') > 0:
        print("error 404 found")

if __name__ == "__main__":
    main() 