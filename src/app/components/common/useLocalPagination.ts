import {useCallback, useEffect, useMemo, useState} from 'react';

export const EVENTS_PAGE_SIZE = 20;

/**
 * Pagination locale d'une liste déjà chargée : seuls les `pageSize × page`
 * premiers éléments sont rendus, `loadMore` ajoute une page. Revient à la
 * première page quand `resetKey` change (nouvelle requête, autre filtre).
 */
export function useLocalPagination<T>(
	items: T[],
	resetKey: unknown,
	pageSize: number = EVENTS_PAGE_SIZE
) {
	const [page, setPage] = useState(1);

	useEffect(() => setPage(1), [resetKey]);

	const visible = useMemo(
		() => items.slice(0, page * pageSize),
		[items, page, pageSize]
	);
	const hasMore = visible.length < items.length;

	const loadMore = useCallback(() => {
		if (hasMore) setPage(p => p + 1);
	}, [hasMore]);

	return {visible, hasMore, loadMore, remaining: items.length - visible.length};
}

/** Distance (px) du bas de la ScrollView sous laquelle on charge la suite. */
export const isNearBottom = (
	{layoutMeasurement, contentOffset, contentSize}: any,
	threshold = 300
) =>
	layoutMeasurement.height + contentOffset.y >=
	contentSize.height - threshold;
