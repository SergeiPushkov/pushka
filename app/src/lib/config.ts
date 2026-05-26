import type { Network } from './router';

// Addresses are populated after deployment via `acton script` and committed by
// the user. Until then the Mini App shows a friendly "not deployed yet" notice
// instead of attempting to read on-chain state.
export const FACTORY_ADDRESSES: Record<Network, string | null> = {
  testnet: import.meta.env.VITE_PUSHKA_FACTORY_TESTNET ?? null,
  mainnet: import.meta.env.VITE_PUSHKA_FACTORY_MAINNET ?? null,
};

export const TONAPI_BASE: Record<Network, string> = {
  testnet: 'https://testnet.tonapi.io',
  mainnet: 'https://tonapi.io',
};

export const TONAPI_KEY = import.meta.env.VITE_TONAPI_KEY ?? '';

export const PUSHKA_BRAND = {
  name: 'PUSHKA',
  tagline: 'Trustless TON escrows in one tap',
  description:
    'Send TON only when conditions match. Cancel anytime before the deadline, auto-refund after.',
};
