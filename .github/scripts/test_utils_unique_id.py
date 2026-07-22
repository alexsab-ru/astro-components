#!/usr/bin/env python
import unittest

from utils import increment_str, increment_unique_id


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


if __name__ == '__main__':
    unittest.main()
