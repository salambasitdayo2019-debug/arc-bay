/**
 * Contract addresses and ABIs for the Arc DeFi Hub.
 * Addresses are filled in after deployment — replace the placeholders.
 */

export const ARC_TESTNET_CHAIN_ID = 5042002;

export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const;

// ─── Deployed on Arc Testnet ─────────────────────────────────────────────────
export const SAVINGS_POOL_ADDRESS = '0x3329d5d97b6fd777d7aac0ecfbd4758e80cb6801' as const;
export const LENDING_POOL_ADDRESS = '0x0624d3f594a2a166bd3e78717ca44ba209118d95' as const;
export const API_PAYMENTS_ADDRESS = '0x8b77d0f00545cfca6b05d1bdf066c936c7efcd9d' as const;
// ─────────────────────────────────────────────────────────────────────────────

export const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
] as const;

export const SAVINGS_POOL_ABI = [
  { name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'fundYieldReserve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'proposeApyBps', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'newBps', type: 'uint256' }], outputs: [] },
  { name: 'applyApyBps', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'principal', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'apyBps', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'yieldReserve', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getAccruedYield', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'Deposited', type: 'event', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { name: 'Withdrawn', type: 'event', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'yieldPaid', type: 'uint256', indexed: false }] },
] as const;

export const LENDING_POOL_ABI = [
  { name: 'depositLP', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'withdrawLP', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'shareAmount', type: 'uint256' }], outputs: [] },
  { name: 'borrow', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'repay', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'loanId', type: 'uint256' }], outputs: [] },
  { name: 'liquidate', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'loanId', type: 'uint256' }], outputs: [] },
  { name: 'shares', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalShares', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalPoolUSDC', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'nextLoanId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getShareValue', type: 'function', stateMutability: 'view', inputs: [{ name: 'lp', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getInterestOwed', type: 'function', stateMutability: 'view', inputs: [{ name: 'loanId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'loans', type: 'function', stateMutability: 'view', inputs: [{ name: 'loanId', type: 'uint256' }], outputs: [{ name: 'borrower', type: 'address' }, { name: 'principal', type: 'uint256' }, { name: 'collateral', type: 'uint256' }, { name: 'startTime', type: 'uint256' }, { name: 'active', type: 'bool' }] },
  { name: 'COLLATERAL_RATIO', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const API_PAYMENTS_ABI = [
  { name: 'registerApi', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'apiId', type: 'string' }, { name: 'pricePerCall', type: 'uint256' }], outputs: [] },
  { name: 'buyCredits', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'apiId', type: 'string' }, { name: 'callCount', type: 'uint256' }], outputs: [] },
  { name: 'consumeCredit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'user', type: 'address' }, { name: 'apiId', type: 'string' }], outputs: [] },
  { name: 'withdrawRevenue', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'apiId', type: 'string' }], outputs: [] },
  { name: 'refundCredits', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'apiId', type: 'string' }, { name: 'user', type: 'address' }, { name: 'callCount', type: 'uint256' }], outputs: [] },
  { name: 'getCredits', type: 'function', stateMutability: 'view', inputs: [{ name: 'apiId', type: 'string' }, { name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getApi', type: 'function', stateMutability: 'view', inputs: [{ name: 'apiId', type: 'string' }], outputs: [{ name: 'pricePerCall', type: 'uint256' }, { name: 'revenue', type: 'uint256' }, { name: 'active', type: 'bool' }] },
  { name: 'CreditsPurchased', type: 'event', inputs: [{ name: 'key', type: 'bytes32', indexed: true }, { name: 'user', type: 'address', indexed: true }, { name: 'callCount', type: 'uint256', indexed: false }, { name: 'cost', type: 'uint256', indexed: false }] },
] as const;
