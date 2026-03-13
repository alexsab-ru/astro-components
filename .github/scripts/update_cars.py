#!/usr/bin/env python
import os
import json
import argparse
import glob
import shutil
from pathlib import Path
from utils import *
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Tuple
import requests

class CarProcessor:
    def __init__(self):
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
        if os.path.exists('./tmp/feeds/photos/dealer_photos_for_cars_avito.xml'):
            try:
                avito_root = get_xml_content('./tmp/feeds/photos/dealer_photos_for_cars_avito.xml', '')
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

        # --- Кэш и настройки для внешних запросов по ID ---
        # Задача: по числовым ID (generation/modification/complectation)
        # получить человекочитаемые значения из внешнего API и подставить в данные.
        self._lookup_cache: Dict[Tuple[str, str], Optional[str]] = {}
        self._lookup_base_url = "https://cdn.alexsab.ru/getAutocatalog/index.php"

        # --- Поля, требующие обязательной нормализации значений ---
        # Документируем: расширяем список по мере появления новых кейсов,
        # чтобы дальше не искать, где именно нужно приводить данные к эталону.
        self.normalizable_fields: List[str] = [
            'mark_id',  # бренды часто приходят в разном регистре — выравниваем сразу
        ]

        # Отложенные ошибки "не найден цвет" по итоговому файлу (friendly_url).
        # Нужны, чтобы не писать ложные ошибки, если позже в эту же карточку пришли фото.
        self.pending_color_errors: Dict[str, str] = {}
        self.friendly_url_has_images: Dict[str, bool] = {}

    def setup_source_config(self):
        """Настройка конфигурации в зависимости от типа источника"""
        configs = {
            'data_cars_car': {
                'root_element': 'cars',
                'car_element': 'car',
                'field_mapping': {
                    'availability': 'availability',
                    'body_type': 'body_type',
                    'color': 'color',
                    'complectation_name': 'complectation_name',
                    'credit_discount': 'credit_discount',
                    'description': 'description',
                    'drive_type': 'drive',
                    'engineType': 'engine_type',
                    'folder_id': 'folder_id',
                    'gearboxType': 'gearbox',
                    'image_tag': 'image',
                    'image_url_attr': None,
                    'images': 'images',
                    'insurance_discount': 'insurance_discount',
                    'mark_id': 'mark_id',
                    'max_discount': 'max_discount',
                    'modification_id': ['modification_id', 'ModificationId'],
                    'optional_discount': 'optional_discount',
                    'price': 'price',
                    'priceWithDiscount': 'priceWithDiscount',
                    'run': 'run',
                    'sale_price': 'sale_price',
                    'tradein_discount': 'tradein_discount',
                    'vin': 'vin',
                    'wheel': 'wheel',
                    'year': 'year'
                },
                'elements_to_localize': [
                    'body_type',
                    'color',
                    'drive_type',
                    'engineType',
                    'gearboxType',
                    'ptsType',
                    'wheel'
                ]
            },
            'ads_ad': {
                'root_element': None,
                'car_element': 'Ad',
                'field_mapping': {
                    'availability': 'Availability',
                    'body_type': 'BodyType',
                    'color': 'Color',
                    'complectation_name': ['Complectation', 'ComplectationId'],
                    'credit_discount': 'credit_discount',
                    'description': 'Description',
                    'drive_type': 'DriveType',
                    'engineType': 'FuelType',
                    'folder_id': 'Model',
                    'gearboxType': 'Transmission',
                    'image_tag': 'Image',
                    'image_url_attr': 'url',
                    'images': 'Images',
                    'insurance_discount': 'insurance_discount',
                    'mark_id': 'Make',
                    'max_discount': 'MaxDiscount',
                    'modification_id': ['Modification', 'ModificationId'],
                    # Добавляем отдельные поля для числовых ID, чтобы их можно было резолвить через API
                    'generation_id': 'GenerationId',
                    'complectation_id': 'ComplectationId',
                    'optional_discount': 'optional_discount',
                    'price': 'Price',
                    'priceWithDiscount': 'priceWithDiscount',
                    'run': 'run',
                    'sale_price': 'sale_price',
                    'tradein_discount': 'tradein_discount',
                    'tradeinDiscount': 'TradeinDiscount',
                    'vin': 'VIN',
                    'wheel': 'WheelType',
                    'year': ['Year', 'GenerationId']
                },
                'elements_to_localize': [
                    'body_type',
                    'color',
                    'drive_type',
                    'engineType',
                    'gearboxType',
                    'wheel'
                ]
            },
            'vehicles_vehicle': {
                'root_element': None,
                'car_element': 'offer',
                'field_mapping': {
                    'availability': 'availability',
                    'body_type': 'bodyType',
                    'color': 'bodyColor',
                    'complectation_name': 'complectation',
                    'credit_discount': 'creditDiscount',
                    'description': 'description',
                    'drive_type': 'driveType',
                    'engineType': 'engineType',
                    'folder_id': 'model',
                    'gearboxType': 'gearboxType',
                    'generation': 'generation',
                    'image_tag': 'photo',
                    'image_url_attr': None,
                    'images': 'photos',
                    'insurance_discount': 'insuranceDiscount',
                    'mark_id': 'brand',
                    'max_discount': 'MaxDiscount',
                    'modification_id': 'modification',
                    'optional_discount': 'optional_discount',
                    'price': 'price',
                    'priceWithDiscount': 'priceWithDiscount',
                    'run': 'mileage',
                    'sale_price': 'sale_price',
                    'tradein_discount': 'tradeinDiscount',
                    'vin': 'vin',
                    'wheel': 'steeringWheel',
                    'year': 'year'
                },
                'elements_to_localize': [
                    'body_type',
                    'color',
                    'drive_type',
                    'engineType',
                    'gearboxType',
                    'ptsType',
                    'wheel'
                ]
            },
            'carcopy_offers_offer': {
                'root_element': 'offers',
                'car_element': 'offer',
                'field_mapping': {
                    'availability': 'availability',
                    'body_type': 'body-type',
                    'color': 'color',
                    'complectation_name': 'complectation',
                    'credit_discount': 'credit-discount',
                    'description': 'comment',
                    'drive_type': 'drive',
                    'engineType': 'engine-type',
                    'folder_id': 'model',
                    'gearboxType': 'transmission',
                    'image_tag': 'photo',
                    'image_url_attr': None,
                    'images': 'photos',
                    'insurance_discount': 'insurance-discount',
                    'mark_id': 'make',
                    'max_discount': 'max-discount',
                    'modification_id': 'version',
                    'optional_discount': 'optional_discount',
                    'price': 'price',
                    'priceWithDiscount': 'priceWithDiscount',
                    'run': 'run',
                    'sale_price': 'sale_price',
                    'tradein_discount': 'tradein-discount',
                    'vin': 'vin',
                    'wheel': 'steering-wheel',
                    'year': 'year'
                },
                'elements_to_localize': [
                    'body_type',
                    'color',
                    'drive_type',
                    'engineType',
                    'gearboxType',
                    'ptsType',
                    'wheel'
                ]
            },
            'catalog_vehicles_vehicle': {
                'root_element': None,
                'car_element': 'vehicle',
                'field_mapping': {
                    'availability': 'availability',
                    'body_type': 'body_type',
                    'color': 'color',
                    'complectation_code': 'complectation-code',
                    'complectation_name': 'сomplectation-name',
                    'credit_discount': 'credit_discount',
                    'description': 'description',
                    'drive_type': 'drive_type',
                    'engineType': 'engine_type',
                    'folder_id': 'model',
                    'gearboxType': 'gearbox_type',
                    'image_tag': 'image',
                    'image_url_attr': None,
                    'images': 'images',
                    'insurance_discount': 'insurance_discount',
                    'mark_id': 'mark',
                    'max_discount': 'max_discount',
                    'modification_id': 'modification',
                    'optional_discount': 'optional_discount',
                    'price': 'price',
                    'priceWithDiscount': 'priceWithDiscount',
                    'run': 'run',
                    'sale_price': 'sale_price',
                    'tradein_discount': 'tradein_discount',
                    'vin': 'vin',
                    'wheel': 'wheel',
                    'year': 'year'
                },
                'elements_to_localize': [
                    'body_type',
                    'color',
                    'drive_type',
                    'engineType',
                    'gearboxType',
                    'ptsType',
                    'wheel'
                ]
            },
            'yml_catalog_shop_offers_offer': {
                'root_element': 'yml_catalog',
                'car_element': 'offer',
                'field_mapping': {
                    'availability': 'available',
                    'body_type': None,  # Будем извлекать из параметра "Кузов"
                    'color': None,  # Будем извлекать из параметра "Цвет"
                    'complectation_name': None,  # В YML нет комплектации
                    'credit_discount': None,
                    'description': 'description',
                    'drive_type': None,  # Будем извлекать из параметра "Привод"
                    'engineType': None,  # Будем извлекать из параметра "Двигатель"
                    'folder_id': 'model',  # Будем извлекать название модели из параметра "Модель"
                    'gearboxType': None,  # Будем извлекать из параметра "КПП"
                    'image_tag': 'picture',
                    'image_url_attr': None,
                    'images': 'picture',
                    'insurance_discount': None,
                    'mark_id': 'vendor',
                    'max_discount': None,  # Будем рассчитывать из sales_notes
                    'modification_id': 'model',  # Будем извлекать модификацию из model
                    'price': 'price',
                    'run': '0',  # Новые автомобили
                    'tradein_discount': None,
                    'vin': None,  # В YML нет VIN, будем генерировать из других полей
                    'wheel': None,  # Будем извлекать из параметра "Руль"
                    'year': None  # Будем извлекать из параметра "Год выпуска"
                },
                'elements_to_localize': [
                    'body_type',
                    'color',
                    'drive_type',
                    'engineType',
                    'gearboxType',
                    'ptsType',
                    'wheel'
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
            
            if root_tag == 'catalog':
                offers_elem = root.find('vehicles')
                if offers_elem is not None:
                    return 'catalog_vehicles_vehicle'
                
            if root_tag == 'carcopy':
                offers_elem = root.find('offers')
                if offers_elem is not None:
                    return 'carcopy_offers_offer'
            
            if root_tag == 'yml_catalog':
                shop_elem = root.find('shop')
                if shop_elem is not None:
                    offers_elem = shop_elem.find('offers')
                    if offers_elem is not None:
                        return 'yml_catalog_shop_offers_offer'
            
            # Проверяем структуру ads_ad
            if len(root) > 0:
                first_child = root[0]
                if first_child.tag == 'Ad':
                    return 'ads_ad'
            
            print(f"Предупреждение: Не удалось определить тип для файла {xml_file_path}, корневой элемент: {root_tag}")
            return None
            
        except Exception as e:
            print(f"Ошибка при автоопределении типа для {xml_file_path}: {e}")
            return None

    def extract_car_data(self, car: ET.Element) -> Dict[str, any]:
        """
        Извлекает данные автомобиля из XML элемента согласно конфигурации.
        
        Args:
            car: XML элемент автомобиля
            
        Returns:
            Dict: Словарь с данными автомобиля
        """
        car_data = {}

        # # 1. Сохраняем все поля из XML как есть
        # for child in car:
        #     if child.tag not in ['images', 'image', 'param']:  # обработаем их отдельно
        #         if child.text:
        #             car_data[child.tag] = child.text.strip()

        # 2. Применяем field_mapping (перезаписываем нужные поля)
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
                else:
                    car_data['images'] = []
                continue
                
            # поддержка одиночного имени тега или списка имён
            elem = None
            if isinstance(xml_field, (list, tuple)):
                # перебираем возможные варианты и берём первый найденный
                for name in xml_field:
                    candidate = car.find(name)
                    if candidate is not None and candidate.text:
                        elem = candidate
                        break
            else:
                elem = car.find(xml_field)

            if elem is not None and elem.text:
                car_data[internal_name] = elem.text.strip()
        
        # Обработка специальных случаев для разных форматов
        if self.source_type == 'yml_catalog':
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

        # Подготовка цветовых полей (рус/eng) для дальнейшего использования
        raw_color = car_data.get('color')
        if raw_color:
            color_rus = None
            color_eng = None

            brand_for_color = car_data.get('mark_id')
            model_for_color = car_data.get('folder_id')

            if brand_for_color and model_for_color:
                color_entry = get_model_info(
                    brand_for_color,
                    model_for_color,
                    property='color',
                    color=raw_color,
                    vin=car_data.get('vin'),
                    log_errors=False
                )
                if isinstance(color_entry, dict):
                    color_eng = color_entry.get('id') or color_eng
                    color_rus = (
                        color_entry.get('name')
                        or next(
                            (n for n in (color_entry.get('names') or []) if n),
                            None
                        )
                    )

            if not color_rus:
                color_rus = self.localize_value(raw_color)

            if not color_eng:
                color_eng = process_friendly_url(str(raw_color).strip())

            car_data['color_rus'] = color_rus
            car_data['color_eng'] = color_eng
        
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

    def _fetch_lookup_value(self, kind: str, id_value: str) -> Optional[str]:
        """
        Делает GET-запрос к справочнику (`kind` ∈ {generation, modification, complectation})
        и возвращает человекочитаемое имя из атрибута `name` первого подходящего тега.

        Пример запроса:
        - generation: https://cdn.alexsab.ru/getAutocatalog/index.php?lookup=1&type=generation&id=332036
        - modification: https://cdn.alexsab.ru/getAutocatalog/index.php?lookup=1&type=modification&id=18488230
        - complectation: https://cdn.alexsab.ru/getAutocatalog/index.php?lookup=1&type=complectation&id=18791852

        Возвращаемое значение кэшируется по ключу (kind, id_value).
        """
        if not id_value:
            return None

        cache_key = (kind, str(id_value))
        if cache_key in self._lookup_cache:
            return self._lookup_cache[cache_key]

        try:
            params = {
                'lookup': '1',
                'type': kind,
                'id': str(id_value)
            }
            # Делаем запрос к API с небольшим таймаутом.
            resp = requests.get(self._lookup_base_url, params=params, timeout=7)
            resp.raise_for_status()

            # Пытаемся распарсить как XML и найти первый элемент с атрибутом name
            # Документация: пользователь сообщил, что нужное значение лежит в атрибуте name
            root = ET.fromstring(resp.content)
            resolved_name: Optional[str] = None
            for elem in root.iter():
                if 'name' in elem.attrib and elem.attrib['name']:
                    resolved_name = elem.attrib['name'].strip()
                    break

            self._lookup_cache[cache_key] = resolved_name
            return resolved_name
        except Exception as e:
            # Логируем, но не прерываем обработку автомобиля
            print(f"[lookup:{kind}] Ошибка при запросе ID={id_value}: {e}")
            self._lookup_cache[cache_key] = None
            return None

    def _maybe_update_year_from_generation_name(self, car_data: Dict[str, any], generation_name: str) -> None:
        """
        Аккуратно обновляет поле 'year' на основе строки поколения, если год отсутствует
        или содержит неподходящее значение (например, числовой ID вместо года).

        Простая эвристика: берем первую 4-значную дату (19xx|20xx), если есть.
        """
        try:
            import re
            # Ничего не делаем, если 'year' уже нормальный год (четыре цифры)
            existing_year = str(car_data.get('year', '')).strip()
            if re.fullmatch(r'(19|20)\d{2}', existing_year):
                return

            match = re.search(r'(19|20)\d{2}', generation_name or '')
            if match:
                car_data['year'] = match.group(0)
        except Exception:
            # Безопасная деградация – не мешаем обработке
            pass

    def resolve_external_ids(self, car_data: Dict[str, any]) -> Dict[str, any]:
        """
        Обогащает car_data по внешним ID:
        - GenerationId: тянем имя поколения; кладём в 'generation_name'; при необходимости обновляем 'year'
        - ModificationId: подменяем 'modification_id' на человекочитаемое имя
        - ComplectationId: заполняем/подменяем 'complectation_name' на человекочитаемое имя

        Важно: вызывается ДО генерации friendly_url и расчёта цен.
        """
        # --- GenerationId → generation_name (+ попытка заполнить year) ---
        gen_id = (
            car_data.get('GenerationId')
            or car_data.get('generation_id')
            or car_data.get('generationId')
        )
        if gen_id and str(gen_id).isdigit():
            gen_name = self._fetch_lookup_value('generation', str(gen_id))
            if gen_name:
                car_data['generation_name'] = gen_name
                # Попробуем аккуратно выставить year, если его нет или он не в формате года
                self._maybe_update_year_from_generation_name(car_data, gen_name)
                # Лог: показываем значение, которое записали
                print(f"[GENERATION] GenerationId={gen_id} -> generation_name='{gen_name}'")
            else:
                # Лог: не нашли расшифровку
                print(f"[GENERATION] GenerationId={gen_id} -> не найдено")

        # --- ModificationId → modification_id (человекочитаемая строка) ---
        mod_id = (
            car_data.get('ModificationId')
            or car_data.get('modification_id')
            or car_data.get('modificationId')
        )
        if mod_id and str(mod_id).isdigit():
            mod_name = self._fetch_lookup_value('modification', str(mod_id))
            if mod_name:
                # Подменяем, чтобы URL и карточка имели читаемый текст
                car_data['modification_id'] = mod_name
                # Лог: показываем значение, которое записали
                print(f"[MODIFICATION] ModificationId={mod_id} -> modification_id='{mod_name}'")
            else:
                # Лог: не нашли расшифровку
                print(f"[MODIFICATION] ModificationId={mod_id} -> не найдено")

        # --- ComplectationId → complectation_name ---
        comp_id = (
            car_data.get('ComplectationId')
            or car_data.get('complectation_id')
            or car_data.get('complectationId')
        )
        if comp_id and str(comp_id).isdigit():
            comp_name = self._fetch_lookup_value('complectation', str(comp_id))
            if comp_name:
                # Заполняем или подменяем значение имени комплектации
                car_data['complectation_name'] = comp_name
                # Лог: показываем значение, которое записали
                print(f"[COMPLECTATION] ComplectationId={comp_id} -> complectation_name='{comp_name}'")
            else:
                # Лог: не нашли расшифровку
                print(f"[COMPLECTATION] ComplectationId={comp_id} -> не найдено")

        return car_data

    def normalize_car_fields(self, car_data: Dict[str, any]) -> Dict[str, any]:
        """
        Приводит значения заранее оговорённых полей к единообразному виду.
        Нужна, чтобы фильтры (remove_mark_ids, friendly_url и т.п.) работали стабильно.
        """
        for field_name in self.normalizable_fields:
            if field_name not in car_data:
                continue

            raw_value = car_data[field_name]
            if raw_value is None:
                continue

            normalized_value = str(raw_value).strip()

            if field_name == 'mark_id':
                # Приводим бренд к заглавной букве
                normalized_value = normalized_value.title()

            car_data[field_name] = normalized_value

        return car_data

    def _car_has_images(self, car_data: Dict[str, any]) -> bool:
        """Проверяет, есть ли у машины изображения в feed или в dealer photos."""
        images = car_data.get('images') or []
        if images:
            return True

        vin = car_data.get('vin')
        if vin and vin in self.dealer_photos_for_cars_avito:
            dealer_images = self.dealer_photos_for_cars_avito[vin].get('images') or []
            if dealer_images:
                return True

        return False

    def register_deferred_color_error(self, car_data: Dict[str, any], group_key: str, friendly_url: str) -> None:
        """
        Отложенно фиксирует ошибку цвета для заглушки:
        - если в группе уже есть фото, ошибку удаляем;
        - если фото нет и цвет не найден, запоминаем ошибку;
        - запись в output.txt делаем только в конце обработки.
        """
        if self._car_has_images(car_data):
            self.friendly_url_has_images[group_key] = True
            self.pending_color_errors.pop(group_key, None)
            return

        if self.friendly_url_has_images.get(group_key):
            return

        brand = car_data.get('mark_id')
        model = car_data.get('folder_id')
        vin = car_data.get('vin')
        raw_color = car_data.get('color')
        if not brand or not model or not raw_color:
            return
        color = str(raw_color).capitalize()

        # Тихая проверка цвета: не пишем ошибку сразу, решаем в конце по всей группе friendly_url.
        color_image = get_color_filename(brand, model, color, vin, log_errors=False)
        if color_image:
            return

        self.pending_color_errors[group_key] = (
            f"\nvin: <code>{vin}</code>\n"
            f"<b>Не найден цвет</b> <code>{color}</code> модели <code>{model}</code> бренда <code>{brand}</code> в models.json\n"
            f"<code>{friendly_url}</code>"
        )

    def flush_deferred_color_errors(self) -> None:
        """Пишет накопленные ошибки цвета в output.txt после полной обработки всех машин."""
        for error_text in self.pending_color_errors.values():
            print_message(error_text, 'error')
        self.pending_color_errors.clear()

    def calculate_max_discount(self, car_data: Dict[str, any]) -> int:
        """Расчёт максимальной скидки в зависимости от типа источника"""
        if self.source_type in ['catalog_vehicles_vehicle', 'vehicles_vehicle', 'data_cars_car']:
            credit_discount = int(car_data.get('credit_discount', 0) or 0)
            tradein_discount = int(car_data.get('tradein_discount', 0) or 0)
            return credit_discount + tradein_discount
        else:
            return int(car_data.get('max_discount', 0) or 0)

    def create_car_element(self, car_data: Dict[str, any]) -> ET.Element:
        """
        Создает XML элемент автомобиля в формате data_cars_car.
        
        Args:
            car_data: Данные автомобиля
            
        Returns:
            ET.Element: XML элемент автомобиля
        """
        car_elem = ET.Element('car')
        
        # Создаем основные элементы
        for field_name, value in car_data.items():
            if field_name == 'images':
                # Особая обработка для изображений
                if value:
                    images_elem = ET.SubElement(car_elem, 'images')
                    for img_url in value:
                        img_elem = ET.SubElement(images_elem, 'image')
                        img_elem.text = img_url
            else:
                if value is not None and value != '':
                    elem = ET.SubElement(car_elem, field_name)
                    elem.text = str(value)
        
        return car_elem

    def localize_value(self, value: str) -> str:
        """
        Локализует значение согласно словарю переводов.
        
        Args:
            value: Исходное значение
            
        Returns:
            str: Локализованное значение
        """
        if value is None:
            return value
        if not isinstance(value, str):
            return value

        normalized_value = value.strip()
        translations = load_localized_value_translations()
        return translations.get(
            normalized_value,
            translations.get(normalized_value.lower(), normalized_value)
        )

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
                value = str(car_data[field]).strip()
                parts.append(value)
        return " ".join(parts)

    def process_car(self, car: ET.Element, config: Dict) -> ET.Element:
        """Обработка отдельного автомобиля"""
        # Извлекаем данные автомобиля
        car_data = self.extract_car_data(car)
        
        # Обогащаем по внешним ID ДО генерации URL и расчётов
        car_data = self.resolve_external_ids(car_data)

        # Нормализуем заранее выбранные поля (начинаем с mark_id → нижний регистр).
        car_data = self.normalize_car_fields(car_data)

        # Проверяем наличие обязательных полей
        if not car_data.get('vin') or not car_data.get('mark_id') or not car_data.get('folder_id'):
            print(car_data)
            print(f"Пропущен автомобиль: отсутствуют обязательные поля VIN, mark_id или folder_id")
            return None
        
        # Создание URL
        friendly_url = process_friendly_url(
            self.join_car_data_from_dict(car_data, 'mark_id', 'folder_id', 'generation', 'modification_id',
                                 'complectation_name', 'color_eng', 'year')
        )
        print(f"\n\n🆔 Уникальный идентификатор: {friendly_url}")
        
        # Получаем цену из car_data, если она есть, иначе используем 0
        price = int(car_data.get('price', 0) or 0)

        # Если max_discount уже есть в car_data, не пересчитываем, иначе считаем
        if 'max_discount' not in car_data:
            max_discount = self.calculate_max_discount(car_data)
            car_data['max_discount'] = max_discount
        else:
            max_discount = int(car_data['max_discount'] or 0)

        # Если priceWithDiscount уже есть, не пересчитываем, иначе считаем
        if 'priceWithDiscount' not in car_data:
            sale_price = price - max_discount
            car_data['priceWithDiscount'] = sale_price
        else:
            sale_price = int(car_data['priceWithDiscount'] or 0)

        # Если sale_price уже есть, не пересчитываем, иначе присваиваем sale_price
        if 'sale_price' not in car_data:
            car_data['sale_price'] = sale_price

        # Локализация элементов
        for elem_name in self.config['elements_to_localize']:
            if elem_name in car_data and car_data[elem_name]:
                car_data[elem_name] = self.localize_value(car_data[elem_name])
        
        url = f"https://{config['domain']}{config['path_car_page']}{friendly_url}/"
        car_data['url'] = url
        
        # Обработка файла
        file_name = f"{friendly_url}.mdx"
        file_path = os.path.join(config['temp_cars_dir'], file_name)

        # Проверяем ошибку "не найден цвет для заглушки" отложенно на уровне friendly_url.
        self.register_deferred_color_error(car_data, file_path, friendly_url)

        # Обновляем цены и скидки на основе car_data
        update_car_prices(car_data, self.prices_data)

        # --- Формирование данных для JSON с ценами и скидками из фида ---
        # Группировка и агрегация данных сразу в готовом формате
        brand = car_data.get('mark_id', '')
        model_full = car_data.get('folder_id', '')
        model = get_model_info(brand, model_full, 'name', None, car_data.get('vin', ''))
        if not model is None:
            car_data['model_name'] = model
            car_data['model_id'] = get_model_info(brand, model_full, 'id', None, car_data.get('vin', ''))
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

        # Сохраняем или обновляем файл, теперь передаём car_data (dict), а не temp_car (XML)
        if os.path.exists(file_path):
            update_yaml(car_data, file_path, friendly_url, self.current_thumbs, self.sort_storage_data, self.dealer_photos_for_cars_avito, config, self.existing_files)
        else:
            create_file(car_data, file_path, friendly_url, self.current_thumbs, self.sort_storage_data, self.dealer_photos_for_cars_avito, config, self.existing_files)

        # Возвращаем новый XML элемент в формате data_cars_car
        return self.create_car_element(car_data)

    def get_cars_element(self, root: ET.Element) -> ET.Element:
        """Получение элемента, содержащего список машин"""
        if self.source_type == 'data_cars_car':
            return root.find('cars')
        elif self.source_type == 'ads_ad':
            return root  # Корневой элемент уже содержит Ad
        elif self.source_type == 'catalog_vehicles_vehicle':
            return root.find('vehicles')
        elif self.source_type == 'vehicles_vehicle':
            return root
        elif self.source_type == 'carcopy_offers_offer':
            return root.find('offers')
        elif self.source_type == 'yml_catalog_shop_offers_offer':
            shop = root.find('shop')
            if shop is not None:
                return shop.find('offers')
        return root

    def sort_cars_by_vin(self, cars_element: ET.Element) -> List[ET.Element]:
        """
        Сортирует элементы автомобилей по VIN.
        
        Args:
            cars_element: Элемент, содержащий список автомобилей
            
        Returns:
            List[ET.Element]: Отсортированный список элементов автомобилей
        """
        if cars_element is None:
            return []
        
        # Получаем все дочерние элементы (автомобили)
        cars = list(cars_element)
        
        # Функция для извлечения VIN из элемента автомобиля
        def get_vin(car_elem):
            # Пытаемся найти VIN в зависимости от типа источника
            vin_field = self.config['field_mapping'].get('vin')
            if vin_field:
                vin_elem = car_elem.find(vin_field)
                if vin_elem is not None and vin_elem.text:
                    return vin_elem.text.strip()
            
            # Если VIN не найден, возвращаем пустую строку для сортировки в конец
            return ""
        
        # Сортируем по VIN
        sorted_cars = sorted(cars, key=get_vin)
        
        print(f"📋 Отсортировано {len(sorted_cars)} автомобилей по VIN")
        
        return sorted_cars

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
        'data_cars_car': 'data_cars_car',
        'vehicles_vehicle': 'vehicles_vehicle',
        'ads_ad': 'ads_ad',
        'catalog_vehicles_vehicle': 'catalog_vehicles_vehicle',
        'carcopy_offers_offer': 'carcopy_offers_offer',
        'yml_catalog_shop_offers_offer': 'yml_catalog_shop_offers_offer'
    }
    
    return folder_mapping.get(folder_name.lower(), folder_name.lower())

def main():
    """
    Основная функция программы.
    """
    parser = argparse.ArgumentParser(description='Process cars from different sources')
    parser.add_argument('--source_type', choices=['data_cars_car', 'vehicles_vehicle', 'carcopy_offers_offer', 'catalog_vehicles_vehicle', 'ads_ad', 'yml_catalog_shop_offers_offer'], help='Type of source data (auto-detected if not specified)')
    parser.add_argument('--path_car_page', default='/cars/', help='Default path to cars pages')
    parser.add_argument('--thumbs_dir', default='public/img/thumbs/', help='Default output directory for thumbnails')
    parser.add_argument('--temp_thumbs_dir', default='tmp/img/thumbs/', help='Default temp output directory for thumbnails')
    parser.add_argument('--cars_dir', default='src/content/cars', help='Default cars directory')
    parser.add_argument('--temp_cars_dir', default='tmp/content/cars', help='Default temp cars directory')
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
    parser.add_argument('--auto_scan', action="store_true", help='Automatically scan ./tmp/feeds/new and ./tmp/feeds/used_cars directories')
    parser.add_argument('--base_dirs', nargs='*', default=['./tmp/feeds/new', './tmp/feeds/used_cars'], help='Base directories to scan for XML files')
    
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
        "remove_folder_ids": [],
        # Шаблоны для генерации frontmatter:
        "h1_template": "",
        "breadcrumb_template": "",
        "title_template": "",
        "description_template": ""
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
        
        # Пробуем автоопределить тип для первого файла
        processor = CarProcessor()
        
        # Словарь конфигураций для разных типов категорий
        category_configs = {
            "used": {
                'cars_dir': 'src/content/used_cars',
                'temp_cars_dir': 'tmp/content/used_cars',
                'thumbs_dir': 'public/img/thumbs_used/',
                'temp_thumbs_dir': 'tmp/img/thumbs_used/',
                'path_car_page': '/used_cars/',
                'output_path': './public/used_cars.xml'
            },
            "new": {
                'cars_dir': 'src/content/cars',
                'temp_cars_dir': 'tmp/content/cars',
                'thumbs_dir': 'public/img/thumbs/',
                'temp_thumbs_dir': 'tmp/img/thumbs/',
                'path_car_page': '/cars/',
                'output_path': './public/cars.xml'
            }
        }
        
        # Очищаем временные папки до начала обработки
        print("🧹 Очистка временных папок...")
        for category_type, category_config in category_configs.items():
            temp_cars_dir = category_config['temp_cars_dir']
            if os.path.exists(temp_cars_dir):
                shutil.rmtree(temp_cars_dir)
                print(f"   Удалена временная папка: {temp_cars_dir}")
            os.makedirs(temp_cars_dir, exist_ok=True)
            print(f"   Создана временная папка: {temp_cars_dir}")

            temp_thumbs_dir = category_config['temp_thumbs_dir']
            if os.path.exists(temp_thumbs_dir):
                shutil.rmtree(temp_thumbs_dir)
                print(f"   Удалена временная папка превью: {temp_thumbs_dir}")
            os.makedirs(temp_thumbs_dir, exist_ok=True)
            print(f"   Создана временная папка превью: {temp_thumbs_dir}")
        
        # Группируем обработанные автомобили по категориям
        processed_cars_by_category = {'new': [], 'used': []}
        
        with open('output.txt', 'w') as file:
            file.write("")

        # Обрабатываем каждый файл
        for xml_file_path, folder_name, category_type in all_xml_files:
            print(f"\n\n🚗 Обработка файла: {xml_file_path}")
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
            
            # Получаем конфигурацию для текущей категории из словаря
            current_config = config.copy()
            current_config.update(category_configs[category_type])
            current_config['move_vin_id_up'] = source_config['move_vin_id_up']
            current_config['new_address'] = source_config['new_address']
            current_config['new_phone'] = source_config['new_phone']
                        
            # Инициализация XML
            root = get_xml_content(xml_file_path, args.xml_url)
            if root is None:
                print(f"[update_cars.py] Не удалось получить XML для файла {xml_file_path}. Пропускаю этот файл.")
                continue  # Пропускаем обработку этого файла

            # Настройка директорий для текущей категории
            if not os.path.exists(current_config['thumbs_dir']):
                os.makedirs(current_config['thumbs_dir'])
            
            if not os.path.exists(current_config['cars_dir']):
                os.makedirs(current_config['cars_dir'])


            # Обработка машин
            cars_element = processor.get_cars_element(root)
            if cars_element is not None:
                # Сортируем автомобили по VIN для стабильной обработки
                sorted_cars = processor.sort_cars_by_vin(cars_element)
                for car in sorted_cars:
                    if should_remove_car(car, remove_mark_ids, remove_folder_ids):
                        continue
                    
                    # Обрабатываем автомобиль и получаем новый элемент в формате data_cars_car
                    processed_car = processor.process_car(car, current_config)
                    if processed_car is not None:
                        processed_cars_by_category[category_type].append(processed_car)
        
        # Создаем объединенные XML файлы по категориям в формате data_cars_car
        for category_type in ['new', 'used']:
            if processed_cars_by_category[category_type]:
                # Получаем конфигурацию для категории из словаря
                category_config = category_configs[category_type]
                output_path = category_config['output_path']
                thumbs_dir = category_config['thumbs_dir']
                
                # Создаем корневую структуру data_cars_car
                data_root = ET.Element('data')
                cars_container = ET.SubElement(data_root, 'cars')
                
                # Добавляем все обработанные автомобили
                for car_elem in processed_cars_by_category[category_type]:
                    cars_container.append(car_elem)
                
                # Сохраняем XML
                convert_to_string(data_root)
                tree = ET.ElementTree(data_root)
                tree.write(output_path, encoding='utf-8', xml_declaration=True)
                print(f"✅ Сохранен объединенный XML для категории {category_type}: {output_path}")
                
                # Очистка превью для категории
                cleanup_unused_thumbs(processor.current_thumbs, thumbs_dir)
        
        # Перенос содержимого из временных папок в основные папки для каждой категории
        print("\n\n📁 Перенос файлов из временных папок в основные...")
        for category_type in ['new', 'used']:
            category_config = category_configs[category_type]
            temp_cars_dir = category_config['temp_cars_dir']
            cars_dir = category_config['cars_dir']
            
            if os.path.exists(temp_cars_dir) and os.listdir(temp_cars_dir):
                # Удаляем старое содержимое папки cars_dir
                if os.path.exists(cars_dir):
                    shutil.rmtree(cars_dir)
                    print(f"   Удалено старое содержимое: {cars_dir}")
                
                # Создаем папку cars_dir заново
                os.makedirs(cars_dir, exist_ok=True)
                
                # Копируем все файлы из temp_cars_dir в cars_dir
                for file_name in os.listdir(temp_cars_dir):
                    src_file = os.path.join(temp_cars_dir, file_name)
                    dst_file = os.path.join(cars_dir, file_name)
                    shutil.copy2(src_file, dst_file)
                    print(f"   Скопирован файл: {file_name}")
                
                print(f"✅ Перенесено {len(os.listdir(temp_cars_dir))} файлов для категории {category_type}")
            else:
                print(f"⚠️ Временная папка {temp_cars_dir} пуста или не существует для категории {category_type}")
        
    else:
        # Режим обработки одного файла (оригинальная логика, но с новой обработкой)
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
        processor = CarProcessor()
        detected_type = processor.auto_detect_source_type(args.input_file)
        if detected_type:
            processor.update_source_type(detected_type)
            print(f"✅ Автоопределен тип для файла: {detected_type}")
        else:
            print(f"❌ Не удалось определить тип для файла: {args.input_file}. Использую тип из аргументов: {args.source_type}")
            processor.update_source_type(args.source_type)
        
        # Инициализация
        root = get_xml_content(args.input_file, args.xml_url)
        if root is None:
            print(f"[update_cars.py] Не удалось получить XML для файла {args.input_file}. Завершаю выполнение.")
            return  # Завершаем выполнение функции

        # Настройка директорий для текущей категории
        if not os.path.exists(config['thumbs_dir']):
            os.makedirs(config['thumbs_dir'])
        
        if not os.path.exists(config['cars_dir']):
            os.makedirs(config['cars_dir'])

        # Очистка директории для временных файлов
        if os.path.exists(config['temp_cars_dir']):
            shutil.rmtree(config['temp_cars_dir'])
            os.makedirs(config['temp_cars_dir'])
        
        with open('output.txt', 'w') as file:
            file.write("")

        processed_cars = []
        
        # Обработка машин
        cars_element = processor.get_cars_element(root)
        # Сортируем автомобили по VIN для стабильной обработки
        sorted_cars = processor.sort_cars_by_vin(cars_element)
        for car in sorted_cars:
            if should_remove_car(car, remove_mark_ids, remove_folder_ids):
                continue
            
            # Обрабатываем автомобиль и получаем новый элемент в формате data_cars_car
            processed_car = processor.process_car(car, config)
            if processed_car is not None:
                processed_cars.append(processed_car)
        
        # Создаем новую структуру в формате data_cars_car
        data_root = ET.Element('data')
        cars_container = ET.SubElement(data_root, 'cars')
        
        # Добавляем все обработанные автомобили
        for car_elem in processed_cars:
            cars_container.append(car_elem)
        
        convert_to_string(data_root)
        tree = ET.ElementTree(data_root)
        tree.write(args.output_path, encoding='utf-8', xml_declaration=True)
        
        # Очистка превью
        cleanup_unused_thumbs(processor.current_thumbs, config['thumbs_dir'])
        
        # Перенос содержимого из временной папки в основную папку
        print("📁 Перенос файлов из временной папки в основную...")
        temp_cars_dir = config['temp_cars_dir']
        cars_dir = config['cars_dir']
        
        if os.path.exists(temp_cars_dir) and os.listdir(temp_cars_dir):
            # Удаляем старое содержимое папки cars_dir
            if os.path.exists(cars_dir):
                shutil.rmtree(cars_dir)
                print(f"   Удалено старое содержимое: {cars_dir}")
            
            # Создаем папку cars_dir заново
            os.makedirs(cars_dir, exist_ok=True)
            
            # Копируем все файлы из temp_cars_dir в cars_dir
            for file_name in os.listdir(temp_cars_dir):
                src_file = os.path.join(temp_cars_dir, file_name)
                dst_file = os.path.join(cars_dir, file_name)
                shutil.copy2(src_file, dst_file)
                print(f"   Скопирован файл: {file_name}")
            
            print(f"✅ Перенесено {len(os.listdir(temp_cars_dir))} файлов")
        else:
            print(f"⚠️ Временная папка {temp_cars_dir} пуста или не существует")
    
    processor.flush_deferred_color_errors()

    if os.path.exists('output.txt') and os.path.getsize('output.txt') > 0:
        print("❌ Найдены ошибки 404")

    # --- Сохранение данных в JSON с ценами и скидками из фида ---
    os.makedirs('src/data', exist_ok=True)
    sorted_cars_price_data = sorted(processor.cars_price_data.values(), key=lambda x: (x['brand'], x['model']))
    with open('src/data/dealer-models_cars_price.json', 'w', encoding='utf-8') as f:
        json.dump(sorted_cars_price_data, f, ensure_ascii=False, indent=2)
    # --- конец блока ---

if __name__ == "__main__":
    main()
