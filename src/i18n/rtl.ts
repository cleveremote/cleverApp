import {I18nManager} from 'react-native';

/**
 * Nom d'icône FontAwesome orienté selon le sens de lecture : en arabe, une
 * flèche « retour » ou un chevron « suivant » pointe dans l'autre sens. Les
 * polices d'icônes ne s'inversent pas d'elles-mêmes, contrairement aux styles.
 */
export const directionalIcon = (name: string): string => {
	if (!I18nManager.isRTL) return name;
	if (name.endsWith('-left')) return `${name.slice(0, -5)}-right`;
	if (name.endsWith('-right')) return `${name.slice(0, -6)}-left`;
	return name;
};
