import { legacyPopupId } from '../../ui/card-action/resolveCardAction.js';

/** Service adapters retain their original form name and default image-card popup. */
export function withLegacyServiceAction(item, defaultPopup = false) {
	if (item.action) return item;
	const id = legacyPopupId(item.url) || (defaultPopup && !item.url ? 'common-modal' : '');
	return id ? {
		...item,
		action: { type: 'popup', id, title: item.title, formName: `Запись на сервис. ${item.title}` },
	} : item;
}
