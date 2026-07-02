#!/usr/bin/env python
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path

bs4_module = types.ModuleType('bs4')
bs4_module.BeautifulSoup = object
sys.modules.setdefault('bs4', bs4_module)

from utils import get_redirect_target_for_car_url


class CarRedirectRoutesTest(unittest.TestCase):
    def test_finds_redirect_for_car_url_with_or_without_trailing_slash(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            routes_path = Path(tmp_dir) / 'routes.json'
            routes_path.write_text(
                json.dumps(
                    {
                        'redirects': {
                            '/cars/geely-atlas/': '/cars/',
                        }
                    }
                ),
                encoding='utf-8',
            )

            self.assertEqual(
                get_redirect_target_for_car_url('/cars/geely-atlas', str(routes_path)),
                '/cars/',
            )
            self.assertEqual(
                get_redirect_target_for_car_url('/cars/geely-atlas/', str(routes_path)),
                '/cars/',
            )

    def test_missing_routes_file_does_not_report_redirect(self):
        self.assertIsNone(
            get_redirect_target_for_car_url('/cars/geely-atlas/', '/tmp/missing-routes.json')
        )


if __name__ == '__main__':
    unittest.main()
