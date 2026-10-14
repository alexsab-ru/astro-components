"""Destination exports: source readers -> destination rules -> format writers.

No dependency on inventory processing, thumbnails, settings or network access.
"""
import json
import os
import re
import tempfile
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Callable, Dict, List, Mapping, Tuple
from urllib.parse import urlsplit

DEFAULT_CONFIG = Path(__file__).with_name('car_feed_exports.json')


@dataclass(frozen=True)
class Vehicle:
    fields: Mapping[str, str]
    images: Tuple[str, ...]


@dataclass(frozen=True)
class ExportJob:
    id: str
    destination: str
    format: str
    input_format: str
    input: Path
    output: Path
    category: str


@dataclass(frozen=True)
class PreparedVehicle:
    fields: Mapping[str, str]
    images: Tuple[str, ...]


@dataclass(frozen=True)
class Destination:
    formats: Tuple[str, ...]
    prepare: Callable
    identify: Callable[[Vehicle], str]


def read_data_cars_car(path: Path) -> List[Vehicle]:
    root = ET.parse(path).getroot()
    if root.tag != 'data' or root.find('cars') is None:
        raise ValueError(f'{path}: expected <data><cars><car>')
    return [Vehicle(
        {child.tag: (child.text or '').strip() for child in car if child.tag != 'images'},
        tuple((image.text or '').strip() for image in car.findall('./images/image')),
    ) for car in root.findall('./cars/car')]


def serialize_data_cars_car(cars: List[PreparedVehicle]) -> bytes:
    root = ET.Element('data')
    container = ET.SubElement(root, 'cars')
    for record in cars:
        car = ET.SubElement(container, 'car')
        for key, value in record.fields.items():
            ET.SubElement(car, key).text = value
        images = ET.SubElement(car, 'images')
        for url in record.images:
            ET.SubElement(images, 'image').text = url
    ET.indent(root, space='  ')
    return ET.tostring(root, encoding='utf-8', xml_declaration=True) + b'\n'


VK_COLORS = set('бежевый белый голубой желтый зеленый золотой коричневый красный '
                'оранжевый пурпурный розовый серебряный серый синий фиолетовый черный'.split())
VK_COLOR_ALIASES = {
    'серебристый': 'серебряный', 'темно-синий': 'синий', 'тёмно-синий': 'синий',
    'серо-голубой': 'голубой',
}
VK_BODY_TYPES = set('Кабриолет|Компактвэн|Купе|Купе-хардтоп|Фастбек|Фургон|Хэтчбек|'
                    'Ландо|Лифтбек|Лимузин|Микровэн|Минивэн|Внедорожник|Фаэтон-универсал|'
                    'Пикап|Родстер|Седан|Тарга|Седан-хардтоп|Спидстер|Внедорожник открытый|'
                    'Универсал|Фаэтон'.split('|'))
VK_STATES = {'отличное', 'хорошее', 'среднее', 'требует ремонта', 'другое'}
VK_CURRENCIES = {'RUR', 'RUB', 'USD', 'EUR', 'UAH', 'BYN', 'KZT', 'MDL',
                 'AZN', 'UZS', 'AMD', 'TJS', 'KGS'}
VK_OWNERS = {
    '0': 'Не было владельцев', '1': 'Один владелец', '2': 'Два владельца',
    '3': 'Три владельца', '4': 'Четыре и более',
}
VK_AVAILABILITY = {
    'в наличии': 'В наличии', 'на заказ': 'На заказ', 'в пути': 'На заказ',
}


def is_http_url(value: str) -> bool:
    try:
        parts = urlsplit(value)
        return parts.scheme in ('http', 'https') and bool(parts.hostname) and not any(
            char.isspace() for char in value)
    except ValueError:
        return False


def positive_price(value: str) -> str:
    # Reject NaN/Infinity, exponent notation, currencies and decimal commas.
    if not re.fullmatch(r'[0-9]+(?:\.[0-9]+)?', value) or Decimal(value) <= 0:
        raise ValueError('price: expected a positive number with decimal point')
    return format(Decimal(value), 'f')


