import type { TraitDefinition, TraitId } from './types'

export class TraitRegistry {
  private readonly definitions = new Map<TraitId, TraitDefinition>()

  register(definition: TraitDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Trait '${definition.id}' is already registered.`)
    }

    this.definitions.set(definition.id, definition)
  }

  get(traitId: TraitId): TraitDefinition | undefined {
    return this.definitions.get(traitId)
  }

  getRequired(traitId: TraitId): TraitDefinition {
    const definition = this.get(traitId)

    if (!definition) {
      throw new Error(`Trait '${traitId}' is not registered.`)
    }

    return definition
  }

  has(traitId: TraitId): boolean {
    return this.definitions.has(traitId)
  }

  all(): readonly TraitDefinition[] {
    return [...this.definitions.values()]
  }

  static fromDefinitions(definitions: readonly TraitDefinition[]): TraitRegistry {
    const registry = new TraitRegistry()

    for (const definition of definitions) {
      registry.register(definition)
    }

    return registry
  }
}
