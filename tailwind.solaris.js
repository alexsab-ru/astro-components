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
					400: "#418fde",
					500: "#1b365d",
				},
				'brand-color': "#3a3c4e",
				'brand-light-color': "#f5f4f3"
			},
			fontFamily: {
				'sans': ['Mulish', ...defaultTheme.fontFamily.sans],
			},
			borderRadius: {
				btn: '100px'
			},
			backgroundSize: {
                'size-200': '150% 200%',
            },
            backgroundPosition: {
                'pos-0': '0% 0%',
                'pos-100': '100% 100%',
            },
		},
	},
}
