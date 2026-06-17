/**
 * Teams that should not appear anywhere in the UI:
 *   - the Start New Retro form's team list
 *   - any "Recent Boards" / "Recent Sessions" group on the home page or board sidebar
 *
 * Add a team here to retire it without losing its existing sessions in the DB.
 */
export const HIDDEN_TEAMS = new Set<string>([])

/** Active teams shown in the team picker when starting a new retro */
export const ACTIVE_TEAMS = ['Frontend', 'Backend', 'Platform']
