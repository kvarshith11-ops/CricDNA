import { describe, expect, it } from 'vitest'
import type { AIDNAObservationCategory } from '../types/aiScout'
import { visibleDnaObservationGroupsFor } from './dnaObservations'

const observation = (category: AIDNAObservationCategory) => ({
  title: `${category} observation`,
  category,
  summary: `${category} summary`,
  supportingTraits: [`trait.${category}`],
  supportingMetricIds: [`${category}.metric`],
  evidence: [`${category} evidence`],
})

describe('visibleDnaObservationGroupsFor', () => {
  it('shows batting observations for batters only', () => {
    const groups = visibleDnaObservationGroupsFor('batter', {
      batting: [observation('batting')],
      bowling: [observation('bowling')],
      fielding: [observation('fielding')],
      overall: [observation('overall')],
    })

    expect(groups.map((group) => group.category)).toEqual(['batting'])
  })

  it('shows batting and bowling observations for all-rounders', () => {
    const groups = visibleDnaObservationGroupsFor('all_rounder', {
      batting: [observation('batting')],
      bowling: [observation('bowling')],
      fielding: [observation('fielding')],
      overall: [observation('overall')],
    })

    expect(groups.map((group) => group.category)).toEqual(['batting', 'bowling'])
  })

  it('shows batting and fielding observations for wicketkeepers', () => {
    const groups = visibleDnaObservationGroupsFor('wicket_keeper', {
      batting: [observation('batting')],
      bowling: [observation('bowling')],
      fielding: [observation('fielding')],
      overall: [observation('overall')],
    })

    expect(groups.map((group) => group.category)).toEqual(['batting', 'fielding'])
  })

  it('returns only display-safe observation fields', () => {
    const [group] = visibleDnaObservationGroupsFor('batter', {
      batting: [observation('batting')],
    })

    expect(group?.observations[0]).toEqual({
      title: 'batting observation',
      summary: 'batting summary',
    })
    expect(group?.observations[0]).not.toHaveProperty('supportingTraits')
    expect(group?.observations[0]).not.toHaveProperty('supportingMetricIds')
    expect(group?.observations[0]).not.toHaveProperty('evidence')
  })
})
