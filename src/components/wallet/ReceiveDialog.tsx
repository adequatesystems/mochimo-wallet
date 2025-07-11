import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Check, QrCode } from 'lucide-react'
import { useState } from 'react'
import { Account } from 'mochimo-wallet'
import { TagUtils } from 'mochimo-wots'
import { QRCodeCanvas} from 'qrcode.react'
import { log } from "@/lib/utils/logging"
const logger = log.getLogger("wallet-receive");

interface ReceiveDialogProps {
  isOpen: boolean
  onClose: () => void
  account: Account
}

export function ReceiveDialog({ isOpen, onClose, account }: ReceiveDialogProps) {
  const [copied, setCopied] = useState(false)
  const tag = TagUtils.addrTagToBase58(Buffer.from(account.tag, 'hex'))!

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tag)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      logger.error('Failed to copy:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[340px] p-4">
        <DialogHeader>
          <DialogTitle>Receive MCM</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-3 bg-white rounded-lg">
              <QRCodeCanvas 
                value={tag}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>

          {/* Tag */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Your Tag
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                {tag}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Share this tag with others to receive MCM
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
} 