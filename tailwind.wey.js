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
					400: "#036a92",
					500: "#024e6b",
				},
			},
			fontFamily: {
				'sans': ['TT Runs', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}
