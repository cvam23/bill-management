import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { AppRouter } from './app/router'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
    <Toaster position="top-center" />
  </StrictMode>,
)
