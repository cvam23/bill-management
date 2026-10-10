export type ItemType = 'service' | 'spare_part'

export type MasterPick = {
  id: string
  itemNumber: string
  name: string
  description: string | null
  itemType: ItemType
  defaultPrice: string
}

export type DraftLine = {
  serviceId: string
  itemNumber: string
  itemName: string
  itemDescription: string | null
  itemType: ItemType
  quantity: number
  unitPricePaise: number
}

export type Draft = {
  idempotencyKey: string
  billDate: string
  customerName: string
  customerAddress: string
  lines: DraftLine[]
}
