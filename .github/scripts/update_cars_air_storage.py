import os
import argparse
import json
from utils import *
import xml.etree.ElementTree as ET


def process_car(car: ET.Element, config, all_duplicates, air_storage_data, elements_to_localize, replacements) -> None:
    """
    Обрабатывает отдельный автомобиль в XML.
    """
    if config.get('generate_friendly_url', False):
        friendly_url = f"{join_car_data(car, 'mark_id', 'folder_id', 'modification_id', 'complectation_name', 'color', 'year')}"
        friendly_url = f"{process_friendly_url(friendly_url)}"
        print(f"Уникальный идентификатор: {friendly_url}")
        create_child_element(car, 'url', f"https://{config['domain']}/cars/{friendly_url}/")

    # Заменяем цвет фида на цвет для Avito
    color = car.find(config['color_tag']).text if car.find(config['color_tag']) is not None else None
    if color:
        update_element_text(car, config['color_tag'], avitoColor(car.find(config['color_tag']).text))

    description = car.find(config['description_tag']).text if car.find(config['description_tag']) is not None else None
    if description:
        updated_text = description
        for old_text, new_text in replacements.items():
            # Замена частей текста
            updated_text = re.sub(re.escape(old_text), new_text, updated_text)
        # Обновляем текст, если он изменился
        if updated_text != description:
            update_element_text(car, config['description_tag'], updated_text)
    
    if config.get('new_address', False):
        address = car.find(config['address_tag']).text if car.find(config['address_tag']) is not None else None
        if address:
            update_element_text(car, config['address_tag'], config['new_address'])
    
    if config.get('new_phone', False):
        phone = car.find(config['phone_tag']).text if car.find(config['phone_tag']) is not None else None
        if phone:
            update_element_text(car, config['phone_tag'], config['new_phone'])
    
    # Получаем VIN автомобиля
    vin = car.find(config['vin_tag']).text if car.find(config['vin_tag']) is not None else None
    if vin:
        # Сдвигаем VIN, если указано
        move_vin_id_up = config.get('move_vin_id_up', 0)
        if move_vin_id_up:
            try:
                new_vin = modify_vin(vin.lower(), move_vin_id_up).upper()
                update_element_text(car, config['vin_tag'], new_vin)
                print(f"VIN сдвинут на {move_vin_id_up}: {vin} -> {new_vin}")
            except ValueError:
                print(f"Ошибка: VIN '{vin}' не может быть сдвинут.")

    # Получаем уникальный идентификатор
    unique_id = car.find(config.get('unique_id_tag', 'Id')).text if car.find(config.get('unique_id_tag', 'Id')) is not None else None
    if unique_id:
        # Сдвигаем unique_id, если указано
        move_vin_id_up = config.get('move_vin_id_up', 0)
        if move_vin_id_up:
            try:
                new_unique_id = increment_str(unique_id, move_vin_id_up)
                update_element_text(car, config.get('unique_id_tag', 'Id'), new_unique_id)
                print(f"unique_id сдвинут на {move_vin_id_up}: {unique_id} -> {new_unique_id}")
            except ValueError:
                print(f"Ошибка: unique_id '{unique_id}' не может быть сдвинут.")

    if vin and vin in air_storage_data and air_storage_data.get(vin):
        # Создаем указанное количество дубликатов для машин из JSON
        duplicates = duplicate_car(car, config, air_storage_data[vin], "в наличии", 0)
        all_duplicates.extend(duplicates)


