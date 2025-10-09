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
					400: '#3f3f4b',
					500: '#282830',
				},
				red: {
					500: "#f02",
				},
			},
			fontFamily: {
				'sans': ['ToyotaType', ...defaultTheme.fontFamily.sans],
			},
			borderRadius:  {
				btn: '5px'
			}
		},
	},
}
