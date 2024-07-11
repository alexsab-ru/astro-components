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
				black: '#252c2c',
				accent: { // в основном в верстке используется 400 и 500
					400: '#ff9549',
					500: '#ff9549',
				},
			},
			fontFamily: {
				'sans': ['TT_TANK', ...defaultTheme.fontFamily.sans],
			},
			borderRadius:  {
				btn: '8px'
			}
		},
	},
}
