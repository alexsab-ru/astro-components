import {
	getModelBrandDisplayName,
	getModelTitle,
} from '../../js/utils/modelFields.js';
import { isModelTestDriveEnabled } from '../../js/utils/modelTestDrive.js';
export const MODEL_ACTION_SETS = {
	default: ['buy', 'credit', 'testDrive', 'offer', 'configuration'],
	purchase: ['buy', 'offer', 'configuration'],
	contact: ['offer'],
};
/** Pure model adapter; the generic ActionGroup never reads model or site settings. */
export function resolveModelActions(
	model,
	{
		status,
		creditEnabled = true,
		testDriveEnabled = true,
		testDriveModels = [],
		preset = 'default',
		actions,
		excludeActions = [],
	} = {}
) {
	if (!(status === 'enable' || status === 'show' || model?.show)) return [];
	const brand = getModelBrandDisplayName(model),
		title = getModelTitle(model);
	const popup = (id, label, classes, dataTitle = label) => ({
		id,
		title: label,
		classes,
		action: {
			type: 'popup',
			id: 'common-modal',
			title: dataTitle,
			formName: `${label}. ${brand} ${title}`,
		},
	});
	const builtins = {
		buy: popup(
			'buy',
			'Купить',
			'black btn-o px-4! flex-1 whitespace-nowrap',
			`Купить ${brand}`
		),
		credit: popup(
			'credit',
			'Рассчитать кредит',
			'px-4! flex-1 whitespace-nowrap'
		),
		testDrive: popup(
			'testDrive',
			'Записаться на тест-драйв',
			'gray px-4! flex-1 whitespace-nowrap'
		),
		offer: popup(
			'offer',
			'Узнать цену по акции',
			'black px-4! flex-1 whitespace-nowrap'
		),
		configuration: model?.complectations?.length
			? {
					id: 'configuration',
					title: 'Подобрать комплектацию',
					view: 'scroll-link',
					classes: 'black btn-o px-4! flex-1 whitespace-nowrap',
					action: { type: 'link', url: '#complectation' },
				}
			: popup(
					'configuration',
					'Подобрать комплектацию',
					'black btn-o px-4! flex-1 whitespace-nowrap'
				),
	};
	const selected = Array.isArray(actions)
		? actions
		: MODEL_ACTION_SETS[preset] || MODEL_ACTION_SETS.default;
	return selected
		.map((item) => (typeof item === 'string' ? builtins[item] : item))
		.filter(
			(item) =>
				item &&
				!excludeActions.includes(item.id) &&
				(item.id !== 'credit' || creditEnabled) &&
				(item.id !== 'testDrive' ||
					(testDriveEnabled &&
						isModelTestDriveEnabled(model, testDriveModels)))
		);
}
