import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { collectionSchema } from './src/content/collectionSchema.js';
import { COLLECTIONS } from './src/const.js';

// Создаем коллекции из константы COLLECTIONS с новым API (loader: glob)
const objectCollections = COLLECTIONS.reduce((acc: Record<string, ReturnType<typeof defineCollection>>, collection) => {
    acc[collection.name] = defineCollection({
        loader: glob({
            base: `./src/content/${collection.name}`,
            pattern: '**/*',
        }),
        schema: collectionSchema.schema,
    });
    return acc;
}, {} as Record<string, ReturnType<typeof defineCollection>>);

// Дополнительная коллекция `seo`
const seoCollection = defineCollection({
    loader: glob({
        base: './src/content/seo',
        pattern: '**/*',
    }),
});

export const collections = {
    ...objectCollections,
    seo: seoCollection,
};


