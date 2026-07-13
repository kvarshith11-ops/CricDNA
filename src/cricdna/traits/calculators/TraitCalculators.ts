import {
  MetricLevel,
  MetricStatus,
  type EngineeringMetrics,
  type MetricId,
} from '../../metrics'
import {
  TraitCategory,
  TraitStatus,
  type SupportingMetric,
  type TraitCalculator,
  type TraitExecutionContext,
  type TraitId,
  type TraitResult,
} from '../types'

interface TraitConfig {
  readonly traitId: TraitId
  readonly traitName: string
  readonly category: TraitCategory
  readonly dependencies: readonly MetricId[]
  readonly classify: (inputs: ReadonlyMap<MetricId, number>) => Classification
}

interface Classification {
  readonly label: string
  readonly explanation: string
}

const VERSION = '1.0.0'
const HIGH_THRESHOLD = 70

abstract class CompositeTraitCalculator implements TraitCalculator {
  protected constructor(private readonly config: TraitConfig) {}

  calculate(context: TraitExecutionContext): TraitResult {
    const inputResult = getCompositeInputs(context.metrics, this.config.dependencies)

    if (!inputResult.ok) {
      return this.result(null, [], 0, TraitStatus.FailedValidation, inputResult.error)
    }

    const classification = this.config.classify(inputResult.values)

    return this.result(
      classification.label,
      inputResult.supportingMetrics,
      confidenceFromCoverage(inputResult.supportingMetrics.length, this.config.dependencies.length),
      TraitStatus.Success,
      classification.explanation,
    )
  }

  private result(
    classification: string | null,
    supportingMetrics: readonly SupportingMetric[],
    confidence: number,
    status: TraitStatus,
    explanation: string,
  ): TraitResult {
    return {
      traitId: this.config.traitId,
      traitName: this.config.traitName,
      category: this.config.category,
      classification,
      confidence,
      supportingMetrics,
      explanation,
      status,
      version: VERSION,
    }
  }
}

export class BattingStyleTraitCalculator extends CompositeTraitCalculator {
  constructor() {
    super({
      traitId: 'trait.batting_style',
      traitName: 'Batting Style',
      category: TraitCategory.Batting,
      dependencies: ['bat.intent', 'bat.consistency'],
      classify: (inputs) => {
        const intent = requiredInput(inputs, 'bat.intent')
        const consistency = requiredInput(inputs, 'bat.consistency')

        if (intent >= HIGH_THRESHOLD && intent >= consistency) {
          return {
            label: 'Aggressive Stroke Player',
            explanation: `Classified from bat.intent ${intent} and bat.consistency ${consistency}: intent met the high threshold and was the dominant batting signal.`,
          }
        }

        if (consistency >= HIGH_THRESHOLD && consistency > intent) {
          return {
            label: 'Reliable Accumulator',
            explanation: `Classified from bat.intent ${intent} and bat.consistency ${consistency}: consistency met the high threshold and exceeded intent.`,
          }
        }

        return {
          label: 'Balanced Batter',
          explanation: `Classified from bat.intent ${intent} and bat.consistency ${consistency}: neither signal dominated above the high threshold.`,
        }
      },
    })
  }
}

export class BattingIntentTraitCalculator extends CompositeTraitCalculator {
  constructor() {
    super({
      traitId: 'trait.batting_intent',
      traitName: 'Batting Intent Trait',
      category: TraitCategory.Batting,
      dependencies: ['bat.intent'],
      classify: (inputs) => {
        const intent = requiredInput(inputs, 'bat.intent')

        return {
          label: intent >= HIGH_THRESHOLD ? 'High Intent Batter' : 'Measured Intent Batter',
          explanation: `Classified from bat.intent ${intent}.`,
        }
      },
    })
  }
}

export class BattingBoundaryTraitCalculator extends CompositeTraitCalculator {
  constructor() {
    super({
      traitId: 'trait.batting_boundary_style',
      traitName: 'Batting Boundary Style',
      category: TraitCategory.Batting,
      dependencies: ['bat.boundary_intent'],
      classify: (inputs) => {
        const boundaryIntent = requiredInput(inputs, 'bat.boundary_intent')

        return {
          label:
            boundaryIntent >= HIGH_THRESHOLD
              ? 'Boundary-Focused Scorer'
              : 'Low-Boundary Scorer',
          explanation: `Classified from bat.boundary_intent ${boundaryIntent}.`,
        }
      },
    })
  }
}

