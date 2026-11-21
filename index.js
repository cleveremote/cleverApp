/**
 * @format
 */

import {AppRegistry} from 'react-native';
// Initialise i18n avant tout rendu. Doit rester un import à effet de bord ici :
// avec `inlineRequires` (config Metro par défaut), un import nommé dans App.tsx
// n'est chargé qu'à sa première utilisation — après le premier rendu. Sans
// instance, useTranslation saute ses hooks, ce qui casse l'ordre des hooks au
// rendu suivant (« Cannot read property 'length' of undefined »).
import './src/i18n';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
