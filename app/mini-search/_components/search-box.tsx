'use client';

import { useDeferredValue, useId, useMemo, useState } from 'react';
import MiniSearch, { type Options, type SearchOptions } from 'minisearch';
import { SearchIcon, XIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface MenuItem {
  productId: number;
  name: string;
  category: string;
  description: string;
  keywords?: string[];
}

interface MenuSearchResult {
  id: number;
  name: string;
  category: string;
  description: string;
}

export interface MiniSearchConfig extends Options<MenuItem> {
  searchOptions: SearchOptions;
  minQueryLength: number;
}

interface SearchBoxProps {
  items: MenuItem[];
  config: MiniSearchConfig;
  resultsLimit: number;
}

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function SearchBox({ items, config, resultsLimit }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const listboxId = useId();

  const miniSearch = useMemo(() => {
    const index = new MiniSearch<MenuItem>({
      ...config,
      processTerm: term => stripAccents(term).toLowerCase(),
    });

    index.addAll(items);

    return index;
  }, [items, config]);

  const results = useMemo(() => {
    const trimmed = deferredQuery.trim();
    if (trimmed.length < config.minQueryLength) return [];
    return miniSearch.search(trimmed, config.searchOptions).slice(0, resultsLimit) as unknown as MenuSearchResult[];
  }, [miniSearch, deferredQuery, config, resultsLimit]);

  const isOpen = query.trim().length > 0;

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative rounded-full bg-white px-2">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-emerald-900" />
        <Input
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Busca tu bebida o alimento favorito"
          value={query}
          onChange={event => setQuery(event.target.value)}
          className="pr-8 pl-10 h-14 border-none"
        />
        {query && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setQuery('')}
            className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Resultados de búsqueda"
          className="absolute z-10 left-5 right-5 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-md"
        >
          {results.length === 0 ? (
            <p className="px-2.5 py-3 text-sm text-muted-foreground">Sin resultados para &ldquo;{query}&rdquo;</p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto p-1">
              {results.map(result => {
                return (
                  <li key={result.id} role="option" aria-selected={false}>
                    <div className="flex flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold trucante">{result.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{result.description}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
