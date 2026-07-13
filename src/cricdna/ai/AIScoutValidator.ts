import type {
  AIDNAObservation,
  AIDNAObservationCategory,
  AIDNAObservations,
  AIRating,
  AIRoleSuitability,
  AIScoutConfidence,
  AIScoutResponse,
} from './AIScoutResponseSchema'

export interface AIScoutValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
  readonly response?: AIScoutResponse
}

export const validateAIScoutResponseJson = (
  rawResponse: string,
): AIScoutValidationResult => {
  try {
    return validateAIScoutResponse(JSON.parse(rawResponse) as unknown)
  } catch {
    return {
      valid: false,
      errors: ['AI Scout response is not valid JSON.'],
    }
  }
}

export const validateAIScoutResponse = (
  response: unknown,
): AIScoutValidationResult => {
  const errors: string[] = []

  if (!isRecord(response)) {
    return {
      valid: false,
      errors: ['AI Scout response must be a JSON object.'],
    }
  }

  requireAllowedKeys(
    response,
    'response',
    [
      'ratings',
      'batting',
      'bowling',
      'fielding',
      'overall',
      'dnaScore',
      'dnaObservations',
      'strengths',
      'developmentAreas',
      'roleSuitability',
      'scoutingReport',
      'confidence',
    ],
    errors,
  )
  requireRatingGroup(response.ratings, 'ratings', errors)
  requireText(response.batting, 'batting', errors)
  requireText(response.bowling, 'bowling', errors)
  requireText(response.fielding, 'fielding', errors)
  requireText(response.overall, 'overall', errors)
  requireRating(response.dnaScore, 'dnaScore', errors)
  requireDnaObservations(response.dnaObservations, errors)
  requireStringArray(response.strengths, 'strengths', errors)
  requireStringArray(response.developmentAreas, 'developmentAreas', errors)
  requireRoleSuitabilityArray(response.roleSuitability, errors)
  requireText(response.scoutingReport, 'scoutingReport', errors)
  requireConfidence(response.confidence, 'confidence', errors)

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    }
  }

  return {
    valid: true,
    errors: [],
    response: response as unknown as AIScoutResponse,
  }
}

const observationCategories = ['batting', 'bowling', 'fielding', 'overall'] as const

const requireDnaObservations = (
  value: unknown,
  errors: string[],
): void => {
  if (!isRecord(value)) {
    errors.push("Missing or invalid 'dnaObservations'.")
    return
  }

  requireAllowedKeys(value, 'dnaObservations', observationCategories, errors)

  const observations = value as AIDNAObservations
  let observationCount = 0

  for (const category of observationCategories) {
    const entries = observations[category]

    if (entries === undefined) {
      errors.push(`Missing or invalid 'dnaObservations.${category}'.`)
      continue
    }

    if (!Array.isArray(entries)) {
      errors.push(`'dnaObservations.${category}' must be an array.`)
      continue
    }

    if (category === 'overall') {
      continue
    }

    observationCount += entries.length
    entries.forEach((entry, index) =>
      requireDnaObservation(entry, category, `dnaObservations.${category}.${index}`, errors),
    )
  }

  if (observationCount > 3) {
    errors.push("'dnaObservations' must include no more than 3 visible observations.")
  }
}

const requireDnaObservation = (
  value: unknown,
  groupCategory: AIDNAObservationCategory,
  path: string,
  errors: string[],
): void => {
  if (!isRecord(value)) {
    errors.push(`'${path}' must be an object.`)
    return
  }

  requireAllowedKeys(
    value,
    path,
    ['title', 'category', 'summary', 'supportingTraits', 'supportingMetricIds', 'evidence'],
    errors,
  )

  const observation = value as Partial<AIDNAObservation>

  requireText(observation.title, `${path}.title`, errors)
  requireText(observation.summary, `${path}.summary`, errors)
  requireStringArray(observation.supportingTraits, `${path}.supportingTraits`, errors)
  requireStringArray(
    observation.supportingMetricIds,
    `${path}.supportingMetricIds`,
    errors,
  )
  requireStringArray(observation.evidence, `${path}.evidence`, errors)

  if (!isObservationCategory(observation.category)) {
    errors.push(`'${path}.category' must be a supported observation category.`)
  } else if (observation.category !== groupCategory) {
    errors.push(`'${path}.category' must match its '${groupCategory}' group.`)
  }

  const evidenceCount = observation.evidence?.length ?? 0

  if (evidenceCount === 0) {
    errors.push(`'${path}.evidence' must include at least one evidence item.`)
  }
}

const requireRatingGroup = (
  value: unknown,
  path: string,
  errors: string[],
): void => {
  if (!isRecord(value)) {
    errors.push(`Missing or invalid '${path}'.`)
    return
  }

  requireRating(value.batting, `${path}.batting`, errors)
  requireRating(value.bowling, `${path}.bowling`, errors)
  requireRating(value.fielding, `${path}.fielding`, errors)
  requireRating(value.overall, `${path}.overall`, errors)
}

const requireRating = (
  value: unknown,
  path: string,
  errors: string[],
): void => {
  if (!isRecord(value)) {
    errors.push(`Missing or invalid '${path}'.`)
    return
  }

  const rating = value as Partial<AIRating>

  if (!isValidScore(rating.score)) {
    errors.push(`'${path}.score' must be a number between 0 and 100.`)
  }

  requireText(rating.explanation, `${path}.explanation`, errors)
}

const requireConfidence = (
  value: unknown,
  path: string,
  errors: string[],
): void => {
  if (!isRecord(value)) {
    errors.push(`Missing or invalid '${path}'.`)
    return
  }

  const confidence = value as Partial<AIScoutConfidence>

  if (!isValidScore(confidence.score)) {
    errors.push(`'${path}.score' must be a number between 0 and 100.`)
  }

  requireText(confidence.explanation, `${path}.explanation`, errors)
}

const requireRoleSuitabilityArray = (
  value: unknown,
  errors: string[],
): void => {
  if (!Array.isArray(value)) {
    errors.push("Missing or invalid 'roleSuitability'.")
    return
  }

  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      errors.push(`'roleSuitability.${index}' must be an object.`)
      return
    }

    const suitability = entry as Partial<AIRoleSuitability>

    requireText(suitability.role, `roleSuitability.${index}.role`, errors)

    if (!isValidScore(suitability.suitability)) {
      errors.push(
        `'roleSuitability.${index}.suitability' must be a number between 0 and 100.`,
      )
    }

    requireText(
      suitability.explanation,
      `roleSuitability.${index}.explanation`,
      errors,
    )
  })
}

const requireStringArray = (
  value: unknown,
  path: string,
  errors: string[],
): void => {
  if (!Array.isArray(value)) {
    errors.push(`Missing or invalid '${path}'.`)
    return
  }

  value.forEach((item, index) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      errors.push(`'${path}.${index}' must be a non-empty string.`)
    }
  })
}

const requireAllowedKeys = (
  value: Record<string, unknown>,
  path: string,
  allowedKeys: readonly string[],
  errors: string[],
): void => {
  const allowed = new Set(allowedKeys)

  Object.keys(value).forEach((key) => {
    if (!allowed.has(key)) {
      errors.push(`Unsupported field '${path}.${key}'.`)
    }
  })
}

const requireText = (
  value: unknown,
  path: string,
  errors: string[],
): void => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`Missing or empty '${path}'.`)
  }
}

const isValidScore = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
}

const isObservationCategory = (
  value: unknown,
): value is AIDNAObservationCategory => {
  return (
    typeof value === 'string' &&
    observationCategories.includes(value as AIDNAObservationCategory)
  )
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
