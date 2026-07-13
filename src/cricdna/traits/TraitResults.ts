import type { TraitId, TraitResult } from './types'

export class TraitResults {
  private readonly results: ReadonlyMap<TraitId, TraitResult>

  constructor(results: ReadonlyMap<TraitId, TraitResult>) {
    this.results = new Map(results)
  }

  get(traitId: TraitId): TraitResult | undefined {
    return this.results.get(traitId)
  }

  has(traitId: TraitId): boolean {
    return this.results.has(traitId)
  }

  entries(): readonly TraitResult[] {
    return [...this.results.values()]
  }

  toJSON(): Readonly<Record<TraitId, TraitResult>> {
    return Object.fromEntries(this.results.entries())
  }
}
