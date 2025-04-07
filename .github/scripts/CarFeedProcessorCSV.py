import csv
import requests
import xml.etree.ElementTree as ET
from xml.dom import minidom

class CarFeedProcessorCSV:
    def __init__(self, url=None, file_path=None):
        self.url = url
        self.file_path = file_path
        self.data = None
    
    def download_csv(self):
        if self.url:
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
            vin = row.get("VIN")
            if vin:
                car = ET.SubElement(cars, 'car')

                def safe_set(tag, key, default=None):
                    value = row.get(key)
                    if value or default is not None:
                        ET.SubElement(car, tag).text = value if value else default

                safe_set('mark_id', 'Марка')
                safe_set('folder_id', 'Модель')
                safe_set('modification_id', 'Модификация')
                safe_set('body_type', 'Тип кузова')
                safe_set('complectation_name', 'Комплектация')
                safe_set('wheel', 'Руль', 'Левый')
                safe_set('color', 'Цвет')
                safe_set('color', 'Цвет экстерьера')
                safe_set('metallic', 'Металлик', 'нет')
                safe_set('availability', 'Наличие', 'в наличии')
                safe_set('driveType', 'Привод', 'Передний')
                safe_set('engineType', 'Топливо', 'Бензин')
                safe_set('gearboxType', 'Коробка')
                safe_set('run', 'Пробег')
                safe_set('engine_volume', 'Объем')
                safe_set('custom', 'Таможня')
                safe_set('owners_number', 'Владельцы')
                safe_set('year', 'Год')
                safe_set('year', 'Год выпуска')
                safe_set('price', 'РРЦ')
                safe_set('priceWithDiscount', 'Конечная цена')
                safe_set('sale_price', 'Конечная цена')
                safe_set('credit_discount', 'Скидка по кредиту', '0')
                safe_set('insurance_discount', 'Скидка по страховке', '0')
                safe_set('tradein_discount', 'Скидка по trade-in', '0')
                safe_set('optional_discount', 'Дополнительная скидка', '0')
                safe_set('max_discount', 'Скидка')
                safe_set('currency', 'Валюта', 'RUR')
                safe_set('registry_year', 'Год регистрации')
                safe_set('vin', 'VIN')
                safe_set('description', 'Описание')
                safe_set('comment', 'Описание')
                safe_set('total', 'Количество', '1')
                
                # Обработка изображений
                images_element = ET.SubElement(car, 'images')
                images_str = row.get('Картинки', '')
                if images_str:
                    image_urls = images_str.split()
                    for image_url in image_urls:
                        ET.SubElement(images_element, 'image').text = image_url

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


# Пример использования:
# processor = CarFeedProcessorCSV(url='https://docs.google.com/spreadsheets/d/__________/gviz/tq?gid=_______&tqx=out:CSV')
# processor.download_csv()
# processor.process_data()
# processor.save_xml('cars.xml')

# Или если у вас уже есть файл:
processor = CarFeedProcessorCSV(file_path='data.csv')
processor.read_csv()
processor.process_data()
processor.save_xml('cars.xml')