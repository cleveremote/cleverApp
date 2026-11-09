import {fieldLabelColor} from '../../../styles/components/common/Input';
import React from 'react';
import i18n from 'i18next';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {connect} from 'react-redux';
import {ELEMENT_FONT_SIZE} from '../../../styles/metrics';
import DeviceCommandModal from './DeviceCommandModal';
import {AccessBadge, CommandAccess, Chip, Row} from './commandUi';
import {findModel, modelKind} from './SlaveModelSection';

// Colonne libellé : assez large pour « Mode par défaut », « Délai de
// relâche »… sur une seule ligne.
const INVERTER_LABEL_WIDTH = 120;

// Variateurs (`config.inverters`) qui pilotent ce slave (`deviceId`).
export const deviceInverters = (inverters: any[], device: any) =>
	(inverters ?? []).filter(
		(i: any) =>
			!i.deletedAt &&
			i.deviceId != null &&
			`${i.deviceId}` === `${device?.id}`
	);

// Slave de type INVERTER : modèle d'un kind INVERTER…, ou variateur déjà relié.
export const hasInverterSection = (
	models: any[],
	device: any,
	inverters: any[]
) =>
	(modelKind(findModel(models, device)) ?? '').startsWith('INVERTER') ||
	deviceInverters(inverters, device).length > 0;

const findCommand = (model: any, commandId: any) =>
	commandId == null
		? undefined
		: (model?.deviceCommands ?? []).find(
				(c: any) => `${c.id}` === `${commandId}`
		  );

const formatGrace = (ms: any) =>
	ms == null ? undefined : `${Number(ms) / 1000} s`;

// Pastille lecture / écriture d'une commande du modèle : ouvre sa popin.
// Commande introuvable dans le modèle : pastille estompée, inactive.
function CommandBadge({
	command,
	access,
	onOpen
}: Readonly<{command?: any; access: CommandAccess; onOpen: () => void}>) {
	return (
		<Pressable
			disabled={!command}
			onPress={onOpen}
			hitSlop={8}
			style={({pressed}) => ({
				opacity: !command ? 0.3 : pressed ? 0.6 : 1
			})}>
			<AccessBadge
				access={access}
				confirm={!!command?.params?.isConfirmRequired}
			/>
		</Pressable>
	);
}

function InverterCard({
	inverter,
	model,
	sensors,
	onOpen
}: Readonly<{
	inverter: any;
	model: any;
	sensors: any[];
	onOpen: (command: any) => void;
}>) {
	const manualSensor = (sensors ?? []).find(
		(s: any) => `${s.id}` === `${inverter.manualSensorId}`
	);
	const commands = Object.entries(inverter.commands ?? {});
	const parameters: any[] = inverter.parameters ?? [];

	return (
		<View>
			<Row
				labelWidth={INVERTER_LABEL_WIDTH}
				icon="bolt"
				label={i18n.t('devices:inverter.name')}
				value={inverter.name}
				sub={inverter.description}
			/>
			<Row
				labelWidth={INVERTER_LABEL_WIDTH}
				icon="id-card"
				label={i18n.t('devices:inverter.profile')}
				value={inverter.profile}
			/>
			<Row
				labelWidth={INVERTER_LABEL_WIDTH}
				icon="sliders-h"
				label={i18n.t('devices:inverter.defaultMode')}
				value={inverter.defaultMode}
			/>
			<Row
				labelWidth={INVERTER_LABEL_WIDTH}
				icon="hourglass-half"
				label={i18n.t('devices:inverter.releaseGrace')}
				value={formatGrace(inverter.releaseGraceMs)}
			/>
			<Row
				labelWidth={INVERTER_LABEL_WIDTH}
				icon="hand-paper"
				label={i18n.t('devices:inverter.manualSensor')}
				value={
					manualSensor?.name ??
					(inverter.manualSensorId != null
						? `${inverter.manualSensorId}`
						: undefined)
				}
			/>

			<Text style={styles.subTitle}>
				{i18n.t('devices:inverter.commands')}
			</Text>
			{commands.length === 0 ? (
				<Text style={styles.empty}>
					{i18n.t('devices:inverter.noCommand')}
				</Text>
			) : (
				commands.map(([role, commandId]) => {
					const command = findCommand(model, commandId);
					return (
						<View key={role} style={styles.item}>
							<View style={{flex: 1}}>
								<Text style={styles.itemName} numberOfLines={1}>
									{role}
								</Text>
								<Text style={styles.itemSub} numberOfLines={1}>
									{command?.name ??
										command?.label ??
										i18n.t('devices:inverter.unknownCommand')}
								</Text>
							</View>
							<CommandBadge
								command={command}
								access="write"
								onOpen={() => onOpen(command)}
							/>
						</View>
					);
				})
			)}

			<Text style={styles.subTitle}>
				{i18n.t('devices:inverter.parameters')}
			</Text>
			{parameters.length === 0 ? (
				<Text style={styles.empty}>
					{i18n.t('devices:inverter.noParameter')}
				</Text>
			) : (
				parameters.map((p: any) => {
					const read = findCommand(model, p.readCommandId);
					const set = findCommand(model, p.setCommandId);
					return (
						<View key={p.blockId ?? p.field} style={styles.item}>
							<View style={{flex: 1}}>
								<View style={styles.paramHeader}>
									<Text style={styles.itemName} numberOfLines={1}>
										{p.blockId ?? p.field}
									</Text>
									{p.isPersistent ? (
										<Chip
											text={i18n.t('devices:inverter.persistent')}
										/>
									) : null}
								</View>
								<Text style={styles.itemSub} numberOfLines={1}>
									{`${i18n.t('devices:inverter.value')} : ${
										p.value ?? '—'
									}`}
								</Text>
							</View>
							<CommandBadge
								command={read}
								access="read"
								onOpen={() => onOpen(read)}
							/>
							<CommandBadge
								command={set}
								access="write"
								onOpen={() => onOpen(set)}
							/>
						</View>
					);
				})
			)}
		</View>
	);
}

