import * as React from 'react';
import {Provider} from 'react-redux';
import {LogBox, StatusBar} from 'react-native';
import Routes from './src/app/routes';
import {store} from './src/module/process/infrasctructure/store/store';
import {SplashScreen} from './src/app/screens/splash/SplashScreen';

LogBox.ignoreLogs(['Warning: ...', 'VirtualizedLists should never be nested']); // Ignore log notification by message
LogBox.ignoreAllLogs();

export async function onAppBootstrap() {}

export default function App() {
	onAppBootstrap();
	const [showSplash, setShowSplash] = React.useState(true);

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
