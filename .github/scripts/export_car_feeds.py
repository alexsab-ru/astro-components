#!/usr/bin/env python3
"""Export existing inventories without modifying cars.xml or generating MDX/images."""
import argparse
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from car_feed_exports import DEFAULT_CONFIG, load_jobs, run_exports


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('exports', nargs='*', help='Export IDs; omitted means all configured exports')
    parser.add_argument('--config', type=Path, default=DEFAULT_CONFIG)
    parser.add_argument('--list-outputs', action='store_true', help='List configured output paths without writing')
    args = parser.parse_args()
    try:
        if args.list_outputs:
            jobs = load_jobs(args.config)
            unknown = set(args.exports) - {job.id for job in jobs}
            if unknown:
                raise ValueError(f'unknown exports: {sorted(unknown)}')
            for job in jobs:
                if not args.exports or job.id in args.exports:
                    print(job.output)
        else:
            run_exports(args.config, tuple(args.exports))
    except (ValueError, OSError, ET.ParseError) as error:
        print(f'Car feed export failed: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
