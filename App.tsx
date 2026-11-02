import * as React from 'react';
// i18n est initialisé dans index.js, avant le premier rendu.
import {initLanguage} from './src/i18n';
import {useTranslation} from 'react-i18next';
import {Provider} from 'react-redux';
import {AppState, LogBox, StatusBar} from 'react-native';
import {activateKeepAwake, deactivateKeepAwake} from '@sayem314/react-native-keep-awake';
import Routes from './src/app/routes';
import {store} from './src/module/process/infrasctructure/store/store';
import {SplashScreen} from './src/app/screens/splash/SplashScreen';
import {GlobalLoader} from './src/app/components/common/GlobalLoader';

LogBox.ignoreLogs(['Warning: ...', 'VirtualizedLists should never be nested']); // Ignore log notification by message
LogBox.ignoreAllLogs();

export async function onAppBootstrap() {}

export default function App() {
	onAppBootstrap();
	const [showSplash, setShowSplash] = React.useState(true);
	const {i18n} = useTranslation();

	// Langue enregistrée ou du téléphone, appliquée pendant le splash.
	React.useEffect(() => {
		initLanguage();
	}, []);

	// Empêche la mise en veille du téléphone tant que l'app est au premier plan.
	React.useEffect(() => {
		const sync = (state: string) => {
			if (state === 'active') {
				activateKeepAwake();
			} else {
				deactivateKeepAwake();
			}
		};

		sync(AppState.currentState);
		const subscription = AppState.addEventListener('change', sync);

		return () => {
			subscription.remove();
			deactivateKeepAwake();
		};
	}, []);

	return (
		<Provider store={store}>
			<StatusBar barStyle={'dark-content'} backgroundColor={'white'} />
			{showSplash ? (
				<SplashScreen onFinish={() => setShowSplash(false)} />
			) : (
				// Remonté au changement de langue : tous les écrans (y compris les
				// textes lus hors hooks via i18n.t) repartent dans la nouvelle langue.
				<Routes key={i18n.language} />
			)}
			<GlobalLoader />
		</Provider>
	);
}
