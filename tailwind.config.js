import defaultTheme from 'tailwindcss/defaultTheme'
import colors from 'tailwindcss/colors'

export const content = ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}']
export const theme = {
  container: {
    center: true,
    padding: '1.25rem',
  },
  extend: {
    fontFamily: {
      // 'sans': ['Gilroy', ...defaultTheme.fontFamily.sans],
    },
    boxShadow: {
      '3xl': '0 35px 60px rgba(0, 0, 0, 0.3)',
      '4xl': '0 0 60px rgba(0, 0, 0, 0.5)',
    },
    colors: {
      accent: colors.cyan, // в основном используется 400 и 500
    },
    screens: {
      'xs': {'max': '430px'},
      's1024_1074': {'min': '1024px', 'max': '1074px'},
      's1280_1330': {'min': '1280px', 'max': '1330px'},
      's1536_1586': {'min': '1536px', 'max': '1586px'},
    },
  },
}
export const plugins = []
