#!/usr/bin/env python3
"""Transfer image mirrors using a pinned SSH host key and bounded network retries."""

import argparse
from contextlib import contextmanager
from dataclasses import dataclass
import os
from pathlib import Path
import random
import re
import shlex
import subprocess
import sys
import tempfile
import time
from urllib.parse import urlsplit


RETRY_DELAYS = ((20, 40), (40, 60), (90, 120))
SITE_MISSING = 'CDN_MIRROR_SITE_MISSING'
BASE_MISSING = 'CDN_MIRROR_BASE_MISSING'
FATAL_ERROR = re.compile(
    r'permission denied|host key verification failed|remote host identification has changed|'
    r'bad owner or permissions|invalid format|error in libcrypto|incorrect passphrase|'
    r'no space left|disk quota exceeded|read-only file system|protocol version mismatch|'
    r'command not found|no such identity', re.I
)
NETWORK_ERROR = re.compile(
    r'timed out|connection (?:reset|closed|refused)|connection unexpectedly closed|'
    r'network is unreachable|no route to host|broken pipe|temporary failure in name resolution', re.I
)


@dataclass
class Config:
    host: str
    user: str
    port: int
    remote_base: str
    known_hosts: str
    private_key: str
    key_path: str

    @classmethod
    def from_env(cls):
        host = os.environ.get('CDN_SSH_HOST', '')
        user = os.environ.get('CDN_SSH_USER', '')
        port = int(os.environ.get('CDN_SSH_PORT') or '22')
        if not re.fullmatch(r'[a-zA-Z0-9_.:-]+', host) or host.startswith('-'):
            raise ValueError('CDN_SSH_HOST is missing or invalid')
        if not re.fullmatch(r'[a-zA-Z_][a-zA-Z0-9_.-]*', user):
            raise ValueError('CDN_SSH_USER is missing or invalid')
        if not 1 <= port <= 65535:
            raise ValueError('CDN_SSH_PORT is invalid')
        known_hosts = os.environ.get('CDN_SSH_KNOWN_HOSTS', '').replace('\\n', '\n').replace('\r', '').strip()
        if not known_hosts:
            raise ValueError('CDN_SSH_KNOWN_HOSTS is required; configure the verified server public key')
        remote_base = os.environ.get('CDN_REMOTE_PATH') or '.'
        if any(character in remote_base for character in '\r\n\0'):
            raise ValueError('CDN_REMOTE_PATH is invalid')
        return cls(host, user, port, remote_base.rstrip('/') or '/', known_hosts,
                   os.environ.get('CDN_SSH_PRIVATE_KEY', ''), os.environ.get('CDN_SSH_KEY_PATH', ''))

    def remote(self, path):
        host = f'[{self.host}]' if ':' in self.host else self.host
        return f'{self.user}@{host}:{path}'


