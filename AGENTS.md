# Arc Bay — Project Memory

## Deployed Contracts (Arc Testnet)

| Contract | Address | Explorer |
|---|---|---|
| SavingsPool | `0x3329d5d97b6fd777d7aac0ecfbd4758e80cb6801` | https://explorer.testnet.arc.io/address/0x3329d5d97b6fd777d7aac0ecfbd4758e80cb6801 |
| LendingPool | `0x0624d3f594a2a166bd3e78717ca44ba209118d95` | https://explorer.testnet.arc.io/address/0x0624d3f594a2a166bd3e78717ca44ba209118d95 |
| ApiPayments | `0x8b77d0f00545cfca6b05d1bdf066c936c7efcd9d` | https://explorer.testnet.arc.io/address/0x8b77d0f00545cfca6b05d1bdf066c936c7efcd9d |

USDC (Arc Testnet): `0x3600000000000000000000000000000000000000`

## Features

- **P2P Payments** — direct USDC transfer + payment request link generator (no contract, pure ERC-20)
- **Savings Pool** — deposit USDC, earn yield at configurable APY (5% default), withdraw anytime
- **Lending Pool** — provide liquidity (earn 5% via share inflation), or borrow USDC with 150% USDC collateral (8% APY, 30-day liquidation window)
- **API Credits** — prepay USDC credits for pay-per-use API endpoints; backend calls consumeCredit()
- **FX Swap** — swap USDC ↔ EURC via Circle App Kit (Arc_Testnet chain)

## Owner Notes

- All contracts deployed with owner = `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42` (platform deployer)
- To fund the SavingsPool yield reserve, call `fundYieldReserve(amount)` as owner after approving USDC
- To register API endpoints in ApiPayments, call `registerApi(apiId, pricePerCall)` as owner
- APY changes in SavingsPool require a 1-day delay (proposeApyBps → applyApyBps)
- LendingPool pause only blocks new deposits and borrows; repay/withdraw always work
