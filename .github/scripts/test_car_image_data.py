#!/usr/bin/env python
from contextlib import redirect_stdout
from copy import deepcopy
from io import StringIO
import os
from pathlib import Path
import subprocess
from types import SimpleNamespace
import unittest
from unittest.mock import patch

with redirect_stdout(StringIO()):
    import utils
    import image_mirror
    import update_cars


class CarImageDataTests(unittest.TestCase):
    def setUp(self):
        self.image_sets = [
            {
                size: f'https://cdn.alexsab.ru/cars/example.test/new/test-car/{index}/{size}.webp'
                for size in ('full', 'large', 'medium', 'small', 'thumb')
            }
            for index in range(7)
        ]
        self.config = {
            'mirror_images': True,
            'skip_thumbs': False,
            'skip_check_thumb': True,
            'domain': 'example.test',
            'thumbs_dir': 'unused',
            'temp_thumbs_dir': 'unused',
            'count_thumbs': 5,
        }
        self.data = {
            'imageSets': deepcopy(self.image_sets),
            'images': [],
            'thumbs': [],
            'image': 'color-fallback.webp',
        }
        self.fallback = self.enterContext(
            patch.object(utils, '_get_color_fallback_image', return_value='color-fallback.webp')
        )
        self.mirror = self.enterContext(
            patch.object(image_mirror.ImageMirror, 'mirror_car_images')
        )

    def apply(self, incoming_images):
        utils._apply_car_images_to_data(
            self.data, incoming_images, 'test-car', {}, self.config, 'test-car'
        )

    def assert_saved_photos(self):
        self.assertEqual(self.data['imageSets'], self.image_sets)
        self.assertEqual(self.data['images'], [item['full'] for item in self.image_sets])
        self.assertEqual(self.data['thumbs'], [item['medium'] for item in self.image_sets[:5]])
        self.assertEqual(self.data['image'], self.image_sets[0]['medium'])
        self.fallback.assert_not_called()
        self.mirror.assert_not_called()

    def test_restores_saved_photos_when_feed_has_no_images(self):
        self.apply([])
        self.assert_saved_photos()

    def test_preserves_saved_photos_when_only_mirrored_urls_remain(self):
        self.data['images'] = [item['full'] for item in self.image_sets]
        self.apply(self.data['images'])
        self.assert_saved_photos()

    def test_new_source_images_still_use_mirror(self):
        source_url = 'https://source.example/photo.jpg'
        new_sets = self.image_sets[:1]
        self.mirror.return_value = SimpleNamespace(
            images=[new_sets[0]['full']], image_sets=new_sets,
            image=new_sets[0]['full'], thumbs=[new_sets[0]['medium']],
        )
        self.apply([source_url])
        self.mirror.assert_called_once_with('test-car', [source_url], 'test-car')
        self.assertEqual(self.data['imageSets'], new_sets)
        self.assertEqual(self.data['images'], [new_sets[0]['full']])
        self.assertEqual(self.data['image'], new_sets[0]['medium'])

    def test_skip_thumbs_explicitly_clears_all_photo_fields(self):
        self.config['skip_thumbs'] = True
        self.apply([])
        for key in ('images', 'imageSets', 'thumbs'):
            self.assertEqual(self.data[key], [])
        self.assertEqual(self.data['image'], 'color-fallback.webp')
        self.mirror.assert_not_called()

    def test_car_without_saved_photos_uses_color_fallback(self):
        self.data['imageSets'] = []
        self.apply([])
        for key in ('images', 'imageSets', 'thumbs'):
            self.assertEqual(self.data[key], [])
        self.assertEqual(self.data['image'], 'color-fallback.webp')
        self.fallback.assert_called_once()

    def test_non_mirror_images_replace_stale_image_sets(self):
        self.config['mirror_images'] = False
        source_url = 'https://source.example/photo.jpg'
        with patch.object(utils, '_filter_valid_image_urls', side_effect=lambda urls, vin: urls), \
             patch.object(utils, 'createThumbs', return_value=['preview.webp']):
            self.apply([source_url])
        self.assertEqual(self.data['imageSets'], [])
        self.assertEqual(self.data['images'], [source_url])
        self.assertEqual(self.data['image'], source_url)
        self.assertEqual(self.data['thumbs'], ['preview.webp'])
        self.mirror.assert_not_called()


