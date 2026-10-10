import { expect, test } from 'vitest'
import { parseDbError } from './errors'

test('reads a stable code and sentence', () => {
  expect(parseDbError({ message: 'duplicate_name: An item with this name already exists for this type.' }))
    .toEqual({
      code: 'duplicate_name',
      message: 'An item with this name already exists for this type.',
    })
})

test('returns null when the message has no code', () => {
  expect(parseDbError({ message: 'network down' })).toBeNull()
  expect(parseDbError(null)).toBeNull()
})
