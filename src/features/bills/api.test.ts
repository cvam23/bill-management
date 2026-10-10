import { vi } from 'vitest'
import { getBill, listBills } from './api'

const state = vi.hoisted(() => ({
  calls: [] as Array<[string, unknown[]]>,
  result: { data: [], error: null, count: 0 } as unknown,
}))

vi.mock('../../lib/supabase', () => {
  const chain: Record<string, unknown> = {}
  for (const name of ['select', 'or', 'eq', 'gte', 'lte', 'order', 'range', 'maybeSingle']) {
    chain[name] = (...args: unknown[]) => {
      state.calls.push([name, args])
      return chain
    }
  }
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(state.result).then(resolve, reject)

  return {
    supabase: {
      from: (...args: unknown[]) => {
        state.calls.push(['from', args])
        return chain
      },
    },
  }
})

const calls = state.calls

const baseQuery = {
  search: '',
  billDate: null,
  fromDate: null,
  toDate: null,
  sort: 'desc' as const,
  page: 1,
}

function names() {
  return calls.map(([name]) => name)
}

beforeEach(() => {
  calls.length = 0
  state.result = { data: [], error: null, count: 0 }
})

test('lists bills with the default sort and a 20-row page range', async () => {
  state.result = {
    data: [
      {
        id: 'b1',
        bill_number: 'B-1',
        bill_date: '2026-10-10',
        customer_name: null,
        grand_total: 450,
      },
    ],
    error: null,
    count: 41,
  }

  const result = await listBills({ ...baseQuery, page: 3 })

  expect(result).toEqual({
    rows: [
      {
        id: 'b1',
        billNumber: 'B-1',
        billDate: '2026-10-10',
        customerName: null,
        grandTotal: '450.00',
      },
    ],
    total: 41,
  })
  expect(calls).toContainEqual(['from', ['bills']])
  expect(calls).toContainEqual([
    'select',
    ['id, bill_number, bill_date, customer_name, grand_total', { count: 'exact' }],
  ])
  expect(calls).toContainEqual(['order', ['bill_date', { ascending: false }]])
  expect(calls).toContainEqual(['order', ['created_at', { ascending: false }]])
  expect(calls).toContainEqual(['range', [40, 59]])
  expect(names()).not.toContain('or')
})

test('sorts oldest first by bill date while keeping created_at descending', async () => {
  await listBills({ ...baseQuery, sort: 'asc' })

  expect(calls).toContainEqual(['order', ['bill_date', { ascending: true }]])
  expect(calls).toContainEqual(['order', ['created_at', { ascending: false }]])
})

test('searches bill number and customer name', async () => {
  await listBills({ ...baseQuery, search: ' 100_ ' })

  expect(calls).toContainEqual([
    'or',
    ['bill_number.ilike."%100\\\\_%",customer_name.ilike."%100\\\\_%"'],
  ])
})

test('a single date wins over the range', async () => {
  await listBills({
    ...baseQuery,
    billDate: '2026-10-10',
    fromDate: '2026-10-01',
    toDate: '2026-10-31',
  })

  expect(calls).toContainEqual(['eq', ['bill_date', '2026-10-10']])
  expect(names()).not.toContain('gte')
  expect(names()).not.toContain('lte')
})

test('applies a range only when both ends are set', async () => {
  await listBills({ ...baseQuery, fromDate: '2026-10-01', toDate: '2026-10-31' })

  expect(calls).toContainEqual(['gte', ['bill_date', '2026-10-01']])
  expect(calls).toContainEqual(['lte', ['bill_date', '2026-10-31']])

  calls.length = 0
  await listBills({ ...baseQuery, fromDate: '2026-10-01' })
  expect(names()).not.toContain('gte')
})

test('throws when the list request fails', async () => {
  state.result = { data: null, error: { message: 'boom' }, count: null }

  await expect(listBills(baseQuery)).rejects.toThrow('boom')
})

test('gets a bill with its snapshot lines ordered by line number', async () => {
  state.result = {
    data: {
      id: 'b1',
      bill_number: 'B-1',
      bill_date: '2026-10-10',
      customer_name: 'Asha',
      customer_address: null,
      grand_total: '600.00',
      bill_items: [
        {
          line_number: 1,
          item_number: '1001',
          item_name: 'Machine Service',
          item_description: null,
          item_type: 'service',
          quantity: 2,
          unit_price: 300,
          line_amount: 600,
        },
      ],
    },
    error: null,
  }

  const bill = await getBill('b1')

  expect(bill).toEqual({
    id: 'b1',
    billNumber: 'B-1',
    billDate: '2026-10-10',
    customerName: 'Asha',
    customerAddress: null,
    grandTotal: '600.00',
    lines: [
      {
        lineNumber: 1,
        itemNumber: '1001',
        itemName: 'Machine Service',
        itemDescription: null,
        itemType: 'service',
        quantity: 2,
        unitPrice: '300.00',
        lineAmount: '600.00',
      },
    ],
  })
  expect(calls).toContainEqual(['from', ['bills']])
  expect(calls).toContainEqual(['eq', ['id', 'b1']])
  expect(calls).toContainEqual([
    'order',
    ['line_number', { referencedTable: 'bill_items', ascending: true }],
  ])
  const selected = calls.find(([name]) => name === 'select')?.[1][0] as string
  expect(selected).toContain('bill_items(line_number, item_number, item_name, item_description')
  expect(selected).not.toContain('services')
})

test('returns null when the bill does not exist', async () => {
  state.result = { data: null, error: null }

  expect(await getBill('missing')).toBeNull()
})
