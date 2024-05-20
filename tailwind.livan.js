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
					300: "#DFDFDD",
					400: "#5B6671",
					500: "#25282A",
					600: "#25282A",
				},
				blue: {
					400: "#0a64dc",
				},
				orange:	{
					400: '#f88d2b',
				}
			},
			fontFamily: {
				...baseConfig.theme.extend.fontFamily
				// Manrope
			},
			transitionTimingFunction: {
				"in-expo": "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
				"out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
			},
		},
	},
}
