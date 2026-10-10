import { supabase } from '../../lib/supabase'
import { parseDbError } from '../../lib/errors'
import { orIlikeFilter, toIlikePattern } from '../../lib/search'

export type MasterItem = {
  id: string
  itemNumber: string
  name: string
  description: string | null
  itemType: 'service' | 'spare_part'
  defaultPrice: string
  isActive: boolean
}

export type MasterItemInput = {
  name: string
  description: string
  itemType: 'service' | 'spare_part'
  defaultPrice: string
}

export type MasterItemQuery = {
  search: string
  itemType: 'all' | 'service' | 'spare_part'
  status: 'all' | 'active' | 'inactive'
  page: number
}

export const PAGE_SIZE = 20

type ServiceRow = {
  id: string
  item_number: string
  name: string
  description: string | null
  item_type: 'service' | 'spare_part'
  default_price: number | string
  is_active: boolean
}

function toMasterItem(row: ServiceRow): MasterItem {
  return {
    id: row.id,
    itemNumber: row.item_number,
    name: row.name,
    description: row.description,
    itemType: row.item_type,
    defaultPrice: Number(row.default_price).toFixed(2),
    isActive: row.is_active,
  }
}

export class MasterItemError extends Error {
  code: string | null

  constructor(message: string, code: string | null) {
    super(message)
    this.name = 'MasterItemError'
    this.code = code
  }
}

function fail(error: { message: string }): never {
  const parsed = parseDbError(error)
  throw new MasterItemError(parsed?.message ?? error.message, parsed?.code ?? null)
}

export async function listMasterItems(
  query: MasterItemQuery,
): Promise<{ rows: MasterItem[]; total: number }> {
  let request = supabase
    .from('services')
    .select('id, item_number, name, description, item_type, default_price, is_active', {
      count: 'exact',
    })

  if (query.search.trim()) {
    request = request.or(
      orIlikeFilter(['item_number', 'name', 'description'], toIlikePattern(query.search)),
    )
  }
  if (query.itemType !== 'all') {
    request = request.eq('item_type', query.itemType)
  }
  if (query.status !== 'all') {
    request = request.eq('is_active', query.status === 'active')
  }

  const { data, error, count } = await request
    .order('item_number_value', { ascending: false })
    .range((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE - 1)

  if (error) {
    fail(error)
  }

  return {
    rows: ((data ?? []) as ServiceRow[]).map(toMasterItem),
    total: count ?? 0,
  }
}

export async function createMasterItem(input: MasterItemInput): Promise<MasterItem> {
  const { data, error } = await supabase.rpc('create_master_item', {
    p_name: input.name,
    p_description: input.description.trim() || null,
    p_item_type: input.itemType,
    p_default_price: input.defaultPrice,
  })

  if (error) {
    fail(error)
  }

  return toMasterItem(data as ServiceRow)
}

export async function updateMasterItem(id: string, input: MasterItemInput): Promise<MasterItem> {
  const { data, error } = await supabase.rpc('update_master_item', {
    p_id: id,
    p_name: input.name,
    p_description: input.description.trim() || null,
    p_item_type: input.itemType,
    p_default_price: input.defaultPrice,
  })

  if (error) {
    fail(error)
  }

  return toMasterItem(data as ServiceRow)
}

export async function setMasterItemActive(id: string, isActive: boolean): Promise<MasterItem> {
  const { data, error } = await supabase.rpc('set_master_item_active', {
    p_id: id,
    p_is_active: isActive,
  })

  if (error) {
    fail(error)
  }

  return toMasterItem(data as ServiceRow)
}

export type ServicesApi = {
  listMasterItems: typeof listMasterItems
  createMasterItem: typeof createMasterItem
  updateMasterItem: typeof updateMasterItem
  setMasterItemActive: typeof setMasterItemActive
}

export const servicesApi: ServicesApi = {
  listMasterItems,
  createMasterItem,
  updateMasterItem,
  setMasterItemActive,
}

export function isDuplicateName(error: unknown): boolean {
  return error instanceof MasterItemError && error.code === 'duplicate_name'
}
