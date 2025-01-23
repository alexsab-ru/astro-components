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
					400: "#cacaca",
					500: "#363e40",
					600: "#363e40",
				},
			},
			fontFamily: {
				'sans': ['NotoSans', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}
