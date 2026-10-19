"""Destination exports: source readers -> destination rules -> format writers.

No dependency on inventory processing, thumbnails, settings or network access.
"""
import json
import os
import re
import tempfile
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path
from typing import Callable, Dict, List, Mapping, Optional, Tuple
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
    defaults: Mapping[str, str] = field(default_factory=dict)
    defaults_file: Optional[Path] = None


@dataclass(frozen=True)
class PreparedVehicle:
    fields: Mapping[str, str]
    images: Tuple[str, ...]


@dataclass(frozen=True)
class Destination:
    formats: Mapping[str, Callable]
    identify: Callable[[Vehicle], str]


def read_data_cars_car(path: Path) -> List[Vehicle]:
    root = ET.parse(path).getroot()
    if root.tag != 'data' or root.find('cars') is None:
        raise ValueError(f'{path}: expected <data><cars><car>')
    def fields(element, prefix=''):
        result = {}
        for child in element:
            if child.tag == 'images':
                continue
            key = prefix + child.tag
            if len(child):
                result.update(fields(child, key + '.'))
            else:
                result[key] = (child.text or '').strip()
        return result

    return [Vehicle(fields(car), tuple((image.text or '').strip()
                    for image in car.findall('./images/image')))
            for car in root.findall('./cars/car')]


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
    sale_price = source.get('sale_price') or source.get('priceWithDiscount') or source.get('price', '')
    try:
        output['price'] = positive_price(source.get('price', ''))
        output['sale_price'] = positive_price(sale_price)
        if source.get('sale_price') and source.get('priceWithDiscount'):
            other = positive_price(source['priceWithDiscount'])
            if Decimal(output['sale_price']) != Decimal(other):
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
    benefit = source.get('max_discount', '')
    if re.fullmatch(r'[0-9]+(?:\.[0-9]+)?', benefit):
        output['max_benefit'] = format(Decimal(benefit), 'f')
    elif benefit:
        warnings.append('max_benefit: invalid optional max_discount omitted')
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


def serialize_channel_item(cars: List[PreparedVehicle]) -> bytes:
    root = ET.Element('channel')
    ET.SubElement(root, 'title').text = 'Автомобили'
    for record in cars:
        item = ET.SubElement(root, 'item')
        for key, value in record.fields.items():
            parent = item
            parts = key.split('.')
            for part in parts[:-1]:
                child = parent.find(part)
                if child is None:
                    child = ET.SubElement(parent, part)
                parent = child
            ET.SubElement(parent, parts[-1]).text = value
    ET.indent(root, space='  ')
    return ET.tostring(root, encoding='utf-8', xml_declaration=True) + b'\n'


CHANNEL_BODY_STYLES = {
    'кабриолет': 'convertible', 'купе': 'coupe', 'хэтчбек': 'hatchback',
    'минивэн': 'minivan', 'грузовик': 'truck', 'внедорожник': 'suv',
    'седан': 'sedan', 'фургон': 'van', 'универсал': 'wagon',
    'кроссовер': 'crossover', 'небольшой автомобиль': 'small_car', 'другое': 'other',
}
CHANNEL_CONDITIONS = {'отличное': 'excellent', 'хорошее': 'good', 'среднее': 'fair',
                      'требует ремонта': 'poor', 'другое': 'other'}
CHANNEL_VEHICLE_TYPES = {'автомобиль': 'car_truck', 'лодка': 'boat',
                         'коммерческий транспорт': 'commercial', 'мотоцикл': 'motorcycle',
                         'пауэрспорт': 'powersport', 'автодом': 'rv_camper',
                         'прицеп': 'trailer', 'другое': 'other'}
CHANNEL_OPTIONAL_FIELDS = (
    'description', 'exterior_color', 'mileage.value', 'mileage.unit', 'body_style',
    'vin', 'condition', 'sale_price', 'min_price', 'max_price', 'custom_label_0',
    'availability', 'vehicle_type', 'location.address', 'location.country',
    'location.region', 'location.locality', 'location.metro.name',
)


