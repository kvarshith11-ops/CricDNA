# AI Scout Integration

## Architecture

The AI Scout integration layer sits after the deterministic Player Profile Builder.

```text
Raw APIs
  -> Extractors
    -> PlayerMatchRecord
      -> PlayerKnowledgeModel
        -> Primitive Metrics
          -> Composite Metrics
            -> Trait Engine
              -> Player Profile Builder
                -> AI Scout Prompt Builder
                -> AI Scout Response Validator
```

This layer does not call an LLM or integrate an SDK. It only prepares a prompt and validates a future AI response.

The deterministic Trait Engine remains the canonical source of trait labels. AI-generated DNA observations are display-only interpretations of deterministic metrics and traits.

## Prompt Generation

`buildAIScoutPrompt()` accepts a deterministic `PlayerProfile` and returns:

- `system`: role and behavioral constraints for the model
- `user`: JSON payload containing the task, constraints, expected response schema, and supplied player profile

The prompt states:

- all supplied analytics are deterministic
- do not invent statistics
- do not contradict supplied metrics
- do not replace or rename deterministic traits
- return only 1 to 3 total DNA observations
- cite supplied trait ids and/or metric ids for each DNA observation
- include empty arrays for unsupported DNA observation role groups
- keep `dnaObservations.overall` empty; the UI does not display overall DNA observations
- keep recent trend analysis out of DNA observations
- keep internal metric ids out of user-facing DNA observation text
- explain conclusions using only supplied evidence
- return JSON only

## Expected JSON Schema

The expected AI response is represented by `AIScoutResponse`.

Required top-level fields:

- `ratings`
- `batting`
- `bowling`
- `fielding`
- `overall`
- `dnaScore`
- `dnaObservations`
- `strengths`
- `developmentAreas`
- `roleSuitability`
- `scoutingReport`
- `confidence`

Ratings contain:

- `score`: number from `0` to `100`
- `explanation`: non-empty string

`dnaScore.explanation` has a stricter presentation purpose than other explanations:

- it should be a concise 35-60 word rationale for why the DNA score was assigned
- it should reference supplied deterministic evidence
- it should not become the broader analyst summary

`dnaObservations` groups display-only scout observations by role category. All groups are required by the strict response schema, but `overall` is not displayed in the UI:

- `batting`
- `bowling`
- `fielding`
- `overall`

Each observation contains:

- `title`: non-empty display title
- `category`: one of the supported role categories
- `summary`: non-empty user-facing interpretation
- `supportingTraits`: supplied deterministic trait ids
- `supportingMetricIds`: supplied metric ids
- `evidence`: concise evidence statements from the profile

The prompt asks for 1 to 3 visible observations total across batting, bowling, and fielding/keeping only. Validation caps visible observations at 3 so a harmless hidden `overall` response does not block the report. Unsupported role groups should be returned as empty arrays rather than filled with invented content.

The UI displays only each observation's `title` and `summary`. Supporting ids and evidence remain in the response for validation/audit and are not shown to users.

Role suitability entries contain:

- `role`: non-empty string
- `suitability`: number from `0` to `100`
- `explanation`: non-empty string

## Validation

`validateAIScoutResponseJson()` parses a raw JSON string and validates the result.

`validateAIScoutResponse()` validates an already parsed object.

Validation checks:

- invalid JSON
- missing fields
- invalid rating ranges
- missing scouting report
- missing explanations
- invalid DNA observation counts
- DNA observations without supporting trait or metric ids
- DNA observations without evidence
- invalid arrays
- invalid role suitability entries

## Future LLM Integration

Future services can:

1. Build a deterministic `PlayerProfile`.
2. Pass it to `buildAIScoutPrompt()`.
3. Send the returned messages to an LLM provider.
4. Validate the returned JSON with `validateAIScoutResponseJson()`.
5. Reject or retry invalid responses.

No OpenAI, Anthropic, or other provider SDK is currently used.
