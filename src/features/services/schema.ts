import { z } from 'zod'
import { parseRupeesToPaise } from '../../lib/currency'

export const masterItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500),
  itemType: z.enum(['service', 'spare_part']),
  defaultPrice: z
    .string()
    .refine((value) => parseRupeesToPaise(value) !== null, 'Enter a valid price.'),
})
