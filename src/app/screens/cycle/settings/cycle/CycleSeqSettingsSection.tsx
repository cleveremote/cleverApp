import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React, {useEffect, useRef} from 'react';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {hapticOptions} from '../../../../data/cycleTypes';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {connect} from 'react-redux';
import {useForm} from 'react-hook-form';
import {DragableForm} from '../../../../components/common/FormComponents';
import {updateCycle} from '../../../../../module/process/infrasctructure/store/actions/cycle';
import {
	loadSequences,
	saveSequences
} from '../../../../../module/process/infrasctructure/store/actions/sequence';

export function SeqSettingsSec(props: any) {
	// Le cycle vient soit d'une prop directe (mode embarqué inline dans
	// CycleSettingsScreen), soit des params de route (mode écran autonome).
	const embedded = !!props.embedded;
	const cycleData = props.cycleData ?? props.route?.params?.cycleData;
	const cycleParamRef = useRef(cycleData);
	cycleParamRef.current = cycleData;

	const sequencesRef = useRef(props.sequences);
	sequencesRef.current = props.sequences;

	// Baseline du contenu des séquences au (re)chargement pour CE cycle. On ne se
	// fie pas au flag `isModified` (il peut persister) : on compare le contenu
	// pour ne synchroniser que sur un vrai changement utilisateur, et jamais au
	// simple affichage de la liste.
	const seqBaselineRef = useRef<string | null>(null);
	// Dernier jeton de rechargement autoritaire observé (cf. slice) : un changement
	// signale un remplacement « propre » de la liste (ex. purge après save auto de
	// suppression) → on ré-établit la baseline sans marquer le cycle modifié.
	const seqPrevTokenRef = useRef<number>(props.sequencesToken);

	const {
		control,
		handleSubmit,
		formState: {errors},
		setValue
	} = useForm({...cycleParamRef.current});

	const save = (data: any, e: any) => {
		const sequences = (data.sequences || data || []).map(
			(x: any, index: number) => ({...x, order: index})
		);
		props.saveSequences(sequences, () => {
			props.updateCycle(
				{
					...cycleParamRef.current,
					sequences: sequences,
					isModified: true
				},
				() => {
					e && props.navigation.dispatch(e.data.action);
				}
			);
		});
	};
	const checkChanges = (e: any) => {
		const isModified = !!sequencesRef.current?.find(
			(x: any) => x.isModified
		);
		if (!isModified && !cycleParamRef.current.isModified) return;
		if (!['GO_BACK', 'POP', 'POP_TO_TOP'].includes(e.data.action.type))
			return;
		e.preventDefault();

		save(sequencesRef.current, e);
	};

	useEffect(() => {
		// En mode embarqué, l'entête appartient à l'écran parent : on ne le
		// modifie pas.
		if (!embedded) {
			props.navigation.setOptions({
				headerLeft: () =>
					navigationHeader(
						() => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							props.navigation.goBack();
						},
						'arrow-alt-circle-left',
						false
					)
			});
		}

		props.loadSequences(cycleParamRef.current);
	}, []);

	useEffect(() => {
		setValue('sequences', sequencesRef.current, {
			shouldValidate: true
		});
		if (embedded) {
			// Pas de listener beforeRemove propre en mode embarqué (l'écran
			// parent CycleSettingsScreen possède le sien). Mais la persistance
			// réelle se fait via saveCycle sur le cycle entier : on répercute
			// donc les édits de séquences (slice cycle_sequence) dans le cycle
			// partagé (state.root_cycle.cycle) pour qu'ils soient enregistrés à
			// la sortie. Sans ça, les modifications restent isolées et perdues.
			// Garde d'appartenance : ignorer un slice appartenant à un autre cycle
			// (partagé) pour ne pas synchroniser des séquences périmées.
			if (props.sequencesParentId !== cycleParamRef.current?.id) {
				seqBaselineRef.current = null;
				seqPrevTokenRef.current = props.sequencesToken;
				return;
			}
			const snapshot = JSON.stringify(sequencesRef.current ?? []);
			if (seqPrevTokenRef.current !== props.sequencesToken) {
				// Rechargement autoritaire : nouvelle baseline, pas de synchro
				// (sinon on re-marquerait le cycle modifié).
				seqPrevTokenRef.current = props.sequencesToken;
				seqBaselineRef.current = snapshot;
				return;
			}
			if (seqBaselineRef.current === null) {
				// Fraîchement chargé pour ce cycle : mémoriser la baseline sans
				// rien synchroniser (le simple affichage ne doit pas marquer le
				// cycle comme modifié).
				seqBaselineRef.current = snapshot;
				return;
			}
			if (snapshot === seqBaselineRef.current) return; // aucun vrai changement
			const sequences = (sequencesRef.current ?? []).map(
				(x: any, index: number) => ({...x, order: index})
			);
			props.updateCycle({
				...cycleParamRef.current,
				sequences,
				isModified: true
			});
			return;
		}
		const listenerUnsubscribe = props.navigation.addListener(
			'beforeRemove',
			checkChanges
		);
		return () => listenerUnsubscribe();
	}, [props.sequences, props.sequencesParentId, props.sequencesToken]);

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				<DragableForm
					isList={true}
					scrollEnabled={!embedded}
					navigation={props.navigation}
					parentId={cycleParamRef.current.id}
					control={control}
					errors={errors}
					name="sequences"
					onDragEnd={() => handleSubmit(save)()}
				/>
				<View style={styles.addButtonWrapper}>
					<TouchableOpacity
						style={styles.addButton}
						onPress={() => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							props.navigation.navigate('SequenceSettingsStack', {
								screen: 'SequenceSettingsMenu',
								params: {
									cycleId: cycleParamRef.current.id
								}
							});
						}}>
						<Icon
							name="times-circle"
							size={30}
							color={colors.dark}
						/>
					</TouchableOpacity>
					<Text style={styles.addLabel}>Add new sequence ...</Text>
				</View>
			</View>
		</View>
	);
}

const colors = {
	dark: '#32404e',
	shadow: '#000',
	white: 'white'
};

const styles = StyleSheet.create({
	container: {
		gap: 8,
		marginVertical: 4,
		alignSelf: 'stretch',
		margin: 20
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: colors.white,
		borderRadius: 12,
		padding: 8,
		elevation: 3,
		shadowColor: colors.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	addButtonWrapper: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	addButton: {
		marginTop: 20,
		transform: [{rotate: '135deg'}]
	},
	addLabel: {
		color: colors.dark,
		fontSize: 15
	}
});

const mapStateToProps = (state: any) => ({
	sequences: state.cycle_sequence.sequences,
	sequencesParentId: state.cycle_sequence.sequencesParentId,
	sequencesToken: state.cycle_sequence.sequencesToken
});

export default connect(mapStateToProps, {
	saveSequences,
	loadSequences,
	updateCycle
})(SeqSettingsSec);
