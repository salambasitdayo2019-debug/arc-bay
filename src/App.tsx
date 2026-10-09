import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { Send, PiggyBank, Landmark, Zap, ArrowLeftRight } from 'lucide-react'
import { P2PPayments } from '@/tabs/P2PPayments'
import { SavingsPoolTab } from '@/tabs/SavingsPool'
import { LendingPoolTab } from '@/tabs/LendingPool'
import { ApiPaymentsTab } from '@/tabs/ApiPayments'
import { FxSwap } from '@/tabs/FxSwap'
import { formatAddress } from '@/lib/utils'

type Tab = 'p2p' | 'savings' | 'lending' | 'api' | 'swap'

const TABS: { id: Tab; label: string; icon: React.ReactNode; short: string }[] = [
  { id: 'p2p',     label: 'P2P Payments',  icon: <Send size={16} />,         short: 'P2P'     },
  { id: 'savings', label: 'Savings Pool',  icon: <PiggyBank size={16} />,    short: 'Savings' },
  { id: 'lending', label: 'Lending',       icon: <Landmark size={16} />,     short: 'Lend'    },
  { id: 'api',     label: 'Pay-per-API',   icon: <Zap size={16} />,          short: 'API'     },
  { id: 'swap',    label: 'FX Swap',       icon: <ArrowLeftRight size={16}/>, short: 'Swap'   },
]

export default function App() {
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    // Start on P2P tab if a payment request link is opened
    const params = new URLSearchParams(window.location.search)
    return params.get('pay') ? 'p2p' : 'p2p'
  })

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md border-b border-[var(--border)] bg-white/60">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="display text-lg font-bold text-[var(--ink)] leading-tight">Arc Bay</h1>
            <p className="text-xs text-[var(--subtle)]">Powered by USDC on Arc</p>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && address && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] border border-[var(--border)] px-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                <span className="mono text-xs text-[var(--ink)]">{formatAddress(address)}</span>
              </div>
            )}
            <ConnectKitButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 pb-28">
        {!isConnected && (
          <div className="mb-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-[var(--border)] p-6 text-center">
            <div className="display text-2xl font-bold text-[var(--ink)] mb-2">Welcome to Arc Bay</div>
            <p className="text-sm text-[var(--muted)] mb-4">
              Connect a browser wallet to use all 5 features. USDC is the only token you need — it's also the gas token on Arc.
            </p>
            <ConnectKitButton label="Connect Wallet" />
          </div>
        )}

        {/* Feature grid teaser (always visible) */}
        {!isConnected && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { icon: <Send size={20} />,         title: 'P2P Payments',  desc: 'Send USDC instantly to any address' },
              { icon: <PiggyBank size={20} />,    title: 'Savings Pool',  desc: 'Earn yield on idle USDC' },
              { icon: <Landmark size={20} />,     title: 'Lending',       desc: 'Lend or borrow with USDC collateral' },
              { icon: <Zap size={20} />,          title: 'API Credits',   desc: 'Prepay for pay-per-use AI/data APIs' },
              { icon: <ArrowLeftRight size={20}/>, title: 'FX Swap',      desc: 'Swap USDC ↔ EURC onchain' },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-[var(--border)] bg-white/50 backdrop-blur-sm p-4 col-span-1 last:col-span-2 last:text-center">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[var(--accent)]">{f.icon}</span>
                  <span className="text-sm font-semibold text-[var(--ink)]">{f.title}</span>
                </div>
                <p className="text-xs text-[var(--muted)]">{f.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab content */}
        {isConnected && (
          <>
            {activeTab === 'p2p'     && <P2PPayments />}
            {activeTab === 'savings' && <SavingsPoolTab />}
            {activeTab === 'lending' && <LendingPoolTab />}
            {activeTab === 'api'     && <ApiPaymentsTab />}
            {activeTab === 'swap'    && <FxSwap />}
          </>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[var(--border)] bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-2 py-2 flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all text-xs font-semibold ${
                activeTab === tab.id
                  ? 'bg-[var(--accent)]/8 text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-[var(--accent)]' : 'text-[var(--subtle)]'}>
                {tab.icon}
              </span>
              <span className="hidden sm:block">{tab.short}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
