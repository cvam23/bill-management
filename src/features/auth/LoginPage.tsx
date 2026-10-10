import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../app/auth'
import { Logo } from '../../components/layout/Logo'
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
    return <Navigate to="/" replace />
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
    <main className="grid min-h-screen bg-housing lg:grid-cols-[1.15fr_0.85fr]">
      <section className="hidden flex-col justify-between px-12 py-10 text-white lg:flex">
        <Logo className="h-12 w-12" />
        <div className="max-w-xl">
          <p className="font-mono text-[11px] tracking-[0.22em] text-white/45 uppercase">
            Workshop counter
          </p>
          <p className="mt-4 font-display text-7xl leading-[0.88] font-semibold tracking-wide uppercase">
            Bill the job on the floor
          </p>
          <p className="mt-5 max-w-sm text-lg text-white/70">
            Services, spare parts, and the saved bill, kept at the counter.
          </p>
        </div>
        <p className="font-mono text-[11px] tracking-[0.16em] text-white/40 uppercase">
          Riddhi Sewing Machine
        </p>
      </section>
      <section className="flex min-h-screen items-start justify-center bg-bench p-4 pt-8 sm:items-center sm:p-8">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="rise w-full max-w-sm space-y-5 rounded-md border border-line bg-white p-6 sm:p-8"
        >
          <div className="flex items-center gap-3">
            <Logo />
            <h1 className="leading-none">
              <span className="sr-only">Riddhi Sewing Machine</span>
              <span
                aria-hidden="true"
                className="block font-display text-3xl font-semibold tracking-wide text-ink uppercase"
              >
                Riddhi
              </span>
              <span
                aria-hidden="true"
                className="mt-1 block font-mono text-[10px] font-medium tracking-[0.18em] text-muted uppercase"
              >
                Sewing Machine
              </span>
            </h1>
          </div>
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
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          ) : null}
          <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
            Sign in
          </Button>
        </form>
      </section>
    </main>
  )
}
