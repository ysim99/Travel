import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

describe('App setup', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    localStorage.clear()
    window.location.hash = ''
  })
  afterEach(() => vi.unstubAllEnvs())

  it('renders an honest local preview in a production build without backend settings', async () => {
    vi.stubEnv('PROD', true)
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Dallas Weekend' })).toBeVisible()
    expect(screen.getByText(/Comments stay in this browser/)).toBeVisible()
  })

  it('does not silently fall back to local comments for partial shared configuration', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Check hosting settings' })).toBeVisible()
    expect(screen.queryByText('Local preview')).not.toBeInTheDocument()
  })

  it('requires a private token for a configured shared trip', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key')
    render(<App />)
    expect(await screen.findByText(/Trip not found/)).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Dallas Weekend' })).not.toBeInTheDocument()
  })
})
