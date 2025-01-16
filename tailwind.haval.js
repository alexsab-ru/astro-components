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
					400: "#83888b",
					500: "#626b6f",
					600: "#626b6f",
				},
			},
			fontFamily: {
				'sans': ['Haval', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}
