import * as React from 'react';
import {Provider} from 'react-redux';
import {LogBox, StatusBar} from 'react-native';
import Routes from './src/app/routes';
import {store} from './src/module/process/infrasctructure/store/store';

LogBox.ignoreLogs(['Warning: ...', 'VirtualizedLists should never be nested']); // Ignore log notification by message
LogBox.ignoreAllLogs();

export async function onAppBootstrap() {}

export default function App() {
	onAppBootstrap();

	return (
		<Provider store={store}>
			<StatusBar barStyle={'dark-content'} backgroundColor={'white'} />
			<Routes />
		</Provider>
	);
}
