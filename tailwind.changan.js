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
					400: "#1059a2",
					500: "#0b457f",
				},
			},
			fontFamily: {
				'sans': ['ChangAnunitype', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}
