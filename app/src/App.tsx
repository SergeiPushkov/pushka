import { useEffect, useState } from 'react';
import {
  TonConnectButton,
  THEME,
  useTonAddress,
  useTonConnectUI,
} from '@tonconnect/ui-react';
import { Sun, Moon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NetworkDropdown } from './components/NetworkDropdown';
import { useRouter } from './lib/router';
import { formatAddressForNetwork } from './lib/ton';
import { CreateDealCard } from './components/CreateDealCard';
import { AcceptDealCard } from './components/AcceptDealCard';
import { PUSHKA_BRAND } from './lib/config';
import { parseDealFromUrl } from './lib/pushka';

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('ton-dapp:theme');
    return stored === 'light' ? 'light' : 'dark';
  });
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ton-dapp:theme', theme);
    tonConnectUI.uiOptions = {
      uiPreferences: { theme: theme === 'light' ? THEME.LIGHT : THEME.DARK },
    };
  }, [theme, tonConnectUI]);

  return { theme, setTheme };
}

type Tab = 'create' | 'accept';

export default function App() {
  const { network, setTestnet } = useRouter();
  const walletAddress = useTonAddress();
  const { theme, setTheme } = useTheme();

  // If we landed via a share link, default to the Accept tab so the taker sees
  // the deal immediately.
  const [tab, setTab] = useState<Tab>(() =>
    parseDealFromUrl() ? 'accept' : 'create',
  );

  const userWallet = walletAddress
    ? (() => {
        try {
          return formatAddressForNetwork(walletAddress, network);
        } catch {
          return walletAddress;
        }
      })()
    : '';

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Topbar ─── */}
      <header className="flex items-center justify-between px-7 h-[60px] border-b sticky top-0 z-50 bg-background max-sm:px-4 max-sm:h-auto max-sm:flex-wrap max-sm:gap-2.5 max-sm:py-3">
        <div className="flex items-center gap-2.5 text-[17px] font-bold max-sm:text-[15px]">
          <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-[#FF3D3D] to-[#FF9933] flex items-center justify-center max-sm:w-7 max-sm:h-7 max-sm:rounded-[7px] text-white font-black">
            P
          </div>
          {PUSHKA_BRAND.name}
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full size-10 bg-secondary max-sm:size-9"
            title="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="size-[18px]" />
            ) : (
              <Moon className="size-[18px]" />
            )}
          </Button>
          <NetworkDropdown network={network} setTestnet={setTestnet} />
          <TonConnectButton />
        </div>
      </header>

      {/* ─── Main content ─── */}
      <main className="flex-1 py-8 px-6 max-w-[720px] mx-auto w-full">
        <section className="flex flex-col items-center text-center gap-3 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {PUSHKA_BRAND.tagline}
          </h1>
          <p className="text-muted-foreground text-[15px] max-w-md">
            {PUSHKA_BRAND.description}
          </p>
          <p className="text-xs text-muted-foreground">
            Network:{' '}
            <span
              className={cn(
                'font-semibold',
                network === 'mainnet' ? 'text-success' : 'text-warning',
              )}
            >
              {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
            </span>
            {userWallet && (
              <>
                {' • '}
                <span className="font-mono break-all">
                  {userWallet.slice(0, 6)}…{userWallet.slice(-4)}
                </span>
              </>
            )}
          </p>
        </section>

        <nav className="flex gap-2 mb-4">
          <Button
            variant={tab === 'create' ? 'default' : 'outline'}
            onClick={() => setTab('create')}
            className="flex-1"
          >
            Create deal
          </Button>
          <Button
            variant={tab === 'accept' ? 'default' : 'outline'}
            onClick={() => setTab('accept')}
            className="flex-1"
          >
            Open / accept
          </Button>
        </nav>

        {tab === 'create' ? (
          <CreateDealCard network={network} />
        ) : (
          <AcceptDealCard network={network} />
        )}

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          <p>
            Open-source · Tolk smart contract ·{' '}
            <a
              className="underline"
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
            >
              source
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
