import React from 'react';
import {ScrollView, View} from 'react-native';
import {connect} from 'react-redux';
import {
	InputForm,
	SelectForm
} from '../../../components/common/FormComponents';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {updateDevice} from '../../../../module/process/infrasctructure/store/actions/device';
import {
	MasterProtocol,
	masterProtocolOptions,
	baudRateOptions
} from '../../../data/modbusTypes';
import {useDeviceSection} from '../useDeviceSection';
import {toNumber, toNumberList} from '../deviceFieldUtils';

// Master Configuration: transport protocol and its connection parameters. The
// visible parameters depend on the protocol — TCP shows the network fields
// (ipAddress, port), a serial protocol (RTU/ASCII) shows `path`; baudRate,
// timeout and discoveryRegisters are common to both. `discoveryRegisters` is
// entered as a comma-separated list and parsed to number[]; an empty list
// disables auto-discovery of unconfigured units.
export function MasterConfigurationSettingsSection(props: any) {
	const transform = (data: any) => ({
		...data,
		config: {
			...data.config,
			port: toNumber(data.config?.port),
			baudRate: toNumber(data.config?.baudRate),
			timeout: toNumber(data.config?.timeout),
			discoveryRegisters: toNumberList(data.config?.discoveryRegisters)
		}
	});

	const embedded = !!props.embedded;
	const {control, errors, watch, markDirty} = useDeviceSection(
		props,
		transform,
		['config']
	);

	const protocol = watch('config.protocol');
	const isTcp = protocol === MasterProtocol.TCP;
	const isSerial =
		protocol === MasterProtocol.RTU || protocol === MasterProtocol.ASCII;

	// Conditional required rules. They read the live protocol from `formValues`
	// so a hidden-but-still-registered field (after toggling TCP↔RTU) is only
	// required when its protocol is actually selected.
	const isFilled = (value: any) =>
		value !== undefined && value !== null && `${value}`.trim() !== '';
	const requiredForTcp = (message: string) => (value: any, formValues: any) =>
		formValues?.config?.protocol !== MasterProtocol.TCP ||
		isFilled(value) ||
		message;
	const requiredForSerial =
		(message: string) => (value: any, formValues: any) => {
			const p = formValues?.config?.protocol;
			return (
				(p !== MasterProtocol.RTU && p !== MasterProtocol.ASCII) ||
				isFilled(value) ||
				message
			);
		};

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};

	return (
		<View style={BoxFormStyle.boxForm}>
			<Body {...bodyProps}>
				<SelectForm
					lstData={masterProtocolOptions}
					control={control}
					errors={errors}
					name="config.protocol"
					placeholder="Protocol*"
					rules={{required: 'Protocol is required'}}
					onValueChange={() => markDirty()}
				/>
				{isTcp && (
					<>
						<InputForm
							control={control}
							errors={errors}
							name="config.ipAddress"
							placeholder="IP address*"
							rules={{
								validate: requiredForTcp(
									'IP address is required'
								)
							}}
							onChangeText={() => markDirty()}
						/>
						<InputForm
							control={control}
							errors={errors}
							name="config.port"
							placeholder="Port*"
							keyboardType="numeric"
							rules={{validate: requiredForTcp('Port is required')}}
							onChangeText={() => markDirty()}
						/>
					</>
				)}
				{isSerial && (
					<InputForm
						control={control}
						errors={errors}
						name="config.path"
						placeholder="Path*"
						rules={{validate: requiredForSerial('Path is required')}}
						onChangeText={() => markDirty()}
					/>
				)}
				<SelectForm
					lstData={baudRateOptions}
					control={control}
					errors={errors}
					name="config.baudRate"
					placeholder="Baud rate"
					onValueChange={() => markDirty()}
				/>
				<InputForm
					control={control}
					errors={errors}
					name="config.timeout"
					placeholder="Timeout (ms)"
					keyboardType="numeric"
					onChangeText={() => markDirty()}
				/>
				<InputForm
					control={control}
					errors={errors}
					name="config.discoveryRegisters"
					placeholder="Discovery registers (comma separated)"
					onChangeText={() => markDirty()}
				/>
			</Body>
		</View>
	);
}

export default connect(null, {updateDevice})(MasterConfigurationSettingsSection);
