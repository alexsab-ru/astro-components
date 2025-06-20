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
				black: "#191919",
				accent: {
					400: "#910a2d",
					500: "#910a2d",
				},
			},
			fontFamily: {
				'sans': ['Mazda', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}
