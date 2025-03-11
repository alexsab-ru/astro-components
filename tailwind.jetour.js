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
					400: '#59c4d4',
					500: '#49a1ae',
				},
			},
			fontFamily: {
				...baseConfig.theme.extend.fontFamily
			},
		},
	},
}
