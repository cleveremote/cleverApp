import React, {useEffect, useState} from 'react';
import {Text, View} from 'react-native';
import Slider from '@react-native-community/slider';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {hapticOptions} from '../../data/cycleTypes';
import {
	executeCycle,
	saveCycle
} from '../../../module/process/infrasctructure/store/actions/cycle';
import {notificationMessage} from './CycleNotification';
import {useUnreachableDevices} from '../device/DeviceConnectivity';

const IN_PROCESS = 'IN_PROCCESS';

// Le module PROPORTIONAL porte une seule séquence pilotant un seul actuator :
// sa référence (moduleConfig) garde la valeur à appliquer (customValue).
const moduleRefOf = (cycleData: any) => {
	const sequence = (cycleData?.sequences || []).find((x: any) => !x.delete);
	const ref = (sequence?.moduleConfigs || []).find((x: any) => !x.delete);
	return {sequence, ref};
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

// Remplace le toggle des cartes PROPORTIONAL : le slider fixe la valeur de
// l'actuator dans les bornes de sa vanne CTRL (minOpening / maxOpening). Au
// relâchement, la valeur est enregistrée sur le module (customValue) puis le
// cycle est lancé ; revenir au minimum l'arrête.
export function ProportionalControl(props: any) {
	const {cycleData, iconColorSwitch} = props;
	const {sequence, ref} = moduleRefOf(cycleData);
	const actuator = (props.actuators || []).find(
		(a: any) => `${a.id}` === `${ref?.moduleId}`
	);
	// Bornes remises dans l'ordre : `minOpening` peut dépasser `maxOpening`
	// (vanne inversée), la valeur brute est envoyée et le back l'interprète.
	const minOpening = Number(actuator?.config?.minOpening ?? 0);
	const maxOpening = Number(actuator?.config?.maxOpening ?? 100);
	const min = Math.min(minOpening, maxOpening);
	const max = Math.max(min + 1, minOpening, maxOpening);
	const custom = Number(ref?.customValue ?? min);
	const stored = clamp(isNaN(custom) ? min : custom, min, max);

	// Valeur affichée pendant le glissement, recalée sur celle du box sinon.
	const [value, setValue] = useState<number>(stored);
	useEffect(() => setValue(stored), [stored]);

	const entry = (props.status || []).find(
		(x: any) => x?.id === cycleData.id
	);
	const running = entry?.status === IN_PROCESS;
	// Mêmes verrous que le toggle (cf. CycleStatus) : bandeau de notification
	// affiché, ou device requis injoignable alors que le cycle est arrêté.
	const hasNotification = !!notificationMessage(entry, true, props.status);
	const unreachable = useUnreachableDevices(cycleData, 'CYCLE');
	const locked =
		!ref ||
		hasNotification ||
		(!!unreachable.length && !running);

	const apply = (raw: number) => {
		const next = clamp(Math.round(raw), min, max);
		setValue(next);
		props.closeSibillings(true);
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		const updated = {
			...cycleData,
			sequences: (cycleData.sequences || []).map((s: any) =>
				s !== sequence
					? s
					: {
							...s,
							moduleConfigs: (s.moduleConfigs || []).map((m: any) =>
								m === ref ? {...m, customValue: next} : m
							)
					  }
			)
		};
		props.saveCycle(updated, false, () =>
			props.executeCycle({
				id: cycleData.id,
				status: 'STOPPED',
				action: next > min ? 'ON' : 'OFF',
				function: 'FUNCTION',
				mode: 'MANUAL',
				type: 'INIT',
				duration: 0
			})
		);
	};

	return (
		<View
			style={{
				flex: 2,
				flexDirection: 'row',
				alignItems: 'center',
				opacity: locked ? 0.4 : 1
			}}>
			<Slider
				style={{flex: 1}}
				disabled={locked}
				minimumValue={min}
				maximumValue={max}
				step={1}
				value={value}
				minimumTrackTintColor={iconColorSwitch}
				maximumTrackTintColor="#d1d1d6"
				onValueChange={setValue}
				onSlidingComplete={apply}
				accessibilityLabel={cycleData.name}
			/>
			<Text
				style={{
					minWidth: 44,
					textAlign: 'right',
					fontWeight: 'bold',
					color: cycleData.style?.fontColor
				}}>
				{`${value}%`}
			</Text>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	status: state.root_cycle.status,
	actuators: state.root_actuator.actuators
});

export default connect(mapStateToProps, {saveCycle, executeCycle})(
	ProportionalControl
);