def prepare_vk_channel(vehicle: Vehicle, category: str, identities: Counter) -> Tuple[PreparedVehicle, List[str], List[str]]:
    source = vehicle.fields
    output, errors, warnings = {}, [], []
    identity = identify_vk(vehicle)
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', identity):
        errors.append('id: missing or invalid identifier')
    elif identities[identity] > 1:
        errors.append('id: duplicate identifier in source; all conflicting records excluded')
    output['id'] = identity
    for key, source_key in (('link', 'url'), ('brand', 'mark_id'), ('model', 'folder_id'), ('year', 'year')):
        value = source.get(source_key, '')
        if not value:
            errors.append(f'{key}: required field is missing')
        elif key != 'link' and len(value) > 256:
            errors.append(f'{key}: exceeds 256 characters')
        output[key] = value
    if output['link'] and not is_http_url(output['link']):
        errors.append('link: expected an absolute HTTP(S) URL')
    title = ' '.join(source.get(key, '') for key in ('mark_id', 'folder_id', 'complectation_name', 'year'))
    output['title'] = ' '.join(title.split())
    if len(output['title']) > 256:
        errors.append('title: exceeds 256 characters')
    if not source.get('complectation_name'):
        warnings.append('title: trim is unavailable in source')
    images = tuple(dict.fromkeys(url for url in vehicle.images if is_http_url(url)))
    if images:
        output['image_link'] = images[0]
    else:
        errors.append('image_link: at least one HTTP(S) image URL is required')
    if len(images) < len(vehicle.images):
        warnings.append('image_link: invalid URLs or repeated images removed')
    currency = source.get('currency', '').upper()
    if currency not in VK_CURRENCIES:
        errors.append('price: missing or unsupported currency')
    currency = 'RUB' if currency == 'RUR' else currency
    try:
        price = positive_price(source.get('price', ''))
        sale = positive_price(source.get('sale_price') or source.get('priceWithDiscount') or price)
        if source.get('sale_price') and source.get('priceWithDiscount') and Decimal(sale) != Decimal(positive_price(source['priceWithDiscount'])):
            errors.append('sale_price: sale_price and priceWithDiscount disagree')
        output['price'] = f'{price} {currency}'
        output['sale_price'] = f'{sale} {currency}'
        # A single vehicle's price range is its final discounted to regular price.
        for key, fallback in (('min_price', format(min(Decimal(sale), Decimal(price)), 'f')),
                              ('max_price', format(max(Decimal(sale), Decimal(price)), 'f'))):
            try:
                output[key] = f"{positive_price(source.get(key) or fallback)} {currency}"
            except ValueError:
                warnings.append(f'{key}: invalid optional price omitted')
        if 'min_price' in output and 'max_price' in output and Decimal(output['min_price'].split()[0]) > Decimal(output['max_price'].split()[0]):
            output.pop('min_price')
            output.pop('max_price')
            warnings.append('min_price/max_price: reversed optional range omitted')
    except ValueError as error:
        errors.append(str(error))
    state = source.get('state_of_vehicle', 'new' if category == 'new' else 'used').lower()
    state = {'новый': 'new', 'с пробегом': 'used', 'с пробегом сертифицированный': 'cpo'}.get(state, state)
    if state not in ({'new'} if category == 'new' else {'used', 'cpo'}):
        errors.append('state_of_vehicle: invalid or inconsistent with category')
    output['state_of_vehicle'] = state
    if errors:
        return PreparedVehicle(output, images), errors, warnings
    # Always factual: native VK descriptions prohibit advertising text and URLs.
    description_source = {**source, 'description': ''}
    output['description'] = compact_description(description_source, {
        'mark_id': output['brand'], 'folder_id': output['model'], 'year': output['year']})
    color = source.get('exterior_color') or source.get('color', '')
    if color and len(color) <= 256:
        output['exterior_color'] = color
    mileage = source.get('mileage.value') or source.get('run') or ('0' if category == 'new' else '')
    unit = source.get('mileage.unit', 'KM').upper()
    unit = {'КМ': 'KM', 'МИЛИ': 'MI'}.get(unit, unit)
    if re.fullmatch(r'[0-9]+', mileage) and unit in ('KM', 'MI'):
        output['mileage.value'] = str(int(mileage))
        output['mileage.unit'] = unit
    elif mileage:
        warnings.append('mileage: invalid value or unit omitted')
    body = (source.get('body_style') or source.get('body_type', '')).lower()
    canonical_body = CHANNEL_BODY_STYLES.get(body, body)
    if canonical_body in CHANNEL_BODY_STYLES.values() or body in {v.lower() for v in VK_BODY_TYPES}:
        output['body_style'] = canonical_body
    condition = (source.get('condition') or source.get('state', '')).lower()
    condition = CHANNEL_CONDITIONS.get(condition, condition)
    if condition in CHANNEL_CONDITIONS.values():
        output['condition'] = condition
    if source.get('vin'):
        output['vin'] = source['vin']
    availability = source.get('availability', '').lower()
    if availability == 'транзит':
        availability = 'в пути'
    if availability in VK_AVAILABILITY:
        output['availability'] = VK_AVAILABILITY[availability].lower()
    vehicle_type = source.get('vehicle_type', 'car_truck').lower()
    vehicle_type = CHANNEL_VEHICLE_TYPES.get(vehicle_type, vehicle_type)
    if vehicle_type in CHANNEL_VEHICLE_TYPES.values():
        output['vehicle_type'] = vehicle_type
    for i in range(5):
        key = f'custom_label_{i}'
        value = source.get(key) or (source.get('custom_label', '') if i == 0 else '')
        if value and len(value) <= 256:
            output[key] = value
    for key in ('location.address', 'location.country', 'location.region', 'location.locality', 'location.metro.name'):
        value = source.get(key) or source.get(key.removeprefix('location.'), '')
        if key == 'location.address' and not value:
            value = source.get('poi_id', '')
        if value and len(value) <= 256:
            output[key] = value
    missing = [key for key in CHANNEL_OPTIONAL_FIELDS if key not in output]
    if missing:
        warnings.append('optional fields unavailable or invalid: ' + ', '.join(missing))
    return PreparedVehicle(output, images), errors, warnings


