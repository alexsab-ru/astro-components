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
				'green-accent': '#00caba'
			},
			fontFamily: {
				'sans': ['Haval', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}
