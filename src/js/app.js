import './data.alpine';
import './modules/scroll';
import './modules/modals';

import { connectForms, cookiecook } from '@alexsab-ru/scripts';
cookiecook();
connectForms('https://alexsab.ru/lead/test/', function() {
});