@contextmanager
def ssh_transport(config):
    with tempfile.TemporaryDirectory(prefix='cdn-ssh-', dir=os.environ.get('RUNNER_TEMP') or None) as directory:
        directory = Path(directory)
        known_hosts = directory / 'known_hosts'
        known_hosts.write_text(config.known_hosts + '\n')
        host_lookup = config.host if config.port == 22 else f'[{config.host}]:{config.port}'
        result = subprocess.run(['ssh-keygen', '-F', host_lookup, '-f', str(known_hosts)],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if result.returncode:
            raise ValueError('Pinned known_hosts does not contain the configured CDN host and port')
        if config.private_key:
            identity = directory / 'identity'
            identity.write_text(config.private_key.replace('\\n', '\n').replace('\r', '').rstrip() + '\n')
            identity.chmod(0o600)
        elif config.key_path:
            identity = Path(config.key_path).expanduser().resolve()
            if not identity.is_file():
                raise ValueError('CDN_SSH_KEY_PATH file not found')
        else:
            raise ValueError('CDN_SSH_PRIVATE_KEY or CDN_SSH_KEY_PATH is required')
        result = subprocess.run(['ssh-keygen', '-y', '-P', '', '-f', str(identity)],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if result.returncode:
            raise ValueError('CDN SSH identity is not a valid unencrypted private key')
        yield shlex.join([
            'ssh', '-F', '/dev/null', '-p', str(config.port), '-i', str(identity),
            '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
            '-o', 'StrictHostKeyChecking=yes', '-o', f'UserKnownHostsFile={known_hosts}',
            '-o', 'GlobalKnownHostsFile=/dev/null', '-o', 'UpdateHostKeys=no',
            '-o', 'ConnectTimeout=15', '-o', 'ConnectionAttempts=1',
            '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3',
        ])


def retry_transfer(command, label, *, allow_missing_site=False):
    delay = random.randint(0, 20)
    print(f'[cdn-ssh] {label}: initial delay {delay}s', flush=True)
    time.sleep(delay)
    for attempt in range(1, len(RETRY_DELAYS) + 2):
        started = time.monotonic()
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        output = result.stdout or ''
        print(f'[cdn-ssh] {label}: attempt {attempt}/4, exit={result.returncode}, '
              f'duration={time.monotonic() - started:.1f}s', flush=True)
        if output:
            print(output, end='' if output.endswith('\n') else '\n', flush=True)
        if result.returncode == 0:
            return 0
        if allow_missing_site and SITE_MISSING in output.splitlines():
            print('[cdn-ssh] No remote mirror directory for this site yet; starting with empty manifests', flush=True)
            return 0
        if BASE_MISSING in output.splitlines():
            print('[cdn-ssh] Remote mirror base directory is missing; check CDN_REMOTE_PATH', flush=True)
            return result.returncode
        transient = result.returncode in (10, 30, 35) or NETWORK_ERROR.search(output)
        if FATAL_ERROR.search(output) or not transient or attempt > len(RETRY_DELAYS):
            print(f'[cdn-ssh] {label}: stopped; transfer was not completed', flush=True)
            return result.returncode
        delay = random.randint(*RETRY_DELAYS[attempt - 1])
        print(f'[cdn-ssh] {label}: temporary network failure; retrying in {delay}s', flush=True)
        time.sleep(delay)
    raise AssertionError('unreachable')


def download_manifests(config, transport, root):
    domain = os.environ.get('DOMAIN', '').strip()
    site = urlsplit(domain if '://' in domain else f'//{domain}').netloc
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_.:-]*', site):
        raise ValueError('DOMAIN is required to download image mirror manifests')
    remote_path = f'{config.remote_base.rstrip("/")}/{site}'
    destination = root / site
    destination.mkdir(parents=True, exist_ok=True)
    # Check both directories inside the rsync SSH session: no extra connection.
    # Only a missing site under an existing mirror base is a normal first run.
    preflight = (
        f'if ! test -d {shlex.quote(config.remote_base)}; then '
        f'echo {BASE_MISSING} >&2; exit 72; fi; '
        f'if ! test -r {shlex.quote(config.remote_base)} || ! test -x {shlex.quote(config.remote_base)}; then '
        'echo "Permission denied reading mirror base" >&2; exit 77; fi; '
        f'if ! test -e {shlex.quote(remote_path)}; then '
        f'echo {SITE_MISSING} >&2; exit 73; fi; exec rsync "$@"'
    )
    return retry_transfer([
        'rsync', '-rzO', '--no-perms', '--protect-args', '--timeout=120',
        '--prune-empty-dirs', '--itemize-changes',
        '--include=*/', '--include=manifest.json', '--exclude=*',
        f'--rsync-path=sh -c {shlex.quote(preflight)} cdn-rsync',
        '-e', transport, config.remote(remote_path + '/'), str(destination) + '/',
    ], 'download manifests', allow_missing_site=True)


def upload(config, transport, source, dry_run):
    command = ['rsync', '-rzO', '--no-perms', '--protect-args', '--timeout=120', '--itemize-changes']
    if dry_run:
        command.append('--dry-run')
    command.extend(['-e', transport, str(source).rstrip('/') + '/',
                    config.remote(config.remote_base.rstrip('/') + '/')])
    return retry_transfer(command, 'upload mirror')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['download-manifests', 'upload'])
    parser.add_argument('directory', nargs='?', type=Path, default=Path('tmp/image_mirror/cars'))
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    if args.action == 'upload' and not any(
        path.is_file() and (path.suffix == '.webp' or path.name == 'manifest.json')
        for path in args.directory.rglob('*')
    ):
        print('[cdn-ssh] No mirrored image files or manifests to upload', flush=True)
        return 0
    config = Config.from_env()
    with ssh_transport(config) as transport:
        if args.action == 'download-manifests':
            return download_manifests(config, transport, args.directory)
        return upload(config, transport, args.directory, args.dry_run)


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, OSError) as error:
        print(f'[cdn-ssh] Configuration or local file error: {error}', file=sys.stderr)
        sys.exit(2)
