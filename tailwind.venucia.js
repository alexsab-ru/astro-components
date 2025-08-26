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
				accent: {
					400: '#111111',
					500: '#000000',
				},
			},
			fontFamily: {
				...baseConfig.theme.extend.fontFamily
			},
		},
	},
}
