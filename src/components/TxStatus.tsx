import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { ARC_TESTNET_CHAIN_ID } from '@/lib/contracts'

interface TxStatusProps {
  hash?: `0x${string}`
  isConfirming?: boolean
  isSuccess?: boolean
  isError?: boolean
  errorMsg?: string
}

export function TxStatus({ hash, isConfirming, isSuccess, isError, errorMsg }: TxStatusProps) {
  if (!isConfirming && !isSuccess && !isError) return null

  return (
    <div className="mt-3 rounded-xl border p-3 text-sm">
      {isConfirming && (
        <p className="text-[var(--muted)] animate-pulse">Waiting for confirmation...</p>
      )}
      {isSuccess && (
        <div className="flex items-center gap-2 text-[var(--success)]">
          <CheckCircle2 size={15} />
          <span>Transaction confirmed!</span>
          {hash && (
            <a
              href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-[var(--accent-hover)] hover:underline"
            >
              View <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}
      {isError && (
        <div className="flex items-center gap-2 text-[var(--danger)]">
          <XCircle size={15} />
          <span>{errorMsg ?? 'Transaction failed.'}</span>
        </div>
      )}
    </div>
  )
}
