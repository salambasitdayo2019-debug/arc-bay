import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { Zap, Lock } from 'lucide-react'
import { Card, CardLabel, CardValue } from '@/components/Card'
import { TxButton } from '@/components/TxButton'
import { TxStatus } from '@/components/TxStatus'
import { USDC_ADDRESS, ERC20_ABI, API_PAYMENTS_ABI, API_PAYMENTS_ADDRESS, ARC_TESTNET_CHAIN_ID } from '@/lib/contracts'
import { parseOnchainError, formatUsdc } from '@/lib/utils'

const NOT_DEPLOYED = !API_PAYMENTS_ADDRESS
const ADDR = API_PAYMENTS_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000001'

// Pre-defined demo APIs for the UI
const DEMO_APIS = [
  { id: 'gpt-inference-v1', name: 'GPT Inference', priceDisplay: '0.01 USDC/call' },
  { id: 'image-gen-v1',     name: 'Image Gen',    priceDisplay: '0.05 USDC/call' },
  { id: 'data-feed-v1',     name: 'Data Feed',    priceDisplay: '0.001 USDC/call' },
]

export function ApiPaymentsTab() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const wrongChain = chainId !== ARC_TESTNET_CHAIN_ID

  const [selectedApi, setSelectedApi] = useState(DEMO_APIS[0])
  const [callCount, setCallCount] = useState('10')
  const [errorMsg, setErrorMsg] = useState('')
  const [approveStep, setApproveStep] = useState(false)

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !!address && !NOT_DEPLOYED },
  })

  const { data: apiInfo } = useReadContract({
    address: ADDR, abi: API_PAYMENTS_ABI, functionName: 'getApi',
    args: [selectedApi.id],
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !NOT_DEPLOYED },
  })

  const { data: myCredits, refetch: refetchCredits } = useReadContract({
    address: ADDR, abi: API_PAYMENTS_ABI, functionName: 'getCredits',
    args: address ? [selectedApi.id, address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !!address && !NOT_DEPLOYED },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'allowance',
    args: address ? [address, ADDR] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !!address && !NOT_DEPLOYED },
  })

  const { writeContract: approve, data: approveHash, isPending: approving } = useWriteContract()
  const { isSuccess: _approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError, error } = useWaitForTransactionReceipt({ hash })

  const pricePerCall = apiInfo ? apiInfo[0] : 0n
  const count = Math.max(1, parseInt(callCount) || 0)
  const totalCost = pricePerCall * BigInt(count)

  function handleBuyCredits() {
    setErrorMsg('')
    if (wrongChain) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }
    if (count === 0) { setErrorMsg('Enter number of calls.'); return }

    const doWrite = () => writeContract({
      address: ADDR, abi: API_PAYMENTS_ABI, functionName: 'buyCredits',
      args: [selectedApi.id, BigInt(count)],
      chainId: ARC_TESTNET_CHAIN_ID,
    }, {
      onSuccess: () => { void refetchCredits() },
      onError: (e) => { setApproveStep(false); setErrorMsg(parseOnchainError(e)) },
    })

    if ((allowance ?? 0n) < totalCost) {
      setApproveStep(true)
      approve({
        address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'approve',
        args: [ADDR, totalCost], chainId: ARC_TESTNET_CHAIN_ID,
      }, {
        onSuccess: () => { void refetchAllowance().then(() => { setApproveStep(false); doWrite() }) },
        onError: (e) => { setApproveStep(false); setErrorMsg(parseOnchainError(e)) },
      })
    } else {
      doWrite()
    }
  }

  return (
    <div className="space-y-4">
      {NOT_DEPLOYED && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Lock size={14} className="inline mr-1.5" />
          ApiPayments contract not deployed. Deploy it and add the address to <span className="mono">src/lib/contracts.ts</span>.
        </div>
      )}

      {/* Balance + credits */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardLabel>USDC Balance</CardLabel>
          <CardValue className="text-xl">{usdcBalance !== undefined ? formatUsdc(usdcBalance) : '—'}</CardValue>
        </Card>
        <Card>
          <CardLabel>Credits Remaining</CardLabel>
          <CardValue className="text-xl text-[var(--accent-hover)]">
            {myCredits !== undefined ? myCredits.toString() : '—'}
          </CardValue>
          <p className="text-xs text-[var(--subtle)] mt-0.5">{selectedApi.name}</p>
        </Card>
      </div>

      {/* API selector */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--subtle)] mb-2">Select API</p>
        <div className="grid grid-cols-3 gap-2">
          {DEMO_APIS.map((api) => (
            <button
              key={api.id}
              onClick={() => { setSelectedApi(api); reset(); setErrorMsg('') }}
              className={`rounded-xl border p-3 text-left transition-all ${
                selectedApi.id === api.id
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                  : 'border-[var(--border)] hover:border-[var(--border-strong)]'
              }`}
            >
              <p className="text-xs font-semibold text-[var(--ink)]">{api.name}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{api.priceDisplay}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Buy credits */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-[var(--accent)]" />
          <span className="font-semibold">Buy API Credits</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--subtle)] block mb-1.5">
              Number of Calls
            </label>
            <input
              type="number" min="1" value={callCount}
              onChange={(e) => setCallCount(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-lg font-semibold text-[var(--ink)] outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/20"
            />
          </div>

          <div className="grid grid-cols-3 gap-1">
            {[10, 50, 100].map((n) => (
              <button key={n} onClick={() => setCallCount(String(n))}
                className={`rounded-lg py-2 text-sm font-semibold transition-all ${callCount === String(n) ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-muted)] text-[var(--muted)] hover:bg-[var(--border)]'}`}>
                {n} calls
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] p-3 text-xs text-[var(--muted)] space-y-0.5">
            <div className="flex justify-between"><span>API</span><span className="font-semibold text-[var(--ink)]">{selectedApi.name}</span></div>
            <div className="flex justify-between"><span>Price/call</span><span>{selectedApi.priceDisplay}</span></div>
            <div className="flex justify-between"><span>Calls</span><span>{count}</span></div>
            <div className="flex justify-between border-t border-[var(--border)] pt-1 mt-1">
              <span>Total cost</span>
              <span className="font-bold text-[var(--ink)]">{pricePerCall > 0n ? formatUsdc(totalCost) : (count * parseFloat(selectedApi.priceDisplay)).toFixed(3)} USDC</span>
            </div>
          </div>

          {approveStep && <p className="text-xs text-[var(--muted)] animate-pulse">Step 1/2: Approving USDC...</p>}
          {errorMsg && <p className="text-xs text-[var(--danger)]">{errorMsg}</p>}

          <TxButton onClick={handleBuyCredits}
            isLoading={approving || isPending || isConfirming}
            loadingText={approving ? 'Approving...' : isPending ? 'Confirm in wallet...' : 'Confirming...'}
            className="w-full" disabled={NOT_DEPLOYED || !address}>
            <Zap size={15} />
            {wrongChain ? 'Switch to Arc Testnet' : `Buy ${count} Credits`}
          </TxButton>

          <TxStatus hash={hash} isConfirming={isConfirming} isSuccess={isSuccess} isError={isError} errorMsg={isError ? parseOnchainError(error) : undefined} />

          {isSuccess && (
            <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-xs text-green-700">
              Credits purchased. Your service backend can now call <span className="mono">consumeCredit()</span> to deduct them as API calls are made.
            </div>
          )}
        </div>
      </Card>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--subtle)] mb-2">How it works</p>
        <ol className="space-y-2 text-sm text-[var(--muted)]">
          <li className="flex gap-2"><span className="shrink-0 w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-bold">1</span>Buy credits for an API endpoint upfront in USDC.</li>
          <li className="flex gap-2"><span className="shrink-0 w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-bold">2</span>Your service calls an API. The backend calls <span className="mono text-xs">consumeCredit()</span> onchain.</li>
          <li className="flex gap-2"><span className="shrink-0 w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-bold">3</span>API owner withdraws accumulated USDC revenue any time.</li>
        </ol>
      </Card>
    </div>
  )
}
