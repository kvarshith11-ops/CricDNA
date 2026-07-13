import {
  FieldAssistedRunOutsCalculator,
  FieldCatchesCalculator,
  FieldDismissalsCalculator,
  FieldInningsCalculator,
  FieldMatchesCalculator,
  FieldRunOutsCalculator,
  FieldStumpingsCalculator,
} from '../calculators/fielding/FieldingCoreCalculators'
import {
  MetricCategory,
  MetricLevel,
  type MetricDefinition,
} from './types'

const version = '1.0.0'

export const fieldingCoreMetricDefinitions: readonly MetricDefinition[] = [
  {
    id: 'field.matches',
    name: 'Fielding Matches',
    category: MetricCategory.Fielding,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new FieldMatchesCalculator(),
  },
  {
    id: 'field.innings',
    name: 'Fielding Innings',
    category: MetricCategory.Fielding,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new FieldInningsCalculator(),
  },
  {
    id: 'field.catches',
    name: 'Catches',
    category: MetricCategory.Fielding,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new FieldCatchesCalculator(),
  },
  {
    id: 'field.stumpings',
    name: 'Stumpings',
    category: MetricCategory.Fielding,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new FieldStumpingsCalculator(),
  },
  {
    id: 'field.run_outs',
    name: 'Run Outs',
    category: MetricCategory.Fielding,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new FieldRunOutsCalculator(),
  },
  {
    id: 'field.assisted_run_outs',
    name: 'Assisted Run Outs',
    category: MetricCategory.Fielding,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new FieldAssistedRunOutsCalculator(),
  },
  {
    id: 'field.dismissals',
    name: 'Fielding Dismissals',
    category: MetricCategory.Fielding,
    level: MetricLevel.Primitive,
    dependencies: [],
    version,
    calculator: new FieldDismissalsCalculator(),
  },
]