class CarImageModeTests(unittest.TestCase):
    def setUp(self):
        self.enterContext(patch.dict(os.environ, {}, clear=True))
        self.dotenv = self.enterContext(patch.object(utils, '_load_dotenv_file', return_value={}))
        self.env_json = self.enterContext(patch.object(utils, '_load_env_json', return_value={}))

    def resolve(self, mirror_images=False, skip_thumbs=False):
        config = {'mirror_images': mirror_images, 'skip_thumbs': skip_thumbs}
        update_cars.configure_car_image_mode(config)
        return config['mirror_images'], config['skip_thumbs']

    def test_image_modes_from_environment_dotenv_and_json(self):
        for source in ('environment', 'dotenv', 'json'):
            for mode, expected in (
                (None, (False, True)),
                ('', (False, True)),
                ('false', (False, True)),
                ('true', (True, False)),
                ('thumbs_local', (False, False)),
            ):
                with self.subTest(source=source, mode=mode):
                    os.environ.pop('MIRROR_CAR_IMAGES', None)
                    self.dotenv.return_value = {}
                    self.env_json.return_value = {}
                    if mode is not None:
                        if source == 'environment':
                            os.environ['MIRROR_CAR_IMAGES'] = mode
                        elif source == 'dotenv':
                            self.dotenv.return_value = {'MIRROR_CAR_IMAGES': mode}
                        else:
                            self.env_json.return_value = {'MIRROR_CAR_IMAGES': mode}
                    self.assertEqual(self.resolve(), expected)

    def test_empty_environment_disables_lower_priority_mirror_settings(self):
        self.dotenv.return_value = {'MIRROR_CAR_IMAGES': 'true'}
        self.env_json.return_value = {'MIRROR_CAR_IMAGES': 'true'}
        os.environ['MIRROR_CAR_IMAGES'] = ''
        self.assertEqual(self.resolve(), (False, True))

    def test_explicit_cli_flags_override_image_mode(self):
        for mode in ('', 'false', 'true', 'thumbs_local'):
            with self.subTest(mode=mode):
                os.environ['MIRROR_CAR_IMAGES'] = mode
                self.assertEqual(self.resolve(mirror_images=True), (True, False))
                self.assertEqual(self.resolve(skip_thumbs=True), (False, True))
                self.assertEqual(self.resolve(mirror_images=True, skip_thumbs=True), (False, True))

    def test_workflow_selects_image_mode_without_processing_real_feeds(self):
        workflow_path = Path(__file__).resolve().parents[1] / 'workflows/update_cars.yml'
        workflow = utils.yaml.safe_load(workflow_path.read_text())
        step = next(step for step in workflow['jobs']['build']['steps'] if step.get('id') == 'generate_cars')
        # Capture pnpm arguments instead of launching feed processing or network requests.
        script = 'pnpm() { printf "%s\\n" "$@"; }\n' + step['run']
        for mode, expected in (
            (None, ['cars', 'auto', '--skip_thumbs']),
            ('', ['cars', 'auto', '--skip_thumbs']),
            ('false', ['cars', 'auto', '--skip_thumbs']),
            ('thumbs_local', ['cars', 'auto']),
            ('true', [
                'cars', 'auto', '--mirror_images',
                '--mirror_autoload_download_delay_seconds', '2',
                '--mirror_max_new_images_per_car', '0',
                '--mirror_avito_autoload_max_new_per_car', '1',
            ]),
        ):
            with self.subTest(mode=mode):
                env = {
                    'MIRROR_AUTOLOAD_DOWNLOAD_DELAY_SECONDS': '2',
                    'MIRROR_MAX_NEW_IMAGES_PER_CAR': '0',
                    'MIRROR_AVITO_AUTOLOAD_MAX_NEW_PER_CAR': '1',
                }
                if mode is not None:
                    env['MIRROR_CAR_IMAGES'] = mode
                result = subprocess.run(
                    ['/bin/bash', '-c', script], env=env,
                    capture_output=True, text=True, timeout=10,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout.splitlines(), expected)


if __name__ == '__main__':
    unittest.main()
