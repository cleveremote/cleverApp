import {ELEMENT_HEIGHT, ELEMENT_FONT_SIZE} from '../../styles/metrics';
import React, { useState } from 'react';
import { Alert, Pressable, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native';
import i18n from 'i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { OrientationType } from 'react-native-orientation-locker';
import {
	hapticOptions,
	navigationCycleType,
	PROPORTIONAL
} from '../../data/cycleTypes';
import SequenceStack from './sequenceStack';
import { ModalOverrideDuration } from '../common/modalOverrideDuration';
import { connect } from 'react-redux';
import SensorStatus from './CycleStatus';
import ProportionalControl, {
	takeIgnoredProportionalRevert
} from './ProportionalControl';
import SeqeuncesList from './SequencesList';
import CycleNotification, {
	useBelowCard,
	isConflictShown
} from './CycleNotification';
import {
	DeviceDisconnectedIcon,
	WARNING_BORDER,
	useUnreachableDevices
} from '../device/DeviceConnectivity';

// Cycles en face du conflit d'un cycle : ceux de la confirmation, sinon les
// causes CYCLE/SEQUENCE (ancien payload), sinon les autres cycles en cours.
const conflictingIds = (id: string, status: any[] = []): string[] => {
	const entry = status.find((x: any) => x?.id === id);
	const fromConfirmation = (entry?.confirmation?.conflicts || []).map(
		(c: any) => c.cycleId
	);
	if (fromConfirmation.length) return fromConfirmation;
	const fromCauses = (entry?.causes || [])
		.filter((c: any) => ['CYCLE', 'SEQUENCE'].includes(c?.type))
		.map((c: any) => c.id);
	if (fromCauses.length) return fromCauses;
	return status
		.filter((x: any) => x?.id !== id && x?.status === 'IN_PROCCESS')
		.map((x: any) => x.id);
};

export function CycleStack({
	cycleData,
	navigation,
	orientation,
	closeSibillings,
	current,
	onSwitch,
	onSkip,
	onForceSequence,
	onQueueCycle,
	onExecute,
	status
}: Readonly<{
	cycleData: any;
	navigation: any;
	orientation: OrientationType;
	closeSibillings: Function;
	current: string | undefined;
	onSwitch: (value: boolean, type: string) => void | Promise<void>;
	onSkip: (sequenceId: any) => void;
	onForceSequence: (sequenceId: string) => void;
	onQueueCycle: (cycleId: string) => void;
	onExecute: (seqeunceId: string, ms: number) => void;
	status?: any;
}>) {
	const fontColor = cycleData.style.fontColor;
	const iconColorSwitch = cycleData.style.iconColor.base;
	const bgColor = cycleData.style.bgColor;
	const belowCard = useBelowCard();
	const disconnected = !!useUnreachableDevices(cycleData, 'CYCLE').length;
	// Déconnecté : un tap n'importe où sur la carte (hors menu, posé
	// par-dessus) ouvre le détail.
	const [detailsOpen, setDetailsOpen] = useState(false);

	return (
		<View>
			<Pressable
				disabled={!disconnected}
				onPress={() => {
					ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
					setDetailsOpen(true);
				}}
				onLayout={belowCard.onCardLayout}
				style={{
					alignSelf: 'stretch',
					backgroundColor: bgColor,
					borderRadius: 12,
					elevation: 3,
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 1 },
					shadowOpacity: 0.22,
					shadowRadius: 2.22,
					height: ELEMENT_HEIGHT,
					marginHorizontal: 4,
					marginTop: 4,
					flex: 1,
					borderWidth: disconnected ? 2 : 0,
					borderColor: WARNING_BORDER
				}}>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						flex: 1,
						marginHorizontal: 8
					}}>
					{/* L'icône « déconnecté » suit directement l'icône menu. */}
					<View
						style={{
							flex: 2,
							flexDirection: 'row',
							alignItems: 'center',
							marginLeft: 40,
							gap: 6
						}}>
						<DeviceDisconnectedIcon
							item={cycleData}
							kind="CYCLE"
							navigation={navigation}
							open={detailsOpen}
							onOpenChange={setDetailsOpen}
						/>
						<Text
							style={{
								flexShrink: 1,
								fontWeight: 'bold',
								color: fontColor,
								fontSize: ELEMENT_FONT_SIZE
							}}
							numberOfLines={1}
							ellipsizeMode="middle">
							{cycleData.name}
						</Text>
					</View>
					{/* PROPORTIONAL : un slider fixe la valeur de l'actuator. */}
					{cycleData.type === PROPORTIONAL ? (
						<ProportionalControl
							cycleData={cycleData}
							iconColorSwitch={iconColorSwitch}
							closeSibillings={closeSibillings}
						/>
					) : (
						<SensorStatus
							cycleData={cycleData}
							iconColorSwitch={iconColorSwitch}
							onSwitch={onSwitch}
							closeSibillings={closeSibillings}
							onSkip={onSkip}
							navigation={navigation}
						/>
					)}
				</View>
			</Pressable>

			<View
				onLayout={belowCard.onMenuLayout}
				style={{ marginTop: -37, width: 60, marginLeft: 8 }}>
				<MenuCycle
					navigation={navigation}
					cycleData={cycleData}
					closeSibillings={closeSibillings}
					current={current}
					onExecute={onExecute}
					status={
						status.find((x: any) => x?.id === cycleData.id)?.status
					}
					isConflict={isConflictShown(
						status.find((x: any) => x?.id === cycleData.id),
						status
					)}
				/>
			</View>
			<CycleNotification
				marginTop={belowCard.marginTop}
				item={cycleData}
				onForce={() => onSwitch(true, 'FORCE')}
				onIgnore={() => {
					// PROPORTIONAL : la valeur du slider revient à celle d'avant,
					// une fois l'IGNORE acquitté (sinon la box la ré-exécute).
					// L'IGNORE de la box l'arrête : l'app le relance à la valeur
					// du slider dès que les cycles en conflit ont fini.
					const revert =
						cycleData.type === PROPORTIONAL
							? takeIgnoredProportionalRevert(
									cycleData.id,
									conflictingIds(cycleData.id, status)
							  )
							: undefined;
					Promise.resolve(onSwitch(false, 'IGNORE'))
						.then(() => revert?.())
						.catch(() => undefined);
				}}
				onQueue={() => onQueueCycle(cycleData.id)}
			/>
			{/* PROPORTIONAL : le slider suffit, pas de progression de séquence. */}
			{cycleData.type !== PROPORTIONAL && (
				<SeqeuncesList
					cycleData={cycleData}
					onSkip={onSkip}
					onForceSequence={onForceSequence}
					navigation={navigation}
				/>
			)}
		</View>
	);
}

