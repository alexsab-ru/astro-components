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
					400: "#000000",
					500: "#000000",
				},
			},
			fontFamily: {
				'sans': ['InfinitiBrand', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}
