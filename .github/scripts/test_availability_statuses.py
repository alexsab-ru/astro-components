"""Check the status producers changed by the TitleCase commit, without network I/O."""
import os
import tempfile
import unittest
import xml.etree.ElementTree as ET
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest.mock import patch

original_cwd = Path.cwd()
with tempfile.TemporaryDirectory() as import_dir:
    try:
        os.chdir(import_dir)
        with redirect_stdout(StringIO()):
            from CarFeedProcessorCSV import CarFeedProcessorCSV
            from update_cars import CarProcessor
            from update_cars_air_storage import process_car
    finally:
        os.chdir(original_cwd)


class AvailabilityStatusTests(unittest.TestCase):
    def setUp(self):
        self.old_cwd = Path.cwd()
        self.tmp = self.enterContext(tempfile.TemporaryDirectory())
        os.chdir(self.tmp)
        self.addCleanup(os.chdir, self.old_cwd)
        self.enterContext(patch.dict(os.environ, {}, clear=True))
        self.enterContext(redirect_stdout(StringIO()))
        self.processor = CarProcessor()
        self.processor.show_only_available_cars = True

    def test_csv_statuses_survive_conversion_and_filtering_in_both_formats(self):
        for feed, source_type, car_path, tag in (
            ('yandex', 'data_cars_car', './cars/car', 'availability'),
            ('avito', 'ads_ad', './Ad', 'Availability'),
        ):
            self.processor.update_source_type(source_type)
            for status, skip in (('В наличии', False), ('В пути', True)):
                for value in (status, status.lower(), status.upper()):
                    with self.subTest(feed=feed, status=value):
                        csv = CarFeedProcessorCSV(feed_type=feed)
                        csv.data = ['VIN,Наличие\n', f'TEST_VIN,{value}\n']
                        csv.process_data()
                        car = csv.xml_tree.find(car_path)
                        self.assertIsNotNone(car)
                        self.assertEqual(car.findtext(tag), value)
                        self.assertEqual(self.processor.should_skip_car_for_availability(car), skip)

    def test_csv_default_status_is_titlecase_and_passes_the_filter(self):
        for feed, source_type, car_path, tag in (
            ('yandex', 'data_cars_car', './cars/car', 'availability'),
            ('avito', 'ads_ad', './Ad', 'Availability'),
        ):
            with self.subTest(feed=feed):
                csv = CarFeedProcessorCSV(feed_type=feed)
                # Lowercase header is accepted by row validation; the output uses its default.
                csv.data = ['VIN,availability\n', 'TEST_VIN,В наличии\n']
                csv.process_data()
                car = csv.xml_tree.find(car_path)
                self.assertEqual(car.findtext(tag), 'В наличии')
                self.processor.update_source_type(source_type)
                self.assertFalse(self.processor.should_skip_car_for_availability(car))

    def test_air_storage_duplicates_are_available_in_both_xml_formats(self):
        for source_type, vin_tag, availability_tag, id_tag in (
            ('ads_ad', 'VIN', 'Availability', 'Id'),
            ('data_cars_car', 'vin', 'availability', 'unique_id'),
        ):
            with self.subTest(source_type=source_type):
                car = ET.Element('car')
                ET.SubElement(car, vin_tag).text = 'EDEJB31B5TE014832'
                ET.SubElement(car, availability_tag).text = 'В пути'
                ET.SubElement(car, id_tag).text = 'CME_77236613'
                config = {
                    'vin_tag': vin_tag, 'availability_tag': availability_tag,
                    'unique_id_tag': id_tag, 'color_tag': 'color', 'description_tag': 'description',
                }
                duplicates = []
                process_car(car, config, duplicates, {'EDEJB31B5TE014832': 2}, [], {})
                self.assertEqual(len(duplicates), 2)
                self.assertEqual(car.findtext(availability_tag), 'В пути')
                self.processor.update_source_type(source_type)
                self.assertTrue(self.processor.should_skip_car_for_availability(car))
                for duplicate in duplicates:
                    self.assertEqual(duplicate.findtext(availability_tag), 'В наличии')
                    self.assertFalse(self.processor.should_skip_car_for_availability(duplicate))


if __name__ == '__main__':
    unittest.main()
