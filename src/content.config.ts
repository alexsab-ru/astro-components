import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import collectionsData from './data/collections.json';

// Базовая схема для markdown-контента (общие страницы коллекций из COLLECTIONS)
const baseCollectionSchema = z.object({
    h1: z.string().optional(),
    title: z.string().optional(),
    caption: z.string().optional(),
    draft: z.boolean().optional(),
    breadcrumb: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    toDate: z.union([z.boolean(), z.coerce.date()]).optional(),
    brand: z.string().optional(),
    // Поля ссылок, чтобы не отбрасывались при включенной схеме
    url: z.string().optional(),
    link: z.string().optional(),
    href: z.string().optional(),
});

// Создаем коллекции из данных collections.json с новым API (loader: glob)
const objectCollections = collectionsData.reduce((acc: Record<string, ReturnType<typeof defineCollection>>, collection) => {
    acc[collection.name] = defineCollection({
        // Используем exclude, т.к. массив pattern приводит к некорректной строке и ломает загрузку
        loader: glob({
            base: `./src/content/${collection.name}`,
            pattern: '**/*.{md,mdx}',
            exclude: ['**/__*'],
        } as any),
        schema: baseCollectionSchema,
    });
    return acc;
}, {} as Record<string, ReturnType<typeof defineCollection>>);

// Дополнительная коллекция `seo`
const seoCollection = defineCollection({
    loader: glob({
        base: './src/content/seo',
        pattern: '**/*.{md,mdx}',
        exclude: ['**/__*'],
    } as any),
});

export const collections = {
    ...objectCollections,
    seo: seoCollection,
    cars: defineCollection({
        loader: glob({
            base: './src/content/cars',
            pattern: '**/*.{md,mdx}',
            exclude: ['**/__*'],
        } as any),
        schema: z.object({
            // Базовые данные
            h1: z.string(),
            title: z.string(),
            breadcrumb: z.string(),
            description: z.string(),
            // Идентификаторы и классификация
            mark_id: z.string(),
            folder_id: z.string(),
            color: z.string(),
            color_rus: z.string().optional(),
            color_eng: z.string().optional(),
            // Цены и скидки
            price: z.number(),
            priceWithDiscount: z.number(),
            sale_price: z.number(),
            max_discount: z.number(),
            // Скидки встречаются не во всех карточках (исторические записи) — делаем их опциональными
            credit_discount: z.number().default(0).optional(),
            insurance_discount: z.number().default(0).optional(),
            optional_discount: z.number().default(0).optional(),
            tradein_discount: z.number().default(0).optional(),
            // Доп. характеристики для карточек и страниц (используются в компонентах)
            availability: z.string().default('в наличии').optional(),
            modification_id: z.string().optional(),
            run: z.number(),
            body_type: z.string().optional(),
            complectation_name: z.string().optional(),
            wheel: z.string().optional(),
            year: z.number(),
            // Медиа
            image: z.string(),
            images: z.array(z.string()).default([]),
            thumbs: z.array(z.string()).default([]),
            // Прочее
            order: z.number(),
            total: z.number(),
            url: z.string(),
            vin: z.string(),
            vin_hidden: z.string(),
            vin_list: z.string(),
        }),
    }),
    used_cars: defineCollection({
        loader: glob({
            base: './src/content/used_cars',
            pattern: '**/*.{md,mdx}',
            exclude: ['**/__*'],
        } as any),
        schema: z.object({
            // Базовые данные
            h1: z.string(),
            title: z.string(),
            breadcrumb: z.string(),
            description: z.string(),
            // Идентификаторы и классификация
            mark_id: z.string(),
            folder_id: z.string(),
            color: z.string(),
            color_rus: z.string().optional(),
            color_eng: z.string().optional(),
            // Цены и скидки
            price: z.number(),
            priceWithDiscount: z.number(),
            sale_price: z.number(),
            max_discount: z.number(),
            // Скидки встречаются не во всех карточках (исторические записи) — делаем их опциональными
            credit_discount: z.number().default(0).optional(),
            insurance_discount: z.number().default(0).optional(),
            optional_discount: z.number().default(0).optional(),
            tradein_discount: z.number().default(0).optional(),
            // Доп. характеристики для карточек и страниц (используются в компонентах)
            availability: z.string().default('в наличии').optional(),
            modification_id: z.string().optional(),
            run: z.number(),
            body_type: z.string().optional(),
            complectation_name: z.string().optional(),
            wheel: z.string().optional(),
            year: z.number(),
            // Медиа
            image: z.string(),
            images: z.array(z.string()).default([]),
            thumbs: z.array(z.string()).default([]),
            // Прочее
            order: z.number(),
            total: z.number(),
            url: z.string(),
            vin: z.string(),
            vin_hidden: z.string(),
            vin_list: z.string(),
        }),
    }),
};


