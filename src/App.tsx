import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { AppShell } from './app/AppShell'
import { LocalTripRepository } from './data/localRepository'
import { SharedCommentsRepository } from './data/sharedCommentsRepository'
import { sampleShareToken, sampleTrip } from './data/sampleTrip'
import type { TripRepository } from './data/repository'

export function App() {
  const [hash, setHash] = useState(window.location.hash)
  const [setup] = useState<{ repository?: TripRepository; shared: boolean; error?: string }>(() => {
    const url = import.meta.env.VITE_SUPABASE_URL?.trim()
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
    if (url || key) {
      if (!url || !key) return { shared: true, error: 'Set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then rebuild the site.' }
      try {
        return { shared: true, repository: new SharedCommentsRepository(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }), sampleTrip) }
      } catch {
        return { shared: true, error: 'Check the Supabase project URL and publishable key in your hosting settings, then rebuild.' }
      }
    }
    try {
      return { shared: false, repository: new LocalTripRepository(sampleTrip, window.localStorage) }
    } catch {
      return { shared: false, error: 'Browser storage could not be opened. Enable site storage or clear this site’s saved data, then reload.' }
    }
  })
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (setup.error || !setup.repository) {
    return (
      <main className="state">
        <h1>Check hosting settings</h1>
        <p role="alert">{setup.error}</p>
      </main>
    )
  }

  const token = setup.shared ? new URLSearchParams(hash.slice(1)).get('trip') ?? '' : sampleShareToken
  return <AppShell key={token} repository={setup.repository} token={token} shared={setup.shared} />
}