def main():
    """
    Основная функция программы.
    """
    parser = argparse.ArgumentParser(description='Download and update Avito|AutoRu XML files.')
    parser.add_argument('--input_file', default='cars.xml', help='Input file')
    parser.add_argument('--output_path', default='./public/cars.xml', help='Output path/file')
    parser.add_argument('--domain', default=os.getenv('DOMAIN', 'localhost'), help='Repository name')
    parser.add_argument('--xml_url', default=os.getenv('XML_URL'), help='XML URL')
    parser.add_argument('--vin_tag', default='VIN', help='VIN tag name')
    parser.add_argument('--availability_tag', default='Availability', help='Availability tag name')
    parser.add_argument('--color_tag', default='Color', help='Color tag name')
    parser.add_argument('--address_tag', default='Address', help='Address tag name')
    parser.add_argument('--phone_tag', default='ContactPhone', help='Phone tag name')
    parser.add_argument('--description_tag', default='Description', help='Description tag name')
    parser.add_argument('--unique_id_tag', default='Id', help='Unique_id tag name')
    parser.add_argument('--source_type', choices=['autoru', 'avito'], required=True, help='Source type')
    parser.add_argument('--config_source', 
                    choices=['env', 'file', 'github'], 
                    default='file',
                    help='Config source type (file, env, or github)')
    parser.add_argument('--config_path', default='./.github/scripts/config_air_storage.json', help='Path to configuration file')
    parser.add_argument('--github_repo', help='GitHub repository in format owner/repo')
    parser.add_argument('--github_path', default='config', help='Path to config directory in GitHub repository')
    parser.add_argument('--gist_id', help='GitHub Gist ID with configuration')
    args = parser.parse_args()

    # Приведение тегов к нижнему регистру для autoru
    if args.source_type == 'autoru':
        args.vin_tag = args.vin_tag.lower()
        args.availability_tag = args.availability_tag.lower()
        args.color_tag = args.color_tag.lower()
        args.address_tag = args.address_tag.lower()
        args.phone_tag = args.phone_tag.lower()
        args.description_tag = args.description_tag.lower()
        args.unique_id_tag = 'unique_id'  # Устанавливаем фиксированное значение

    config = vars(args)
    
    # Добавляем специфичные настройки в зависимости от типа источника
    config['generate_friendly_url'] = (args.source_type == 'autoru')

    default_config = {
        "move_vin_id_up": 0,
        "new_address": "",
        "new_phone": "",
        "replacements": {},
        "elements_to_localize": [],
        "remove_cars_after_duplicate": [],
        "remove_mark_ids": [],
        "remove_folder_ids": []
    }
    # Загружаем конфигурацию в зависимости от источника
    if args.config_source == 'file':
        source_config = load_file_config(args.config_path, args.source_type, default_config)  # Существующая функция загрузки из файла
    elif args.config_source == 'env':
        source_config = load_env_config(args.source_type, default_config)
    elif args.config_source == 'github':
        github_config = {}
        if args.gist_id:
            github_config['gist_id'] = args.gist_id
        elif args.github_repo:
            github_config['repo'] = args.github_repo
            github_config['path'] = args.github_path
        else:
            print("Для использования GitHub необходимо указать --gist_id или --github_repo")
            return

        source_config = load_github_config(args.source_type, github_config, default_config)
    else:
        raise ValueError(f"Неподдерживаемый источник конфигурации: {args.config_source}")
    
    replacements = source_config['replacements']
    elements_to_localize = source_config['elements_to_localize']
    remove_cars_after_duplicate = source_config['remove_cars_after_duplicate']
    remove_mark_ids = source_config['remove_mark_ids']
    remove_folder_ids = source_config['remove_folder_ids']
    config['move_vin_id_up'] = source_config['move_vin_id_up']
    config['new_address'] = source_config['new_address']
    config['new_phone'] = source_config['new_phone']

    root = get_xml_content(args.input_file, args.xml_url)
    tree = ET.ElementTree(root)

    # Загружаем данные из JSON файла
    air_storage_data = {}
    if os.path.exists('air_storage.json'):
        try:
            with open('air_storage.json', 'r', encoding='utf-8') as f:
                air_storage_data = json.load(f)
        except json.JSONDecodeError:
            print("Ошибка при чтении air_storage.json")
        except Exception as e:
            print(f"Произошла ошибка при работе с файлом: {e}")

    # Список для хранения всех дубликатов
    all_duplicates = [
    ]
    # Создаем список машин для удаления
    cars_to_remove = [
    ]
        
    # Определяем корневой элемент в зависимости от типа источника
    cars_element = root.find('cars') if args.source_type == 'autoru' else root
    
    # Обработка машин
    for car in cars_element:
        if should_remove_car(car, remove_mark_ids, remove_folder_ids):
            cars_to_remove.append(car)
            continue
        
        vin = car.find(config['vin_tag']).text if car.find(config['vin_tag']) is not None else None
        
        process_car(car, config, all_duplicates, air_storage_data, elements_to_localize, replacements)
        
        if vin and vin in remove_cars_after_duplicate:
            cars_to_remove.append(car)

    # Удаление ненужных машин
    for car in cars_to_remove:
        cars_element.remove(car)

    # После окончания основного цикла добавляем все дубликаты в cars_element
    for new_car in all_duplicates:
        cars_element.append(new_car)

    convert_to_string(root)
    tree.write(args.output_path, encoding='utf-8', xml_declaration=True)


if __name__ == "__main__":
    main()
