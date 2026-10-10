import { expect, test } from 'vitest'
import { orIlikeFilter, toIlikePattern } from './search'

test('trims and escapes like wildcards', () => {
  expect(toIlikePattern('  1001  ')).toBe('%1001%')
  expect(toIlikePattern('100%')).toBe('%100\\%%')
  expect(toIlikePattern('a_b')).toBe('%a\\_b%')
  expect(toIlikePattern('a\\b')).toBe('%a\\\\b%')
})

test('keeps double quotes in the pattern', () => {
  expect(toIlikePattern('12" zip')).toBe('%12" zip%')
})

test('quotes the pattern so commas stay inside one filter', () => {
  expect(orIlikeFilter(['item_number', 'name'], '%a,b%')).toBe(
    'item_number.ilike."%a,b%",name.ilike."%a,b%"',
  )
})

test('escapes the pattern again for the PostgREST quoted value', () => {
  expect(orIlikeFilter(['name'], toIlikePattern('100%'))).toBe('name.ilike."%100\\\\%%"')
  expect(orIlikeFilter(['name'], toIlikePattern('a_b'))).toBe('name.ilike."%a\\\\_b%"')
  expect(orIlikeFilter(['name'], toIlikePattern('a\\b'))).toBe('name.ilike."%a\\\\\\\\b%"')
  expect(orIlikeFilter(['name'], toIlikePattern('12" zip'))).toBe('name.ilike."%12\\" zip%"')
})
