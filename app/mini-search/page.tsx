import { ArrowUpRightIcon } from 'lucide-react';
import { SearchBox, type MiniSearchConfig } from './_components/search-box';
import data from '@/lib/data/product-search-minisearch.json';

export default function SearchPage() {
  return (
    <div className="flex flex-col h-dvh justify-between">
      <div className="bg-emerald-900 p-2 flex justify-center">
        <SearchBox items={data.items} config={data.config as MiniSearchConfig} resultsLimit={data.resultsLimit} />
      </div>

      <footer className="flex justify-center p-5">
        <a
          className="font-bold flex items-center gap-2"
          href="https://github.com/lucaong/minisearch"
          target="_blank"
          rel="noopener noreferrer"
        >
          MiniSearch
          <ArrowUpRightIcon className="size-5" />
        </a>
      </footer>
    </div>
  );
}
