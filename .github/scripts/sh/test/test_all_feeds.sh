#!/bin/bash

# Скрипт для тестирования всех фидов из папки example
# Запускать из корня проекта: sh .github/scripts/sh/test/test_all_feeds.sh

echo "🚗 Тестирование всех фидов из папки example"
echo "=============================================="

# Создаем директорию для результатов
mkdir -p .github/scripts/test_results

# Функция для тестирования одного фида
test_feed() {
    local input_file=$1
    local output_file=$2
    local description=$3
    
    echo ""
    echo "📋 Тестируем: $description"
    echo "📁 Входной файл: $input_file"
    echo "📄 Выходной файл: $output_file"
    echo "----------------------------------------"
    
    # Запускаем обработчик с автоопределением типа
    python .github/scripts/create_cars.py \
        --input_file "$input_file" \
        --output_path "$output_file" \
        --domain "localhost:4321" \
        --cars_dir "src/content/cars" \
        --thumbs_dir "public/img/thumbs" \
        --skip_thumbs
    
    if [ $? -eq 0 ]; then
        echo "✅ Успешно обработан: $description"
    else
        echo "❌ Ошибка при обработке: $description"
    fi
}

# Очищаем предыдущие результаты
rm -rf src/content/cars/*
rm -rf public/img/thumbs/*

echo "🧹 Очищены предыдущие результаты"

# Тестируем все фиды
test_feed \
    ".github/scripts/example/Ads-Ad.xml" \
    ".github/scripts/test_results/Ads-Ad.xml" \
    "Ads-Ad (Avito формат)"

test_feed \
    ".github/scripts/example/Ads-Ad--carcopy.xml" \
    ".github/scripts/test_results/Ads-Ad--carcopy.xml" \
    "Ads-Ad--carcopy (Avito формат, CarCopy)"

test_feed \
    ".github/scripts/example/Ads-Ad--1c.xml" \
    ".github/scripts/test_results/Ads-Ad--1c.xml" \
    "Ads-Ad--1c (Avito формат, 1C)"

test_feed \
    ".github/scripts/example/data-cars-car--cm.expert.xml" \
    ".github/scripts/test_results/data-cars-car--cm.expert.xml" \
    "data-cars-car--cm.expert (CM Expert формат)"

test_feed \
    ".github/scripts/example/data-cars-car--1c.xml" \
    ".github/scripts/test_results/data-cars-car--1c.xml" \
    "data-cars-car--1c (CM Expert формат, 1C)"

test_feed \
    ".github/scripts/example/data-cars-car--carcopy.xml" \
    ".github/scripts/test_results/data-cars-car--carcopy.xml" \
    "data-cars-car--carcopy (CM Expert формат, CarCopy)"

test_feed \
    ".github/scripts/example/vehicles-vehicle--maxposter.xml" \
    ".github/scripts/test_results/vehicles-vehicle--maxposter.xml" \
    "vehicles-vehicle--maxposter (MaxPoster формат)"

test_feed \
    ".github/scripts/example/avtoxml-Offers-Offer--maxposter.xml" \
    ".github/scripts/test_results/avtoxml-Offers-Offer--maxposter.xml" \
    "avtoxml-Offers-Offer--maxposter (MaxPoster формат, AvtoXML)"

test_feed \
    ".github/scripts/example/yml_catalog-shop-offers-offer--cm.expert.xml" \
    ".github/scripts/test_results/yml_catalog.shop-offers-offer--cm.expert.xml" \
    "yml_catalog-shop-offers-offer--cm.expert (YML формат, CM Expert)"

echo ""
echo "🎉 Тестирование завершено!"
echo "📊 Статистика:"
echo "   📁 Создано MDX файлов: $(ls -1 src/content/cars/*.mdx 2>/dev/null | wc -l)"
echo "   🖼️  Создано превью: $(ls -1 public/img/thumbs/*.webp 2>/dev/null | wc -l)"
echo ""
echo "🌐 Для просмотра результатов запустите:"
echo "   pnpm dev"
echo "   Затем откройте: http://localhost:4321/cars/" 