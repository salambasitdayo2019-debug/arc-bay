import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { Send, PiggyBank, Landmark, Zap, ArrowLeftRight, Wallet, X } from 'lucide-react'
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
    const params = new URLSearchParams(window.location.search)
    return params.get('pay') ? 'p2p' : 'p2p'
  })
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 800)
    return () => clearTimeout(t)
  }, [])

  const showBanner = mounted && !isConnected && !bannerDismissed

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>

      {/* Wallet connection notification banner */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm
          transition-all duration-500 ease-out
          ${showBanner ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-lg shadow-amber-100/60 px-4 py-3 flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <Wallet size={16} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">Connect your wallet to continue</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Arc Bay requires a wallet to send, save, lend, and swap USDC on Arc.
            </p>
            <div className="mt-2">
              <ConnectKitButton label="Connect Wallet" />
            </div>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="flex-shrink-0 text-amber-400 hover:text-amber-600 transition-colors mt-0.5"
          >
            <X size={16} />
          </button>
        </div>
      </div>

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
