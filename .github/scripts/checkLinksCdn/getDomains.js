const domainFoldersUrl = 'https://api.github.com/repos/alexsab-ru/astro-json/contents/src';
let domains = [];

export async function getDomains() {
    console.log('📁 Получаю список папок из GitHub репозитория...');
    return fetch(domainFoldersUrl, { headers: { 'User-Agent': 'check-links-script' } })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data)) {
          throw new Error('Данные не являются массивом.');
        }
        return domains = data.filter(item => item.type === 'dir').map(item => item.name);
      })
      .catch(err => {
        console.log(`Ошибка при получении списка данных: `, err?.message);
        return [];
      })
      .finally(() => {
        console.log('Конец запроса получения списка доменов');
      });
};