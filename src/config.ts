/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected, coinbaseWallet } from 'wagmi/connectors'
import { getDefaultConfig } from 'connectkit'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])

export const config = createConfig(
  getDefaultConfig({
    chains: [arcTestnet, mainnet], // mainnet needed for ENS resolution
    connectors: [
      injected(),
      coinbaseWallet({ appName: 'Arc DeFi Hub' }),
    ],
    transports: {
      [arcTestnet.id]: http(),
      [mainnet.id]: http(),
    },
    walletConnectProjectId: (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) ?? '',
    appName: 'Arc DeFi Hub',
    appDescription: 'P2P payments, savings, lending, API credits, and FX swaps on Arc',
    appUrl: 'https://studio.arc.io',
  })
)
