export const LEGAL_DOCUMENTS = [
	{
		key: 'privacyPolicy',
		slug: 'privacy-policy',
		href: '/privacy-policy/',
		label: 'Политика конфиденциальности',
	},
	{
		key: 'personalDataConsent',
		slug: 'personal-data-consent',
		href: '/personal-data-consent/',
		label: 'Согласие на обработку персональных данных',
	},
	{
		key: 'cookiePolicy',
		slug: 'cookie-policy',
		href: '/cookie-policy/',
		label: 'Правила использования cookie',
	},
	{
		key: 'advertisingConsent',
		slug: 'advertising-consent',
		href: '/advertising-consent/',
		label: 'Согласие на рекламные сообщения',
	},
	{
		key: 'companySout',
		slug: 'company-sout',
		href: '/company-sout/',
		label: 'СОУТ',
	},
	{
		key: 'termsOfUse',
		slug: 'terms-of-use',
		href: '/terms-of-use/',
		label: 'Пользовательское соглашение',
	},
	{
		key: 'thirdPartiesPage',
		slug: 'third-parties',
		href: '/third-parties/',
		label: 'Третьи лица',
	},
];

export const isLegalDocumentEnabled = (legal, key) => legal?.[key] === true;

export const getEnabledLegalDocuments = (legal) =>
	LEGAL_DOCUMENTS.filter((document) => isLegalDocumentEnabled(legal, document.key));
