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
					400: "#c6213a",
					500: "#a6192e",
				},
				yellow: '#ffc000',
				dark: '#0d171a'
			},
			fontFamily: {
				'sans': ['HarmonyOS', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}
