#!/bin/bash

# Скрипт для тестирования фида с явным указанием типа
# Использование: sh .github/scripts/sh/test/test_with_type.sh <тип> <файл>
# Пример: sh .github/scripts/sh/test/test_with_type.sh "Ads-Ad" "Ads-Ad.xml"

if [ $# -ne 2 ]; then
    echo "❌ Неверное количество аргументов"
    echo "Использование: $0 <тип> <файл>"
    echo ""
    echo "Доступные типы:"
    echo "  Ads-Ad"
    echo "  data-cars-car"
    echo "  vehicles-vehicle"
    echo "  yml_catalog-shop-offers-offer"
    echo "  avtoxml-Offers-Offer"
    echo ""
    echo "Примеры:"
    echo "  sh $0 \"Ads-Ad\" \"Ads-Ad.xml\""
    echo "  sh $0 \"data-cars-car\" \"data-cars-car--cm.expert.xml\""
    exit 1
fi

source_type=$1
input_file=$2

echo "🚗 Тестирование фида с явным указанием типа"
echo "============================================"
echo "📋 Тип: $source_type"
echo "📁 Файл: $input_file"
echo ""

# Проверяем существование файла
if [ ! -f ".github/scripts/example/$input_file" ]; then
    echo "❌ Файл .github/scripts/example/$input_file не найден"
    exit 1
fi

# Очищаем предыдущие результаты
rm -rf src/content/cars/*
rm -rf public/img/thumbs/*

echo "🧹 Очищены предыдущие результаты"

# Запускаем обработчик с явным указанием типа
echo "🔄 Обрабатываем фид..."
python .github/scripts/update_cars.py \
    --source_type "$source_type" \
    --input_file ".github/scripts/example/$input_file" \
    --output_path ".github/scripts/test_results/$input_file" \
    --domain "localhost:4321" \
    --cars_dir "src/content/cars" \
    --thumbs_dir "public/img/thumbs" \
    --count_thumbs 1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Успешно обработан!"
    echo "📊 Статистика:"
    echo "   📁 Создано MDX файлов: $(ls -1 src/content/cars/*.mdx 2>/dev/null | wc -l)"
    echo "   🖼️  Создано превью: $(ls -1 public/img/thumbs/*.webp 2>/dev/null | wc -l)"
    echo ""
    echo "🌐 Для просмотра результатов запустите:"
    echo "   pnpm dev"
    echo "   Затем откройте: http://localhost:4321/cars/"
else
    echo "❌ Ошибка при обработке фида"
fi 