// Variateur(s) d'un slave INVERTER : identité, profil, mode par défaut, puis
// ses commandes (rôle → device command du modèle) et ses paramètres (bloc,
// valeur, lecture / écriture). Les pastilles ouvrent la popin d'exécution.
export function SlaveInverterSection(props: any) {
	const model = findModel(props.models, props.device);
	const inverters = deviceInverters(props.inverters, props.device);
	const [opened, setOpened] = React.useState<any>();

	return (
		<View style={styles.embeddedCard}>
			{inverters.length === 0 ? (
				<Text style={styles.empty}>{i18n.t('devices:inverter.none')}</Text>
			) : (
				inverters.map((inverter: any, index: number) => (
					<View
						key={inverter.id ?? index}
						style={index > 0 ? styles.separator : undefined}>
						<InverterCard
							inverter={inverter}
							model={model}
							sensors={props.sensors}
							onOpen={setOpened}
						/>
					</View>
				))
			)}
			{model ? (
				<DeviceCommandModal
					command={opened}
					deviceId={props.device?.id}
					model={model}
					onClose={() => setOpened(undefined)}
				/>
			) : null}
		</View>
	);
}

const textColor = '#32404e';
// Couleur des libellés : source unique (Input.tsx).
const mutedColor = fieldLabelColor;
const COLORS = {
	cardBackground: 'white',
	border: '#e5e7eb',
	shadow: '#000'
};

const styles = StyleSheet.create({
	// Embarqué dans l'accordéon (déjà une carte blanche) : pas d'ombre ni de
	// marge, juste un peu de padding.
	embeddedCard: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 16
	},
	separator: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: COLORS.border
	},
	subTitle: {
		color: textColor,
		fontWeight: 'bold',
		fontSize: 14,
		marginTop: 12,
		marginBottom: 4,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: COLORS.border
	},
	// Même carte que les commandes de la section Modèle.
	item: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		borderRadius: 12,
		margin: 4,
		paddingVertical: 8,
		paddingLeft: 8,
		paddingRight: 10,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	paramHeader: {flexDirection: 'row', alignItems: 'center', gap: 6},
	itemName: {
		flexShrink: 1,
		textAlign: 'left',
		color: textColor,
		fontSize: ELEMENT_FONT_SIZE,
		lineHeight: 20,
		fontWeight: 'bold'
	},
	itemSub: {
		textAlign: 'left',
		color: mutedColor,
		fontSize: 12,
		lineHeight: 16
	},
	empty: {color: mutedColor, paddingVertical: 8}
});

const mapStateToProps = (state: any) => ({
	models: state.root_device_model.models,
	inverters: state.root_inverter.inverters,
	sensors: state.root_sensor.sensors
});

export default connect(mapStateToProps)(SlaveInverterSection);
