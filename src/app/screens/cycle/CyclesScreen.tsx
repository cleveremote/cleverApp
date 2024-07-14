import React, { useEffect, useRef } from "react";
import { VStack } from "native-base";
import { connect } from 'react-redux';
import { CycleStack } from "../../components/cycle/cycleStack";
import { ScrollView, RefreshControl } from "react-native-gesture-handler";
import Orientation, { OrientationType } from "react-native-orientation-locker";
import { brandLogo, navigationHeader } from "../../components/common/navigationHeaders";
import Spinner from "react-native-loading-spinner-overlay";
import { styles } from "../../styles/cycleStyles";
import { AppState } from "react-native";
import { executeCycle, listenerEvents, loadCycles } from "../../../module/process/infrasctructure/store/actions/cycle";
export function Cycle(props: any) {

    const [activeMenu, setActiveMenu] = React.useState<string>();
    const [orientation, setOrientation] = React.useState<OrientationType>(OrientationType.UNKNOWN);
    const [refreshing, setRefreshing] = React.useState<boolean>(false);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    const appState = useRef(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', async nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                await onRefresh();
            }
            appState.current = nextAppState;
        });
        return () => {
            subscription.remove();
        };
    }, []);

    useEffect(() => {
        props.navigation.setOptions({
            headerRight: () => navigationHeader(() => props.navigation.navigate('Settings'), 'times-circle', true),
            headerLeft: brandLogo
        });

        const initial = Orientation.getInitialOrientation();
        setOrientation(initial);
        Orientation.addOrientationListener((or) => {
            setOrientation(or);
        });

        //props.loadCycles();;
        //props.listenerEvents();
    }, []);


    const closeSibillings = (isExpended: boolean, current?: string) => {
        if (isExpended) {
            setActiveMenu(current)
        } else {
            setActiveMenu(undefined)
        }
    }

    const onSwitch = (cycleData: any, value: any, type: string) => {
        setIsLoading(true);
        const dto = {
            id: cycleData.id,
            status: 'STOPPED',
            action: !value ? 'OFF' : 'ON',
            function: 'FUNCTION',
            mode: 'MANUAL',
            type: type,//'INIT',// 'QUEUED'
            duration: 0
        }
        props.executeCycle(dto).then(() => {
            setIsLoading(false);
        });
    }

    //override function for settinf custom execution time for all sequences .
    const onExecute = (id: string, ms: number) => {
        setIsLoading(true);
        const dto = {
            id: id,
            status: 'STOPPED',
            action: 'ON',
            function: 'FUNCTION',
            mode: 'MANUAL',
            type: 'INIT',// 'QUEUED'
            duration: ms
        }
        props.executeCycle(dto).then(() => {
            setIsLoading(false);
        });
    }

    const onSkip = (sequenceId: string) => {
        setIsLoading(true);
        const dto = {
            id: sequenceId,
            status: 'STOPPED',
            action: 'OFF',
            function: 'FUNCTION',
            mode: 'MANUAL',
            type: 'SKIP',// 'QUEUED'
            duration: 0
        }
        props.executeCycle(dto).then(() => {
            setIsLoading(false);
        });
    }

 

    const onRefresh = async () => {
        setRefreshing(true);
        props.loadCycles()
            .then((response: { configuration: string }) => {
                setRefreshing(false);
            });
    }


    return (
        
        <ScrollView scrollEnabled={true} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} style={{ alignItems: 'flex-start', justifyContent: 'flex-start', alignSelf: 'flex-start' }} />}>
            
            <VStack space={2} my={1} alignSelf="stretch">
            <Spinner visible={isLoading} color='#32404e' textStyle={styles.spinnerTextStyle} animation="fade" />
                {props.cycles?.filter((x: any) => x.id.indexOf('deleted') < 0)?.map((cycle: any, index: number) =>
                    <CycleStack key={'cycle_' + index} cycleData={cycle}
                        navigation={props.navigation}
                        current={activeMenu}
                        orientation={orientation}
                        closeSibillings={closeSibillings}
                        onSwitch={(value, type) => onSwitch(cycle, value, type)}
                        onSkip={onSkip}
                        onExecute={onExecute} />
                )}
            </VStack>
        </ScrollView>
    );

}

const mapStateToProps = (state: any) => ({
    cycles: state.root_cycle.cycles,
    connected: state.status.connected,
    isBoxConnected: state.status.isBoxConnected,
});

export default connect(mapStateToProps, {
    loadCycles,
    executeCycle
})(Cycle);