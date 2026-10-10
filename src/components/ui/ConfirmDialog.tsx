import { Button } from './Button'
import { Dialog } from './Dialog'

type ConfirmDialogProps = {
  title: string
  onCancel: () => void
  onConfirm: () => void
  busy?: boolean
}

export function ConfirmDialog({ title, onCancel, onConfirm, busy = false }: ConfirmDialogProps) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={busy}>
          Confirm
        </Button>
      </div>
    </Dialog>
  )
}
