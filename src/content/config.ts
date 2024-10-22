import { defineCollection } from 'astro:content';

const seoCollection = defineCollection({});

export const collections = {
  seo: seoCollection,
};