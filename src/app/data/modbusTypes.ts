// Shared types & option lists for the Modbus device editing flow
// (Master → Slave → COM Request). The `*Options` arrays are ready to feed
// into `SelectForm`'s `lstData` prop ({label, value}).

// Transport/protocol a master device speaks. The spec references
// `MasterProtocol` without enumerating it; these values align with the
// existing modbus-connection default (`protocol: 'TCP'`) and the usual
// Modbus transports. Adjust here if the backend expects other values.
export enum MasterProtocol {
	TCP = 'TCP',
	RTU = 'RTU',
	ASCII = 'ASCII'
}

export enum ModbusValueType {
	CUMULATIVE = 'cumulative',
	FLOAT = 'float',
	INT = 'int',
	UINT32 = 'uint32',
	FLOAT_6_BYTES = 'float-6Bytes'
}

// Chosen once at COM request creation, then immutable.
export enum ComRequestType {
	DIGITAL_IO_RESET = 'DIGITAL_IO_RESET',
	DIGITAL_IO_INIT = 'DIGITAL_IO_INIT',
	COM_INIT = 'COM_INIT',
	COM_RESET = 'COM_RESET',
	COM_READ = 'COM_READ',
	COM_WRITE = 'COM_WRITE',
	DIGITAL_INPUT = 'DIGITAL_INPUT',
	DIGITAL_OUTPUT = 'DIGITAL_OUTPUT',
	ANALOG_OUTPUT = 'ANALOG_OUTPUT',
	ANALOG_INPUT = 'ANALOG_INPUT',
	INVERTER_INIT = 'INVERTER_INIT',
	INVERTER_RESET = 'INVERTER_RESET',
	INVERTER_WRITE = 'INVERTER_WRITE',
	INVERTER_READ = 'INVERTER_READ'
}

// Weather forecast data points a FORCAST sensor can track. Stored in
// `config.forcastDataName`; the labels are the raw open-meteo variable names.
export enum ForcastDataName {
	TEMPERATURE_2M_MAX = 'temperature_2m_max',
	TEMPERATURE_2M_MIN = 'temperature_2m_min'
}

export enum ModbusFunctionName {
	READ_COILS = 'readCoils',
	READ_DISCRETE_INPUTS = 'readDiscreteInputs',
	READ_HOLDING_REGISTERS = 'readHoldingRegisters',
	READ_INPUT_REGISTERS = 'readInputRegisters',
	WRITE_SINGLE_COIL = 'writeCoil',
	WRITE_SINGLE_REGISTER = 'writeRegister',
	WRITE_MULTIPLE_COILS = 'writeCoils',
	WRITE_MULTIPLE_REGISTERS = 'writeRegisters'
}

// Device discriminator kept in `root_device.devices` entries.
export type DeviceType = 'MASTER' | 'SLAVE';

const toOptions = (e: Record<string, string>) =>
	Object.values(e).map(value => ({label: value, value}));

// Baud rates proposés pour un master série (RTU/ASCII). Valeurs numériques :
// `config.baudRate` est stocké en nombre (voir `toNumber`), et SelectForm
// compare les valeurs coercées en chaîne, donc des nombres conviennent.
export const baudRateOptions = [
	4800, 9600, 19200, 38400, 57600, 115200, 128000, 256000
].map(value => ({label: `${value}`, value}));

export const masterProtocolOptions = toOptions(MasterProtocol);
export const modbusValueTypeOptions = toOptions(ModbusValueType);
export const comRequestTypeOptions = toOptions(ComRequestType);
export const modbusFunctionOptions = toOptions(ModbusFunctionName);
export const forcastDataNameOptions = toOptions(ForcastDataName);
