import { expect, test } from 'vitest'
import { orIlikeFilter, toIlikePattern } from './search'

test('trims and escapes like wildcards', () => {
  expect(toIlikePattern('  1001  ')).toBe('%1001%')
  expect(toIlikePattern('100%')).toBe('%100\\%%')
  expect(toIlikePattern('a_b')).toBe('%a\\_b%')
  expect(toIlikePattern('a\\b')).toBe('%a\\\\b%')
})

test('quotes the pattern so commas stay inside one filter', () => {
  expect(orIlikeFilter(['item_number', 'name'], '%a,b%')).toBe(
    'item_number.ilike."%a,b%",name.ilike."%a,b%"',
  )
})
