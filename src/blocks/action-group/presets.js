export function actionGroupItems(items, preset) {
	if (Array.isArray(items)) return items;
	if (preset === 'callback')
		return [
			{
				title: 'Заказать звонок',
				action: {
					type: 'popup',
					id: 'common-modal',
					title: 'Заказать звонок',
					formName: 'Группа кнопок. Обратный звонок',
				},
			},
		];
	if (preset === 'request')
		return [
			{
				title: 'Получить предложение',
				action: {
					type: 'popup',
					id: 'common-modal',
					title: 'Получить предложение',
					formName: 'Группа кнопок. Предложение',
				},
			},
		];
	return [];
}
