#!/usr/bin/env python
import csv
import xml.etree.ElementTree as ET
from xml.dom import minidom
import hashlib
import argparse
try:
    import requests
except ImportError:
    requests = None

class CarFeedProcessorCSV:
    def __init__(self, url=None, file_path=None, feed_type="yandex"):
        self.url = url
        self.file_path = file_path
        self.feed_type = (feed_type or "yandex").lower()
        self.data = None
        self.xml_tree = None
    
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
    
    @staticmethod
    def vin_to_code_md5(vin: str) -> str:
        vin = vin.strip().upper()
        return hashlib.md5(vin.encode("utf-8")).hexdigest()

    @staticmethod
    def _get_value(row, keys):
        if not isinstance(keys, (list, tuple)):
            keys = [keys]
        for key in keys:
            value = row.get(key)
            if value:
                return value.strip()
        return None

    @staticmethod
    def _is_valid_row(row):
        vin_value = CarFeedProcessorCSV._get_value(row, ["VIN", "Vin", "vin"])
        availability_value = CarFeedProcessorCSV._get_value(row, ["availability", "Наличие", "Availability"])
        if not vin_value or vin_value in {"Обязательный", "Подробнее о параметре"}:
            return False
        if not availability_value or availability_value in {"пример", "Обязательный", "Подробнее о параметре"}:
            return False
        return True

    def _generate_yandex_feed(self, reader):
        root = ET.Element('data')
        cars = ET.SubElement(root, 'cars')

        for row in reader:
            if not self._is_valid_row(row):
                continue

            car = ET.SubElement(cars, 'car')

            def safe_set(tag, keys=None, default=None, transform=None):
                value = self._get_value(row, keys) if keys else None
                if transform:
                    value = transform(value, row)
                if (value is None or value == '') and default is not None:
                    value = default
                if value:
                    ET.SubElement(car, tag).text = value

            def folder_transform(value, current_row):
                model = value or self._get_value(current_row, ["Model", "Модель"])
                generation = self._get_value(current_row, ["GenerationId"])
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

            images_element = ET.SubElement(car, 'images')
            images_str = self._get_value(row, ['Картинки', 'ImageUrls']) or ''
            if images_str:
                raw_urls = images_str.split('|') if '|' in images_str else images_str.split()
                for image_url in raw_urls:
                    cleaned_url = image_url.strip()
                    if cleaned_url:
                        ET.SubElement(images_element, 'image').text = cleaned_url

        return ET.ElementTree(root)

    def _generate_avito_feed(self, reader):
        root = ET.Element('Ads', {'formatVersion': '3', 'target': 'Avito.ru'})

        for row in reader:
            if not self._is_valid_row(row):
                continue

            ad = ET.SubElement(root, 'Ad')

            def safe_set(tag, keys=None, default=None, transform=None):
                value = self._get_value(row, keys) if keys else None
                if transform:
                    value = transform(value, row)
                if (value is None or value == '') and default is not None:
                    value = default
                if value:
                    ET.SubElement(ad, tag).text = value

            safe_set('Address', ['Address', 'Адрес'])
            safe_set('Latitude', ['Latitude', 'Широта'])
            safe_set('Longitude', ['Longitude', 'Долгота'])
            safe_set('Id', ['Id', 'ID', 'id', 'ExternalId'], default=self.vin_to_code_md5(self._get_value(row, ["VIN", "Vin", "vin"])))
            safe_set('DateBegin', ['DateBegin'])
            safe_set('DateEnd', ['DateEnd'])
            safe_set('ListingFee', ['ListingFee'])
            safe_set('AdStatus', ['AdStatus'])
            safe_set('AvitoId', ['AvitoId'])
            safe_set('ManagerName', ['ManagerName'])
            safe_set('ContactPhone', ['ContactPhone'])
            safe_set('ContactMethod', ['ContactMethod'])
            safe_set('Category', ['Category', 'Категория'], 'Автомобили')
            safe_set('Description', ['Описание', 'Description'])
            safe_set('Price', ['Price', 'РРЦ'])

            images_element = ET.SubElement(ad, 'Images')
            images_str = self._get_value(row, ['Картинки', 'ImageUrls']) or ''
            if images_str:
                raw_urls = images_str.split('|') if '|' in images_str else images_str.split()
                for image_url in raw_urls:
                    cleaned_url = image_url.strip()
                    if cleaned_url:
                        ET.SubElement(images_element, 'Image', {'url': cleaned_url})

            safe_set('VideoURL', ['VideoURL'])
            safe_set('Generation', ['Поколение', 'Generation'])
            safe_set('Modification', ['Модификация', 'Modification'])
            safe_set('Complectation', ['Complectation', 'Комплектация'])
            safe_set('InternetCalls', ['InternetCalls'])
            safe_set('CallsDevices', ['CallsDevices'])
            safe_set('CarType', ['CarType', 'Тип автомобиля'], 'Новые')
            safe_set('TradeinDiscount', ['Скидка по trade-in', 'TradeinDiscount'])
            safe_set('CreditDiscount', ['Скидка по кредиту', 'CreditDiscount'])
            safe_set('InsuranceDiscount', ['Скидка по страховке'])
            safe_set('MaxDiscount', ['Скидка', 'MaxDiscount', 'Максимальная скидка'])
            safe_set('Availability', ['Наличие', 'Availability'], 'в наличии')
            safe_set('Color', ['Цвет', 'Цвет экстерьера', 'Color'])
            safe_set('VideoFileURL', ['VideoFileURL'])
            safe_set('Make', ['Марка', 'Make'])
            safe_set('Model', ['Модель', 'Model'])
            safe_set('GenerationId', ['GenerationId', 'Поколение ID'])
            safe_set('ModificationId', ['Модификация ID', 'ModificationId'])
            safe_set('ComplectationId', ['Комплектация ID', 'ComplectationId'])
            safe_set('FuelType', ['Топливо', 'FuelType'])
            safe_set('Transmission', ['Коробка', 'Transmission'])
            safe_set('EngineSize', ['Объем', 'EngineSize', 'Объем двигателя','Объём', 'Объём двигателя'])
            safe_set('Year', ['Год', 'Год выпуска', 'Year'])
            safe_set('Doors', ['Doors', 'Количество дверей'])
            safe_set('BodyType', ['Тип кузова', 'BodyType'])
            safe_set('DriveType', ['Привод', 'DriveType'], 'Передний')
            safe_set('Power', ['Power', 'Мощность', 'Мощность двигателя'])
            safe_set('WheelType', ['Руль', 'WheelType'], 'Левый')
            safe_set('PowerSteering', ['PowerSteering'])
            safe_set('ClimateControl', ['ClimateControl'])
            safe_set('ClimateControlOptions', ['ClimateControlOptions'])
            safe_set('Interior', ['Interior'])
            safe_set('InteriorOptions', ['InteriorOptions'])
            safe_set('InteriorColor', ['InteriorColor'])
            safe_set('Heating', ['Heating'])
            safe_set('PowerWindows', ['PowerWindows'])
            safe_set('ElectricDrive', ['ElectricDrive'])
            safe_set('MemorySettings', ['MemorySettings'])
            safe_set('DrivingAssistance', ['DrivingAssistance'])
            safe_set('AntitheftSystem', ['AntitheftSystem'])
            safe_set('Airbags', ['Airbags'])
            safe_set('ActiveSafety', ['ActiveSafety'])
            safe_set('Multimedia', ['Multimedia'])
            safe_set('AudioSystem', ['AudioSystem'])
            safe_set('AudioSystemOptions', ['AudioSystemOptions'])
            safe_set('Lights', ['Lights'])
            safe_set('LightsOptions', ['LightsOptions'])
            safe_set('Wheels', ['Wheels', 'Колеса'])
            safe_set('WheelsOptions', ['WheelsOptions'])
            safe_set('Maintenance', ['Maintenance'])
            safe_set('AuctionPriceLastDate', ['AuctionPriceLastDate'])
            safe_set('AuctionPrice', ['AuctionPrice'])
            safe_set('VIN', ['VIN', 'Vin', 'vin'])
            safe_set('GRN', ['GRN'])
            safe_set('RegInRussia', ['RegInRussia'])
            safe_set('OfferSpecialLoanConditions', ['OfferSpecialLoanConditions'])
            safe_set('OfferRepairGuarantee', ['OfferRepairGuarantee'])
            safe_set('OfferGiftCasco', ['OfferGiftCasco'])
            safe_set('OfferGiftTires', ['OfferGiftTires'])
            safe_set('OfferDiscountCasco', ['OfferDiscountCasco'])
            safe_set('OfferGiftTO', ['OfferGiftTO'])
            safe_set('OfferGiftAccessories', ['OfferGiftAccessories'])
            safe_set('OfferFastRegistration', ['OfferFastRegistration'])
            safe_set('OfferProgramLadaRestart', ['OfferProgramLadaRestart'])

        return ET.ElementTree(root)

    def process_data(self):
        if self.data is None:
            raise ValueError("No data to process.")

        reader = csv.DictReader(self.data)
        if self.feed_type == "avito":
            self.xml_tree = self._generate_avito_feed(reader)
        elif self.feed_type == "yandex":
            self.xml_tree = self._generate_yandex_feed(reader)
        else:
            raise ValueError(f"Unsupported feed type: {self.feed_type}")

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
    parser.add_argument('--feed', dest='feed_type', choices=['yandex', 'avito'], default='yandex', help='Target feed type to generate')
    args = parser.parse_args()

    processor = CarFeedProcessorCSV(file_path=args.csv_path, feed_type=args.feed_type)
    processor.read_csv()
    processor.process_data()
    processor.save_xml(args.xml_path)

if __name__ == '__main__':
    main()
