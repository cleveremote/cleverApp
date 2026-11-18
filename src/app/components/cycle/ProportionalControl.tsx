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
import {
	enabledLoopOf,
	isFollowLoop,
	sensorUnit
} from '../../data/controlLoopTypes';
import {controlLoopBadge} from './controlLoopBadge';

// Le module PROPORTIONAL porte une seule séquence pilotant un seul actuator :
// sa référence (moduleConfig) garde la valeur à appliquer (customValue).
const moduleRefOf = (cycleData: any) => {
	const sequence = (cycleData?.sequences || []).find((x: any) => !x.delete);
	const ref = (sequence?.moduleConfigs || []).find((x: any) => !x.delete);
	return {sequence, ref};
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const toFinite = (value: any) => {
	const n = Number(value);
	return value == null || value === '' || isNaN(n) ? undefined : n;
};

// Vanne pilotée par sa boucle (FOLLOW / REGULATION) : le slider n'est plus une
// commande, il reflète ce que la box applique. En FOLLOW, l'entrée analogique
// (`follow.inputMin..inputMax`) recopiée en ouverture % ; en REGULATION, la
// consigne placée sur l'échelle du capteur de retour.
const loopDisplay = (
	loop: any,
	sensor: any,
	live: number | undefined,
	min: number,
	max: number
) => {
	if (isFollowLoop(loop)) {
		const inMin = Number(loop.follow?.inputMin ?? 0);
		const inMax = Number(loop.follow?.inputMax ?? 100);
		const pct =
			live == null || inMax === inMin
				? undefined
				: ((live - inMin) / (inMax - inMin)) * 100;
		const value =
			pct == null ? undefined : clamp(Math.round(pct), min, max);
		return {
			min,
			max,
			value: value ?? min,
			label: value == null ? '–' : `${value}%`
		};
	}
	const setpoint = toFinite(loop.setpoint);
	const scaling = sensor?.config?.scaling;
	const lo = toFinite(scaling?.outputMin) ?? 0;
	const hi = toFinite(scaling?.outputMax) ?? Math.max(100, setpoint ?? 0);
	const sMin = Math.min(lo, hi);
	const sMax = Math.max(sMin + 1, lo, hi);
	const unit = sensorUnit(sensor);
	return {
		min: sMin,
		max: sMax,
		value: clamp(setpoint ?? sMin, sMin, sMax),
		label: setpoint == null ? '–' : `${setpoint}${unit ? ` ${unit}` : ''}`
	};
};

// Contexte d'un PROPORTIONAL : vanne pilotée, bornes, valeur enregistrée et
// éventuelle boucle (avec la valeur live de son capteur).
type ProportionalState = {
	actuators?: any[];
	controlLoops?: any[];
	sensors?: any[];
	sensorValues?: any[];
};

const resolveProportional = (cycleData: any, state: ProportionalState) => {
	const {sequence, ref} = moduleRefOf(cycleData);
	const actuator = (state.actuators || []).find(
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
	const loop = enabledLoopOf(state.controlLoops, actuator?.id);
	const loopSensor = (state.sensors || []).find(
		(x: any) => `${x.id}` === `${loop?.sensorId}`
	);
	const loopLive = toFinite(
		(state.sensorValues || []).find(
			(x: any) =>
				loopSensor &&
				(`${x.id}` === `${loopSensor.id}` ||
					`${x.deviceId}` === `${loopSensor.id}`)
		)?.value
	);
	return {sequence, ref, actuator, min, max, stored, loop, loopSensor, loopLive};
};

// ON au sens de la pastille : le box le fait tourner ET la vanne n'est pas à
// 0 %. Valeur lue comme sur le slider : entrée live recopiée en FOLLOW,
// customValue sans boucle. En REGULATION l'ouverture n'est pas connue, on
// s'en tient au statut du box.
export const isProportionalOn = (
	cycleData: any,
	status: string | undefined,
	state: ProportionalState
) => {
	if (status !== 'IN_PROCCESS') return false;
	const r = resolveProportional(cycleData, state);
	if (!r.loop) return r.stored !== 0;
	if (!isFollowLoop(r.loop)) return true;
	const {value, label} = loopDisplay(r.loop, r.loopSensor, r.loopLive, r.min, r.max);
	return label !== '–' && value !== 0;
};

// Remplace le toggle des cartes PROPORTIONAL : le slider fixe la valeur de
// l'actuator dans les bornes de sa vanne CTRL (minOpening / maxOpening). Au
// relâchement, la valeur est enregistrée sur le module (customValue) puis le
// cycle est lancé ; revenir au minimum l'arrête.
export function ProportionalControl(props: any) {
	const {cycleData, iconColorSwitch} = props;
	const {sequence, ref, min, max, stored, loop, loopSensor, loopLive} =
		resolveProportional(cycleData, props);

	// Valeur affichée pendant le glissement, recalée sur celle du box sinon.
	const [value, setValue] = useState<number>(stored);
	useEffect(() => setValue(stored), [stored]);

	const entry = (props.status || []).find(
		(x: any) => x?.id === cycleData.id
	);
	// Bandeau de notification affiché, ou device requis injoignable (même si
	// le cycle tourne : la commande ne pourrait pas être appliquée).
	const hasNotification = !!notificationMessage(entry, true, props.status);
	const unreachable = useUnreachableDevices(cycleData, 'CYCLE');
	// Boucle activée sur la vanne : slider désactivé, il suit la boucle.
	const shown = loop
		? loopDisplay(loop, loopSensor, loopLive, min, max)
		: {min, max, value, label: `${value}%`};
	const locked =
		!ref ||
		!!loop ||
		hasNotification ||
		!!unreachable.length;
	// Grisé dès que verrouillé hors boucle, ou quand le device est déconnecté.
	const dimmed = (locked && !loop) || !!unreachable.length;

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
				action: next > min && next !== 0 ? 'ON' : 'OFF',
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
				alignItems: 'center'
			}}>
			{loop ? (
				<View style={{marginRight: 6}}>
					{controlLoopBadge(loop, cycleData.style?.fontColor)}
				</View>
			) : null}
			<Slider
				style={{flex: 1, opacity: dimmed ? 0.4 : 1}}
				disabled={locked}
				minimumValue={shown.min}
				maximumValue={shown.max}
				step={loop ? 0 : 1}
				value={shown.value}
				minimumTrackTintColor={iconColorSwitch}
				maximumTrackTintColor="#d1d1d6"
				onValueChange={setValue}
				onSlidingComplete={apply}
				accessibilityLabel={cycleData.name}
			/>
			<Text
				numberOfLines={1}
				style={{
					minWidth: 44,
					opacity: dimmed ? 0.4 : 1,
					textAlign: 'right',
					fontWeight: 'bold',
					color: cycleData.style?.fontColor
				}}>
				{shown.label}
			</Text>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	status: state.root_cycle.status,
	actuators: state.root_actuator.actuators,
	controlLoops: state.root_control_loop.loops,
	sensors: state.root_sensor.sensors,
	sensorValues: state.root_sensor.values
});

export default connect(mapStateToProps, {saveCycle, executeCycle})(
	ProportionalControl
);
