import { defineCollection } from 'astro:content';
import { collectionSchema } from './collectionSchema';
import { COLLECTIONS } from '@/const';

// Создаем коллекции
const objectCollections = COLLECTIONS.reduce((acc, collection) => {
	acc[collection.name] = defineCollection(collectionSchema); // Используем collection.name как ключ
	return acc; // Возвращаем измененный аккумулятор
}, {});

const seoCollection = defineCollection({});

export const collections = {
	...objectCollections,
	seo: seoCollection,
};
