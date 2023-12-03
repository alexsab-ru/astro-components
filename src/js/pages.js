import { readdir } from 'fs';

export async function getPages(){
    const pagesDirectory = './src/pages';
    const pages = [];

    await readdir(pagesDirectory, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }
        files.forEach((file) => {
            file = '/'+file.replace(/.[^.]+$/g, '').replace('index', '')
            pages.push(file);
        });
    });
    return pages;
}
