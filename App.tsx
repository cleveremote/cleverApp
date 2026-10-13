import * as React from 'react';
import {Provider} from 'react-redux';
import {AppState, LogBox, StatusBar} from 'react-native';
import {activateKeepAwake, deactivateKeepAwake} from '@sayem314/react-native-keep-awake';
import Routes from './src/app/routes';
import {store} from './src/module/process/infrasctructure/store/store';
import {SplashScreen} from './src/app/screens/splash/SplashScreen';

LogBox.ignoreLogs(['Warning: ...', 'VirtualizedLists should never be nested']); // Ignore log notification by message
LogBox.ignoreAllLogs();

export async function onAppBootstrap() {}

export default function App() {
	onAppBootstrap();
	const [showSplash, setShowSplash] = React.useState(true);

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
				<Routes />
			)}
		</Provider>
	);
}
