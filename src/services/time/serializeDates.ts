/**
 * Instants envoyés au backend : toujours en ISO 8601 UTC (« …Z »). Appliqué à
 * la frontière socket, pour qu'aucun écran n'ait à s'en soucier.
 */
export const toUtcIso = (value: Date | number): string =>
	new Date(value).toISOString();

/**
 * Remplace en profondeur chaque `Date` par sa forme ISO UTC ; une date
 * invalide devient `null` (JSON.stringify ferait de même). Copie fraîche,
 * l'original n'est pas touché.
 */
export const serializeDatesDeep = (value: any): any => {
	if (value instanceof Date) {
		return isNaN(value.getTime()) ? null : value.toISOString();
	}
	if (Array.isArray(value)) {
		return value.map(serializeDatesDeep);
	}
	if (value !== null && typeof value === 'object') {
		// Objets simples seulement : pas de classes (Buffer, etc.).
		const proto = Object.getPrototypeOf(value);
		if (proto !== Object.prototype && proto !== null) return value;
		const result: Record<string, any> = {};
		for (const key of Object.keys(value)) {
			result[key] = serializeDatesDeep(value[key]);
		}
		return result;
	}
	return value;
};

/** Instant reçu du backend (ISO ou epoch ms) -> epoch ms, `undefined` si absent. */
export const toEpoch = (value: unknown): number | undefined => {
	if (value === null || value === undefined || value === '') return undefined;
	const t =
		value instanceof Date ? value.getTime() : new Date(value as any).getTime();
	return isNaN(t) ? undefined : t;
};
