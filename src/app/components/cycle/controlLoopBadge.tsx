import React from 'react';
import i18n from 'i18next';
import {Text, View} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faGaugeHigh, faSliders} from '@fortawesome/free-solid-svg-icons';
import {ControlLoop, isFollowLoop} from '../../data/controlLoopTypes';

// Badge d'une vanne CTRL dont la boucle est activée : « Follow » (suivi
// potentiomètre) ou « Regulation » (consigne). Passé en `badge` d'elementStack.
export function controlLoopBadge(loop?: ControlLoop, color = '#32404e') {
	if (!loop) return undefined;
	const follow = isFollowLoop(loop);
	return (
		<View style={{flexDirection: 'row', alignItems: 'center'}}>
			<FontAwesomeIcon
				icon={follow ? faSliders : faGaugeHigh}
				size={14}
				color={color}
			/>
			<Text style={{color, fontSize: 11, marginLeft: 4}}>
				{follow
					? i18n.t('cycle:controlLoop.follow')
					: i18n.t('cycle:controlLoop.regulation')}
			</Text>
		</View>
	);
}