def compact_description(fields: Mapping[str, str], output: Mapping[str, str]) -> str:
    description = ' '.join(fields.get('description', '').split())
    if description and len(description) <= 256 and not description.isupper() and not description.islower() and '<' not in description:
        return description
    # Compose a factual short description instead of cutting promotional/legal prose.
    details = [f"{output['mark_id']} {output['folder_id']}"]
    for key in ('complectation_name', 'modification_id'):
        if fields.get(key):
            details.append(fields[key])
    details.append(f"{output['year']} г.")
    if output.get('color'):
        details.append(output['color'])
    value = ', '.join(details)
    if len(value) > 256:
        value = value[:255].rstrip() + '…'
    # Even an all-uppercase source brand gets a mixed-case sentence.
    return ('Автомобиль ' + value)[:256]


def identify_vk(vehicle: Vehicle) -> str:
    return vehicle.fields.get('unique_id') or vehicle.fields.get('vin', '')


def prepare_vk(vehicle: Vehicle, category: str, identities: Counter) -> Tuple[PreparedVehicle, List[str], List[str]]:
    source = vehicle.fields
    errors, warnings = [], []
    output: Dict[str, str] = {}
    identity = identify_vk(vehicle)
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', identity):
        errors.append('unique_id: missing or invalid identifier')
    elif identities[identity] > 1:
        errors.append('unique_id: duplicate identifier in source; all conflicting records excluded')
    output['unique_id'] = identity
    for key in ('url', 'mark_id', 'folder_id', 'year', 'vin'):
        value = source.get(key, '')
        if not value:
            errors.append(f'{key}: required field is missing')
        elif key in ('mark_id', 'folder_id', 'year') and len(value) > 256:
            errors.append(f'{key}: exceeds 256 characters')
        output[key] = value
    if output['url'] and not is_http_url(output['url']):
        errors.append('url: expected an absolute HTTP(S) URL')
    # Native inventory convention: sale_price/priceWithDiscount are final prices.
    price = source.get('sale_price') or source.get('priceWithDiscount') or source.get('price', '')
    try:
        output['price'] = positive_price(price)
        if source.get('sale_price') and source.get('priceWithDiscount'):
            other = positive_price(source['priceWithDiscount'])
            if Decimal(output['price']) != Decimal(other):
                errors.append('price: sale_price and priceWithDiscount disagree')
    except ValueError as error:
        errors.append(str(error))
    currency = source.get('currency', '').upper()
    if currency not in VK_CURRENCIES:
        errors.append('currency: missing or unsupported currency')
    output['currency'] = currency
    owner_value = source.get('owners_number', '')
    owners = VK_OWNERS.get(owner_value, owner_value)
    if category == 'new' and not owners:
        owners = VK_OWNERS['0']
    allowed = {VK_OWNERS['0']} if category == 'new' else set(VK_OWNERS.values()) - {VK_OWNERS['0']}
    if owners not in allowed:
        errors.append('owners_number: missing, invalid or inconsistent with category')
    output['owners_number'] = owners
    images = tuple(dict.fromkeys(url for url in vehicle.images if is_http_url(url)))
    if len(images) < len(vehicle.images):
        warnings.append('images: invalid URLs or repeated images removed')
    if not images:
        errors.append('images/image: at least one HTTP(S) image URL is required')
    if errors:
        return PreparedVehicle(output, images), errors, warnings
    color = source.get('color', '').lower().replace('ё', 'е')
    color = VK_COLOR_ALIASES.get(color, color)
    if color in VK_COLORS:
        output['color'] = color
    elif color:
        warnings.append('color: unsupported optional value omitted')
    availability = source.get('availability', '').lower()
    if availability in VK_AVAILABILITY:
        output['availability'] = VK_AVAILABILITY[availability]
    elif availability:
        warnings.append('availability: unsupported optional value omitted')
    body = source.get('body_type', '')
    canonical_body = next((v for v in VK_BODY_TYPES if v.casefold() == body.casefold()), None)
    if canonical_body:
        output['body_type'] = canonical_body
    elif body:
        warnings.append('body_type: unsupported optional value omitted')
    state = source.get('state', '').lower()
    if state in VK_STATES:
        output['state'] = state
    elif state:
        warnings.append('state: unsupported optional value omitted')
    run = source.get('run', '')
    if re.fullmatch(r'[0-9]+', run):
        output['run'] = str(int(run))
    elif run:
        warnings.append('run: invalid optional mileage omitted')
    output['description'] = compact_description(source, output)
    for key in ('poi_id', *(f'custom_label_{i}' for i in range(5))):
        if source.get(key) and len(source[key]) <= 256:
            output[key] = source[key]
        elif source.get(key):
            warnings.append(f'{key}: exceeds 256 characters; optional field omitted')
    return PreparedVehicle(output, images), errors, warnings


