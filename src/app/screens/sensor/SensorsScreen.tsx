import React, { useEffect } from "react";
import { VStack } from "native-base";
import { connect } from 'react-redux';
import { ScrollView, RefreshControl } from "react-native-gesture-handler";
import Orientation, { OrientationType } from "react-native-orientation-locker";
import { brandLogo } from "../../components/common/navigationHeaders";
import { SensorStack } from "../../components/sensor/SensorStack";
import { loadSensors } from "../../../module/process/infrasctructure/store/actions/sensor";
export function Sensor(props: any) {

    const [activeMenu, setActiveMenu] = React.useState<string>();
    const [orientation, setOrientation] = React.useState<OrientationType>(OrientationType.UNKNOWN);
    const [refreshing, setRefreshing] = React.useState<boolean>(false);



    useEffect(() => {
        props.navigation.setOptions({ headerLeft: brandLogo });

        const initial = Orientation.getInitialOrientation();
        setOrientation(initial);
        Orientation.addOrientationListener((or) => {
            setOrientation(or);
        });

        //props.loadSensors();

    }, []);

    // useEffect(() => {
    //     console.log("listener");
    //     if (props.isServerConnected) {
    //         props.listenerEvents();
    //     }

    // }, [props.isServerConnected, props.isBoxConnected]);


    const closeSibillings = (isExpended: boolean, current?: string) => {
        if (isExpended) {
            setActiveMenu(current)
        } else {
            setActiveMenu(undefined)
        }
    }

    const onRefresh = async () => {
        setRefreshing(true);
        props.loadSensors()
            .then((response: { configuration: string }) => {
                setRefreshing(false);
            });
    }


    return (
        <ScrollView scrollEnabled={true} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} style={{ alignItems: 'flex-start', justifyContent: 'flex-start', alignSelf: 'flex-start' }} />}>
            <VStack space={2} my={1} alignSelf="stretch">
                {props.sensors?.filter((x: any) => x.id.indexOf('deleted') < 0)?.map((cycle: any, index: number) =>
                    <SensorStack key={'cycle_' + index} cycleData={cycle}
                        navigation={props.navigation}
                        current={activeMenu}
                        orientation={orientation}
                        closeSibillings={closeSibillings} />
                )}
            </VStack>
        </ScrollView>
    );
}

const mapStateToProps = (state: any) => ({
    sensors: state.root_sensor.sensors,
    isBoxConnected: state.status.isBoxConnected,
    isServerConnected: state.status.isServerConnected,
});

export default connect(mapStateToProps, {
    loadSensors
})(Sensor);