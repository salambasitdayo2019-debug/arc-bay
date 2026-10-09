import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { Landmark, Lock } from 'lucide-react'
import { Card, CardLabel, CardValue } from '@/components/Card'
import { TxButton } from '@/components/TxButton'
import { AmountInput } from '@/components/AmountInput'
import { TxStatus } from '@/components/TxStatus'
import { USDC_ADDRESS, ERC20_ABI, LENDING_POOL_ABI, LENDING_POOL_ADDRESS, ARC_TESTNET_CHAIN_ID } from '@/lib/contracts'
import { parseUsdc, formatUsdc, parseOnchainError } from '@/lib/utils'

const NOT_DEPLOYED = !LENDING_POOL_ADDRESS
const POOL_ADDR = LENDING_POOL_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000001'

type Mode = 'lend' | 'borrow'

export function LendingPoolTab() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const wrongChain = chainId !== ARC_TESTNET_CHAIN_ID

  const [mode, setMode] = useState<Mode>('lend')
  const [lendTab, setLendTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [lendAmount, setLendAmount] = useState('')
  const [borrowAmount, setBorrowAmount] = useState('')
  const [loanIdInput, setLoanIdInput] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [approveStep, setApproveStep] = useState(false)

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !!address && !NOT_DEPLOYED },
  })

  const { data: myShares } = useReadContract({
    address: POOL_ADDR, abi: LENDING_POOL_ABI, functionName: 'shares',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !!address && !NOT_DEPLOYED },
  })

  const { data: shareValue } = useReadContract({
    address: POOL_ADDR, abi: LENDING_POOL_ABI, functionName: 'getShareValue',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !!address && !NOT_DEPLOYED },
  })

  const { data: poolUSDC } = useReadContract({
    address: POOL_ADDR, abi: LENDING_POOL_ABI, functionName: 'totalPoolUSDC',
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !NOT_DEPLOYED },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'allowance',
    args: address ? [address, POOL_ADDR] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID, query: { enabled: !!address && !NOT_DEPLOYED },
  })

  const { writeContract: approve, data: approveHash, isPending: approving } = useWriteContract()
  const { isSuccess: _approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError, error } = useWaitForTransactionReceipt({ hash })

  function doApproveAndCall(spendAmount: bigint, fn: () => void) {
    if ((allowance ?? 0n) >= spendAmount) { fn(); return }
    setApproveStep(true)
    approve({
      address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'approve',
      args: [POOL_ADDR, spendAmount], chainId: ARC_TESTNET_CHAIN_ID,
    }, {
      onSuccess: () => { void refetchAllowance().then(() => { setApproveStep(false); fn() }) },
      onError: (e) => { setApproveStep(false); setErrorMsg(parseOnchainError(e)) },
    })
  }

  function handleLendDeposit() {
    setErrorMsg('')
    if (wrongChain) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }
    const parsed = parseUsdc(lendAmount)
    if (parsed === 0n) { setErrorMsg('Enter a valid amount.'); return }
    doApproveAndCall(parsed, () => writeContract({
      address: POOL_ADDR, abi: LENDING_POOL_ABI, functionName: 'depositLP',
      args: [parsed], chainId: ARC_TESTNET_CHAIN_ID,
    }, { onError: (e) => setErrorMsg(parseOnchainError(e)) }))
  }

  function handleLendWithdraw() {
    setErrorMsg('')
    if (wrongChain) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }
    const parsed = parseUsdc(lendAmount)
    if (parsed === 0n) { setErrorMsg('Enter a valid share amount.'); return }
    writeContract({
      address: POOL_ADDR, abi: LENDING_POOL_ABI, functionName: 'withdrawLP',
      args: [parsed], chainId: ARC_TESTNET_CHAIN_ID,
    }, { onError: (e) => setErrorMsg(parseOnchainError(e)) })
  }

  function handleBorrow() {
    setErrorMsg('')
    if (wrongChain) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }
    const parsed = parseUsdc(borrowAmount)
    if (parsed === 0n) { setErrorMsg('Enter a valid amount.'); return }
    const collateral = (parsed * 150n) / 100n
    doApproveAndCall(collateral, () => writeContract({
      address: POOL_ADDR, abi: LENDING_POOL_ABI, functionName: 'borrow',
      args: [parsed], chainId: ARC_TESTNET_CHAIN_ID,
    }, { onError: (e) => setErrorMsg(parseOnchainError(e)) }))
  }

  function handleRepay() {
    setErrorMsg('')
    if (wrongChain) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }
    const id = BigInt(loanIdInput || '0')
    const bigRepay = parseUsdc(borrowAmount) // rough upper bound for approval
    doApproveAndCall(bigRepay + bigRepay / 10n, () => writeContract({
      address: POOL_ADDR, abi: LENDING_POOL_ABI, functionName: 'repay',
      args: [id], chainId: ARC_TESTNET_CHAIN_ID,
    }, { onError: (e) => setErrorMsg(parseOnchainError(e)) }))
  }

  return (
    <div className="space-y-4">
      {NOT_DEPLOYED && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Lock size={14} className="inline mr-1.5" />
          LendingPool contract not deployed yet. Deploy it and paste the address into <span className="mono">src/lib/contracts.ts</span>.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardLabel>Pool Liquidity</CardLabel>
          <CardValue className="text-xl">{poolUSDC !== undefined ? formatUsdc(poolUSDC) : '—'}</CardValue>
          <p className="text-xs text-[var(--subtle)] mt-1">USDC available</p>
        </Card>
        <Card>
          <CardLabel>My LP Value</CardLabel>
          <CardValue className="text-xl text-[var(--success)]">
            {shareValue !== undefined ? formatUsdc(shareValue) : '—'}
          </CardValue>
          <p className="text-xs text-[var(--subtle)] mt-1">{myShares !== undefined ? formatUsdc(myShares) : '0'} shares</p>
        </Card>
      </div>

      {/* Mode switcher */}
      <div className="flex gap-1 rounded-xl bg-[var(--surface-muted)] p-1">
        {(['lend', 'borrow'] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); reset(); setErrorMsg('') }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${mode === m ? 'bg-white shadow-sm text-[var(--ink)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}>
            {m === 'lend' ? 'Lend (Earn 5% APY)' : 'Borrow (8% APY)'}
          </button>
        ))}
      </div>

      {mode === 'lend' && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Landmark size={18} className="text-[var(--accent)]" />
            <span className="font-semibold">Provide Liquidity</span>
          </div>

          <div className="flex gap-1 rounded-xl bg-[var(--surface-muted)] p-1 mb-4">
            {(['deposit', 'withdraw'] as const).map((t) => (
              <button key={t} onClick={() => { setLendTab(t); reset(); setErrorMsg('') }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${lendTab === t ? 'bg-white shadow-sm text-[var(--ink)]' : 'text-[var(--muted)]'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <AmountInput value={lendAmount} onChange={setLendAmount}
              balance={lendTab === 'deposit' ? usdcBalance : myShares}
              label={lendTab === 'deposit' ? 'Deposit USDC' : 'Shares to withdraw'}
              disabled={NOT_DEPLOYED} />
            {lendTab === 'deposit' && (
              <div className="rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] p-3 text-xs text-[var(--muted)] space-y-0.5">
                <div className="flex justify-between"><span>LP APY</span><span className="text-[var(--success)] font-semibold">5%</span></div>
                <div className="flex justify-between"><span>Interest accrual</span><span>Per repayment (share inflation)</span></div>
                <div className="flex justify-between"><span>Withdrawal</span><span>Anytime (if liquidity available)</span></div>
              </div>
            )}
            {approveStep && <p className="text-xs text-[var(--muted)] animate-pulse">Step 1/2: Approving USDC...</p>}
            {errorMsg && <p className="text-xs text-[var(--danger)]">{errorMsg}</p>}
            <TxButton
              onClick={lendTab === 'deposit' ? handleLendDeposit : handleLendWithdraw}
              isLoading={approving || isPending || isConfirming}
              loadingText={approving ? 'Approving...' : isPending ? 'Confirm in wallet...' : 'Confirming...'}
              className="w-full"
              disabled={NOT_DEPLOYED || !address}
            >
              {wrongChain ? 'Switch to Arc Testnet' : lendTab === 'deposit' ? 'Deposit Liquidity' : 'Withdraw Liquidity'}
            </TxButton>
            <TxStatus hash={hash} isConfirming={isConfirming} isSuccess={isSuccess} isError={isError} errorMsg={isError ? parseOnchainError(error) : undefined} />
          </div>
        </Card>
      )}

      {mode === 'borrow' && (
        <Card>
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700">
              Borrowing requires <strong>150% collateral</strong>. E.g. borrow 100 USDC → post 150 USDC collateral. Loans older than 30 days can be liquidated.
            </div>
            <AmountInput value={borrowAmount} onChange={setBorrowAmount}
              balance={usdcBalance} label="Borrow Amount (USDC)" disabled={NOT_DEPLOYED} />
            {borrowAmount && parseFloat(borrowAmount) > 0 && (
              <div className="rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] p-3 text-xs text-[var(--muted)] space-y-0.5">
                <div className="flex justify-between"><span>Collateral required</span><span className="font-semibold">{(parseFloat(borrowAmount) * 1.5).toFixed(2)} USDC</span></div>
                <div className="flex justify-between"><span>Borrow rate</span><span>8% APY</span></div>
                <div className="flex justify-between"><span>Liquidation after</span><span>30 days</span></div>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--subtle)] block mb-1.5">
                Loan ID (for repay)
              </label>
              <input type="number" min="0" value={loanIdInput} onChange={(e) => setLoanIdInput(e.target.value)}
                placeholder="0" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/20" />
            </div>
            {approveStep && <p className="text-xs text-[var(--muted)] animate-pulse">Step 1/2: Approving collateral...</p>}
            {errorMsg && <p className="text-xs text-[var(--danger)]">{errorMsg}</p>}
            <div className="grid grid-cols-2 gap-2">
              <TxButton onClick={handleBorrow} isLoading={approving || isPending || isConfirming}
                loadingText="Processing..." className="w-full" disabled={NOT_DEPLOYED || !address}>
                {wrongChain ? 'Switch Chain' : 'Borrow USDC'}
              </TxButton>
              <TxButton onClick={handleRepay} variant="secondary" isLoading={approving || isPending || isConfirming}
                loadingText="Processing..." className="w-full" disabled={NOT_DEPLOYED || !address || !loanIdInput}>
                Repay Loan #{loanIdInput || '?'}
              </TxButton>
            </div>
            <TxStatus hash={hash} isConfirming={isConfirming} isSuccess={isSuccess} isError={isError} errorMsg={isError ? parseOnchainError(error) : undefined} />
          </div>
        </Card>
      )}
    </div>
  )
}
