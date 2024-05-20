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
					400: "#e9231f",
					500: "#c31e1a",
					600: "#901613",
				},
			},
			fontFamily: {
				...baseConfig.theme.extend.fontFamily
			},
		},
	},
}
