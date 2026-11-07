import React from 'react';
import i18n from 'i18next';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {ModalCard} from '../../../components/common/ModalCard';
import CommandExecuteForm from './CommandExecuteForm';
import {
	AccessBadge,
	CONFIRM_STYLE,
	Chip,
	Row,
	commandAccess,
	enumLabel,
	formatRange,
	formatValueSpec,
	label
} from './commandUi';

// Popin (carte de référence `ModalCard`) d'une device command du modèle d'un
// slave : sa description (sens,
// paramètres, mesures) puis le formulaire pour l'exécuter en test. Ouverte
// tant que `command` est défini ; le formulaire repart à zéro à chaque
// ouverture.
export function DeviceCommandModal({
	command,
	deviceId,
	model,
	onClose
}: Readonly<{
	command?: any;
	deviceId?: string;
	model: any;
	onClose: () => void;
}>) {
	return (
		<ModalCard isOpen={!!command} onClose={onClose} style={styles.cardSize}>
			{command ? (
				<CommandContent
					command={command}
					deviceId={deviceId}
					model={model}
				/>
			) : null}
		</ModalCard>
	);
}

function CommandContent({
	command,
	deviceId,
	model
}: Readonly<{
	command: any;
	deviceId?: string;
	model: any;
}>) {
	const access = commandAccess(command);
	const params = command.params ?? {};
	const valueSpec = params.value;
	const operation = [command.blockId, command.operationId]
		.filter(Boolean)
		.join('/');
	// `channel` / `value` posés sur la commande = valeurs par défaut envoyées.
	const defaults = [
		command.channel != null && params.channel
			? i18n.t('devices:model.channelValue', {
					value: label(command.channel, params.channel)
			  })
			: undefined,
		command.value != null ? enumLabel(valueSpec, command.value) : undefined
	]
		.filter(Boolean)
		.join(' · ');

	return (
		<View style={styles.content}>
			<View style={styles.header}>
				<AccessBadge
					access={access}
					confirm={!!params.isConfirmRequired}
				/>
				<Text style={[styles.name, {flex: 1}]}>
					{command.name ?? command.label}
				</Text>
			</View>
			<ScrollView
				style={styles.scroll}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.chips}>
					{params.isPersistable ? <Chip text="persisted" /> : null}
					{params.isConfirmRequired ? (
						<View style={styles.confirm}>
							<View style={styles.confirmDot} />
							<Text style={styles.confirmText}>
								{i18n.t('devices:model.confirm')}
							</Text>
						</View>
					) : null}
				</View>
				{command.types?.length || operation ? (
					<Row
						icon="tag"
						label={i18n.t('devices:model.type')}
						value={(command.types ?? []).join(', ')}
						// Bloc / opération de la commande, ex. « outputs/read ».
						aside={
							operation
								? {
										icon: 'route',
										label: i18n.t('devices:model.path'),
										value: operation
								  }
								: undefined
						}
					/>
				) : null}
				{params.range ? (
					<Row
						icon="arrows-alt-h"
						label={i18n.t('devices:model.range')}
						// Préfixé de son type, ex. « range · 1 – 8 ».
						value={formatValueSpec(params.range)}
					/>
				) : null}
				{params.channel ? (
					<Row
						icon="random"
						label={i18n.t('sensor:dataSource.channel')}
						value={formatRange(params.channel)}
					/>
				) : null}
				{valueSpec ? (
					<Row
						icon="sliders-h"
						label={i18n.t('sensor:dataSource.value')}
						value={formatValueSpec(valueSpec)}
					/>
				) : null}
				{defaults ? (
					<Row
						icon="check"
						label={i18n.t('devices:model.default')}
						value={defaults}
					/>
				) : null}
				<CommandExecuteForm
					command={command}
					deviceId={deviceId}
					model={model}
				/>
			</ScrollView>
		</View>
	);
}

const textColor = '#32404e';
const styles = StyleSheet.create({
	// Plus large que la carte par défaut : le formulaire a des pastilles.
	cardSize: {width: '90%', maxHeight: '85%'},
	// Se contracte dans la carte pour que le contenu défile.
	content: {flexShrink: 1},
	header: {flexDirection: 'row', alignItems: 'center', gap: 10},
	name: {textAlign: 'left', color: textColor, fontSize: 17, fontWeight: 'bold'},
	scroll: {flexGrow: 0, flexShrink: 1},
	// Commande à confirmer : même rouge que le cercle de son icône.
	confirm: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		borderWidth: 1,
		borderColor: CONFIRM_STYLE.color,
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 1
	},
	confirmDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: CONFIRM_STYLE.color
	},
	confirmText: {color: CONFIRM_STYLE.color, fontSize: 11, fontWeight: '600'},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 4,
		marginTop: 10,
		marginBottom: 6
	}
});

export default DeviceCommandModal;
