import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {connect} from 'react-redux';
import Icon from 'react-native-vector-icons/FontAwesome5';
import CommandExecuteForm from './CommandExecuteForm';

// Modèle du slave (`config.modelId`) dans `config.models`.
export const findModel = (models: any[], device: any) =>
	(models ?? []).find(
		(m: any) => `${m.id}` === `${device?.config?.modelId}`
	);

export const modelKind = (model: any): string | undefined =>
	model?.kind ?? model?.device?.kind;

// Un index (voie, plage) est stocké à partir de 0 et affiché à partir de
// `labelStart`.
const label = (index: number, spec: any) => index + (spec?.labelStart ?? 0);

const formatRange = (spec: any) => {
	if (spec?.min == null || spec?.max == null) return undefined;
	const from = label(spec.min, spec);
	const to = label(spec.max, spec);
	return from === to ? `${from}` : `${from} – ${to}`;
};

const enumLabel = (spec: any, value: any) =>
	(spec?.entries ?? []).find((e: any) => `${e.value}` === `${value}`)
		?.label ?? (value == null ? undefined : `${value}`);

const formatValueSpec = (spec: any) => {
	if (!spec) return undefined;
	if (spec.type === 'enum') {
		return (spec.entries ?? []).map((e: any) => e.label).join(' / ');
	}
	const range = formatRange(spec);
	return [spec.type, range].filter(Boolean).join(' · ') || undefined;
};

const resultFields = (command: any): any[] =>
	command?.params?.result?.type === 'fields'
		? command.params.result.fields ?? []
		: [];

const textColor = '#32404e';
const mutedColor = '#8a96a3';
const COLORS = {
	cardBackground: 'white',
	border: '#e5e7eb',
	chip: '#eef1f4'
};

function Row({
	icon,
	label: rowLabel,
	value,
	sub
}: Readonly<{icon?: string; label: string; value?: string; sub?: string}>) {
	return (
		<View style={styles.row}>
			<View style={styles.rowIcon}>
				{icon ? <Icon name={icon} size={14} color={mutedColor} /> : null}
			</View>
			<Text style={styles.rowLabel}>{rowLabel}</Text>
			<View style={{flex: 1}}>
				<Text style={styles.rowValue}>{value || '—'}</Text>
				{sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
			</View>
		</View>
	);
}

function Chip({text}: Readonly<{text: string}>) {
	return (
		<View style={styles.chip}>
			<Text style={styles.chipText}>{text}</Text>
		</View>
	);
}

function CommandCard({
	command,
	deviceId
}: Readonly<{command: any; deviceId: string}>) {
	const [open, setOpen] = React.useState(false);
	const params = command.params ?? {};
	const fields = resultFields(command);
	const valueSpec = params.value;
	// `channel` / `value` posés sur la commande = valeurs par défaut envoyées.
	const defaults = [
		command.channel != null && params.channel
			? `channel ${label(command.channel, params.channel)}`
			: undefined,
		command.value != null ? enumLabel(valueSpec, command.value) : undefined
	]
		.filter(Boolean)
		.join(' · ');

	return (
		<View style={styles.command}>
			<Pressable
				onPress={() => setOpen(o => !o)}
				style={({pressed}) => [
					styles.commandHeader,
					{opacity: pressed ? 0.6 : 1}
				]}>
				<View style={{flex: 1}}>
					<Text style={styles.commandName}>{command.name}</Text>
					<View style={styles.chips}>
						{(command.types ?? []).map((t: string) => (
							<Chip key={t} text={t} />
						))}
						{params.isConfirmRequired ? (
							<Chip text="confirm" />
						) : null}
						{params.isPersistable ? <Chip text="persisted" /> : null}
					</View>
				</View>
				<Icon
					name={open ? 'chevron-up' : 'chevron-down'}
					size={14}
					color={mutedColor}
				/>
			</Pressable>
			{open ? (
				<View style={styles.commandBody}>
					{params.channel ? (
						<Row
							icon="random"
							label="Channel"
							value={formatRange(params.channel)}
						/>
					) : null}
					{params.range ? (
						<Row
							icon="arrows-alt-h"
							label="Range"
							value={formatRange(params.range)}
						/>
					) : null}
					{valueSpec ? (
						<Row
							icon="sliders-h"
							label="Value"
							value={formatValueSpec(valueSpec)}
						/>
					) : null}
					{defaults ? (
						<Row icon="check" label="Default" value={defaults} />
					) : null}
					{fields.length ? (
						<>
							<Text style={styles.subTitle}>Measures</Text>
							{fields.map((f: any) => (
								<Row
									key={f.name}
									label={f.label || f.name}
									value={[f.type, f.unit]
										.filter(Boolean)
										.join(' · ')}
									sub={f.autoCreate ? 'auto-created sensor' : undefined}
								/>
							))}
						</>
					) : null}
					<Text style={styles.technical}>
						{[command.blockId, command.operationId]
							.filter(Boolean)
							.join(' / ')}
					</Text>
					<CommandExecuteForm command={command} deviceId={deviceId} />
				</View>
			) : null}
		</View>
	);
}

// Modèle d'un slave : identité de l'appareil puis la liste de ses device
// commands, dépliables pour voir leurs paramètres et les exécuter en test.
export function SlaveModelSection(props: any) {
	const model = findModel(props.models, props.device);

	if (!model) {
		return (
			<View style={styles.embeddedCard}>
				<Text style={styles.empty}>No model linked to this device.</Text>
			</View>
		);
	}

	const ports = model.device?.portConfig;
	const portRange =
		ports?.portCount != null
			? formatRange({
					min: 0,
					max: ports.portCount - 1,
					labelStart: ports.portNumStart ?? 0
			  })
			: undefined;
	const commands = model.deviceCommands ?? [];

	return (
		<View style={styles.embeddedCard}>
			<Row
				icon="microchip"
				label="Model"
				value={model.name}
				sub={[modelKind(model), model.description]
					.filter(Boolean)
					.join(' · ')}
			/>
			{model.device?.name ? (
				<Row icon="hdd" label="Device" value={model.device.name} />
			) : null}
			{portRange ? (
				<Row
					icon="plug"
					label="Ports"
					value={portRange}
					sub={`${ports.portCount} ports`}
				/>
			) : null}
			<Text style={styles.subTitle}>Commands</Text>
			{commands.length === 0 ? (
				<Text style={styles.empty}>No command for this model.</Text>
			) : (
				commands.map((c: any) => (
					<CommandCard
						key={c.id ?? c.name}
						command={c}
						deviceId={props.device?.id}
					/>
				))
			)}
		</View>
	);
}

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
	row: {flexDirection: 'row', paddingVertical: 6},
	rowIcon: {width: 26, paddingTop: 2},
	rowLabel: {width: 90, color: mutedColor, fontSize: 14},
	rowValue: {color: textColor, fontSize: 15, fontWeight: '600'},
	rowSub: {color: mutedColor, fontSize: 12, marginTop: 2},
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
	command: {
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 10,
		marginTop: 8
	},
	commandHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10
	},
	commandName: {color: textColor, fontSize: 15, fontWeight: '600'},
	commandBody: {paddingHorizontal: 10, paddingBottom: 10},
	chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4},
	chip: {
		backgroundColor: COLORS.chip,
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 2
	},
	chipText: {color: textColor, fontSize: 11},
	technical: {color: mutedColor, fontSize: 11, marginTop: 6},
	empty: {color: mutedColor, paddingVertical: 8}
});

const mapStateToProps = (state: any) => ({
	models: state.root_device_model.models
});

export default connect(mapStateToProps)(SlaveModelSection);
