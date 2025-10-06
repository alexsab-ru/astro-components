export function transformVkUrl(url) {
  // Проверяем, является ли это VK embed-ссылкой
  const vkEmbedMatch = url.match(/vkvideo\.ru\/video_ext\.php\?oid=(-?\d+)&id=(\d+)/);
  
  if (vkEmbedMatch) {
    const [, oid, id] = vkEmbedMatch;
    // Преобразуем в прямую ссылку на видео VK
    return `https://vk.com/video${oid}_${id}`;
  }
  
  return url;
}