import { Address, beginCell, toNano, fromNano, type Cell } from '@ton/core';
import { PushkaFactory } from '../../../wrappers-ts/PushkaFactory.gen';
import { PushkaEscrow } from '../../../wrappers-ts/PushkaEscrow.gen';
import { FACTORY_ADDRESSES } from './config';
import type { Network } from './router';

export interface CreateDealInput {
  giveTon: string; // user-facing TON amount string, e.g. "1.5"
  wantTon: string;
  deadlineUnix: number; // unix seconds
  takerPinned: string | null;
}

export interface DealLink {
  network: Network;
  escrowAddress: string;
}

const TX_VALID_FOR_SECONDS = 360;

export class FactoryNotConfiguredError extends Error {
  constructor() {
    super(
      'PUSHKA Factory address is not configured for this network. ' +
        'Set VITE_PUSHKA_FACTORY_TESTNET (or _MAINNET) in your environment and rebuild.',
    );
  }
}

export function getFactoryAddress(network: Network): Address {
  const raw = FACTORY_ADDRESSES[network];
  if (!raw) throw new FactoryNotConfiguredError();
  return Address.parse(raw);
}

export function tryGetFactoryAddress(network: Network): Address | null {
  const raw = FACTORY_ADDRESSES[network];
  return raw ? Address.parse(raw) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Building TonConnect transaction payloads
// ─────────────────────────────────────────────────────────────────────────────

interface TonConnectTx {
  validUntil: number;
  messages: {
    address: string;
    amount: string;
    payload: string;
  }[];
}

function txEnvelope(messages: TonConnectTx['messages']): TonConnectTx {
  return {
    validUntil: Math.floor(Date.now() / 1000) + TX_VALID_FOR_SECONDS,
    messages,
  };
}

function bocBase64(cell: Cell): string {
  return cell.toBoc().toString('base64');
}

// Wraps PushkaFactory.createCellOfCreateDeal with our user-facing inputs.
export function buildCreateDealTx(
  input: CreateDealInput,
  network: Network,
): TonConnectTx {
  const factoryAddr = getFactoryAddress(network);
  const give = toNano(input.giveTon);
  const want = toNano(input.wantTon);
  if (give <= 0n || want <= 0n) {
    throw new Error('Give and want amounts must be positive.');
  }
  if (input.deadlineUnix <= Math.floor(Date.now() / 1000)) {
    throw new Error('Deadline must be in the future.');
  }
  const takerPinned = input.takerPinned
    ? Address.parse(input.takerPinned)
    : null;

  const body = PushkaFactory.createCellOfCreateDeal({
    takerPinned,
    giveAmount: give,
    wantAmount: want,
    deadline: BigInt(input.deadlineUnix),
  });

  // Maker must cover: giveAmount + escrow deploy buffer (0.05) + factory gas
  // (0.02) + comfortable cushion (0.13) = giveAmount + 0.2 TON.
  const msgValue = give + toNano('0.2');

  return txEnvelope([
    {
      address: factoryAddr.toString({ bounceable: true, urlSafe: true }),
      amount: msgValue.toString(),
      payload: bocBase64(body),
    },
  ]);
}

export function buildAcceptTx(
  escrowAddress: string,
  wantNano: bigint,
): TonConnectTx {
  const addr = Address.parse(escrowAddress);
  const body = PushkaEscrow.createCellOfAccept({});
  const msgValue = wantNano + toNano('0.1'); // gas cushion
  return txEnvelope([
    {
      address: addr.toString({ bounceable: true, urlSafe: true }),
      amount: msgValue.toString(),
      payload: bocBase64(body),
    },
  ]);
}

export function buildCancelTx(escrowAddress: string): TonConnectTx {
  const addr = Address.parse(escrowAddress);
  const body = PushkaEscrow.createCellOfCancel({});
  return txEnvelope([
    {
      address: addr.toString({ bounceable: true, urlSafe: true }),
      amount: toNano('0.05').toString(),
      payload: bocBase64(body),
    },
  ]);
}

export function buildReclaimTx(escrowAddress: string): TonConnectTx {
  const addr = Address.parse(escrowAddress);
  const body = PushkaEscrow.createCellOfReclaim({});
  return txEnvelope([
    {
      address: addr.toString({ bounceable: true, urlSafe: true }),
      amount: toNano('0.05').toString(),
      payload: bocBase64(body),
    },
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Share links
// ─────────────────────────────────────────────────────────────────────────────

export function buildShareLink(
  escrowAddress: string,
  network: Network,
): string {
  const url = new URL(window.location.origin);
  url.searchParams.set('deal', escrowAddress);
  if (network === 'testnet') url.searchParams.set('testnet', 'true');
  return url.toString();
}

export function parseDealFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('deal');
  if (!raw) return null;
  try {
    Address.parse(raw); // validate format
    return raw;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Formatting
// ─────────────────────────────────────────────────────────────────────────────

export function formatTon(
  nano: bigint | string | number,
  decimals: number = 4,
): string {
  const n = typeof nano === 'bigint' ? nano : BigInt(nano);
  const str = fromNano(n);
  const [whole, frac = ''] = str.split('.');
  if (decimals === 0) return whole;
  return `${whole}.${frac.padEnd(decimals, '0').slice(0, decimals)}`;
}

// Re-export some core helpers so the components don't need to import @ton/core directly.
export { Address, toNano, fromNano, beginCell };
