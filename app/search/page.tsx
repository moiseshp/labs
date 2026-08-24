import { ArrowUpRightIcon } from 'lucide-react';
import { SearchBox } from './_components/search-box';
import data from '@/lib/data/product-search.json';

export default function SearchPage() {
  return (
    <div className="flex flex-col h-dvh justify-between">
      <div className="bg-emerald-900 p-2 flex justify-center">
        <SearchBox items={data.items} config={data.config} resultsLimit={data.resultsLimit} />
      </div>

      <footer className="flex justify-center p-5">
        <h1 className="font-bold flex items-center gap-2">
          Fuse.js
          <a href="https://fusejs.io/" target="_blank" rel="noopener noreferrer">
            <ArrowUpRightIcon className="size-5" />
          </a>
        </h1>
      </footer>
    </div>
  );
}
