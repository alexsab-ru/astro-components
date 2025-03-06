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
					300: "#bfd8de",
					400: "#3b9db2",
					500: "#00657b",
					600: "#00657b",
				},
				yellow: '#ffc000',
				dark: '#0d171a'
			},
			fontFamily: {
				'sans': ['Dopis', ...defaultTheme.fontFamily.sans],
			},
		},
	},
}
