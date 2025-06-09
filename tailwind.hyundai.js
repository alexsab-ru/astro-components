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
					400: "#043a7a",
					500: "#002c5f",
				},
			},
			fontFamily: {
				'sans': ['Hyundai', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}