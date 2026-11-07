import importlib.util
import io
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location('cdn_ssh', Path(__file__).with_name('cdn_ssh.py'))
cdn = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = cdn
SPEC.loader.exec_module(cdn)


class TransferTests(unittest.TestCase):
    def transfer(self, results, **kwargs):
        with patch.object(cdn.subprocess, 'run', side_effect=results) as run, \
                patch.object(cdn.random, 'randint', side_effect=lambda low, high: low), \
                patch.object(cdn.time, 'sleep') as sleep, redirect_stdout(io.StringIO()):
            status = cdn.retry_transfer(['rsync', 'fixture'], 'fixture', **kwargs)
        return status, run.call_count, [call.args[0] for call in sleep.call_args_list]

    @staticmethod
    def result(status, output=''):
        return subprocess.CompletedProcess([], status, output)

    def test_network_failure_retries_then_succeeds(self):
        status, attempts, sleeps = self.transfer([
            self.result(255, 'Connection closed by host port 22'),
            self.result(12, 'rsync: connection unexpectedly closed'), self.result(0),
        ])
        self.assertEqual((status, attempts, sleeps), (0, 3, [0, 20, 40]))

    def test_retries_stop_after_four_attempts(self):
        status, attempts, sleeps = self.transfer([self.result(255, 'Connection timed out')] * 4)
        self.assertEqual((status, attempts, sleeps), (255, 4, [0, 20, 40, 90]))

    def test_rsync_inactivity_timeout_retries(self):
        self.assertEqual(self.transfer([self.result(30), self.result(0)])[:2], (0, 2))

    def test_authentication_host_key_and_storage_errors_fail_immediately(self):
        for message in ['Permission denied (publickey)', 'Host key verification failed.',
                        'REMOTE HOST IDENTIFICATION HAS CHANGED!', 'No space left on device',
                        'Disk quota exceeded', 'protocol version mismatch', 'Unknown SSH failure']:
            with self.subTest(message=message):
                self.assertEqual(self.transfer([self.result(255, message)])[:2], (255, 1))

    def test_fatal_error_does_not_retry_even_when_connection_also_closes(self):
        self.assertEqual(self.transfer([
            self.result(255, 'Permission denied\nConnection closed by remote host')
        ])[:2], (255, 1))

    def test_missing_site_is_allowed_only_for_manifest_download(self):
        result = self.result(12, cdn.SITE_MISSING + '\nrsync: connection unexpectedly closed')
        self.assertEqual(self.transfer([result], allow_missing_site=True)[:2], (0, 1))
        self.assertEqual(self.transfer([result] * 4)[:2], (12, 4))

    def test_missing_base_is_a_configuration_error(self):
        result = self.result(12, cdn.BASE_MISSING + '\nrsync: connection unexpectedly closed')
        self.assertEqual(self.transfer([result], allow_missing_site=True)[:2], (12, 1))

    def test_other_missing_files_are_not_treated_as_an_empty_mirror(self):
        result = self.result(23, 'rsync: opendir failed: No such file or directory')
        self.assertEqual(self.transfer([result], allow_missing_site=True)[:2], (23, 1))


