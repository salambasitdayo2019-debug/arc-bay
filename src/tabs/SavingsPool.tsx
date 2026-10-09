import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { PiggyBank, TrendingUp, Lock } from 'lucide-react'
import { Card, CardLabel, CardValue } from '@/components/Card'
import { TxButton } from '@/components/TxButton'
import { AmountInput } from '@/components/AmountInput'
import { TxStatus } from '@/components/TxStatus'
import { USDC_ADDRESS, ERC20_ABI, SAVINGS_POOL_ABI, SAVINGS_POOL_ADDRESS, ARC_TESTNET_CHAIN_ID } from '@/lib/contracts'
import { parseUsdc, formatUsdc, parseOnchainError } from '@/lib/utils'

const NOT_DEPLOYED = !SAVINGS_POOL_ADDRESS

export function SavingsPoolTab() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const wrongChain = chainId !== ARC_TESTNET_CHAIN_ID

  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [step, setStep] = useState<'idle' | 'approving' | 'depositing'>('idle')

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !!address && !NOT_DEPLOYED },
  })

  const { data: deposited } = useReadContract({
    address: SAVINGS_POOL_ADDRESS || '0x0000000000000000000000000000000000000001',
    abi: SAVINGS_POOL_ABI, functionName: 'principal',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !!address && !NOT_DEPLOYED },
  })

  const { data: accrued } = useReadContract({
    address: SAVINGS_POOL_ADDRESS || '0x0000000000000000000000000000000000000001',
    abi: SAVINGS_POOL_ABI, functionName: 'getAccruedYield',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !!address && !NOT_DEPLOYED },
  })

  const { data: apyBps } = useReadContract({
    address: SAVINGS_POOL_ADDRESS || '0x0000000000000000000000000000000000000001',
    abi: SAVINGS_POOL_ABI, functionName: 'apyBps',
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !NOT_DEPLOYED },
  })

  const { data: yieldReserve } = useReadContract({
    address: SAVINGS_POOL_ADDRESS || '0x0000000000000000000000000000000000000001',
    abi: SAVINGS_POOL_ABI, functionName: 'yieldReserve',
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !NOT_DEPLOYED },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'allowance',
    args: address && SAVINGS_POOL_ADDRESS ? [address, SAVINGS_POOL_ADDRESS as `0x${string}`] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !!address && !NOT_DEPLOYED },
  })

  const { writeContract: approve, data: approveHash, isPending: approving } = useWriteContract()
  const { isSuccess: _approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError, error } = useWaitForTransactionReceipt({ hash })

  const apyPct = apyBps ? (Number(apyBps) / 100).toFixed(1) : '—'

  function handleDeposit() {
    setErrorMsg('')
    if (wrongChain) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }
    const parsed = parseUsdc(amount)
    if (parsed === 0n) { setErrorMsg('Enter a valid amount.'); return }

    const doDeposit = () => {
      setStep('depositing')
      writeContract({
        address: SAVINGS_POOL_ADDRESS,
        abi: SAVINGS_POOL_ABI, functionName: 'deposit',
        args: [parsed], chainId: ARC_TESTNET_CHAIN_ID,
      }, { onError: (e) => { setStep('idle'); setErrorMsg(parseOnchainError(e)) } })
    }

    if ((allowance ?? 0n) < parsed) {
      setStep('approving')
      approve({
        address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'approve',
        args: [SAVINGS_POOL_ADDRESS as `0x${string}`, parsed],
        chainId: ARC_TESTNET_CHAIN_ID,
      }, {
        onSuccess: () => { void refetchAllowance().then(() => doDeposit()) },
        onError: (e) => { setStep('idle'); setErrorMsg(parseOnchainError(e)) },
      })
    } else {
      doDeposit()
    }
  }

  function handleWithdraw() {
    setErrorMsg('')
    if (wrongChain) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }
    const parsed = parseUsdc(amount)
    if (parsed === 0n) { setErrorMsg('Enter a valid amount.'); return }
    writeContract({
      address: SAVINGS_POOL_ADDRESS,
      abi: SAVINGS_POOL_ABI, functionName: 'withdraw',
      args: [parsed], chainId: ARC_TESTNET_CHAIN_ID,
    }, { onError: (e) => setErrorMsg(parseOnchainError(e)) })
  }

  return (
    <div className="space-y-4">
      {NOT_DEPLOYED && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Lock size={14} className="inline mr-1.5" />
          SavingsPool contract not yet deployed. Deploy it first, then paste the address into <span className="mono">src/lib/contracts.ts</span>.
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardLabel>APY</CardLabel>
          <CardValue className="text-xl">{apyPct}%</CardValue>
        </Card>
        <Card className="text-center">
          <CardLabel>Deposited</CardLabel>
          <CardValue className="text-xl">{deposited !== undefined ? formatUsdc(deposited) : '—'}</CardValue>
        </Card>
        <Card className="text-center">
          <CardLabel>Yield Earned</CardLabel>
          <CardValue className="text-xl text-[var(--success)]">
            {accrued !== undefined ? formatUsdc(accrued) : '—'}
          </CardValue>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <PiggyBank size={18} className="text-[var(--accent)]" />
          <span className="font-semibold text-[var(--ink)]">Savings Pool</span>
          {yieldReserve !== undefined && (
            <span className="ml-auto text-xs text-[var(--subtle)]">
              Reserve: {formatUsdc(yieldReserve)} USDC
            </span>
          )}
        </div>

        {/* Tab */}
        <div className="flex gap-1 rounded-xl bg-[var(--surface-muted)] p-1 mb-4">
          {(['deposit', 'withdraw'] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); reset(); setErrorMsg(''); setStep('idle') }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${tab === t ? 'bg-white shadow-sm text-[var(--ink)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <AmountInput
            value={amount}
            onChange={setAmount}
            balance={tab === 'deposit' ? usdcBalance : deposited}
            label={tab === 'deposit' ? 'Deposit Amount' : 'Withdraw Amount'}
            disabled={NOT_DEPLOYED}
          />
          {tab === 'deposit' && (
            <div className="rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] p-3 text-xs text-[var(--muted)] space-y-0.5">
              <div className="flex justify-between"><span>APY</span><span className="font-semibold text-[var(--success)]">{apyPct}%</span></div>
              <div className="flex justify-between"><span>Yield type</span><span>Continuous accrual</span></div>
              <div className="flex justify-between"><span>Unlock</span><span>Anytime</span></div>
            </div>
          )}
          {errorMsg && <p className="text-xs text-[var(--danger)]">{errorMsg}</p>}
          {step === 'approving' && (
            <p className="text-xs text-[var(--muted)] animate-pulse">Step 1 of 2: Approving USDC...</p>
          )}
          <TxButton
            onClick={tab === 'deposit' ? handleDeposit : handleWithdraw}
            isLoading={approving || isPending || isConfirming}
            loadingText={approving ? 'Approving...' : isPending ? 'Confirm in wallet...' : 'Confirming...'}
            className="w-full"
            disabled={NOT_DEPLOYED || !address}
          >
            <TrendingUp size={15} />
            {wrongChain ? 'Switch to Arc Testnet' : tab === 'deposit' ? 'Deposit USDC' : 'Withdraw + Yield'}
          </TxButton>
          <TxStatus hash={hash} isConfirming={isConfirming} isSuccess={isSuccess} isError={isError} errorMsg={isError ? parseOnchainError(error) : undefined} />
        </div>
      </Card>
    </div>
  )
}
