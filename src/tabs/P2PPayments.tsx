import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { isAddress } from 'viem'
import { Send, ArrowDownLeft } from 'lucide-react'
import { Card, CardLabel, CardValue } from '@/components/Card'
import { TxButton } from '@/components/TxButton'
import { AmountInput } from '@/components/AmountInput'
import { TxStatus } from '@/components/TxStatus'
import { USDC_ADDRESS, ERC20_ABI, ARC_TESTNET_CHAIN_ID } from '@/lib/contracts'
import { parseUsdc, formatUsdc, parseOnchainError } from '@/lib/utils'

export function P2PPayments() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  const [tab, setTab] = useState<'send' | 'request'>('send')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [requestFrom, setRequestFrom] = useState('')
  const [requestAmount, setRequestAmount] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address },
  })

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError, error } = useWaitForTransactionReceipt({ hash })

  const wrongChain = chainId !== ARC_TESTNET_CHAIN_ID

  function handleSend() {
    setErrorMsg('')
    if (wrongChain) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }
    if (!isAddress(recipient)) { setErrorMsg('Invalid recipient address.'); return }
    const parsed = parseUsdc(amount)
    if (parsed === 0n) { setErrorMsg('Enter a valid amount.'); return }
    writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipient, parsed],
      chainId: ARC_TESTNET_CHAIN_ID,
    }, {
      onError: (e) => setErrorMsg(parseOnchainError(e)),
    })
  }

  // Request is off-chain: builds a shareable link
  const requestLink = requestFrom && requestAmount
    ? `${window.location.origin}?pay=${requestFrom}&amount=${requestAmount}`
    : ''

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <Card>
        <CardLabel>Your USDC Balance</CardLabel>
        <CardValue>{balance !== undefined ? formatUsdc(balance) : '—'} USDC</CardValue>
        <p className="text-xs text-[var(--subtle)] mt-1">On Arc Testnet</p>
      </Card>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-[var(--surface-muted)] p-1">
        {(['send', 'request'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); reset(); setErrorMsg('') }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${
              tab === t
                ? 'bg-white shadow-sm text-[var(--ink)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            {t === 'send' ? <Send size={14} /> : <ArrowDownLeft size={14} />}
            {t === 'send' ? 'Send' : 'Request'}
          </button>
        ))}
      </div>

      {tab === 'send' && (
        <Card>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--subtle)] block mb-1.5">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-mono text-[var(--ink)] outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/20"
              />
            </div>
            <AmountInput
              value={amount}
              onChange={setAmount}
              balance={balance}
              label="Amount to Send"
            />
            {errorMsg && <p className="text-xs text-[var(--danger)]">{errorMsg}</p>}
            <TxButton
              onClick={handleSend}
              isLoading={isPending || isConfirming}
              loadingText={isPending ? 'Confirm in wallet...' : 'Sending...'}
              className="w-full"
              disabled={!address}
            >
              {wrongChain ? 'Switch to Arc Testnet' : 'Send USDC'}
            </TxButton>
            <TxStatus
              hash={hash}
              isConfirming={isConfirming}
              isSuccess={isSuccess}
              isError={isError}
              errorMsg={isError ? parseOnchainError(error) : undefined}
            />
          </div>
        </Card>
      )}

      {tab === 'request' && (
        <Card>
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted)]">
              Generate a payment link to share with someone. They click it to pay you directly.
            </p>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--subtle)] block mb-1.5">
                Your Address (recipient)
              </label>
              <input
                type="text"
                value={requestFrom}
                onChange={(e) => setRequestFrom(e.target.value)}
                placeholder={address ?? '0x...'}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-mono text-[var(--ink)] outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus)]/20"
              />
              {address && !requestFrom && (
                <button
                  className="mt-1 text-xs text-[var(--accent-hover)] hover:underline"
                  onClick={() => setRequestFrom(address)}
                >
                  Use connected wallet
                </button>
              )}
            </div>
            <AmountInput
              value={requestAmount}
              onChange={setRequestAmount}
              label="Amount to Request"
            />
            {requestLink && (
              <div className="rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--subtle)] mb-1">Payment link</p>
                <p className="mono text-xs text-[var(--ink)] break-all">{requestLink}</p>
                <button
                  onClick={() => { void navigator.clipboard.writeText(requestLink) }}
                  className="mt-2 text-xs text-[var(--accent-hover)] font-semibold hover:underline"
                >
                  Copy link
                </button>
              </div>
            )}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
              The recipient pastes this link to auto-fill the Send form. No contract needed — it's a standard USDC transfer.
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
