import { TraitRegistry } from './TraitRegistry'
import { traitDefinitions } from './definitions'

export const loadDefaultTraitRegistry = (): TraitRegistry => {
  return TraitRegistry.fromDefinitions(traitDefinitions)
}
