import 'i18next';
import {defaultNS, resources} from './resources';

// Clés typées à partir des fichiers FR : `t('cle.inexistante')` ne compile pas.
declare module 'i18next' {
	interface CustomTypeOptions {
		defaultNS: typeof defaultNS;
		resources: (typeof resources)['fr'];
	}
}
