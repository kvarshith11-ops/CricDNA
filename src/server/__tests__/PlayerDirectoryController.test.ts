import { describe, expect, it } from 'vitest'
import { PlayerDirectoryController } from '../PlayerDirectoryController'

describe('PlayerDirectoryController', () => {
  it('builds a supported player directory from local scorecards', () => {
    const response = new PlayerDirectoryController().listPlayers()

    expect(response.status).toBe('success')
    expect(response.data.length).toBeGreaterThan(8)
    expect(response.meta.totalPlayers).toBe(response.data.length)
    expect(response.meta.totalMatches).toBeGreaterThan(0)
    expect(response.data[0]?.matchCount).toBeGreaterThanOrEqual(
      response.data[1]?.matchCount ?? 0,
    )
    expect(response.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '10982',
          name: 'Jasprit Bumrah',
          country: 'India',
          role: 'Bowler',
        }),
        expect.objectContaining({
          id: '291',
          name: 'Alex Carey',
          country: 'Australia',
          role: 'Wicket keeper',
        }),
      ]),
    )
  })
})
