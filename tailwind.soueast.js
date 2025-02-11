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
					400: "#ff8700",
					500: "#fe7600",
				},
			},
			fontFamily: {
				'sans': ['Montserrat', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}
