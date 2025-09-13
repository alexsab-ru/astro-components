/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// Разрешаем импорт YAML-файлов (например, models-sections.yml)
declare module '*.yml' {
  const content: any;
  export default content;
}
declare module '*.yaml' {
  const content: any;
  export default content;
}
