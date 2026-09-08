import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocalTripRepository } from '../data/localRepository'
import { sampleTrip } from '../data/sampleTrip'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('opens as a readable Saturday route with editing controls hidden', async () => {
    render(<AppShell repository={new LocalTripRepository(sampleTrip)} token="demo-dallas-2026" />)

    expect(await screen.findByRole('heading', { name: 'Dallas Weekend' })).toBeVisible()
    expect(screen.getByRole('heading', { name: /Saturday route/i })).toBeVisible()
    expect(screen.getByText('Fort Worth')).toBeVisible()
    const drives = screen.getAllByText('50 min drive')
    expect(drives).toHaveLength(2)
    drives.forEach((drive) => expect(drive).toBeVisible())
    expect(screen.queryByRole('button', { name: /Edit Fort Worth/i })).not.toBeInTheDocument()
  })

  it('switches days from the sticky day navigation', async () => {
    const user = userEvent.setup()
    render(<AppShell repository={new LocalTripRepository(sampleTrip)} token="demo-dallas-2026" />)

    await screen.findByRole('heading', { name: 'Dallas Weekend' })
    await user.click(screen.getByRole('tab', { name: /Sunday, September 20/i }))

    expect(screen.getByRole('heading', { name: /Sunday route/i })).toBeVisible()
    expect(screen.getByText('WinStar Casino')).toBeVisible()
    expect(screen.queryByText('Fort Worth')).not.toBeInTheDocument()
  })

  it('posts to only the selected stop and keeps comments after reopening the app', async () => {
    const user = userEvent.setup()
    const repository = new LocalTripRepository(sampleTrip, localStorage)
    const view = render(<AppShell repository={repository} token="demo-dallas-2026" />)
    await screen.findByRole('heading', { name: 'Dallas Weekend' })
    await user.click(screen.getByRole('button', { name: /Comments for Fort Worth/ }))
    const dialog = screen.getByRole('dialog', { name: 'Fort Worth comments' })
    expect(within(dialog).getByRole('button', { name: 'Post comment' })).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Your name'), 'Min')
    await user.type(within(dialog).getByLabelText('Comment'), 'Meet by the cattle drive!')
    await user.click(within(dialog).getByRole('button', { name: 'Post comment' }))
    expect(await within(dialog).findByText('Meet by the cattle drive!')).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
    expect(screen.getByRole('button', { name: /Comments for Fort Worth/ })).toHaveFocus()
    view.unmount()
    render(<AppShell repository={new LocalTripRepository(sampleTrip, localStorage)} token="demo-dallas-2026" />)
    await screen.findByRole('heading', { name: 'Dallas Weekend' })
    await user.click(screen.getByRole('button', { name: /Comments for Fort Worth/ }))
    expect(screen.getByText('Meet by the cattle drive!')).toBeVisible()
    expect(screen.getByLabelText('Your name')).toHaveValue('Min')
    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    await user.click(screen.getByRole('button', { name: /Comments for Bowling/ }))
    expect(screen.queryByText('Meet by the cattle drive!')).not.toBeInTheDocument()
  })

  it('keeps a comment draft when posting fails and lets the user retry', async () => {
    const user = userEvent.setup()
    const repository = new LocalTripRepository(sampleTrip)
    vi.spyOn(repository, 'addComment').mockRejectedValueOnce(new Error('Connection lost. Please retry.'))
    render(<AppShell repository={repository} token="demo-dallas-2026" />)
    await screen.findByRole('heading', { name: 'Dallas Weekend' })
    await user.click(screen.getByRole('button', { name: /Comments for Bowling/ }))
    await user.type(screen.getByLabelText('Your name'), 'Min')
    await user.type(screen.getByLabelText('Comment'), 'Book a lane?')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost')
    expect(screen.getByLabelText('Comment')).toHaveValue('Book a lane?')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(await screen.findByText('Book a lane?')).toBeVisible()
    expect(screen.getByLabelText('Comment')).toHaveValue('')
  })

  it('opens stop details with price source and provides calendar choices', async () => {
    const user = userEvent.setup()
    render(<AppShell repository={new LocalTripRepository(sampleTrip)} token="demo-dallas-2026" />)
    await screen.findByRole('heading', { name: 'Dallas Weekend' })
    await user.click(screen.getByRole('button', { name: 'Details for Fort Worth' }))
    expect(screen.getByRole('button', { name: 'Details for Fort Worth' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: /Stockyards visitor information/ })).toHaveAttribute('href', 'https://www.fortworthstockyards.org/faq/cattle-drive-times-locations')
    await user.click(screen.getByRole('button', { name: 'Save Fort Worth to calendar' }))
    const dialog = screen.getByRole('dialog', { name: 'Save to calendar' })
    expect(within(dialog).getByRole('link', { name: 'Open Google Calendar' })).toHaveAttribute('href', expect.stringContaining('calendar.google.com'))
    expect(within(dialog).getByRole('button', { name: 'Download .ics file' })).toBeEnabled()
  })
})
