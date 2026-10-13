import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {connect} from 'react-redux';
import {
	InputForm,
	SelectForm,
	SwitchForm
} from '../../../components/common/FormComponents';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {updateModbusTask} from '../../../../module/process/infrasctructure/store/actions/modbus-task';
import {
	modbusFunctionOptions,
	modbusValueTypeOptions
} from '../../../data/modbusTypes';
import {useComRequestSection} from './useComRequestSection';
import {toNumber, toAddressNumber, isValidAddress} from '../deviceFieldUtils';

// COM request Configuration + a dedicated Parameters sub-section. All editable
// fields live under `config` (address, function, value type, disabled, done,
// params) — mirroring the Slave Configuration section — so the whole `config`
// object is the owned/staged field. The immutable creation `type`
// (ComRequestType) is a top-level field owned by the General section and is not
// touched here; the value type below is Modbus's `config.type` (ModbusValueType).
export function ComRequestConfigurationSettingsSection(props: any) {
	const transform = (data: any) => ({
		...data,
		config: {
			...data.config,
			address: toAddressNumber(data.config?.address),
			params: {
				...data.config?.params,
				length: toNumber(data.config?.params?.length),
				scale: toNumber(data.config?.params?.scale),
				persistence: data.config?.params?.persistence
					? {
							...data.config.params.persistence,
							address: toNumber(
								data.config.params.persistence.address
							)
					  }
					: data.config?.params?.persistence
			}
		}
	});

	const embedded = !!props.embedded;
	const {control, errors, watch, markDirty} = useComRequestSection(
		props,
		transform,
		['config']
	);

	const persist = watch('config.params.persistence.persist');

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};

	return (
		<View style={BoxFormStyle.boxForm}>
			<Body {...bodyProps}>
				<InputForm
					control={control}
					errors={errors}
					name="config.address"
					placeholder="Address* (decimal or hex 0x...)"
					rules={{
						required: 'Address is required',
						validate: (v: any) =>
							isValidAddress(v) ||
							'Enter a decimal number or a hex value (0x...)'
					}}
					onChangeText={() => markDirty()}
				/>
				<SelectForm
					lstData={modbusFunctionOptions}
					control={control}
					errors={errors}
					name="config.function"
					placeholder="Function"
					onValueChange={() => markDirty()}
				/>
				<SelectForm
					lstData={modbusValueTypeOptions}
					control={control}
					errors={errors}
					name="config.type"
					placeholder="Value type"
					onValueChange={() => markDirty()}
				/>

				<Text style={styles.subSectionTitle}>Parameters</Text>
				<InputForm
					control={control}
					errors={errors}
					name="config.params.length"
					placeholder="Length"
					keyboardType="numeric"
					onChangeText={() => markDirty()}
				/>
				<InputForm
					control={control}
					errors={errors}
					name="config.params.scale"
					placeholder="Scale"
					keyboardType="numeric"
					onChangeText={() => markDirty()}
				/>
				<InputForm
					control={control}
					errors={errors}
					name="config.params.unit"
					placeholder="Unit"
					onChangeText={() => markDirty()}
				/>
				<InputForm
					control={control}
					errors={errors}
					name="config.params.formula"
					placeholder="Formula"
					onChangeText={() => markDirty()}
				/>
				<SwitchForm
					control={control}
					errors={errors}
					name="config.params.persistence.persist"
					placeholder="Persist"
					onChangeText={() => markDirty()}
				/>
				{persist ? (
					<InputForm
						control={control}
						errors={errors}
						name="config.params.persistence.address"
						placeholder="Persistence address"
						keyboardType="numeric"
						onChangeText={() => markDirty()}
					/>
				) : null}

				
				<SwitchForm
					control={control}
					errors={errors}
					name="config.disabled"
					placeholder="Disabled"
					onChangeText={() => markDirty()}
				/>
				<SwitchForm
					control={control}
					errors={errors}
					name="config.done"
					placeholder="Done"
					onChangeText={() => markDirty()}
				/>
			</Body>
		</View>
	);
}

const styles = {
	subSectionTitle: {
		color: '#32404e',
		fontSize: 15,
		fontWeight: 'bold' as const,
		marginTop: 16,
		marginBottom: 8
	}
};

export default connect(null, {updateModbusTask})(
	ComRequestConfigurationSettingsSection
);