// Le glyphe ne doit pas s’étirer sur toute la zone du menu : il y serait
// calé à gauche même en RTL et passerait sous le titre de la carte.
export const MENU_ICON_STYLE = {alignSelf: 'flex-start'} as const;

export function MenuCycle({
	navigation,
	cycleData,
	closeSibillings,
	current,
	onExecute,
	status,
	isConflict,
	isGroup
}: Readonly<{
	navigation: any;
	cycleData: any;
	closeSibillings: Function;
	current: string | undefined;
	onExecute: (sequenceId: string, ms: number) => void;
	status: any;
	// Conflit en cours (bandeau affiché) : l'icône d'attente remplace le menu.
	isConflict?: boolean;
	isGroup?: boolean;
}>) {
	const [isOpen, setIsOpen] = useState(false);
	const onToggle = () => setIsOpen(prev => !prev);
	const [isOpened, setIsOpened] = useState(false);
	const iconColor = cycleData.style.iconColor.icon;

	if (current !== cycleData.name && isOpen) {
		onToggle();
	}

	const onPress = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		setIsOpened(prev => !prev);
	};

	const allMenuItems = [
		{
			name: 'cog',
			label: i18n.t('cycle:menu.settings'),
			action: () => {
				ReactNativeHapticFeedback.trigger(
					'impactMedium',
					hapticOptions
				);
				closeSibillings(false);
				navigation.navigate('Settings', {
					screen: 'CycleSettingsMenu',
					params: { ...cycleData, isGroup }
				});
			}
		},
		...(isGroup
			? []
			: [
				{
					name: 'stopwatch',
					label: i18n.t('cycle:menu.override'),
					action: () => {
						onToggle();
						onPress();
						closeSibillings(false);
					}
				}
			]),
		{
			name: 'history',
			label: i18n.t('cycle:menu.schedules'),
			action: () => {
				ReactNativeHapticFeedback.trigger(
					'impactMedium',
					hapticOptions
				);
				navigation.navigate('SchedulesStack', {
					screen: 'Schedules',
					params: { cycle: cycleData }
				});
				onToggle();
			}
		},
		// Override duration is only offered for classic and MODULE cycles,
		// not for fertigation groups.

		{
			name: 'bullseye',
			label: i18n.t('cycle:menu.triggers'),
			action: () => {
				ReactNativeHapticFeedback.trigger(
					'impactMedium',
					hapticOptions
				);
				closeSibillings(false);
				navigation.navigate('TriggersStack', {
					screen: 'Triggers',
					params: { cycle: cycleData }
				});
			}
		},
		{
			name: 'tasks',
			label: i18n.t('cycle:menu.events'),
			action: () => {
				ReactNativeHapticFeedback.trigger(
					'impactMedium',
					hapticOptions
				);
				closeSibillings(false);
				navigation.navigate('EventsScreen', { cycle: cycleData });
			}
		}
	];
	// PROPORTIONAL : piloté par son slider, sans durée ni planification ni
	// déclencheur → seuls réglages et événements.
	const menuItems =
		cycleData.type === PROPORTIONAL
			? allMenuItems.filter(x => x.name === 'cog' || x.name === 'tasks')
			: allMenuItems;

	return (
		<View>
			{!isConflict ? (
				<TouchableOpacity
					onPress={() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						// PROPORTIONAL : lancé sans durée, il reste en cours ;
						// son menu doit rester ouvrable pour le paramétrage.
						if (
							status !== 'IN_PROCCESS' ||
							cycleData.type === PROPORTIONAL
						) {
							if (closeSibillings) {
								closeSibillings(!isOpen, cycleData.name);
							}
							onToggle();
						} else {
							Alert.alert(
								i18n.t('cycle:menu.inProcess')
							);
						}
					}}>
					<Icon size={30} name="bars" color={iconColor} style={MENU_ICON_STYLE} />
				</TouchableOpacity>
			) : (
				<Icon size={30} name="user-check" color={iconColor} style={MENU_ICON_STYLE} />
			)}
			{isOpen && (
				<View>
					{menuItems.map((item, index) => (
						<Animated.View
							key={index}
							entering={FadeInDown.delay(index * 25)
								.springify()
								.damping(10)
								.mass(0.8)}>
							<View
								style={{
									flexDirection: 'row',
									alignItems: 'center',
									width: 100
								}}>
								<TouchableOpacity
									style={{
										marginTop: 16,
										flexDirection: 'row',
										alignItems: 'center',
										gap: 8
									}}
									onPress={item.action}>
									<Icon
										name={item.name}
										size={25}
										color={'#32404e'}
									/>
									<Text
										style={{
											fontWeight: 'bold',
											color: '#32404e',
											fontSize: 14
										}}>
										{item.label.charAt(0).toUpperCase() +
											item.label.slice(1)}
									</Text>
								</TouchableOpacity>
							</View>
						</Animated.View>
					))}
				</View>
			)}

			<ModalOverrideDuration
				isOpen={isOpened}
				onClose={() => setIsOpened(false)}
				onConfirm={(ms: number) => onExecute(cycleData.id, ms)}
			/>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	status: state.root_cycle.status
});

export default connect(mapStateToProps, null)(CycleStack);
