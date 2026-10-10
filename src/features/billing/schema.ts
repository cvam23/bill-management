import { z } from 'zod'

export const billHeaderSchema = z.object({
  billDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customerName: z.string().trim().max(120),
  customerAddress: z.string().trim().max(500),
})

export type BillHeaderInput = z.infer<typeof billHeaderSchema>
