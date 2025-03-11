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
            car = ET.SubElement(cars, 'car')
            ET.SubElement(car, 'mark_id').text =                row.get('Марка', 'GAC')
            ET.SubElement(car, 'folder_id').text =              row.get('Модель', '')
            ET.SubElement(car, 'modification_id').text =        row.get('Модификация', '')
            ET.SubElement(car, 'body_type').text =              row.get('Тип кузова', 'Седан')
            ET.SubElement(car, 'complectation_name').text =     row.get('Комплектация', '')
            ET.SubElement(car, 'wheel').text =                  row.get('Руль', 'Левый')
            ET.SubElement(car, 'color').text =                  row.get('Цвет', '')
            ET.SubElement(car, 'metallic').text =               row.get('Металлик', 'нет')
            ET.SubElement(car, 'availability').text =           row.get('Наличие', 'в наличии')
            ET.SubElement(car, 'driveType').text =              row.get('Привод', 'Передний')
            ET.SubElement(car, 'engineType').text =             row.get('Топливо', 'Бензин')
            ET.SubElement(car, 'gearboxType').text =            row.get('Коробка', '')
            ET.SubElement(car, 'run').text =                    row.get('Пробег', '0')
            ET.SubElement(car, 'custom').text =                 row.get('Таможня', 'растаможен')
            ET.SubElement(car, 'owners_number').text =          row.get('Владельцы', 'Не было владельцев')
            ET.SubElement(car, 'year').text =                   row.get('Год', '2023')
            ET.SubElement(car, 'price').text =                  row.get('РРЦ', '')
            ET.SubElement(car, 'priceWithDiscount').text =      row.get('Конечная цена', '')
            ET.SubElement(car, 'sale_price').text =             row.get('Конечная цена', '')
            ET.SubElement(car, 'credit_discount').text =        row.get('Скидка по кредиту', '0')
            ET.SubElement(car, 'insurance_discount').text =     row.get('Скидка по страховке', '0')
            ET.SubElement(car, 'tradein_discount').text =       row.get('Скидка по trade-in', '0')
            ET.SubElement(car, 'optional_discount').text =      row.get('Дополнительная скидка', '0')
            ET.SubElement(car, 'max_discount').text =           row.get('Скидка', '')
            ET.SubElement(car, 'currency').text =               row.get('Валюта', 'RUR')
            # ET.SubElement(car, 'registry_year').text =          row.get('Год регистрации', '2023')
            ET.SubElement(car, 'vin').text =                    row.get('VIN', '')
            ET.SubElement(car, 'description').text =            row.get('Описание', '')
            ET.SubElement(car, 'total').text =                  row.get('Количество', '1')
            # images = ET.SubElement(car, 'images')
            # ET.SubElement(images, 'image').text =             row.get('Ссылка на изображение', '')

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