class ConfigurationTests(unittest.TestCase):
    def environment(self, **overrides):
        return {'CDN_SSH_HOST': 'cdn.test', 'CDN_SSH_USER': 'fixture',
                'CDN_SSH_KNOWN_HOSTS': 'cdn.test ssh-ed25519 fixture', **overrides}

    def test_requires_a_pinned_host_key(self):
        with patch.dict(os.environ, self.environment(CDN_SSH_KNOWN_HOSTS=''), clear=True):
            with self.assertRaisesRegex(ValueError, 'CDN_SSH_KNOWN_HOSTS'):
                cdn.Config.from_env()

    def test_rejects_invalid_connection_settings(self):
        for settings in [{'CDN_SSH_HOST': '-oProxyCommand=bad'}, {'CDN_SSH_USER': 'bad user'},
                         {'CDN_SSH_PORT': '0'}, {'CDN_REMOTE_PATH': 'bad\npath'}]:
            with self.subTest(settings=settings), patch.dict(os.environ, self.environment(**settings), clear=True):
                with self.assertRaises(ValueError):
                    cdn.Config.from_env()

    def test_transport_pins_host_and_configures_timeouts_without_network_scans(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            key = directory / 'identity'
            subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(key)], check=True)
            public = key.with_suffix('.pub').read_text().split()
            env = self.environment(CDN_SSH_KNOWN_HOSTS=f'cdn.test {public[0]} {public[1]}',
                                   CDN_SSH_KEY_PATH=str(key), CDN_SSH_PORT='22')
            with patch.dict(os.environ, env, clear=True):
                config = cdn.Config.from_env()
                with cdn.ssh_transport(config) as transport:
                    args = shlex.split(transport)
                    self.assertIn('StrictHostKeyChecking=yes', args)
                    self.assertIn('ConnectTimeout=15', args)
                    self.assertIn('ServerAliveCountMax=3', args)
                    self.assertIn('GlobalKnownHostsFile=/dev/null', args)
                    pinned = Path(next(value.split('=', 1)[1] for value in args if value.startswith('UserKnownHostsFile=')))
                    self.assertEqual(pinned.read_text().strip(), env['CDN_SSH_KNOWN_HOSTS'])
                self.assertFalse(pinned.exists())
                self.assertTrue(key.exists())

    def test_rejects_a_pin_for_another_host_before_using_identity(self):
        with patch.dict(os.environ, self.environment(CDN_SSH_KNOWN_HOSTS='other.test ssh-ed25519 fixture'), clear=True):
            with self.assertRaisesRegex(ValueError, 'configured CDN host and port'):
                with cdn.ssh_transport(cdn.Config.from_env()):
                    self.fail('incorrect pin was accepted')


class CommandTests(unittest.TestCase):
    def config(self, base):
        return cdn.Config('cdn.test', 'fixture', 2222, str(base), 'pin', '', 'identity')

    def test_download_checks_missing_site_in_the_same_remote_rsync_session(self):
        with tempfile.TemporaryDirectory(prefix='cdn fixture ') as directory:
            root = Path(directory)
            base = root / "remote base's directory"
            base.mkdir()
            local = root / 'local'
            with patch.dict(os.environ, {'DOMAIN': 'https://site.test/'}), \
                    patch.object(cdn, 'retry_transfer', return_value=0) as transfer:
                cdn.download_manifests(self.config(base), 'ssh fixture', local)
            command = transfer.call_args.args[0]
            self.assertIn('--include=manifest.json', command)
            self.assertIn('--exclude=*', command)
            self.assertIn('--protect-args', command)
            self.assertEqual(command[-2], f'fixture@cdn.test:{base}/site.test/')
            preflight = next(arg.split('=', 1)[1] for arg in command if arg.startswith('--rsync-path='))
            script = shlex.split(preflight)
            result = subprocess.run(script + ['--version'], capture_output=True, text=True)
            self.assertEqual(result.returncode, 73)
            self.assertEqual(result.stderr.strip(), cdn.SITE_MISSING)
            (base / 'site.test').mkdir()
            result = subprocess.run(script + ['--version'], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0)
            (base / 'site.test').rmdir()
            base.rmdir()
            result = subprocess.run(script + ['--version'], capture_output=True, text=True)
            self.assertEqual(result.returncode, 72)
            self.assertEqual(result.stderr.strip(), cdn.BASE_MISSING)

    def test_upload_dry_run_preserves_destination_and_never_deletes(self):
        with patch.object(cdn, 'retry_transfer', return_value=0) as transfer:
            cdn.upload(self.config('/mirror/cars'), 'ssh fixture', Path('tmp/mirror'), True)
        command = transfer.call_args.args[0]
        self.assertIn('--dry-run', command)
        self.assertNotIn('--delete', command)
        self.assertEqual(command[-2:], ['tmp/mirror/', 'fixture@cdn.test:/mirror/cars/'])

    def test_invalid_domain_stops_before_any_transfer(self):
        with patch.dict(os.environ, {'DOMAIN': ''}), patch.object(cdn, 'retry_transfer') as transfer:
            with self.assertRaises(ValueError):
                cdn.download_manifests(self.config('/mirror'), 'ssh fixture', Path('tmp'))
            transfer.assert_not_called()

    def test_empty_upload_does_not_require_credentials_or_open_connections(self):
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(sys, 'argv', ['cdn_ssh.py', 'upload', directory]), \
                patch.dict(os.environ, {}, clear=True), \
                patch.object(cdn, 'ssh_transport') as transport, redirect_stdout(io.StringIO()):
            self.assertEqual(cdn.main(), 0)
            transport.assert_not_called()


if __name__ == '__main__':
    unittest.main()
