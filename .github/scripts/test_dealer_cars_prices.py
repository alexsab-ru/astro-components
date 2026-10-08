#!/usr/bin/env python
import os
import subprocess
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest.mock import patch

# Импортируем обработчик без чтения настоящих generated data сайта.
original_cwd = Path.cwd()
with tempfile.TemporaryDirectory() as import_dir:
    try:
        os.chdir(import_dir)
        with redirect_stdout(StringIO()):
            import utils
    finally:
        os.chdir(original_cwd)


class DealerCarsPricesTests(unittest.TestCase):
    def test_price_modes_with_lower_equal_and_higher_table_prices(self):
        for mode in (None, '', ' ', False, 'false', True, 'true', 'less', ' LESS '):
            for table_price in (1800000, 2000000, 2200000):
                with self.subTest(mode=mode, table_price=table_price):
                    car = {
                        'vin': 'TEST_VIN',
                        'priceWithDiscount': 2000000,
                        'sale_price': 2000000,
                        'max_discount': 100000,
                        'price': 2100000,
                    }
                    original = car.copy()
                    prices = {'TEST_VIN': {
                        'Конечная цена': table_price,
                        'Скидка': 300000,
                        'РРЦ': table_price + 300000,
                    }}
                    with redirect_stdout(StringIO()):
                        utils.update_car_prices(car, prices, mode)

                    should_update = mode in (True, 'true') or (
                        mode in ('less', ' LESS ') and table_price <= 2000000
                    )
                    expected = dict(original)
                    if should_update:
                        expected.update({
                            'priceWithDiscount': table_price,
                            'sale_price': table_price,
                            'max_discount': 300000,
                            'price': table_price + 300000,
                        })
                    self.assertEqual(car, expected)

    def test_unmatched_vin_or_incomplete_table_does_not_change_prices(self):
        for prices in ({}, {'TEST_VIN': {'Конечная цена': 1800000}}):
            for mode in (True, 'less'):
                with self.subTest(prices=prices, mode=mode):
                    car = {'vin': 'TEST_VIN', 'priceWithDiscount': 2000000}
                    original = car.copy()
                    with redirect_stdout(StringIO()):
                        utils.update_car_prices(car, prices, mode)
                    self.assertEqual(car, original)

    def test_config_modes_from_environment_dotenv_and_json(self):
        for source in ('environment', 'dotenv', 'json'):
            for raw, expected in (
                (None, False), ('', False), ('false', False),
                (False, False), ('true', True), (True, True),
                ('less', 'less'), (' LESS ', 'less'),
            ):
                if source != 'json' and isinstance(raw, bool):
                    continue
                with self.subTest(source=source, raw=raw):
                    values = {} if raw is None else {'DEALER_CARS_PRICE_OVERRIDE': raw}
                    with patch.dict(os.environ, values if source == 'environment' else {}, clear=True), \
                            patch.object(utils, '_load_dotenv_file', return_value=values if source == 'dotenv' else {}), \
                            patch.object(utils, '_load_env_json', return_value=values if source == 'json' else {}), \
                            redirect_stdout(StringIO()) as output:
                        config = utils.load_env_config('autoru', {'dealer_cars_price_override': False})
                    self.assertEqual(config['dealer_cars_price_override'], expected)
                    self.assertEqual(output.getvalue(), '')

    def test_empty_environment_disables_lower_priority_settings(self):
        with patch.dict(os.environ, {'DEALER_CARS_PRICE_OVERRIDE': ''}, clear=True), \
                patch.object(utils, '_load_dotenv_file', return_value={'DEALER_CARS_PRICE_OVERRIDE': 'true'}), \
                patch.object(utils, '_load_env_json', return_value={'DEALER_CARS_PRICE_OVERRIDE': 'less'}):
            config = utils.load_env_config('autoru', {'dealer_cars_price_override': False})
        self.assertIs(config['dealer_cars_price_override'], False)

    def test_invalid_modes_do_not_enable_override(self):
        for raw in ('invalid', '"less"', 1, [], {}):
            with self.subTest(raw=raw):
                with self.assertRaises(ValueError):
                    utils.normalize_dealer_cars_price_override(raw)
                with patch.dict(os.environ, {}, clear=True), \
                        patch.object(utils, '_load_dotenv_file', return_value={}), \
                        patch.object(utils, '_load_env_json', return_value={'DEALER_CARS_PRICE_OVERRIDE': raw}), \
                        redirect_stdout(StringIO()):
                    config = utils.load_env_config('autoru', {'dealer_cars_price_override': False})
                self.assertIs(config['dealer_cars_price_override'], False)


class DealerCarsPriceDownloadTests(unittest.TestCase):
    def test_shell_modes_without_network_or_site_data(self):
        script = Path(__file__).resolve().parent / 'sh/getDealerCarsPrice.sh'
        with tempfile.TemporaryDirectory() as tmp_dir:
            cwd = Path(tmp_dir)
            bin_dir = cwd / 'bin'
            bin_dir.mkdir()
            marker = cwd / 'node-called'
            node = bin_dir / 'node'
            node.write_text('#!/bin/sh\nprintf "%s\\n" "$OUTPUT_PATHS" > "$TEST_NODE_CALL"\n')
            node.chmod(0o755)
            # Старый прайс должен остаться безопасным при отключённом режиме.
            cached_price = cwd / 'src/data/site/dealer-cars_price.json'
            cached_price.parent.mkdir(parents=True)
            cached_price.write_text('{"cached": true}')

            for source in ('environment', 'dotenv', 'empty_environment'):
                for mode in (None, '', 'false', ' FALSE ', 'true', 'less', ' LESS ', 'invalid'):
                    with self.subTest(source=source, mode=mode):
                        marker.unlink(missing_ok=True)
                        dotenv = cwd / '.env'
                        dotenv.unlink(missing_ok=True)
                        env = {
                            'PATH': str(bin_dir) + os.pathsep + os.environ['PATH'],
                            'CSV_URL': 'https://example.invalid/prices.csv',
                            'TEST_NODE_CALL': str(marker),
                        }
                        if mode is not None:
                            if source == 'environment':
                                env['DEALER_CARS_PRICE_OVERRIDE'] = mode
                            else:
                                dotenv.write_text(f'DEALER_CARS_PRICE_OVERRIDE="{mode}"\n')
                        if source == 'empty_environment':
                            env['DEALER_CARS_PRICE_OVERRIDE'] = ''
                        result = subprocess.run(
                            ['bash', str(script)], cwd=cwd, env=env,
                            capture_output=True, text=True, timeout=10,
                        )
                        active = source != 'empty_environment'
                        self.assertEqual(result.returncode, 1 if active and mode == 'invalid' else 0, result.stdout)
                        self.assertEqual(marker.exists(), active and mode in ('true', 'less', ' LESS '))
                        if marker.exists():
                            self.assertEqual(marker.read_text().strip(), './src/data/site/dealer-cars_price.json')
                        self.assertEqual(cached_price.read_text(), '{"cached": true}')


if __name__ == '__main__':
    unittest.main()
