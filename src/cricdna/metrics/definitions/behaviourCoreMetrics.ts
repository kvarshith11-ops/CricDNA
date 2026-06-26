import {
  BehaviourCaptainMatchesCalculator,
  BehaviourEventTypesCalculator,
  BehaviourEventsCalculator,
  BehaviourPlayerOfMatchAwardsCalculator,
  BehaviourSubstituteMatchesCalculator,
  BehaviourWicketKeeperMatchesCalculator,
} from '../calculators/behaviour/BehaviourCoreCalculators'
import {
  MetricCategory,
  MetricLevel,
  type MetricDefinition,
} from './types'

const version = '1.0.0'

export const behaviourCoreMetricDefinitions: readonly MetricDefinition[] = [
  {
    id: 'behaviour.captain_matches',
    name: 'Captain Matches',
    category: MetricCategory.Behaviour,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new BehaviourCaptainMatchesCalculator(),
  },
  {
    id: 'behaviour.wicket_keeper_matches',
    name: 'Wicket Keeper Matches',
    category: MetricCategory.Behaviour,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new BehaviourWicketKeeperMatchesCalculator(),
  },
  {
    id: 'behaviour.substitute_matches',
    name: 'Substitute Matches',
    category: MetricCategory.Behaviour,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new BehaviourSubstituteMatchesCalculator(),
  },
  {
    id: 'behaviour.player_of_match_awards',
    name: 'Player Of Match Awards',
    category: MetricCategory.Behaviour,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new BehaviourPlayerOfMatchAwardsCalculator(),
  },
  {
    id: 'behaviour.events',
    name: 'Behaviour Events',
    category: MetricCategory.Behaviour,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new BehaviourEventsCalculator(),
  },
  {
    id: 'behaviour.event_types',
    name: 'Behaviour Event Types',
    category: MetricCategory.Behaviour,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new BehaviourEventTypesCalculator(),
  },
]
