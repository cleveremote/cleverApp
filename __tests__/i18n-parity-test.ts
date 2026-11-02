/**
 * Chaque langue doit avoir exactement les clés du français (langue de
 * référence) : une clé manquante s'afficherait en français, une clé en trop
 * est du texte mort. Les formes plurielles varient selon la langue (l'arabe
 * en a six) : elles sont comparées par clé de base.
 */
import {resources} from '../src/i18n/resources';

type Tree = {[key: string]: unknown};

const PLURAL = /_(zero|one|two|few|many|other)$/;

const entries = (obj: Tree, prefix = ''): [string, unknown][] =>
	Object.entries(obj).flatMap(([key, value]) =>
		value && typeof value === 'object' && !Array.isArray(value)
			? entries(value as Tree, `${prefix}${key}.`)
			: [[`${prefix}${key}`, value] as [string, unknown]]
	);

const baseKeys = (obj: Tree) =>
	[...new Set(entries(obj).map(([key]) => key.replace(PLURAL, '')))].sort();

const placeholders = (value: unknown): string[] =>
	typeof value === 'string' ? (value.match(/{{\w+}}/g) ?? []).sort() : [];

const namespaces = Object.keys(resources.fr) as (keyof typeof resources.fr)[];
const fr = resources.fr as Record<string, Tree>;

describe.each(['en', 'ar'] as const)('%s', lng => {
	const translated = resources[lng] as Record<string, Tree>;

	it.each(namespaces)('%s has the same keys as fr', ns => {
		expect(baseKeys(translated[ns])).toEqual(baseKeys(fr[ns]));
	});

	it.each(namespaces)('%s keeps the {{placeholders}} of fr', ns => {
		const reference = Object.fromEntries(entries(fr[ns]));
		for (const [key, value] of entries(translated[ns])) {
			const base = key.replace(PLURAL, '');
			const expected = placeholders(
				reference[key] ?? reference[`${base}_other`] ?? reference[base]
			)
				// Une forme plurielle peut taire le nombre (« Chaque minute »).
				.filter(p => p !== '{{count}}' || !PLURAL.test(key));
			expect({key, placeholders: placeholders(value)}).toEqual({
				key,
				placeholders: expect.arrayContaining(expected)
			});
		}
	});
});
