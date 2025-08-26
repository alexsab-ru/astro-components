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
				black: '#282830',
				accent: { // в основном в верстке используется 400 и 500
					400: '#4a4a54',
					500: '#282830',
				},
			},
			fontFamily: {
				'sans': ['ToyotaType', ...defaultTheme.fontFamily.sans],
			},
			borderRadius:  {
				btn: '8px'
			}
		},
	},
}
