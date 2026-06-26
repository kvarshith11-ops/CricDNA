import {
  BatAverageCalculator,
  BatDucksCalculator,
  BatOutsCalculator,
} from '../calculators/batting/BattingAverageCalculators'
import {
  MetricCategory,
  MetricLevel,
  type MetricDefinition,
} from './types'

const version = '1.0.0'

export const battingAverageMetricDefinitions: readonly MetricDefinition[] = [
  {
    id: 'bat.outs',
    name: 'Outs',
    category: MetricCategory.Batting,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new BatOutsCalculator(),
  },
  {
    id: 'bat.average',
    name: 'Batting Average',
    category: MetricCategory.Batting,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new BatAverageCalculator(),
  },
  {
    id: 'bat.ducks',
    name: 'Ducks',
    category: MetricCategory.Batting,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new BatDucksCalculator(),
  },
]
