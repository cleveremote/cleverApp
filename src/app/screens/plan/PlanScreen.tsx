import { FlatList, Platform, Text, View } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { SvgXml } from 'react-native-svg';
import { connect } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCloud, faSun } from '@fortawesome/free-solid-svg-icons';
import SequenceStack from '../../components/cycle/sequenceStack';
import { executeCycle } from '../../../module/process/infrasctructure/store/actions/cycle';

const hapticOptions = {
	enableVibrateFallback: false,
	ignoreAndroidSystemSettings: true
};

const hapticTriggerType: string = Platform.select({
	ios: 'notificationSuccess',
	android: 'impactMedium'
}) as string;

export function PlanScreen(props: any) {
	const [processes, setProcesses] = React.useState<any[]>([]);

	const getAllSequencesInProcess = (values: any[]) => {
		const inProcess = values.filter(
			x => x.status === 'IN_PROCCESS' && x.type === 'SEQUENCE'
		);
		return inProcess.map(x => x.mapSectionId);
	};

	const getProcesses = (ProcessesStatus: any[], cycles: any[]): any[] => {
		const inProcess = ProcessesStatus.filter(
			x => x.status === 'IN_PROCCESS' && x.type === 'SEQUENCE'
		);
		const cyclesInProcess = ProcessesStatus.filter(
			x => x.status === 'IN_PROCCESS' && x.type === 'CYCLE'
		);
		const res = [];
		for (let index = 0; index < cyclesInProcess.length; index++) {
			const cycleInProcess = cyclesInProcess[index];
			const cycle = cycles.find(x => x.id === cycleInProcess.id);
			const sequence = cycle.sequences.find(
				(x: { id: string }) =>
					inProcess.map(j => j.id).indexOf(x.id) !== -1
			);
			if (sequence) {
				res.push({ ...sequence, name: cycle.name + '/' + sequence.name });
			}
		}
		return res;
	};

	const getKeys = (svg: string) => {
		const matches = svg.match(/sel_./g);
		const res = {} as any;
		matches?.forEach(key => {
			res[key] = false;
		});
		return res;
	};

	const mysKeys = useRef(getKeys(props.plan));
	const [showText, setShowText] = useState(mysKeys.current);

	useEffect(() => {
		const inProcessSections = getAllSequencesInProcess(props.statusIn);
		setProcesses(getProcesses(props.statusIn, props.cycles));

		let interval: NodeJS.Timeout | undefined;
		if (inProcessSections.length) {
			setShowText((showText: any) => {
				const res = { ...showText };
				inProcessSections.forEach(data => {
					res[data] = true;
				});

				return res;
			});
		}

		return () => {
			setShowText((showText: any) => {
				const res = { ...showText };
				Object.entries(mysKeys.current).forEach(data => {
					res[data[0]] = false;
				});

				return res;
			});
			if (interval) {
				clearInterval(interval);
			}
		};
	}, [props.statusIn]); ///on values change ...

	const Plan = (props1: any) => {
		let dup = props.plan;
		Object.entries(mysKeys.current).forEach(data => {
			dup = dup.replace(
				`${data[0]}_display`,
				props1[data[0]] ? 'inline' : 'none'
			);
		});

		return (
			<>
				{dup && <SvgXml xml={dup} width={'100%'} height={'100%'} />}
			</>
		);
	};

	const onSkip = (sequenceId: string) => {
		const dto = {
			id: sequenceId,
			status: 'STOPPED',
			action: 'OFF',
			function: 'FUNCTION',
			mode: 'MANUAL',
			type: 'SKIP', // 'QUEUED'
			duration: 0
		};
		props.executeCycle(dto);
	};

	return (
		<View style={{ marginBottom: 60 }}>
			<View style={{ alignSelf: 'stretch', backgroundColor: '#84adea', height: 60, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.22, shadowRadius: 2.22 }}>
				<View style={{ flexDirection: 'row', justifyContent: 'center', borderRadius: 12, marginBottom: 4, elevation: 6, backgroundColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.27, shadowRadius: 4.65 }}>
					<View>
						<FontAwesomeIcon
							icon={faSun}
							size={55}
							color={'#FDB813'}
						/>
						<FontAwesomeIcon
							icon={faCloud}
							size={55}
							color={'white'}
							style={{
								position: 'absolute',
								marginLeft: 20,
								marginTop: 10
							}}
						/>
					</View>

					<Text
						style={{
							marginLeft: 20,
							marginTop: 15,
							fontWeight: 'bold'
						}}>
						temperature : 27°
					</Text>
					<Text
						style={{
							marginLeft: 20,
							marginTop: 15,
							fontWeight: 'bold'
						}}>
						Humidity : 60%
					</Text>
					<Text
						style={{
							marginLeft: 20,
							marginTop: 15,
							fontWeight: 'bold'
						}}>
						Wind : 6 km/h
					</Text>
					<Text
						style={{
							marginLeft: 20,
							marginTop: 15,
							fontWeight: 'bold'
						}}>
						precipitation : 0%
					</Text>
				</View>
			</View>

			<FlatList
				style={{ maxHeight: 100 }}
				data={processes}
				keyExtractor={(item, index) => index.toString()}
				renderItem={({ item }) => (
					<SequenceStack
						navigation={props.navigation}
						cycleId={'props.cycleData.id'}
						item={item}
						isActive={false}
						onSkip={() => onSkip(item.id)}
						stackParent={true}
					/>
				)}
			/>
			<View style={{ width: '100%', height: 200, marginTop: 20 }}>
				{Plan(showText)}
			</View>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	statusIn: state.root_cycle.status,
	cycles: state.root_cycle.cycles,
	plan: state.root_cycle.plan
});

export default connect(mapStateToProps, { executeCycle })(PlanScreen);
