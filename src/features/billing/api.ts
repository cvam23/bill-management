import { supabase } from '../../lib/supabase'
import { paiseToRupeeString } from '../../lib/currency'
import { parseDbError } from '../../lib/errors'
import { orIlikeFilter, toIlikePattern } from '../../lib/search'
import type { MasterItem } from '../services/api'
import type { Draft } from './types'

const SEARCH_LIMIT = 20

type ServiceRow = {
  id: string
  item_number: string
  name: string
  description: string | null
  item_type: 'service' | 'spare_part'
  default_price: number | string
  is_active: boolean
}

type BillRow = {
  id: string
  bill_number: string
  bill_date: string
  grand_total: number | string
}

export type CreatedBill = {
  id: string
  billNumber: string
  billDate: string
  grandTotal: string
}

export async function searchActiveItems(search: string): Promise<MasterItem[]> {
  let request = supabase
    .from('services')
    .select('id, item_number, name, description, item_type, default_price, is_active')
    .eq('is_active', true)

  if (search.trim()) {
    request = request.or(
      orIlikeFilter(['item_number', 'name', 'description'], toIlikePattern(search)),
    )
  }

  const { data, error } = await request
    .order('item_number_value', { ascending: true })
    .limit(SEARCH_LIMIT)

  if (error) {
    throw new Error(parseDbError(error)?.message ?? error.message)
  }

  return ((data ?? []) as ServiceRow[]).map((row) => ({
    id: row.id,
    itemNumber: row.item_number,
    name: row.name,
    description: row.description,
    itemType: row.item_type,
    defaultPrice: Number(row.default_price).toFixed(2),
    isActive: row.is_active,
  }))
}

export async function createBill(draft: Draft): Promise<CreatedBill> {
  const { data, error } = await supabase.rpc('create_bill', {
    p_idempotency_key: draft.idempotencyKey,
    p_bill_date: draft.billDate,
    p_customer_name: draft.customerName.trim() || null,
    p_customer_address: draft.customerAddress.trim() || null,
    p_lines: draft.lines.map((line) => ({
      service_id: line.serviceId,
      quantity: line.quantity,
      unit_price: paiseToRupeeString(line.unitPricePaise),
    })),
  })

  if (error) {
    throw new Error(parseDbError(error)?.message ?? error.message)
  }

  const row = (Array.isArray(data) ? data[0] : data) as BillRow

  return {
    id: row.id,
    billNumber: row.bill_number,
    billDate: row.bill_date,
    grandTotal: Number(row.grand_total).toFixed(2),
  }
}
