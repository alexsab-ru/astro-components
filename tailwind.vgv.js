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
					400: "#009a9e",
					500: "#007578",
					600: "#007578",
				},
			},
			fontFamily: {
				...baseConfig.theme.extend.fontFamily
			},
		},
	},
}