# New formats and destinations are registered here; the runner stays unchanged.
READERS = {'data_cars_car': read_data_cars_car}
WRITERS = {'data_cars_car': serialize_data_cars_car, 'channel_item': serialize_channel_item}
DESTINATIONS = {'vk': Destination({'data_cars_car': prepare_vk, 'channel_item': prepare_vk_channel}, identify_vk)}


def validate_defaults(value, path: str) -> dict:
    if not isinstance(value, dict) or not all(isinstance(key, str) and re.fullmatch(r'[a-zA-Z_][a-zA-Z0-9_.]*', key)
                                             and isinstance(item, str) for key, item in value.items()):
        raise ValueError(f'{path}: expected an object of string fields; use dotted paths for nested values')
    return {key: item.strip() for key, item in value.items()}


def load_jobs(config_path: Path = DEFAULT_CONFIG) -> List[ExportJob]:
    config = json.loads(config_path.read_text(encoding='utf-8'))
    if not isinstance(config, dict) or set(config) != {'version', 'exports'} or config['version'] != 1 or not isinstance(config['exports'], list):
        raise ValueError('export config: expected version 1 and an exports array')
    jobs = []
    expected = {'id', 'destination', 'format', 'input_format', 'input', 'output', 'category'}
    for index, entry in enumerate(config['exports']):
        prefix = f'exports[{index}]'
        if not isinstance(entry, dict) or not expected.issubset(entry) or set(entry) - expected - {'defaults', 'defaults_file'} or not all(isinstance(entry[key], str) and entry[key] for key in expected):
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
        defaults = validate_defaults(entry.get('defaults', {}), f'{prefix}.defaults')
        defaults_file = entry.get('defaults_file')
        if defaults_file is not None and (not isinstance(defaults_file, str) or not defaults_file):
            raise ValueError(f'{prefix}.defaults_file: expected a nonempty path')
        jobs.append(ExportJob(**{**entry, 'input': Path(entry['input']), 'output': Path(entry['output']),
                                  'defaults': defaults, 'defaults_file': Path(defaults_file) if defaults_file else None}))
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
    defaults = dict(job.defaults)
    if job.defaults_file is not None and job.defaults_file.exists():
        defaults.update(validate_defaults(json.loads(job.defaults_file.read_text(encoding='utf-8')), str(job.defaults_file)))
    vehicles = [Vehicle({**defaults, **{key: value for key, value in vehicle.fields.items() if value}}, vehicle.images)
                for vehicle in vehicles]
    destination = DESTINATIONS[job.destination]
    identities = Counter(destination.identify(vehicle) for vehicle in vehicles)
    records, issues = [], []
    for index, vehicle in enumerate(vehicles, 1):
        prepared, errors, warnings = destination.formats[job.format](vehicle, job.category, identities)
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
