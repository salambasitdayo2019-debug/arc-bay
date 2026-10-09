import { useState } from 'react'
import { toast } from 'sonner'
import { useAccount, useSwitchChain } from 'wagmi'
import type { EIP1193Provider } from 'viem'
import { AppKit, type SwapEstimate } from '@circle-fin/app-kit'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import { ArrowUpDown, RefreshCw } from 'lucide-react'
import { Card, CardLabel } from '@/components/Card'
import { TxButton } from '@/components/TxButton'
import { ARC_TESTNET_CHAIN_ID } from '@/lib/contracts'
import { parseOnchainError } from '@/lib/utils'
import { TokenUSDC } from '@web3icons/react'

const kit = new AppKit()

type SwapDirection = 'USDC_TO_EURC' | 'EURC_TO_USDC'

interface Quote {
  estimate: SwapEstimate
  direction: SwapDirection
  amount: string
  account: string
}

export function FxSwap() {
  const { address, chainId, connector } = useAccount()
  const { switchChain } = useSwitchChain()
  const wrongChain = chainId !== ARC_TESTNET_CHAIN_ID

  const [direction, setDirection] = useState<SwapDirection>('USDC_TO_EURC')
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const tokenIn  = direction === 'USDC_TO_EURC' ? 'USDC' : 'EURC'
  const tokenOut = direction === 'USDC_TO_EURC' ? 'EURC' : 'USDC'

  async function getAdapter() {
    if (!connector) throw new Error('Wallet not connected')
    if (wrongChain) switchChain({ chainId: ARC_TESTNET_CHAIN_ID })
    const provider = (await connector.getProvider()) as EIP1193Provider
    return createViemAdapterFromProvider({ provider })
  }

  function handleGetQuote() {
    if (!address || !amount || parseFloat(amount) <= 0) { setErrorMsg('Enter an amount.'); return }
    setErrorMsg('')
    setQuote(null)
    setLoading(true)
    void getAdapter()
      .then((adapter) =>
        kit.estimateSwap({
          from: { adapter, chain: 'Arc_Testnet' },
          tokenIn,
          tokenOut,
          amountIn: amount,
          config: { slippageBps: 100 },
        })
      )
      .then((estimate) => {
        setQuote({ estimate, direction, amount, account: address })
      })
      .catch((e: unknown) => {
        setErrorMsg(parseOnchainError(e))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  function handleSwap() {
    if (!quote || !address) return
    if (address !== quote.account) { setErrorMsg('Wallet changed. Get a new quote.'); setQuote(null); return }
    setErrorMsg('')
    setSwapping(true)
    const inToken = quote.direction === 'USDC_TO_EURC' ? 'USDC' : 'EURC'
    const outToken = quote.direction === 'USDC_TO_EURC' ? 'EURC' : 'USDC'
    void getAdapter()
      .then((adapter) =>
        kit.swap({
          from: { adapter, chain: 'Arc_Testnet' },
          tokenIn: inToken,
          tokenOut: outToken,
          amountIn: quote.amount,
          config: { slippageBps: 100 },
        })
      )
      .then(() => {
        const msg = `Swapped ${quote.amount} ${inToken} → ${outToken}`
        setSuccessMsg(msg)
        toast.success(msg, {
          description: `Your ${outToken} balance will update shortly.`,
          duration: 7000,
        })
        setQuote(null)
        setAmount('')
      })
      .catch((e: unknown) => {
        const msg = parseOnchainError(e)
        setErrorMsg(msg)
        toast.error('Swap failed', { description: msg })
      })
      .finally(() => {
        setSwapping(false)
      })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardLabel>Stablecoin FX Swap</CardLabel>
        <p className="text-sm text-[var(--muted)] mt-1">Swap between USDC and EURC on Arc Testnet via Circle's Swap Kit.</p>
      </Card>

      <Card>
        <div className="space-y-4">
          {/* Direction row */}
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 flex items-center gap-2">
              <TokenUSDC size={20} variant="branded" />
              <span className="text-sm font-semibold text-[var(--ink)]">{tokenIn}</span>
            </div>
            <button
              onClick={() => { setDirection(d => d === 'USDC_TO_EURC' ? 'EURC_TO_USDC' : 'USDC_TO_EURC'); setQuote(null); setErrorMsg('') }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-muted)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
            >
              <ArrowUpDown size={16} className="text-[var(--muted)]" />
            </button>
            <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 flex items-center gap-2">
              <TokenUSDC size={20} variant="branded" />
              <span className="text-sm font-semibold text-[var(--ink)]">{tokenOut}</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--subtle)] block mb-1.5">
              Amount In ({tokenIn})
            </label>
            <input
              type="number" min="0" step="0.01"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setQuote(null); setErrorMsg('') }}
              placeholder="0.00"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-lg font-semibold text-[var(--ink)] tabular-nums outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/20"
            />
          </div>

          {/* Quote result */}
          {quote && (
            <div className="rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] p-3 text-sm space-y-1">
              <div className="flex justify-between text-[var(--muted)]">
                <span>You receive (est.)</span>
                <span className="font-bold text-[var(--ink)]">
                  {quote.estimate.estimatedOutput.amount} {quote.estimate.estimatedOutput.token}
                </span>
              </div>
              {quote.estimate.fees && quote.estimate.fees.length > 0 && (
                <div className="flex justify-between text-[var(--muted)]">
                  <span>Fee</span>
                  <span>{quote.estimate.fees[0]?.amount} {quote.estimate.fees[0]?.token}</span>
                </div>
              )}
              <p className="text-xs text-[var(--subtle)] mt-1">Quote valid for ~30 seconds. Click Swap to confirm.</p>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-sm text-green-700 font-medium">
              {successMsg}
            </div>
          )}

          {errorMsg && <p className="text-xs text-[var(--danger)]">{errorMsg}</p>}

          {!quote ? (
            <TxButton onClick={handleGetQuote} isLoading={loading} loadingText="Getting quote..."
              className="w-full" disabled={!address}>
              <RefreshCw size={15} />
              {wrongChain ? 'Switch to Arc Testnet' : 'Get Quote'}
            </TxButton>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <TxButton variant="secondary" onClick={() => { setQuote(null); setErrorMsg('') }} className="w-full">
                New Quote
              </TxButton>
              <TxButton onClick={handleSwap} isLoading={swapping} loadingText="Swapping..."
                className="w-full" disabled={!address}>
                Swap Now
              </TxButton>
            </div>
          )}
        </div>
      </Card>

      <div className="rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] p-4 text-xs text-[var(--muted)] space-y-1">
        <p className="font-semibold text-[var(--ink)]">About FX Swap</p>
        <p>USDC and EURC are both Circle-issued stablecoins. Swapping between them lets you hold either euro or dollar-denominated value onchain with no bank account needed.</p>
        <p className="mt-1">Swaps are routed through Circle's Swap Kit. Slippage tolerance: 1%.</p>
      </div>
    </div>
  )
}
