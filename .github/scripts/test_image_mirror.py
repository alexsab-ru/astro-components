import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

import image_mirror


class DisabledSourceTests(unittest.TestCase):
    def test_skips_unmirrored_legacy_sources_without_network_requests(self):
        with tempfile.TemporaryDirectory() as directory:
            mirror = image_mirror.ImageMirror(image_mirror.MirrorConfig(
                site='example.test', category='new', local_root=Path(directory),
            ))
            with patch.object(image_mirror.requests, 'head') as head, \
                    patch.object(image_mirror.requests, 'get') as get:
                result = mirror.mirror_car_images('car', [
                    'https://CDN.ALEXSAB.RU:443/photo.jpg',
                    'http://cdn.alexsab.ru/another.jpg',
                ])
            head.assert_not_called()
            get.assert_not_called()
            self.assertEqual(result.images, [])
            self.assertEqual(result.changed_indexes, [])

    def test_keeps_saved_mirror_even_when_other_source_forces_full_probe(self):
        with tempfile.TemporaryDirectory() as directory:
            mirror = image_mirror.ImageMirror(image_mirror.MirrorConfig(
                site='example.test', category='new', local_root=Path(directory),
                probe_count=1, autoload_download_delay_seconds=0,
            ))
            legacy_url = 'https://cdn.alexsab.ru/saved.jpg'
            cdn = mirror.build_cdn_map('car', 1, 'saved-version')
            saved = {
                'index': 1, 'source_url': legacy_url, 'version': 'saved-version',
                'etag': 'saved-etag', 'generated_at': '2026-11-01', 'cdn': cdn,
            }
            image_mirror.atomic_write_json(mirror.manifest_local_path('car'), {
                'images': [saved],
            })
            with patch.object(image_mirror, 'inspect_remote_image', return_value={}) as inspect, \
                    patch.object(mirror, 'write_image_set', return_value=[]) as write:
                result = mirror.mirror_car_images('car', [
                    'https://working.example/new.jpg', legacy_url,
                    'https://cdn.alexsab.ru/unsaved.jpg',
                ])
            inspect.assert_called_once_with('https://working.example/new.jpg')
            write.assert_called_once_with('car', 0, 'https://working.example/new.jpg',
                                          image_mirror.source_signature('https://working.example/new.jpg', {}))
            self.assertEqual(result.images[1], cdn['full'])
            self.assertEqual(result.manifest['images'][1]['etag'], 'saved-etag')
            self.assertEqual(result.manifest['images'][1]['generated_at'], '2026-11-01')
            self.assertEqual(result.changed_indexes, [0])


if __name__ == '__main__':
    unittest.main()
