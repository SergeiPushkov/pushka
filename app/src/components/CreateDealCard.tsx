import { useMemo, useState } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';

import { Button } from '@/components/ui/button';
import type { Network } from '@/lib/router';
import { buildCreateDealTx, buildShareLink, Address } from '@/lib/pushka';
import { FACTORY_ADDRESSES } from '@/lib/config';

interface CreateDealCardProps {
  network: Network;
}

const DURATION_OPTIONS = [
  { label: '1 hour', seconds: 3600 },
  { label: '6 hours', seconds: 21600 },
  { label: '24 hours', seconds: 86400 },
  { label: '7 days', seconds: 604800 },
];

export function CreateDealCard({ network }: CreateDealCardProps) {
  const [tonConnectUI] = useTonConnectUI();
  const walletAddress = useTonAddress();

  const [giveTon, setGiveTon] = useState('1');
  const [wantTon, setWantTon] = useState('2');
  const [durationSec, setDurationSec] = useState(DURATION_OPTIONS[2].seconds);
  const [takerPinnedRaw, setTakerPinnedRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastShareLink, setLastShareLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const factoryConfigured = !!FACTORY_ADDRESSES[network];

  const takerPinnedValid = useMemo(() => {
    if (!takerPinnedRaw.trim()) return true;
    try {
      Address.parse(takerPinnedRaw.trim());
      return true;
    } catch {
      return false;
    }
  }, [takerPinnedRaw]);

  const canSubmit =
    factoryConfigured &&
    !busy &&
    !!walletAddress &&
    Number(giveTon) > 0 &&
    Number(wantTon) > 0 &&
    takerPinnedValid;

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    try {
      const deadlineUnix = Math.floor(Date.now() / 1000) + durationSec;
      const tx = buildCreateDealTx(
        {
          giveTon,
          wantTon,
          deadlineUnix,
          takerPinned: takerPinnedRaw.trim() || null,
        },
        network,
      );
      await tonConnectUI.sendTransaction(tx);

      // For MVP we cannot easily resolve the escrow address client-side without
      // also calling factory.getEscrowAddressOf. Showing the factory page is a
      // safe fallback the user can use right now.
      setLastShareLink(buildShareLink('PENDING', network));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-secondary/40 border border-border rounded-2xl p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Create a deal</h2>
        <p className="text-muted-foreground text-sm mt-1">
          You lock the <em>give</em> amount in escrow. The deal settles when a
          taker sends the <em>want</em> amount before the deadline.
        </p>
      </div>

      {!factoryConfigured && (
        <div className="text-warning text-sm border border-warning/40 rounded-md p-3 bg-warning/5">
          PUSHKA Factory is not deployed for {network} yet. See{' '}
          <code className="font-mono">docs/DEPLOY.md</code> to launch your own
          and set <code className="font-mono">VITE_PUSHKA_FACTORY_*</code>.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">You give (TON)</span>
          <input
            className="bg-background border border-border rounded-md px-3 py-2 font-mono"
            inputMode="decimal"
            value={giveTon}
            onChange={(e) => setGiveTon(e.target.value)}
            disabled={!factoryConfigured}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">You want (TON)</span>
          <input
            className="bg-background border border-border rounded-md px-3 py-2 font-mono"
            inputMode="decimal"
            value={wantTon}
            onChange={(e) => setWantTon(e.target.value)}
            disabled={!factoryConfigured}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Deadline</span>
        <div className="flex gap-2 flex-wrap">
          {DURATION_OPTIONS.map((opt) => (
            <Button
              key={opt.seconds}
              variant={durationSec === opt.seconds ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDurationSec(opt.seconds)}
              disabled={!factoryConfigured}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">
          Pin a taker (optional) — only this wallet can accept
        </span>
        <input
          className="bg-background border border-border rounded-md px-3 py-2 font-mono text-xs"
          placeholder="EQ... or kQ..."
          value={takerPinnedRaw}
          onChange={(e) => setTakerPinnedRaw(e.target.value)}
          disabled={!factoryConfigured}
        />
        {!takerPinnedValid && (
          <span className="text-destructive text-xs">Invalid TON address.</span>
        )}
      </label>

      <Button onClick={handleSubmit} disabled={!canSubmit}>
        {!walletAddress
          ? 'Connect wallet to continue'
          : busy
            ? 'Signing…'
            : 'Create deal & lock funds'}
      </Button>

      {error && (
        <div className="text-destructive text-sm border border-destructive/40 rounded-md p-3 bg-destructive/5">
          {error}
        </div>
      )}

      {lastShareLink && (
        <div className="text-success text-sm border border-success/40 rounded-md p-3 bg-success/5">
          Transaction signed. After the network confirms it (~5 sec), open the
          Tonviewer link from your wallet to copy the exact escrow address and
          share it with your counterparty.
        </div>
      )}
    </div>
  );
}
