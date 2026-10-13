// react-hook-form stores TextInput values as strings; these helpers coerce the
// numeric Modbus fields back to their real types before an entity is staged.

// Coerce to a number, or leave undefined/null untouched (so optional fields stay
// absent rather than becoming NaN).
export const toNumber = (value: any): any => {
	if (value === undefined || value === null || value === '') return value;
	const n = Number(value);
	return Number.isNaN(n) ? value : n;
};

// An address may be typed as a decimal integer (e.g. "40001") or as a
// hexadecimal value prefixed with 0x (e.g. "0x9C41"); both are stored as a
// number. Empty/undefined/null are left untouched (the required rule handles
// them) and any unparseable string is returned as-is so validation can flag it.
const HEX_ADDRESS = /^0x[0-9a-f]+$/i;
const DEC_ADDRESS = /^\d+$/;

export const isValidAddress = (value: any): boolean => {
	if (value === undefined || value === null || value === '') return true;
	const s = String(value).trim();
	return HEX_ADDRESS.test(s) || DEC_ADDRESS.test(s);
};

export const toAddressNumber = (value: any): any => {
	if (value === undefined || value === null || value === '') return value;
	const s = String(value).trim();
	if (HEX_ADDRESS.test(s)) return parseInt(s, 16);
	const n = Number(s);
	return Number.isNaN(n) ? value : n;
};

// Parse a comma/space separated list (or an already-parsed array) into number[].
export const toNumberList = (value: any): number[] => {
	if (Array.isArray(value)) {
		return value.map(v => Number(v)).filter(v => !Number.isNaN(v));
	}
	if (typeof value === 'string') {
		return value
			.split(/[\s,]+/)
			.map(s => s.trim())
			.filter(s => s.length > 0)
			.map(s => Number(s))
			.filter(v => !Number.isNaN(v));
	}
	return [];
};

// Display an array of registers as a comma-separated string for a text input.
export const fromNumberList = (value: any): string =>
	Array.isArray(value) ? value.join(', ') : `${value ?? ''}`;
