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
				'sand-silver': '#E2E2E2',
				'lunar-maria-gray': '#A3B0BA',
				'space-gray': '#313E48',
				'purple': '#7D5EA8',
				'orange': '#F48026',
				red: {
					500: '#DF202A',
				},
				yellow: {
					500: '#FECA57',
				},
				blue: {
					300: '#77C8F0',
					400: '#5A9AD3',
					500: '#3D91CE',
				},
				'dark-blue': {
					400: '#343759',
					500: '#222951',
				},
				accent: { // в основном в верстке используется 400 и 500
					400: '#215469',
					500: '#000000',
				},
			},
			fontFamily: {
				'sans': ['Open Sans', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}
