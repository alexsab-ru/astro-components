#!/usr/bin/env python
import csv
import xml.etree.ElementTree as ET
from xml.dom import minidom
import sys
import argparse
try:
    import requests
except ImportError:
    requests = None

class CarFeedProcessorCSV:
    def __init__(self, url=None, file_path=None):
        self.url = url
        self.file_path = file_path
        self.data = None
    
    def download_csv(self):
        if self.url:
            if requests is None:
                raise ImportError("The 'requests' package is required to download CSV data from a URL.")
            response = requests.get(self.url)
            response.raise_for_status()
            self.data = response.text.splitlines()
        else:
            raise ValueError("URL is not provided.")
    
    def read_csv(self):
        if self.file_path:
            with open(self.file_path, mode='r', encoding='utf-8') as file:
                self.data = file.readlines()
        elif self.data is None:
            raise ValueError("No data to read. Provide a URL or file path.")
    
    def process_data(self):
        if self.data is None:
            raise ValueError("No data to process.")
        
        reader = csv.DictReader(self.data)

        root = ET.Element('data')
        cars = ET.SubElement(root, 'cars')

        for row in reader:
            def get_value(keys):
                if not isinstance(keys, (list, tuple)):
                    keys = [keys]
                for key in keys:
                    value = row.get(key)
                    if value:
                        return value.strip()
                return None

            vin_value = get_value(["VIN", "Vin", "vin"])
            if vin_value and vin_value not in {"Обязательный", "Подробнее о параметре"}:
                car = ET.SubElement(cars, 'car')

                def safe_set(tag, keys=None, default=None, transform=None):
                    value = get_value(keys) if keys else None
                    if transform:
                        value = transform(value, row)
                    if (value is None or value == '') and default is not None:
                        value = default
                    if value:
                        ET.SubElement(car, tag).text = value

                def folder_transform(value, current_row):
                    model = value or get_value(["Model", "Модель"])
                    generation = get_value(["GenerationId"])
                    generation_short = generation.split()[0] if generation else None
                    if model and generation_short:
                        return f"{model}, {generation_short}"
                    return model or generation_short

                safe_set('mark_id', ['Марка', 'Make'])
                safe_set('folder_id', ['Модель', 'Model'], transform=folder_transform)
                safe_set('modification_id', ['Модификация', 'ModificationId'])
                safe_set('body_type', ['Тип кузова', 'BodyType'])
                safe_set('complectation_name', ['Комплектация', 'ComplectationId'])
                safe_set('wheel', ['Руль', 'WheelType'], 'Левый')
                safe_set('color', ['Цвет', 'Цвет экстерьера', 'Color'])
                safe_set('metallic', ['Металлик'], 'нет')
                safe_set('availability', ['Наличие', 'Availability'], 'в наличии')
                safe_set('driveType', ['Привод', 'DriveType'], 'Передний')
                safe_set('engineType', ['Топливо', 'FuelType'], 'Бензин')
                safe_set('gearboxType', ['Коробка', 'Transmission'])
                safe_set('run', ['Пробег'])
                safe_set('engine_volume', ['Объем', 'EngineSize'])
                safe_set('custom', ['Таможня', 'RegInRussia'])
                safe_set('owners_number', ['Владельцы'])
                safe_set('year', ['Год', 'Год выпуска', 'Year'])
                safe_set('price', ['РРЦ', 'Price'])
                safe_set('priceWithDiscount', ['Конечная цена'])
                safe_set('sale_price', ['Конечная цена'])
                safe_set('credit_discount', ['Скидка по кредиту', 'CreditDiscount'], '0')
                safe_set('insurance_discount', ['Скидка по страховке'], '0')
                safe_set('tradein_discount', ['Скидка по trade-in', 'TradeinDiscount'], '0')
                safe_set('optional_discount', ['Дополнительная скидка'], '0')
                safe_set('max_discount', ['Скидка', 'MaxDiscount'])
                safe_set('currency', ['Валюта'], 'RUR')
                safe_set('registry_year', ['Год регистрации'])
                safe_set('vin', ['VIN', 'Vin', 'vin'])
                safe_set('description', ['Описание', 'Description'])
                safe_set('comment', ['Описание'])
                safe_set('total', ['Количество'], '1')
                
                # Обработка изображений
                images_element = ET.SubElement(car, 'images')
                images_str = get_value(['Картинки', 'ImageUrls']) or ''
                if images_str:
                    raw_urls = images_str.split('|') if '|' in images_str else images_str.split()
                    for image_url in raw_urls:
                        cleaned_url = image_url.strip()
                        if cleaned_url:
                            ET.SubElement(images_element, 'image').text = cleaned_url

        self.xml_tree = ET.ElementTree(root)

    def save_xml(self, output_path):
        if self.xml_tree:
            rough_string = ET.tostring(self.xml_tree.getroot(), 'utf-8')
            reparsed = minidom.parseString(rough_string)
            pretty_xml_as_string = reparsed.toprettyxml(indent="  ", encoding="UTF-8")
            with open(output_path, 'wb') as f:
                f.write(pretty_xml_as_string)
        else:
            raise ValueError("XML tree is not generated. Call process_data() first.")


def main():
    parser = argparse.ArgumentParser(description='Process car CSV and convert to XML.')
    parser.add_argument('--csv', dest='csv_path', default='data.csv', help='Path to input CSV file')
    parser.add_argument('--xml', dest='xml_path', default='cars.xml', help='Path to output XML file')
    args = parser.parse_args()

    # Создаем процессор с путем к CSV
    processor = CarFeedProcessorCSV(file_path=args.csv_path)
    processor.read_csv()
    processor.process_data()
    # Сохраняем XML по указанному пути
    processor.save_xml(args.xml_path)

if __name__ == '__main__':
    main()
