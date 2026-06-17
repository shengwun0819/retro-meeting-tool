import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BoardSettingsModal from '@/components/modals/BoardSettingsModal'
import { RetroSession } from '@/types'

function makeSession(overrides: Partial<RetroSession> = {}): RetroSession {
  return {
    id: 'session-1',
    name: 'Frontend Sprint 42 Retro',
    team: 'Frontend',
    sprint_number: 42,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function setup(session: RetroSession = makeSession()) {
  const onClose = jest.fn()
  const onSave = jest.fn().mockResolvedValue(undefined)
  const onSaveSectionConfig = jest.fn().mockResolvedValue(undefined)
  render(
    <BoardSettingsModal
      session={session}
      onClose={onClose}
      onSave={onSave}
      sectionConfig={null}
      onSaveSectionConfig={onSaveSectionConfig}
    />
  )
  return { onClose, onSave, onSaveSectionConfig }
}

describe('BoardSettingsModal', () => {
  it('renders with existing team and sprint number pre-filled', () => {
    setup()
    expect(screen.getByDisplayValue('Frontend')).toBeInTheDocument()
    expect(screen.getByDisplayValue('42')).toBeInTheDocument()
  })

  it('renders with empty fields when session has no team or sprint', () => {
    setup(makeSession({ team: undefined, sprint_number: undefined }))
    expect(screen.getByPlaceholderText(/e\.g\. frontend/i)).toHaveValue('')
    expect(screen.getByPlaceholderText(/e\.g\. 42/i)).toHaveValue(null)
  })

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    const cancelBtns = screen.getAllByRole('button', { name: /cancel/i })
    await user.click(cancelBtns[0])
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('calls onClose when × is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = setup()
    await user.click(screen.getByRole('button', { name: '×' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('shows validation error for invalid team name', async () => {
    const user = userEvent.setup()
    setup()
    const teamInput = screen.getByDisplayValue('Frontend')
    await user.clear(teamInput)
    await user.type(teamInput, 'InvalidTeam')
    expect(screen.getByText(/please enter one of/i)).toBeInTheDocument()
  })

  it('clears validation error when a valid team is entered', async () => {
    const user = userEvent.setup()
    setup()
    const teamInput = screen.getByDisplayValue('Frontend')
    await user.clear(teamInput)
    await user.type(teamInput, 'InvalidTeam')
    expect(screen.getByText(/please enter one of/i)).toBeInTheDocument()
    await user.clear(teamInput)
    await user.type(teamInput, 'Backend')
    expect(screen.queryByText(/please enter one of/i)).not.toBeInTheDocument()
  })

  it('Save button is disabled when team is invalid', async () => {
    const user = userEvent.setup()
    setup()
    const teamInput = screen.getByDisplayValue('Frontend')
    await user.clear(teamInput)
    await user.type(teamInput, 'NotATeam')
    const saveBtns = screen.getAllByRole('button', { name: /save/i })
    expect(saveBtns[0]).toBeDisabled()
  })

  it('calls onSave with correct data on valid submit', async () => {
    const user = userEvent.setup()
    const { onSave } = setup(makeSession({ team: 'Backend', sprint_number: 10 }))
    const sprintInput = screen.getByDisplayValue('10')
    await user.clear(sprintInput)
    await user.type(sprintInput, '11')
    const saveBtns = screen.getAllByRole('button', { name: /save/i })
    await user.click(saveBtns[0])
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ team: 'Backend', sprint_number: 11 })
    )
  })

  it('accepts all valid team names without error', async () => {
    const user = userEvent.setup()
    const teams = ['Frontend', 'Backend', 'Platform']
    for (const team of teams) {
      const { unmount } = render(
        <BoardSettingsModal
          session={makeSession({ team: undefined })}
          onClose={jest.fn()}
          onSave={jest.fn().mockResolvedValue(undefined)}
          sectionConfig={null}
          onSaveSectionConfig={jest.fn().mockResolvedValue(undefined)}
        />
      )
      const input = screen.getByPlaceholderText(/e\.g\. frontend/i)
      await user.type(input, team)
      expect(screen.queryByText(/please enter one of/i)).not.toBeInTheDocument()
      unmount()
    }
  })
})
