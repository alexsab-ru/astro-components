#!/usr/bin/env python
from contextlib import redirect_stdout
from io import StringIO
import unittest
import xml.etree.ElementTree as ET

# utils сообщает о недостающих generated data через stdout при импорте.
# В этом локальном тесте generated data не нужны, поэтому скрываем только этот ожидаемый вывод.
with redirect_stdout(StringIO()):
    from utils import duplicate_car, increment_str, increment_unique_id


class IncrementUniqueIdTests(unittest.TestCase):
    """Проверяет выбор алгоритма без обращения к XML и внешним сервисам."""

    def test_increments_numeric_suffix_after_formatted_prefix(self):
        self.assertEqual(increment_unique_id('CME_77236613', 1), 'CME_77236614')

    def test_preserves_numeric_suffix_width(self):
        self.assertEqual(increment_unique_id('CME_0009', 1), 'CME_0010')
        self.assertEqual(increment_unique_id('0009', 1), '0010')

    def test_preserves_legacy_algorithm_for_old_format(self):
        legacy_id = 'abc129'
        self.assertEqual(
            increment_unique_id(legacy_id, 1),
            increment_str(legacy_id, 1),
        )

    def test_increments_mixed_id_and_preserves_separators(self):
        self.assertEqual(increment_unique_id('CME_AB9Z', 1), 'CME_AC0A')
        self.assertEqual(increment_unique_id('CME_AB9Z', 2), 'CME_AC0B')

    def test_duplicate_car_increments_formatted_ids(self):
        car = ET.fromstring(
            '<Car>'
            '<Id>CME_77236613</Id>'
            '<VIN>EDEJB31B5TE014832</VIN>'
            '<Availability>в наличии</Availability>'
            '</Car>',
        )
        config = {
            'unique_id_tag': 'Id',
            'vin_tag': 'VIN',
            'availability_tag': 'Availability',
        }

        # duplicate_car печатает диагностические значения в штатном режиме.
        # Тест подавляет только stdout. Исключения по-прежнему завершают тест с ошибкой.
        with redirect_stdout(StringIO()):
            duplicates = duplicate_car(car, config, 2)

        self.assertEqual(
            [duplicate.findtext('Id') for duplicate in duplicates],
            ['CME_77236614', 'CME_77236615'],
        )
        self.assertEqual(
            [duplicate.findtext('VIN') for duplicate in duplicates],
            ['EDEJB31B5TE014833', 'EDEJB31B5TE014834'],
        )
        self.assertEqual(
            [duplicate.findtext('Availability') for duplicate in duplicates],
            ['в пути', 'в пути'],
        )


if __name__ == '__main__':
    unittest.main()
