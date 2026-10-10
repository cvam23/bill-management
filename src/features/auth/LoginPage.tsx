import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../app/auth'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'

const schema = z.object({ email: z.string().email(), password: z.string().min(1) })
type LoginValues = z.infer<typeof schema>

export function LoginPage() {
  const { session, authorized, signIn } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(schema) })

  if (session && authorized) {
    return <Navigate to="/billing" replace />
  }

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    try {
      await signIn(values.email, values.password)
    } catch (error) {
      setFormError(
        error instanceof Error && error.message ? error.message : 'Invalid email or password.',
      )
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6"
      >
        <h1 className="text-xl font-semibold text-slate-900">Riddhi Sewing Machine</h1>
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email ? 'Enter a valid email address.' : undefined}
          {...register('email')}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password ? 'Enter your password.' : undefined}
          {...register('password')}
        />
        {formError ? (
          <p role="alert" className="text-sm text-red-700">
            {formError}
          </p>
        ) : null}
        <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>
    </main>
  )
}
