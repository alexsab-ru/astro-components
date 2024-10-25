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
				'light-gray': '#bacad2',
				'dark-gray': '#6c6d70',
				red: {
					500: '#df202a',
				},
				accent: { // в основном в верстке используется 400 и 500
					400: '#00a1e3',
					500: '#0b70b7',
				},
			},
			fontFamily: {
				'sans': ['Neo Sans Cyr', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}
