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
				black: "#1C1C1B",
				accent: {
					400: "#004C66",
					500: "#005F7F",
				},
				"light-blue": "#E0ECF9",
				"middle-blue": "#00A5CF",
			},
			fontFamily: {
				...baseConfig.theme.extend.fontFamily
			},
		},
	},
}
