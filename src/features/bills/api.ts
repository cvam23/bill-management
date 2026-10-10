import { parseDbError } from '../../lib/errors'
import { orIlikeFilter, toIlikePattern } from '../../lib/search'
import { supabase } from '../../lib/supabase'
import type { SavedBill, SavedBillLine } from './types'

export { downloadBillPdf } from './pdf'

export const PAGE_SIZE = 20

export type BillSummary = Omit<SavedBill, 'customerAddress' | 'lines'>

export type BillQuery = {
  search: string
  billDate: string | null
  fromDate: string | null
  toDate: string | null
  sort: 'asc' | 'desc'
  page: number
}

type BillSummaryRow = {
  id: string
  bill_number: string
  bill_date: string
  customer_name: string | null
  grand_total: number | string
}

type BillItemRow = {
  line_number: number
  item_number: string
  item_name: string
  item_description: string | null
  item_type: 'service' | 'spare_part'
  quantity: number
  unit_price: number | string
  line_amount: number | string
}

type BillRow = BillSummaryRow & {
  customer_address: string | null
  bill_items: BillItemRow[] | null
}

function toSummary(row: BillSummaryRow): BillSummary {
  return {
    id: row.id,
    billNumber: row.bill_number,
    billDate: row.bill_date,
    customerName: row.customer_name,
    grandTotal: Number(row.grand_total).toFixed(2),
  }
}

function toLine(row: BillItemRow): SavedBillLine {
  return {
    lineNumber: row.line_number,
    itemNumber: row.item_number,
    itemName: row.item_name,
    itemDescription: row.item_description,
    itemType: row.item_type,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price).toFixed(2),
    lineAmount: Number(row.line_amount).toFixed(2),
  }
}

export async function listBills(
  query: BillQuery,
): Promise<{ rows: BillSummary[]; total: number }> {
  let request = supabase
    .from('bills')
    .select('id, bill_number, bill_date, customer_name, grand_total', { count: 'exact' })

  if (query.search.trim()) {
    request = request.or(
      orIlikeFilter(['bill_number', 'customer_name'], toIlikePattern(query.search)),
    )
  }
  if (query.billDate) {
    request = request.eq('bill_date', query.billDate)
  } else if (query.fromDate && query.toDate) {
    request = request.gte('bill_date', query.fromDate).lte('bill_date', query.toDate)
  }

  const { data, error, count } = await request
    .order('bill_date', { ascending: query.sort === 'asc' })
    .order('created_at', { ascending: false })
    .range((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE - 1)

  if (error) {
    throw new Error(parseDbError(error)?.message ?? error.message)
  }

  return {
    rows: ((data ?? []) as BillSummaryRow[]).map(toSummary),
    total: count ?? 0,
  }
}

export async function getBill(id: string): Promise<SavedBill | null> {
  const { data, error } = await supabase
    .from('bills')
    .select(
      'id, bill_number, bill_date, customer_name, customer_address, grand_total, bill_items(line_number, item_number, item_name, item_description, item_type, quantity, unit_price, line_amount)',
    )
    .eq('id', id)
    .order('line_number', { referencedTable: 'bill_items', ascending: true })
    .maybeSingle()

  if (error) {
    throw new Error(parseDbError(error)?.message ?? error.message)
  }
  if (!data) {
    return null
  }

  const row = data as unknown as BillRow

  return {
    ...toSummary(row),
    customerAddress: row.customer_address,
    lines: (row.bill_items ?? []).map(toLine),
  }
}

export type BillsApi = {
  listBills: typeof listBills
}