export class BattingScoringConsistencyTraitCalculator extends CompositeTraitCalculator {
  constructor() {
    super({
      traitId: 'trait.batting_scoring_consistency',
      traitName: 'Batting Scoring Consistency Trait',
      category: TraitCategory.Batting,
      dependencies: ['bat.scoring_consistency'],
      classify: (inputs) => {
        const scoringConsistency = requiredInput(inputs, 'bat.scoring_consistency')

        return {
          label:
            scoringConsistency >= HIGH_THRESHOLD
              ? 'Consistent Scoring Contributor'
              : 'Variable Scoring Contributor',
          explanation: `Classified from bat.scoring_consistency ${scoringConsistency}.`,
        }
      },
    })
  }
}

export class BowlingStyleTraitCalculator extends CompositeTraitCalculator {
  constructor() {
    super({
      traitId: 'trait.bowling_style',
      traitName: 'Bowling Style',
      category: TraitCategory.Bowling,
      dependencies: ['bowl.control', 'bowl.wicket_threat', 'bowl.effectiveness'],
      classify: (inputs) => {
        const control = requiredInput(inputs, 'bowl.control')
        const wicketThreat = requiredInput(inputs, 'bowl.wicket_threat')
        const effectiveness = requiredInput(inputs, 'bowl.effectiveness')

        if (wicketThreat >= HIGH_THRESHOLD && wicketThreat >= control) {
          return {
            label: 'Strike Bowler',
            explanation: `Classified from bowl.wicket_threat ${wicketThreat}, bowl.control ${control}, and bowl.effectiveness ${effectiveness}: wicket threat met the high threshold and was the dominant bowling signal.`,
          }
        }

        if (control >= HIGH_THRESHOLD && control > wicketThreat) {
          return {
            label: 'Control Bowler',
            explanation: `Classified from bowl.control ${control}, bowl.wicket_threat ${wicketThreat}, and bowl.effectiveness ${effectiveness}: control met the high threshold and exceeded wicket threat.`,
          }
        }

        return {
          label: 'Balanced Bowler',
          explanation: `Classified from bowl.control ${control}, bowl.wicket_threat ${wicketThreat}, and bowl.effectiveness ${effectiveness}: no single bowling signal dominated above the high threshold.`,
        }
      },
    })
  }
}

export class BowlingControlTraitCalculator extends CompositeTraitCalculator {
  constructor() {
    super({
      traitId: 'trait.bowling_control',
      traitName: 'Bowling Control Trait',
      category: TraitCategory.Bowling,
      dependencies: ['bowl.control'],
      classify: (inputs) => {
        const control = requiredInput(inputs, 'bowl.control')

        return {
          label: control >= HIGH_THRESHOLD ? 'Control Bowler' : 'Developing Control Bowler',
          explanation: `Classified from bowl.control ${control}.`,
        }
      },
    })
  }
}

export class BowlingThreatTraitCalculator extends CompositeTraitCalculator {
  constructor() {
    super({
      traitId: 'trait.bowling_wicket_threat',
      traitName: 'Bowling Wicket Threat Trait',
      category: TraitCategory.Bowling,
      dependencies: ['bowl.wicket_threat'],
      classify: (inputs) => {
        const wicketThreat = requiredInput(inputs, 'bowl.wicket_threat')

        return {
          label: wicketThreat >= HIGH_THRESHOLD ? 'Wicket Threat' : 'Low Wicket Threat',
          explanation: `Classified from bowl.wicket_threat ${wicketThreat}.`,
        }
      },
    })
  }
}

export class BowlingEffectivenessTraitCalculator extends CompositeTraitCalculator {
  constructor() {
    super({
      traitId: 'trait.bowling_effectiveness',
      traitName: 'Bowling Effectiveness Trait',
      category: TraitCategory.Bowling,
      dependencies: ['bowl.effectiveness'],
      classify: (inputs) => {
        const effectiveness = requiredInput(inputs, 'bowl.effectiveness')

        return {
          label:
            effectiveness >= HIGH_THRESHOLD
              ? 'Effective Bowling Contributor'
              : 'Situational Bowling Contributor',
          explanation: `Classified from bowl.effectiveness ${effectiveness}.`,
        }
      },
    })
  }
}

