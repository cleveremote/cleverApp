import React from 'react';
import {View} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';
import SynoptiqueFilterBar, {
	SynoptiqueKey
} from '../../components/synoptique/SynoptiqueFilterBar';
import {brandLogo} from '../../components/common/navigationHeaders';
import TanksScreen from '../tanks/TanksScreen';
import FertigationScreen from '../fertigation/FertigationScreen';
import PlanScreen from '../plan/PlanScreen';

export function SynoptiquesScreen(props: any) {
	const [activeFilter, setActiveFilter] = React.useState<SynoptiqueKey>(
		'FERTIGATION'
	);

	React.useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () => brandLogo()
		});
	}, []);

	const renderView = () => {
		if (activeFilter === 'WELLHEAD') {
			return (
				<FertigationScreen
					onNavigateToTanks={() => setActiveFilter('FERTIGATION')}
				/>
			);
		}
		if (activeFilter === 'FIELDVUE') {
			return <PlanScreen navigation={props.navigation} />;
		}
		return <TanksScreen />;
	};

	return (
		<View style={{flex: 1}}>
			<SynoptiqueFilterBar active={activeFilter} onChange={setActiveFilter} />
			<ScrollView
				scrollEnabled={true}
				contentContainerStyle={{paddingBottom: 16, flexGrow: 1}}>
				{renderView()}
			</ScrollView>
		</View>
	);
}

export default SynoptiquesScreen;
