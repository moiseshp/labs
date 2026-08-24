import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-5">
      <div className="flex flex-col">
        <Button>
          <Link href="/fuse-search">Fuse.js</Link>
        </Button>
        <Button>
          <Link href="/mini-search">MiniSearch</Link>
        </Button>
      </div>
    </div>
  );
}
