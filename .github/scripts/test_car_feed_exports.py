"""Offline regression checks for destination exports and publication boundaries."""
import hashlib
from contextlib import redirect_stdout
from io import StringIO
import json
import os
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

import car_feed_exports as feeds


class CarFeedExportTests(unittest.TestCase):
    def setUp(self):
        self.enterContext(redirect_stdout(StringIO()))
        self.tmp = self.enterContext(tempfile.TemporaryDirectory())
        self.root = Path(self.tmp)
        self.job = feeds.ExportJob('vk_data_cars_car', 'vk', 'data_cars_car',
                                  'data_cars_car', self.root / 'cars.xml',
                                  self.root / 'vk_data_cars_car.xml', 'new')
        self.fields = {
            'vin': 'TEST_VIN_1', 'url': 'https://dealer.example/cars/1/',
            'mark_id': 'Belgee', 'folder_id': 'X50+', 'year': '2026',
            'price': '2699990', 'priceWithDiscount': '2240000', 'sale_price': '2240000',
            'currency': 'RUR', 'description': 'Длинный рекламный текст. ' * 100,
            'availability': 'В пути', 'color': 'СЕРЕБРИСТЫЙ', 'body_type': 'Внедорожник',
            'run': '3', 'complectation_name': 'Престиж', 'max_discount': '459990',
        }
        self.images = ['https://cdn.example/1.webp?v=123', 'https://cdn.example/2.jpg']

    def write_inventory(self, records):
        root = ET.Element('data')
        cars = ET.SubElement(root, 'cars')
        for fields, images in records:
            car = ET.SubElement(cars, 'car')
            for key, value in fields.items():
                ET.SubElement(car, key).text = value
            if images:
                container = ET.SubElement(car, 'images')
                for url in images:
                    ET.SubElement(container, 'image').text = url
        ET.ElementTree(root).write(self.job.input, encoding='utf-8', xml_declaration=True)

    def export(self, records, job=None):
        self.write_inventory(records)
        before = hashlib.sha256(self.job.input.read_bytes()).digest()
        report = feeds.export_job(job or self.job, self.root / 'reports')
        self.assertEqual(before, hashlib.sha256(self.job.input.read_bytes()).digest())
        return ET.parse((job or self.job).output).findall('./cars/car'), report

    def test_vk_required_fields_discount_and_optional_normalization(self):
        cars, report = self.export([(self.fields, self.images)])
        self.assertEqual(report['exported'], 1)
        car = cars[0]
        for key, expected in {
            'unique_id': 'TEST_VIN_1', 'vin': 'TEST_VIN_1', 'price': '2699990',
            'sale_price': '2240000', 'max_benefit': '459990',
            'owners_number': 'Не было владельцев', 'color': 'серебряный',
            'availability': 'На заказ', 'body_type': 'Внедорожник', 'run': '3',
        }.items():
            self.assertEqual(car.findtext(key), expected)
        self.assertLessEqual(len(car.findtext('description')), 256)
        self.assertFalse(car.findtext('description').isupper())
        self.assertFalse(car.findtext('description').islower())
        self.assertEqual([image.text for image in car.findall('images/image')], self.images)
        for native_key in ('priceWithDiscount', 'max_discount', 'complectation_name'):
            self.assertIsNone(car.find(native_key))

    def test_short_description_xml_escaping_and_id_preserved(self):
        fields = {**self.fields, 'unique_id': 'stock_1', 'description': 'Belgee X50+ & специальная цена'}
        cars, _ = self.export([(fields, self.images)])
        self.assertEqual(cars[0].findtext('description'), fields['description'])
        self.assertEqual(cars[0].findtext('unique_id'), 'stock_1')
        self.assertEqual(cars[0].findtext('vin'), fields['vin'])

    def test_regular_and_discounted_prices_are_validated_independently(self):
        cases = [
            ({'sale_price': '', 'priceWithDiscount': '2300000.50'}, '2300000.50'),
            ({'sale_price': '', 'priceWithDiscount': ''}, '2699990'),
            ({'sale_price': '0', 'priceWithDiscount': ''}, None),
            ({'sale_price': 'NaN', 'priceWithDiscount': ''}, None),
            ({'sale_price': '1,50', 'priceWithDiscount': ''}, None),
            ({'sale_price': '-1', 'priceWithDiscount': ''}, None),
            ({'sale_price': '2000000'}, None),  # conflicting discounted fields
            ({'price': ''}, None),  # a discounted price cannot replace the regular price
            ({'price': 'NaN'}, None),
            ({'price': '0'}, None),
            ({'price': '-1'}, None),
            ({'price': '2699990,50'}, None),
            ({'price': '2699990.50'}, '2240000'),
        ]
        for changes, expected in cases:
            with self.subTest(changes=changes):
                cars, report = self.export([({**self.fields, **changes}, self.images)])
                self.assertEqual(len(cars), 0 if expected is None else 1)
                if expected:
                    self.assertEqual(cars[0].findtext('price'), changes.get('price', self.fields['price']))
                    self.assertEqual(cars[0].findtext('sale_price'), expected)
                else:
                    self.assertTrue(report['issues'][0]['errors'])

    def test_max_benefit_accepts_zero_and_omits_invalid_optional_values(self):
        for value, expected in (('0', '0'), ('459990.50', '459990.50'),
                                ('', None), (None, None), ('-1', None),
                                ('NaN', None), ('1,50', None), ('1e5', None)):
            with self.subTest(value=value):
                fields = {**self.fields, 'max_discount': value}
                if value is None:
                    del fields['max_discount']
                cars, report = self.export([(fields, self.images)])
                self.assertEqual(report['exported'], 1)
                self.assertEqual(cars[0].findtext('max_benefit'), expected)
                self.assertEqual(bool(report['issues']), bool(value) and expected is None)

    def test_conflicting_ids_and_missing_photos_are_excluded(self):
        records = [(self.fields, self.images), ({**self.fields, 'color': 'Белый'}, self.images),
                   ({**self.fields, 'vin': 'TEST_VIN_2'}, []),
                   ({**self.fields, 'vin': 'TEST_VIN_3'}, self.images)]
        cars, report = self.export(records)
        self.assertEqual((report['total'], report['exported'], report['excluded']), (4, 1, 3))
        self.assertEqual(cars[0].findtext('vin'), 'TEST_VIN_3')
        self.assertEqual(len(report['issues']), 3)

    def test_required_values_not_invented(self):
        for key in ('vin', 'url', 'mark_id', 'folder_id', 'year', 'currency'):
            with self.subTest(key=key):
                fields = {**self.fields, key: ''}
                cars, report = self.export([(fields, self.images)])
                self.assertFalse(cars)
                self.assertEqual(report['excluded'], 1)
        cars, _ = self.export([({**self.fields, 'url': 'javascript:alert(1)'}, ['file:///photo.jpg'])])
        self.assertFalse(cars)

    def test_unsupported_optional_values_omitted(self):
        fields = {**self.fields, 'color': 'Неизвестный', 'body_type': 'Что-то',
                  'state': 'Идеальное', 'availability': 'Продан', 'run': 'abc', 'poi_id': 'x' * 257}
        cars, report = self.export([(fields, self.images + ['bad-url', self.images[0]])])
        for key in ('color', 'body_type', 'state', 'availability', 'run', 'poi_id'):
            self.assertIsNone(cars[0].find(key))
        self.assertEqual(len(cars[0].findall('images/image')), 2)
        self.assertGreaterEqual(len(report['issues'][0]['warnings']), 6)

    def test_used_owners_must_be_known(self):
        job = replace(self.job, category='used')
        cars, report = self.export([(self.fields, self.images)], job)
        self.assertFalse(cars)
        self.assertEqual(report['excluded'], 1)
        cars, _ = self.export([({**self.fields, 'owners_number': '2'}, self.images)], job)
        self.assertEqual(cars[0].findtext('owners_number'), 'Два владельца')

    def test_empty_inventory_clears_previous_export(self):
        self.export([(self.fields, self.images)])
        cars, report = self.export([])
        self.assertFalse(cars)
        self.assertEqual(report['total'], 0)

    def test_malformed_input_preserves_previous_output(self):
        self.export([(self.fields, self.images)])
        before = self.job.output.read_bytes()
        self.job.input.write_text('<not-xml')
        with self.assertRaises(ET.ParseError):
            feeds.export_job(self.job, self.root / 'reports')
        self.assertEqual(self.job.output.read_bytes(), before)

    def test_failed_atomic_write_preserves_existing_file(self):
        path = self.root / 'atomic.xml'
        path.write_bytes(b'previous')
        with patch.object(feeds.os, 'replace', side_effect=OSError('write failed')):
            with self.assertRaises(OSError):
                feeds.atomic_write(path, b'new')
        self.assertEqual(path.read_bytes(), b'previous')
        self.assertEqual(list(self.root.glob('.atomic.xml.*')), [])

    def test_config_validation_and_independent_registries(self):
        entry = {'id': self.job.id, 'destination': 'vk', 'format': 'data_cars_car',
                 'input_format': 'data_cars_car', 'input': str(self.job.input),
                 'output': str(self.job.output), 'category': 'new'}
        config_path = self.root / 'exports.json'
        def config(entries):
            config_path.write_text(json.dumps({'version': 1, 'exports': entries}))
        config([entry])
        self.assertEqual(feeds.load_jobs(config_path), [self.job])
        for entries in ([entry, entry], [{**entry, 'output': entry['input']}],
                        [{**entry, 'destination': 'unknown'}], [{**entry, 'category': 'other'}],
                        [{**entry, 'unknown': 'field'}], [{**entry, 'defaults': []}],
                        [{**entry, 'defaults_file': 1}]):
            config(entries)
            with self.assertRaises(ValueError):
                feeds.load_jobs(config_path)
        # A destination and an output format can be added independently of the runner.
        config([{**entry, 'destination': 'another', 'format': 'another_format'}])
        with patch.dict(feeds.WRITERS, {'another_format': feeds.serialize_data_cars_car}), patch.dict(
            feeds.DESTINATIONS, {'another': feeds.Destination({'another_format': feeds.prepare_vk}, feeds.identify_vk)}):
            jobs = feeds.load_jobs(config_path)
            self.write_inventory([(self.fields, self.images)])
            report = feeds.export_job(jobs[0], self.root / 'reports')
            self.assertEqual(report['exported'], 1)

    def channel_export(self, fields=None, images=None, **job_options):
        job = replace(self.job, id='vk_channel_item', format='channel_item',
                      output=self.root / 'vk_channel_item.xml', **job_options)
        self.export([(self.fields if fields is None else fields,
                      self.images if images is None else images)], job)
        return ET.parse(job.output).getroot(), json.loads(
            (self.root / 'reports/vk_channel_item.json').read_text())

    def test_channel_item_covers_csv_fields_with_nested_xml(self):
        # Equivalent to the VK CSV columns, with unique headers and valid price ordering.
        source = {**self.fields, 'state': 'Отличное', 'custom_label': 'Летняя распродажа',
                  'location.address': '3-я улица Строителей, 55', 'location.country': 'Россия',
                  'location.region': 'Республика Татарстан', 'location.locality': 'Казань',
                  'metro.name': 'Проспект Победы'}
        root, report = self.channel_export(source)
        self.assertEqual(root.tag, 'channel')
        self.assertEqual(len(root.findall('item')), 1)
        car = root.find('item')
        expected = {
            'id': 'TEST_VIN_1', 'title': 'Belgee X50+ Престиж 2026',
            'link': self.fields['url'], 'brand': 'Belgee', 'model': 'X50+',
            'year': '2026', 'image_link': self.images[0], 'price': '2699990 RUB',
            'sale_price': '2240000 RUB', 'min_price': '2240000 RUB',
            'max_price': '2699990 RUB', 'exterior_color': 'СЕРЕБРИСТЫЙ',
            'mileage/value': '3', 'mileage/unit': 'KM', 'vin': 'TEST_VIN_1',
            'body_style': 'suv', 'condition': 'excellent', 'state_of_vehicle': 'new',
            'availability': 'на заказ', 'vehicle_type': 'car_truck',
            'custom_label_0': 'Летняя распродажа',
            'location/address': source['location.address'], 'location/country': 'Россия',
            'location/region': 'Республика Татарстан', 'location/locality': 'Казань',
            'location/metro/name': 'Проспект Победы',
        }
        for key, value in expected.items():
            self.assertEqual(car.findtext(key), value, key)
        self.assertLessEqual(len(car.findtext('description')), 256)
        self.assertNotIn('Длинный рекламный текст', car.findtext('description'))
        self.assertFalse(report['issues'])
        for key in ('unique_id', 'mark_id', 'folder_id', 'currency', 'max_discount', 'owners_number', 'images'):
            self.assertIsNone(car.find(key))
        for key in ('description', 'availability', 'condition'):
            self.assertEqual(len(car.findall(key)), 1)

    def test_channel_item_does_not_require_owners_or_vin_with_valid_id(self):
        fields = {**self.fields, 'unique_id': 'stock-123', 'state_of_vehicle': 'cpo'}
        del fields['vin']
        root, report = self.channel_export(fields, category='used')
        self.assertEqual(report['exported'], 1)
        self.assertEqual(root.findtext('item/id'), 'stock-123')
        self.assertEqual(root.findtext('item/state_of_vehicle'), 'cpo')
        self.assertIsNone(root.find('item/vin'))
        self.assertTrue(report['issues'][0]['warnings'])

    def test_channel_item_missing_data_is_reported_without_fabrication(self):
        fields = {**self.fields}
        for key in ('run', 'body_type', 'availability'):
            fields.pop(key)
        root, report = self.channel_export(fields)
        self.assertEqual(root.findtext('item/mileage/value'), '0')
        self.assertIsNone(root.find('item/location'))
        self.assertIsNone(root.find('item/condition'))
        self.assertIsNone(root.find('item/body_style'))
        self.assertIn('location.region', ' '.join(report['issues'][0]['warnings']))
        fields['state_of_vehicle'] = 'used'
        root, report = self.channel_export(fields)
        self.assertEqual(report['excluded'], 1)
        self.assertFalse(root.findall('item'))

    def test_channel_item_validates_required_values_and_mileage(self):
        for changes in ({'price': ''}, {'url': 'javascript:alert(1)'}, {'mark_id': ''},
                        {'sale_price': 'bad'}, {'year': ''}, {'folder_id': 'x' * 257}):
            with self.subTest(changes=changes):
                root, report = self.channel_export({**self.fields, **changes})
                self.assertEqual(report['excluded'], 1)
                self.assertFalse(root.findall('item'))
        root, report = self.channel_export(images=[])
        self.assertEqual(report['excluded'], 1)
        root, _ = self.channel_export({**self.fields, 'run': 'bad'})
        self.assertIsNone(root.find('item/mileage'))
        root, _ = self.channel_export({**self.fields, 'mileage.unit': 'mi', 'min_price': '2100000'})
        self.assertEqual(root.findtext('item/mileage/unit'), 'MI')
        self.assertEqual(root.findtext('item/min_price'), '2100000 RUB')
        root, _ = self.channel_export({**self.fields, 'availability': 'транзит'})
        self.assertEqual(root.findtext('item/availability'), 'на заказ')

    def test_channel_item_price_ranges_are_ordered_and_currency_is_preserved(self):
        root, report = self.channel_export({**self.fields, 'price': '200', 'sale_price': '250',
                                           'priceWithDiscount': '250', 'currency': 'USD'})
        self.assertEqual(root.findtext('item/price'), '200 USD')
        self.assertEqual(root.findtext('item/sale_price'), '250 USD')
        self.assertEqual(root.findtext('item/min_price'), '200 USD')
        self.assertEqual(root.findtext('item/max_price'), '250 USD')
        root, report = self.channel_export({**self.fields, 'min_price': '3000000', 'max_price': '2000000'})
        self.assertEqual(report['exported'], 1)
        self.assertIsNone(root.find('item/min_price'))
        self.assertIsNone(root.find('item/max_price'))
        self.assertIn('reversed', ' '.join(report['issues'][0]['warnings']))

    def test_nested_source_and_dealer_defaults_do_not_change_input_or_other_exports(self):
        defaults_file = self.root / 'dealer.json'
        defaults_file.write_text(json.dumps({'location.country': 'Россия', 'condition': 'excellent'}))
        root, report = self.channel_export({**self.fields, 'condition': 'good'},
            defaults={'location.country': 'Other', 'location.locality': 'Казань'}, defaults_file=defaults_file)
        self.assertEqual(root.findtext('item/condition'), 'good')
        self.assertEqual(root.findtext('item/location/country'), 'Россия')
        self.assertEqual(root.findtext('item/location/locality'), 'Казань')
        # The source reader understands actual nested XML, too.
        tree = ET.parse(self.job.input)
        location = ET.SubElement(tree.find('./cars/car'), 'location')
        ET.SubElement(location, 'address').text = 'Улица & Дом'
        metro = ET.SubElement(location, 'metro')
        ET.SubElement(metro, 'name').text = 'Удельная'
        tree.write(self.job.input, encoding='utf-8')
        vehicle = feeds.read_data_cars_car(self.job.input)[0]
        self.assertEqual(vehicle.fields['location.address'], 'Улица & Дом')
        self.assertEqual(vehicle.fields['location.metro.name'], 'Удельная')
        before = self.job.input.read_bytes()
        job = replace(self.job, id='vk_channel_item', format='channel_item',
                      output=self.root / 'vk_channel_item.xml', defaults_file=defaults_file)
        feeds.export_job(job, self.root / 'reports')
        self.assertEqual(self.job.input.read_bytes(), before)
        self.assertEqual(ET.parse(job.output).findtext('item/location/address'), 'Улица & Дом')
        with self.assertRaises(ValueError):
            feeds.validate_defaults({'location': {'address': 'nested'}}, 'defaults')
        defaults_file.write_text('{invalid-json')
        previous = job.output.read_bytes()
        with self.assertRaises(ValueError):
            feeds.export_job(job, self.root / 'reports')
        self.assertEqual(job.output.read_bytes(), previous)

    def test_cli_shell_wrapper_and_source_selection(self):
        scripts = Path(__file__).resolve().parent
        entry = {'id': self.job.id, 'destination': 'vk', 'format': 'data_cars_car',
                 'input_format': 'data_cars_car', 'input': str(self.job.input),
                 'output': str(self.job.output), 'category': 'new'}
        config = self.root / 'config.json'
        config.write_text(json.dumps({'version': 1, 'exports': [entry]}))
        self.write_inventory([(self.fields, self.images)])
        before = self.job.input.read_bytes()
        cwd = Path.cwd()
        try:
            os.chdir(self.root)
            self.assertEqual(feeds.export_for_source(self.root / 'used.xml', config), [])
            self.assertFalse(self.job.output.exists())
            self.assertEqual(len(feeds.export_for_source(self.job.input, config)), 1)
        finally:
            os.chdir(cwd)
        for command in (
            [sys.executable, str(scripts / 'export_car_feeds.py')],
            ['bash', str(scripts / 'sh/process_xml.sh'), 'export'],
        ):
            result = subprocess.run(command + [self.job.id, '--config', str(config)],
                                    env={**os.environ, 'PYTHON_BIN': sys.executable},
                                    capture_output=True, text=True, timeout=30)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        result = subprocess.run([sys.executable, str(scripts / 'export_car_feeds.py'),
                                 '--config', str(config), '--list-outputs'],
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), str(self.job.output))
        self.assertEqual(self.job.input.read_bytes(), before)
        result = subprocess.run([sys.executable, str(scripts / 'export_car_feeds.py'),
                                 'unknown', '--config', str(config)], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 1)
        self.assertIn('unknown exports', result.stderr)


if __name__ == '__main__':
    unittest.main()
