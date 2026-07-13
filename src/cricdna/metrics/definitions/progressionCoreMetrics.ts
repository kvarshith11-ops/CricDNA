import {
  ProgressionEventsCalculator,
  ProgressionInningsProgressionsCalculator,
  ProgressionRunProgressionPointsCalculator,
  ProgressionWicketProgressionPointsCalculator,
} from '../calculators/progression/ProgressionCoreCalculators'
import {
  MetricCategory,
  MetricLevel,
  type MetricDefinition,
} from './types'

const version = '1.0.0'

export const progressionCoreMetricDefinitions: readonly MetricDefinition[] = [
  {
    id: 'progression.innings_progressions',
    name: 'Innings Progressions',
    category: MetricCategory.Progression,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new ProgressionInningsProgressionsCalculator(),
  },
  {
    id: 'progression.run_progression_points',
    name: 'Run Progression Points',
    category: MetricCategory.Progression,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new ProgressionRunProgressionPointsCalculator(),
  },
  {
    id: 'progression.wicket_progression_points',
    name: 'Wicket Progression Points',
    category: MetricCategory.Progression,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new ProgressionWicketProgressionPointsCalculator(),
  },
  {
    id: 'progression.progression_events',
    name: 'Progression Events',
    category: MetricCategory.Progression,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new ProgressionEventsCalculator(),
  },
]
