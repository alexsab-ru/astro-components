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
					300: "#4495d1",
					400: "#1a4f89",
					500: "#12365e",
					600: "#12365e",
				},
				orange: '#fa5f1a',
				dark: '#040606'
			},
			fontFamily: {
				'sans': ['Montserrat', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}
