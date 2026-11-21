import {AnalogSignalType} from '../src/app/data/analogTypes';
import {
	InverterAnalogInput,
	curveInputOf,
	curveOf,
	pidFeedbackInputOf,
	pidFeedbackSensorOf,
	readingToPhysical,
	targetToPercent,
	groupParameters,
	scaleDecimals,
	toDisplay,
	toRaw
} from '../src/app/data/inverterTypes';

const parameter = (blockId: string) => ({
	blockId,
	field: blockId.toLowerCase().replace('.', '_'),
	readCommandId: `${blockId}-read`,
	setCommandId: `${blockId}-set`,
	isPersistent: true
});

describe('inverterTypes', () => {
	it('should convert a raw value to its physical value', () => {
		expect(toDisplay(5000, 0.01)).toBe('50');
		expect(toDisplay(1234, 0.01)).toBe('12.34');
		expect(toDisplay(100, 0.1)).toBe('10');
		expect(toDisplay(3, undefined)).toBe('3');
		expect(toDisplay(undefined, 0.01)).toBe('');
		expect(toDisplay(3000, 0.001)).toBe('3');
	});

	it('should convert an input back to its raw value, null when empty', () => {
		expect(toRaw('50', 0.01)).toBe(5000);
		expect(toRaw('12,34', 0.01)).toBe(1234);
		expect(toRaw('10', 0.1)).toBe(100);
		expect(toRaw('', 0.01)).toBeNull();
		expect(toRaw(null, 0.01)).toBeNull();
		expect(toRaw('abc', 0.01)).toBeNaN();
	});

	it('should count the decimals of a scale', () => {
		expect(scaleDecimals(0.01)).toBe(2);
		expect(scaleDecimals(0.1)).toBe(1);
		expect(scaleDecimals(1)).toBe(0);
		expect(scaleDecimals(undefined)).toBe(0);
	});

	it('should group parameters by Fgg, with the PID feedback source first in the analog inputs', () => {
		const groups = groupParameters(
			['F11.06', 'F03.06', 'F00.09', 'F11.03', 'F03.00', 'X99.00'].map(
				parameter
			)
		);

		expect(groups).toEqual([
			{key: 'F00', blockIds: ['F00.09']},
			{key: 'F03', blockIds: ['F11.03', 'F03.00', 'F03.06']},
			{key: 'F11', blockIds: ['F11.06']},
			{key: 'other', blockIds: ['X99.00']}
		]);
	});

	describe('analog sensor of the PID feedback', () => {
		const pressure = {
			signalType: AnalogSignalType.VOLTAGE as const,
			inputMin: 0.5,
			inputMax: 4.5,
			outputMin: 0,
			outputMax: 10,
			unit: 'bar'
		};

		it('should convert a sensor target to the PID percent, clamped', () => {
			expect(targetToPercent(pressure, 3)).toBe(30);
			expect(targetToPercent(pressure, 12)).toBe(100);
			expect(targetToPercent({...pressure, outputMax: 0}, 3)).toBeUndefined();
		});

		it('should convert an electrical reading to the sensor value', () => {
			expect(readingToPhysical(pressure, 1.7)).toBe(3);
		});

		it('should report a 4-20 mA sensor as 2-10 V', () => {
			expect(
				curveOf({
					...pressure,
					signalType: AnalogSignalType.CURRENT,
					inputMin: 4,
					inputMax: 20
				})
			).toEqual({lowVoltage: 2, highVoltage: 10});
		});

		it('should resolve the feedback input from F11.03 (AI1 by default)', () => {
			const f1103 = (value?: number) => [{...parameter('F11.03'), value}];
			expect(pidFeedbackInputOf({parameters: f1103()})).toBe(InverterAnalogInput.AI1);
			expect(pidFeedbackInputOf({parameters: f1103(3)})).toBe(InverterAnalogInput.AI2);
			expect(pidFeedbackInputOf({parameters: f1103(0)})).toBeUndefined();
			expect(
				pidFeedbackSensorOf({parameters: f1103(3), analogInputs: {AI1: pressure}})
			).toBeUndefined();
		});

		it('should find the input of a curve block', () => {
			expect(curveInputOf('F03.02')).toBe(InverterAnalogInput.AI1);
			expect(curveInputOf('F03.09')).toBe(InverterAnalogInput.AI2);
			expect(curveInputOf('F03.04')).toBeUndefined();
		});
	});
});
