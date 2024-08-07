import * as React from 'react';
import { Provider } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogBox } from 'react-native';
import { StatusBar } from 'native-base';
import Routes from './src/app/routes';
import { store } from './src/module/process/infrasctructure/store/store';

LogBox.ignoreLogs(['Warning: ...', 'VirtualizedLists should never be nested']); // Ignore log notification by message
LogBox.ignoreAllLogs();

export async function onAppBootstrap() { }

const Stack = createNativeStackNavigator();
export default function App() {
    onAppBootstrap();

    return (
        <Provider store={store}>
            <StatusBar barStyle={'dark-content'} backgroundColor={'white'}/>
            <Routes />
        </Provider>
    );
}