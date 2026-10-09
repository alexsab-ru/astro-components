#!/usr/bin/env python
"""YML regression tests; all writes and CLI runs stay in temporary directories."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
import yaml
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from lxml import etree

original_cwd = Path.cwd()
with tempfile.TemporaryDirectory() as import_dir:
    try:
        os.chdir(import_dir)
        with redirect_stdout(StringIO()):
            import update_cars
            import getOneXML
    finally:
        os.chdir(original_cwd)


OFFER = '''<offer id="stock-1" type="vendor.model">
    <url>https://example.invalid/stock-1</url>
    <vendor>Haval</vendor><model>H9 2.0 AT (218 л.с.) 4WD 2026</model>
    <typePrefix>Новый автомобиль</typePrefix><store>true</store><count>1</count>
    <price>5000000</price><oldprice>5500000</oldprice><picture>https://example.invalid/1.jpg</picture>
    <picture>https://example.invalid/2.jpg</picture><picture> </picture>
    <param name="Модель">H9</param><param name="Год выпуска">2026</param>
    <param name="Цвет">Белый</param><param name="Кузов">Внедорожник 5 дв.</param>
    <param name="Руль">Левый</param><param name="ПТС">Оригинал</param>
    <param name="Двигатель">бензин, 2.0 л, 218 л. с.</param>
    <param name="Привод">Полный</param><param name="КПП">Автомат</param>
    <sales_notes>Максимальная скидка: 900 000
    - при покупке в кредит до 200000
    - при покупке по программе trade-in до 100000</sales_notes>
</offer>'''


def feed(*offers):
    return '<yml_catalog><shop><offers>' + ''.join(offers) + '</offers></shop></yml_catalog>'


class YmlFeedTests(unittest.TestCase):
    def setUp(self):
        self.tmp = self.enterContext(tempfile.TemporaryDirectory())
        self.old_cwd = Path.cwd()
        os.chdir(self.tmp)
        self.addCleanup(os.chdir, self.old_cwd)
        self.enterContext(patch.dict(os.environ, {}, clear=True))
        with redirect_stdout(StringIO()):
            self.processor = update_cars.CarProcessor()
        self.processor.update_source_type('yml_catalog_shop_offers_offer')
        self.enterContext(patch.object(update_cars, 'get_model_info', return_value=None))
        self.offer = ET.fromstring(OFFER)

    def test_extracts_parameters_images_and_modification(self):
        data = self.processor.extract_car_data(self.offer)
        self.assertEqual(data['folder_id'], 'H9')
        self.assertEqual(data['modification_id'], '2.0 AT (218 л.с.) 4WD')
        self.assertEqual(data['year'], '2026')
        self.assertEqual(data['color'], 'Белый')
        self.assertEqual(data['engineType'], 'бензин')
        self.assertEqual(data['gearboxType'], 'Автомат')
        self.assertEqual(data['ptsType'], 'Оригинал')
        self.assertEqual(data['run'], '0')
        self.assertEqual(data['availability'], 'в наличии')
        self.assertEqual(data['images'], ['https://example.invalid/1.jpg', 'https://example.invalid/2.jpg'])
        self.assertEqual(data['price'], 5500000)
        self.assertEqual(data['priceWithDiscount'], 5000000)
        self.assertEqual(data['sale_price'], 5000000)
        self.assertEqual(data['max_discount'], 500000)
        self.assertEqual(update_cars.to_int(data['credit_discount']), 200000)
        self.assertEqual(update_cars.to_int(data['tradein_discount']), 100000)

    def test_missing_or_invalid_oldprice_uses_sales_notes_benefit(self):
        for oldprice in (None, '', 'invalid', 'NaN', 'Infinity', '-1', '0', '4900000', '5000000'):
            with self.subTest(oldprice=oldprice):
                car = ET.fromstring(OFFER)
                if oldprice is None:
                    car.remove(car.find('oldprice'))
                else:
                    car.find('oldprice').text = oldprice
                data = self.processor.extract_car_data(car)
                self.assertEqual(data['price'], 5900000)
                self.assertEqual(data['priceWithDiscount'], 5000000)
                self.assertEqual(data['sale_price'], 5000000)
                self.assertEqual(data['max_discount'], 900000)

    def test_sales_notes_fallback_formats_and_missing_benefit(self):
        self.offer.remove(self.offer.find('oldprice'))
        for notes, benefit in (
            ('Максимальная скидка: 900 000', 900000),
            ('Максимальная выгода до 900\u202f000 руб.', 900000),
            ('Общая выгода: 900\u00a0000', 900000),
            ('Выгода до 900000', 900000),
            ('Скидка: 900000.00 рублей', 900000),
            ('', 0), ('Оплата наличными', 0),
            ('при покупке в кредит до 200000\ntrade-in до 100000', 0),
            ('Максимальная скидка: неизвестна', 0),
            ('Максимальная скидка: -100000', 0),
            ('Максимальная скидка: 10%', 0),
            ('Максимальная скидка: 900 тыс. рублей', 0),
        ):
            with self.subTest(notes=notes):
                self.offer.find('sales_notes').text = notes
                data = self.processor.extract_car_data(self.offer)
                self.assertEqual(data['price'], 5000000 + benefit)
                self.assertEqual(data['max_discount'], benefit)
                self.assertEqual(data['sale_price'], 5000000)
                self.assertEqual(data['priceWithDiscount'], 5000000)

    def test_decimal_yml_prices(self):
        self.offer.find('price').text = '1999000.00'
        self.offer.find('oldprice').text = '2319990.00'
        data = self.processor.extract_car_data(self.offer)
        self.assertEqual(data['price'], 2319990)
        self.assertEqual(data['sale_price'], 1999000)
        self.assertEqual(data['max_discount'], 320990)

    def test_identity_stays_stable_when_price_model_or_year_changes(self):
        identity = self.processor.get_yml_identifier(self.offer)
        self.assertTrue(identity.startswith('YML-'))
        self.offer.find('price').text = '4900000'
        self.offer.find('model').text = 'H9 updated'
        self.offer.find("param[@name='Год выпуска']").text = '2027'
        self.assertEqual(self.processor.get_yml_identifier(self.offer), identity)
        self.offer.set('id', 'stock-2')
        self.assertNotEqual(self.processor.get_yml_identifier(self.offer), identity)
        self.offer.set('id', 'stock-1')
        self.offer.find('vendor').text = 'Another brand'
        self.assertNotEqual(self.processor.get_yml_identifier(self.offer), identity)

    def test_real_vin_takes_priority_over_offer_id(self):
        for location in ('vin', 'VIN', 'attribute', 'param'):
            with self.subTest(location=location):
                car = ET.fromstring(OFFER)
                if location == 'attribute':
                    car.set('vin', 'REAL_VIN')
                elif location == 'param':
                    ET.SubElement(car, 'param', name='VIN').text = 'REAL_VIN'
                else:
                    ET.SubElement(car, location).text = 'REAL_VIN'
                self.assertEqual(self.processor.extract_car_data(car)['vin'], 'REAL_VIN')

    def test_url_fallback_and_missing_identity(self):
        del self.offer.attrib['id']
        first = self.processor.get_yml_identifier(self.offer)
        self.assertTrue(first.startswith('YML-'))
        self.assertEqual(self.processor.get_yml_identifier(self.offer), first)
        self.offer.remove(self.offer.find('url'))
        self.assertEqual(self.processor.get_yml_identifier(self.offer), '')

    def test_availability_flags_and_stock(self):
        self.processor.show_only_available_cars = True
        for available, store, count, expected in (
            (None, 'true', '1', True), (None, 'false', '1', False),
            ('false', 'true', '1', False), ('true', 'false', '1', True),
            ('true', 'true', '0', False), (None, None, '2', True),
            (None, None, None, False), (None, None, 'invalid', False),
        ):
            with self.subTest(available=available, store=store, count=count):
                car = ET.Element('offer')
                if available is not None:
                    car.set('available', available)
                for tag, value in (('store', store), ('count', count)):
                    if value is not None:
                        ET.SubElement(car, tag).text = value
                self.assertEqual(self.processor.should_skip_car_for_availability(car), not expected)
        self.processor.update_source_type('data_cars_car')
        self.assertFalse(self.processor.should_skip_car_for_availability(ET.fromstring('<car><availability>в наличии</availability></car>')))
        self.assertTrue(self.processor.should_skip_car_for_availability(ET.fromstring('<car><availability>в пути</availability></car>')))

    def test_used_car_mileage_is_preserved(self):
        self.offer.find('typePrefix').text = 'Автомобиль с пробегом'
        ET.SubElement(self.offer, 'param', name='Пробег').text = '120000'
        self.assertEqual(self.processor.extract_car_data(self.offer)['run'], '120000')

    def test_downloader_merges_and_deduplicates_offers_without_logging_payload(self):
        other = OFFER.replace('stock-1', 'stock-2')
        source = feed(OFFER, other).encode()
        with redirect_stdout(StringIO()) as output:
            xpath = getOneXML.detect_xpath(source, 'local-fixture')
            merged = getOneXML.merge_xml_files([source, source], xpath)
            getOneXML.remove_duplicates(merged, xpath)
        self.assertEqual(len(merged.xpath(xpath)), 2)
        self.assertNotIn('example.invalid', output.getvalue())
        self.assertNotIn('<offer', output.getvalue())


class YmlCliTests(unittest.TestCase):
    def test_download_update_and_auto_for_new_and_used(self):
        scripts = Path(__file__).resolve().parent
        with tempfile.TemporaryDirectory() as tmp:
            cwd = Path(tmp)
            isolated_scripts = cwd / '.github/scripts'
            isolated_scripts.mkdir(parents=True)
            # __file__.resolve() участвует в поиске .env: копии исключают настройки
            # рабочего сайта из CLI-тестов, в отличие от symlink на scripts.
            for name in ('config.py', 'utils.py', 'getOneXML.py', 'update_cars.py', 'image_mirror.py'):
                shutil.copyfile(scripts / name, isolated_scripts / name)
            site = cwd / 'src/data/site'
            site.mkdir(parents=True)
            (site / 'settings.json').write_text(json.dumps({'legal_city': 'Тест', 'legal_city_where': 'Тесте'}))
            (site / 'env.json').write_text(json.dumps({'DEALER_CARS_SHOW_ONLY_AVAILABILITY': True}))
            models = cwd / 'src/data/common/brands/haval/models'
            models.mkdir(parents=True)
            (models / 'h9.json').write_text(json.dumps({
                'brand': {'id': 'haval', 'name': 'Haval'}, 'name': 'H9',
                'colors': [{'id': 'white', 'name': 'Белый', 'image': 'https://example.invalid/white.webp'}],
            }))
            (site / 'dealer-cars_price.json').write_text('{}')
            (cwd / 'public').mkdir()
            fixture = cwd / 'fixture.xml'
            fixture.write_text(feed(OFFER, OFFER.replace('stock-1', 'stock-2')), encoding='utf-8')
            env = {'PATH': os.environ['PATH'], 'PYTHON_BIN': sys.executable,
                   'PYTHONDONTWRITEBYTECODE': '1', 'DOMAIN': 'example.test',
                   'XML_URL_YML_CATALOG_SHOP_OFFERS_OFFER': str(fixture),
                   'USED_CARS_YML_CATALOG_SHOP_OFFERS_OFFER': str(fixture)}

            def run(*args):
                result = subprocess.run(['bash', str(scripts / 'sh/process_xml.sh'), *args],
                                        cwd=cwd, env=env, capture_output=True, text=True, timeout=30)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

            run('test', 'yml_catalog_shop_offers_offer', '--skip_thumbs')
            fixture.write_text(feed(OFFER.replace('Новый автомобиль', 'Автомобиль с пробегом').replace(
                '<price>', '<param name="Пробег">120000</param><price>')), encoding='utf-8')
            run('test', 'used_cars_yml_catalog_shop_offers_offer', '--skip_thumbs')
            for name, count in (('cars', 2), ('used_cars', 1)):
                root = ET.parse(cwd / f'public/{name}.xml').getroot()
                self.assertEqual(len(root.findall('./cars/car')), count)
                files = list((cwd / f'src/content/{name}').glob('*.mdx'))
                self.assertEqual(len(files), 1)
                data = yaml.safe_load(files[0].read_text().split('---', 2)[1])
                for key, expected in (('price', 5500000), ('priceWithDiscount', 5000000),
                                      ('sale_price', 5000000), ('max_discount', 500000)):
                    self.assertEqual(data[key], expected)
                    for car in root.findall('./cars/car'):
                        self.assertEqual(int(car.findtext(key)), expected)
            before = (cwd / 'public/cars.xml').read_bytes()
            run('auto', '--skip_thumbs')
            self.assertEqual((cwd / 'public/cars.xml').read_bytes(), before)
            self.assertEqual(ET.parse(cwd / 'public/used_cars.xml').findtext('./cars/car/run'), '120000')
            prices = json.loads((cwd / 'src/data/dealer-models_cars_price.json').read_text())
            self.assertEqual(prices[0]['price'], 5000000)
            self.assertEqual(prices[0]['benefit'], 500000)

            # sales_notes не даёт права вычитать скидку из уже конечной price.
            fixture.write_text(feed(OFFER.replace('<oldprice>5500000</oldprice>', '')), encoding='utf-8')
            run('test', 'yml_catalog_shop_offers_offer', '--skip_thumbs')
            car = ET.parse(cwd / 'public/cars.xml').find('./cars/car')
            file = next((cwd / 'src/content/cars').glob('*.mdx'))
            data = yaml.safe_load(file.read_text().split('---', 2)[1])
            for key, expected in (('price', 5900000), ('sale_price', 5000000),
                                  ('priceWithDiscount', 5000000), ('max_discount', 900000)):
                self.assertEqual(int(car.findtext(key)), expected)
                self.assertEqual(data[key], expected)
            prices = json.loads((cwd / 'src/data/dealer-models_cars_price.json').read_text())
            self.assertEqual(prices[0]['price'], 5000000)
            self.assertEqual(prices[0]['benefit'], 900000)


if __name__ == '__main__':
    unittest.main()
