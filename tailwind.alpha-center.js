import { orange } from 'tailwindcss/colors';
import defaultTheme from 'tailwindcss/defaultTheme'
const baseConfig = require('./tailwind.config');

module.exports = {
	...baseConfig,
	theme: {
		...baseConfig.theme,
		extend: {
			...baseConfig.theme.extend,
			colors: {
				...baseConfig.theme.extend.colors,
				bgcolor: {
					500: '#E5E5E5',
				},
				textlight: {
					500: '#F9FAFB',
				},
				red: {
					500: '#D90429',
				},
				orange: {
					500: '#F59E0B',
				},
				accent: {
					400: '#D90429',
					500: '#1F1F1F',
				},
			},
      fontFamily: {
				'sans': ['Montserrat', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}