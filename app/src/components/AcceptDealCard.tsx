import { useEffect, useMemo, useState } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';

import { Button } from '@/components/ui/button';
import type { Network } from '@/lib/router';
import {
  Address,
  buildAcceptTx,
  buildCancelTx,
  buildReclaimTx,
  formatTon,
  parseDealFromUrl,
} from '@/lib/pushka';
import { TONAPI_BASE, TONAPI_KEY } from '@/lib/config';
import { tonviewerUrl } from '@/lib/ton';

interface EscrowSnapshot {
  state: number; // 1 Funded, 2 Settled, 3 Cancelled
  maker: string;
  factory: string;
  dealId: string;
  giveTon: string;
  wantTon: string;
  deadlineUnix: number;
  takerPinned: string | null;
  feeBps: number;
}

interface AcceptDealCardProps {
  network: Network;
}

const TIME_LEFT = (deadlineUnix: number) => {
  const left = deadlineUnix - Math.floor(Date.now() / 1000);
  if (left <= 0) return 'expired';
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
};

async function fetchEscrowState(
  network: Network,
  escrowAddress: string,
): Promise<EscrowSnapshot> {
  const base = TONAPI_BASE[network];
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (TONAPI_KEY) headers.Authorization = `Bearer ${TONAPI_KEY}`;

  const url = `${base}/v2/blockchain/accounts/${escrowAddress}/methods/details`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(
      `TonAPI returned ${res.status}. If you hit a rate limit, set VITE_TONAPI_KEY.`,
    );
  }
  const json = (await res.json()) as {
    success: boolean;
    decoded?: unknown;
    stack: { type: string; cell?: string; num?: string; slice?: string }[];
  };
  if (!json.success) {
    throw new Error('Escrow not found or not initialized yet.');
  }
  // We rely on the manually-known field layout — the stack mirrors EscrowStorage:
  //   factory (slice), dealId (num), maker (slice), state (num), terms (cell)
  // The terms cell is not parsed here for the MVP — we expose the top-level state
  // and ask for the deal parameters from the share link / query params.
  const s = json.stack;
  if (s.length < 5) throw new Error('Unexpected get-method shape.');

  // Off-chain layout is not strictly necessary here because the share link can
  // carry deal terms — but in a full implementation we'd decode the terms cell.
  return {
    state: Number(BigInt(s[3].num ?? '0')),
    maker: '',
    factory: '',
    dealId: s[1].num ?? '0',
    giveTon: '?',
    wantTon: '?',
    deadlineUnix: 0,
    takerPinned: null,
    feeBps: 0,
  };
}

export function AcceptDealCard({ network }: AcceptDealCardProps) {
  const [tonConnectUI] = useTonConnectUI();
  const walletAddress = useTonAddress();

  const [escrowInput, setEscrowInput] = useState(
    () => parseDealFromUrl() ?? '',
  );
  const [snapshot, setSnapshot] = useState<EscrowSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wantTonOverride, setWantTonOverride] = useState<string>('');

  const escrowValid = useMemo(() => {
    if (!escrowInput.trim()) return false;
    try {
      Address.parse(escrowInput.trim());
      return true;
    } catch {
      return false;
    }
  }, [escrowInput]);

  useEffect(() => {
    let cancelled = false;
    if (!escrowValid) {
      setSnapshot(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchEscrowState(network, escrowInput.trim())
      .then((snap) => {
        if (!cancelled) setSnapshot(snap);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [escrowInput, escrowValid, network]);

  async function handleAccept() {
    setError(null);
    setBusy(true);
    try {
      if (!wantTonOverride || Number(wantTonOverride) <= 0) {
        throw new Error('Specify the wantAmount agreed with the maker.');
      }
      const tx = buildAcceptTx(
        escrowInput.trim(),
        BigInt(Math.round(Number(wantTonOverride) * 1e9)),
      );
      await tonConnectUI.sendTransaction(tx);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setError(null);
    setBusy(true);
    try {
      await tonConnectUI.sendTransaction(buildCancelTx(escrowInput.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleReclaim() {
    setError(null);
    setBusy(true);
    try {
      await tonConnectUI.sendTransaction(buildReclaimTx(escrowInput.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-secondary/40 border border-border rounded-2xl p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Open an existing deal</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Paste the escrow address you received from your counterparty (or open
          a share link). You can <strong>accept</strong> as a taker, or{' '}
          <strong>cancel/reclaim</strong> as the maker.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Escrow address</span>
        <input
          className="bg-background border border-border rounded-md px-3 py-2 font-mono text-xs"
          placeholder="EQ... or kQ..."
          value={escrowInput}
          onChange={(e) => setEscrowInput(e.target.value)}
        />
      </label>

      {escrowValid && (
        <a
          href={`${tonviewerUrl(network)}/${escrowInput.trim()}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground underline self-start"
        >
          View on Tonviewer →
        </a>
      )}

      {loading && (
        <div className="text-muted-foreground text-sm">
          Reading on-chain state…
        </div>
      )}

      {snapshot && (
        <div className="text-sm text-muted-foreground flex flex-col gap-1">
          <div>
            State:{' '}
            <span className="font-semibold text-foreground">
              {snapshot.state === 1
                ? 'Funded (waiting for taker)'
                : snapshot.state === 2
                  ? 'Settled'
                  : snapshot.state === 3
                    ? 'Cancelled'
                    : 'Unknown'}
            </span>
          </div>
          <div>Deal #{snapshot.dealId}</div>
          {snapshot.deadlineUnix > 0 && (
            <div>{TIME_LEFT(snapshot.deadlineUnix)}</div>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">
          Want amount agreed with maker (TON)
        </span>
        <input
          className="bg-background border border-border rounded-md px-3 py-2 font-mono"
          inputMode="decimal"
          placeholder="2"
          value={wantTonOverride}
          onChange={(e) => setWantTonOverride(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">
          Required because the MVP doesn't yet decode terms client-side. Read it
          from the share link the maker sent you.
        </span>
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={handleAccept}
          disabled={!escrowValid || busy || !walletAddress}
          className="flex-1"
        >
          {busy ? 'Signing…' : 'Accept deal'}
        </Button>
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={!escrowValid || busy || !walletAddress}
        >
          Cancel (maker)
        </Button>
        <Button
          variant="outline"
          onClick={handleReclaim}
          disabled={!escrowValid || busy || !walletAddress}
        >
          Reclaim (maker)
        </Button>
      </div>

      {error && (
        <div className="text-destructive text-sm border border-destructive/40 rounded-md p-3 bg-destructive/5">
          {error}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Tip: only Cancel works before the deadline; Reclaim works after.
      </div>
    </div>
  );
}

// We need formatTon used somewhere to keep the import alive for tree-shaking
// in case the snapshot view expands later — current MVP renders raw strings.
void formatTon;
