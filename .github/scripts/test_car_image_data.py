#!/usr/bin/env python
from contextlib import redirect_stdout
from copy import deepcopy
from io import StringIO
from types import SimpleNamespace
import unittest
from unittest.mock import patch

with redirect_stdout(StringIO()):
    import utils
    import image_mirror


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


if __name__ == '__main__':
    unittest.main()
