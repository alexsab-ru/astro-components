import fs from 'fs';
import path from 'path';

const NOTIFICATIONS_DIR = './tmp/notifications';
const ReportFile = {
    RASSROCHKA: `${NOTIFICATIONS_DIR}/rassrochka.txt`,
    RASSROCHKA_MARKETING: `${NOTIFICATIONS_DIR}/rassrochka-marketing.txt`,
};

class RassrochkaWordSearcher {
    constructor() {
        this.dataDirectory = path.join(process.cwd(), 'src', 'data', 'site');
        this.contentDirectory = path.join(process.cwd(), 'src', 'content');
        this.pagesDirectory = path.join(process.cwd(), 'src', 'pages');
        this.componentsDirectory = path.join(process.cwd(), 'src', 'components');
        this.filesWithRassrochka = [];
    }

    searchFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');

        if (/рассрочк/i.test(content)) {
            this.filesWithRassrochka.push(filePath);
        }
    }

    processDirectory(directory, fileExtensions) {
        if (!fs.existsSync(directory)) return;

        const files = fs.readdirSync(directory);

        files.forEach(file => {
            const filePath = path.join(directory, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                this.processDirectory(filePath, fileExtensions);
            } else if (fileExtensions.includes(path.extname(filePath))) {
                if (!filePath.includes('all-prices.json') &&
                    !filePath.includes('dealer-models_price.json') &&
                    !filePath.includes('federal-disclaimer.json')) {
                    this.searchFile(filePath);
                }
            }
        });
    }

    buildUrl(relativePath, domain) {
        const sanitizedPath = relativePath.replace(/^src\/(content|pages)\//, '');
        const pathChanged = sanitizedPath !== relativePath;

        if (pathChanged) {
            const fileNameWithoutExt = path.basename(sanitizedPath, path.extname(sanitizedPath));
            const directoryPath = path.dirname(sanitizedPath);
            const slug = directoryPath === '.' ? fileNameWithoutExt : `${directoryPath}/${fileNameWithoutExt}`;
            return `https://${domain}/${slug}/`;
        }

        return `https://${domain}/`;
    }

    generateUrl(filePath, domain) {
        const relativePath = path.relative(process.cwd(), filePath);
        return this.buildUrl(relativePath, domain);
    }

    outputRassrochkaFiles() {
        if (this.filesWithRassrochka.length === 0) {
            console.log('Слово "Рассрочка" не найдено.');
            return;
        }

        fs.mkdirSync(NOTIFICATIONS_DIR, { recursive: true });

        const domain = process.env.DOMAIN;
        console.log('\n⚠️ Найдено слово "Рассрочка" в следующих файлах:');

        const parsedFiles = this.filesWithRassrochka.map(filePath => {
            const relativePath = path.relative(process.cwd(), filePath);
            const url = this.generateUrl(filePath, domain);
            return { relativePath, url };
        });

        parsedFiles.forEach(({ relativePath, url }) => {
            console.log(`\nФайл: \`${relativePath}\`\nURL: ${url}`);
        });

        const htmlHeader = '<b>⚠️ Найдено слово "Рассрочка":</b>\n\n';
        const htmlContent = htmlHeader + parsedFiles
            .map(({ relativePath, url }) =>
                `<strong>Файл:</strong> <code>${relativePath}</code>\n<strong>URL:</strong> <a href="${url}">${url}</a>`
            )
            .join('\n\n');

        const htmlContentMarketing = htmlHeader + parsedFiles
            .map(({ url }) =>
                `<strong>URL:</strong> <a href="${url}">${url}</a>`
            )
            .join('\n\n');

        fs.writeFileSync(ReportFile.RASSROCHKA, htmlContent, 'utf8');
        fs.writeFileSync(ReportFile.RASSROCHKA_MARKETING, htmlContentMarketing, 'utf8');
        console.log(`\nИнформация о "Рассрочке" сохранена в: ${ReportFile.RASSROCHKA}, ${ReportFile.RASSROCHKA_MARKETING}`);
    }

    run() {
        this.processDirectory(this.dataDirectory, ['.json']);
        this.processDirectory(this.contentDirectory, ['.mdx']);
        this.processDirectory(this.pagesDirectory, ['.astro']);
        this.processDirectory(this.componentsDirectory, ['.astro']);
        this.outputRassrochkaFiles();
    }
}

const searcher = new RassrochkaWordSearcher();
searcher.run();
