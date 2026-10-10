import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { SelectField } from '../../components/ui/SelectField'
import { TextArea } from '../../components/ui/TextArea'
import { TextField } from '../../components/ui/TextField'
import { isDuplicateName } from './api'
import type { MasterItem, MasterItemInput } from './api'
import { masterItemSchema } from './schema'

type ServiceFormDialogProps = {
  item: MasterItem | null
  onSubmit: (input: MasterItemInput) => Promise<MasterItem>
  onClose: () => void
}

export function ServiceFormDialog({ item, onSubmit, onClose }: ServiceFormDialogProps) {
  const [created, setCreated] = useState<MasterItem | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MasterItemInput>({
    resolver: zodResolver(masterItemSchema),
    defaultValues: {
      name: item?.name ?? '',
      description: item?.description ?? '',
      itemType: item?.itemType ?? 'service',
      defaultPrice: item?.defaultPrice ?? '',
    },
  })

  async function save(values: MasterItemInput) {
    try {
      const saved = await onSubmit(values)
      if (item) {
        onClose()
      } else {
        setCreated(saved)
      }
    } catch (error) {
      if (isDuplicateName(error)) {
        setError('name', {
          type: 'duplicate',
          message: (error as Error).message,
        })
      } else {
        toast.error(error instanceof Error ? error.message : 'Could not save the item.')
      }
    }
  }

  if (created) {
    return (
      <Dialog title="Item added" onClose={onClose}>
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Assigned number</p>
        <p className="font-display text-4xl leading-none font-semibold tracking-wide text-ink">
          {created.itemNumber}
        </p>
        <p className="text-sm text-ink">Item number {created.itemNumber}</p>
        <div className="flex justify-end border-t border-line pt-4">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog title={item ? 'Edit Item' : 'Add Item'} onClose={onClose} className="max-w-lg">
      <form onSubmit={handleSubmit(save)} noValidate className="space-y-4">
        {item ? (
          <p className="flex items-baseline justify-between gap-3 rounded-md bg-bench px-3 py-2.5">
            <span className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
              Item number
            </span>
            <span className="font-mono text-lg font-medium text-ink">{item.itemNumber}</span>
          </p>
        ) : null}
        <TextField
          id="item-name"
          label="Item Name"
          maxLength={100}
          error={
            errors.name
              ? errors.name.type === 'duplicate'
                ? errors.name.message
                : 'Enter an item name (up to 100 characters).'
              : undefined
          }
          {...register('name')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField id="item-type" label="Item Type" {...register('itemType')}>
            <option value="service">Service</option>
            <option value="spare_part">Spare Part</option>
          </SelectField>
          <TextField
            id="item-price"
            label="Default Price (₹)"
            inputMode="decimal"
            error={errors.defaultPrice ? 'Enter a valid price.' : undefined}
            {...register('defaultPrice')}
          />
        </div>
        <TextArea
          id="item-description"
          label="Description"
          rows={4}
          error={errors.description ? 'Description can be up to 500 characters.' : undefined}
          {...register('description')}
        />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