# New formats and destinations are registered here; the runner stays unchanged.
READERS = {'data_cars_car': read_data_cars_car}
WRITERS = {'data_cars_car': serialize_data_cars_car}
DESTINATIONS = {'vk': Destination(('data_cars_car',), prepare_vk, identify_vk)}


def load_jobs(config_path: Path = DEFAULT_CONFIG) -> List[ExportJob]:
    config = json.loads(config_path.read_text(encoding='utf-8'))
    if not isinstance(config, dict) or set(config) != {'version', 'exports'} or config['version'] != 1 or not isinstance(config['exports'], list):
        raise ValueError('export config: expected version 1 and an exports array')
    jobs = []
    expected = {'id', 'destination', 'format', 'input_format', 'input', 'output', 'category'}
    for index, entry in enumerate(config['exports']):
        prefix = f'exports[{index}]'
        if not isinstance(entry, dict) or set(entry) != expected or not all(isinstance(v, str) and v for v in entry.values()):
            raise ValueError(f'{prefix}: expected nonempty strings for {sorted(expected)}')
        if not re.fullmatch(r'[a-z][a-z0-9_]*', entry['id']):
            raise ValueError(f'{prefix}.id: use lowercase letters, digits and underscores')
        if entry['destination'] not in DESTINATIONS:
            raise ValueError(f'{prefix}.destination: unsupported destination')
        if entry['format'] not in WRITERS or entry['format'] not in DESTINATIONS[entry['destination']].formats:
            raise ValueError(f'{prefix}.format: unsupported destination/format combination')
        if entry['input_format'] not in READERS:
            raise ValueError(f'{prefix}.input_format: unsupported source format')
        if entry['category'] not in ('new', 'used'):
            raise ValueError(f'{prefix}.category: expected new or used')
        jobs.append(ExportJob(**{**entry, 'input': Path(entry['input']), 'output': Path(entry['output'])}))
    if len({job.id for job in jobs}) != len(jobs):
        raise ValueError('export config: duplicate export id')
    inputs = {job.input.resolve() for job in jobs}
    outputs = [job.output.resolve() for job in jobs]
    if len(set(outputs)) != len(outputs) or inputs.intersection(outputs):
        raise ValueError('export config: outputs must be distinct and must not overwrite any input')
    return jobs


def atomic_write(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=f'.{path.name}.', delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(content)
        temporary.chmod(0o644)
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def export_job(job: ExportJob, report_dir: Path = Path('tmp/feed_exports')) -> dict:
    if job.input.resolve() == job.output.resolve():
        raise ValueError('export must not overwrite its input')
    vehicles = READERS[job.input_format](job.input)
    destination = DESTINATIONS[job.destination]
    identities = Counter(destination.identify(vehicle) for vehicle in vehicles)
    records, issues = [], []
    for index, vehicle in enumerate(vehicles, 1):
        prepared, errors, warnings = destination.prepare(vehicle, job.category, identities)
        if errors or warnings:
            issues.append({'record': index, 'id': destination.identify(vehicle),
                           'errors': errors, 'warnings': warnings})
        if not errors:
            records.append(prepared)
    report = {'export': job.id, 'input': str(job.input), 'output': str(job.output),
              'total': len(vehicles), 'exported': len(records), 'excluded': len(vehicles) - len(records),
              'issues': issues}
    # Empty valid inventories are published too, so removed cars do not remain advertised.
    content = WRITERS[job.format](records)
    atomic_write(report_dir / f'{job.id}.json', (json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    atomic_write(job.output, content)
    print(f"{job.id}: {report['exported']}/{report['total']} exported, {report['excluded']} excluded -> {job.output}")
    if report['excluded']:
        print(f"Validation report: {report_dir / (job.id + '.json')}")
    return report


def export_for_source(source: Path, config_path: Path = DEFAULT_CONFIG) -> List[dict]:
    """Only regenerate exports whose configured input was actually updated."""
    return [export_job(job) for job in load_jobs(config_path) if job.input.resolve() == source.resolve()]


def run_exports(config_path: Path = DEFAULT_CONFIG, export_ids: Tuple[str, ...] = ()) -> List[dict]:
    jobs = load_jobs(config_path)
    unknown = set(export_ids) - {job.id for job in jobs}
    if unknown:
        raise ValueError(f'unknown exports: {sorted(unknown)}')
    return [export_job(job) for job in jobs if not export_ids or job.id in export_ids]