export class FieldingStyleTraitCalculator extends CompositeTraitCalculator {
  constructor() {
    super({
      traitId: 'trait.fielding_style',
      traitName: 'Fielding Style',
      category: TraitCategory.Fielding,
      dependencies: ['field.impact', 'field.reliability', 'field.activity'],
      classify: (inputs) => {
        const impact = requiredInput(inputs, 'field.impact')
        const reliability = requiredInput(inputs, 'field.reliability')
        const activity = requiredInput(inputs, 'field.activity')

        if (reliability >= HIGH_THRESHOLD && reliability >= activity && reliability >= impact) {
          return {
            label: 'Safe Hands',
            explanation: `Classified from field.reliability ${reliability}, field.activity ${activity}, and field.impact ${impact}: reliability met the high threshold and was the dominant fielding signal.`,
          }
        }

        if (activity >= HIGH_THRESHOLD && activity >= impact) {
          return {
            label: 'Active Fielder',
            explanation: `Classified from field.activity ${activity}, field.impact ${impact}, and field.reliability ${reliability}: activity met the high threshold and was the dominant available signal.`,
          }
        }

        return {
          label: 'Reliable Defender',
          explanation: `Classified from field.impact ${impact}, field.reliability ${reliability}, and field.activity ${activity}: fielding signals did not produce a dominant high-activity or high-reliability classification.`,
        }
      },
    })
  }
}

export class FieldingImpactTraitCalculator extends CompositeTraitCalculator {
  constructor() {
    super({
      traitId: 'trait.fielding_impact',
      traitName: 'Fielding Impact Trait',
      category: TraitCategory.Fielding,
      dependencies: ['field.impact'],
      classify: (inputs) => {
        const impact = requiredInput(inputs, 'field.impact')

        return {
          label: impact >= HIGH_THRESHOLD ? 'Impact Fielder' : 'Support Fielder',
          explanation: `Classified from field.impact ${impact}.`,
        }
      },
    })
  }
}

export class FieldingActivityTraitCalculator extends CompositeTraitCalculator {
  constructor() {
    super({
      traitId: 'trait.fielding_activity',
      traitName: 'Fielding Activity Trait',
      category: TraitCategory.Fielding,
      dependencies: ['field.activity'],
      classify: (inputs) => {
        const activity = requiredInput(inputs, 'field.activity')

        return {
          label: activity >= HIGH_THRESHOLD ? 'Active Fielder' : 'Low Activity Fielder',
          explanation: `Classified from field.activity ${activity}.`,
        }
      },
    })
  }
}

export class WicketKeepingDismissalTraitCalculator extends CompositeTraitCalculator {
  constructor() {
    super({
      traitId: 'trait.keeping_dismissal_involvement',
      traitName: 'Keeping Dismissal Involvement',
      category: TraitCategory.Fielding,
      dependencies: ['field.reliability'],
      classify: (inputs) => {
        const reliability = requiredInput(inputs, 'field.reliability')

        return {
          label:
            reliability >= HIGH_THRESHOLD
              ? 'High Dismissal Involvement Keeper'
              : 'Developing Dismissal Involvement Keeper',
          explanation: `Classified from field.reliability ${reliability}.`,
        }
      },
    })
  }
}

type InputResult =
  | {
      readonly ok: true
      readonly values: ReadonlyMap<MetricId, number>
      readonly supportingMetrics: readonly SupportingMetric[]
    }
  | {
      readonly ok: false
      readonly error: string
    }

const getCompositeInputs = (
  metrics: EngineeringMetrics,
  dependencies: readonly MetricId[],
): InputResult => {
  const values = new Map<MetricId, number>()
  const supportingMetrics: SupportingMetric[] = []

  for (const dependencyId of dependencies) {
    const result = metrics.get(dependencyId)

    if (!result) {
      return {
        ok: false,
        error: `Missing composite dependency '${dependencyId}'.`,
      }
    }

    if (result.level !== MetricLevel.Composite) {
      return {
        ok: false,
        error: `Dependency '${dependencyId}' is not a composite metric.`,
      }
    }

    if (result.status !== MetricStatus.Success) {
      return {
        ok: false,
        error: `Dependency '${dependencyId}' did not complete successfully.`,
      }
    }

    if (typeof result.value !== 'number' || !Number.isFinite(result.value)) {
      return {
        ok: false,
        error: `Dependency '${dependencyId}' does not provide a finite numeric value.`,
      }
    }

    values.set(dependencyId, result.value)
    supportingMetrics.push({
      metricId: dependencyId,
      value: result.value,
    })
  }

  return {
    ok: true,
    values,
    supportingMetrics,
  }
}

const requiredInput = (
  inputs: ReadonlyMap<MetricId, number>,
  metricId: MetricId,
): number => {
  const value = inputs.get(metricId)

  if (value === undefined) {
    throw new Error(`Missing trait input '${metricId}'.`)
  }

  return value
}

const confidenceFromCoverage = (available: number, required: number): number => {
  if (required === 0) {
    return 0
  }

  const coverage = available / required
  const thresholdSupport = available >= 2 ? 1 : 0.75

  return Math.round(Math.min(1, coverage * thresholdSupport) * 100) / 100
}
