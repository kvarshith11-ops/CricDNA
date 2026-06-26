import type {
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

  requireRatingGroup(response.ratings, 'ratings', errors)
  requireText(response.batting, 'batting', errors)
  requireText(response.bowling, 'bowling', errors)
  requireText(response.fielding, 'fielding', errors)
  requireText(response.overall, 'overall', errors)
  requireRating(response.dnaScore, 'dnaScore', errors)
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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
