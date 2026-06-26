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

## Prompt Generation

`buildAIScoutPrompt()` accepts a deterministic `PlayerProfile` and returns:

- `system`: role and behavioral constraints for the model
- `user`: JSON payload containing the task, constraints, expected response schema, and supplied player profile

The prompt states:

- all supplied analytics are deterministic
- do not invent statistics
- do not contradict supplied metrics
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
- `strengths`
- `developmentAreas`
- `roleSuitability`
- `scoutingReport`
- `confidence`

Ratings contain:

- `score`: number from `0` to `100`
- `explanation`: non-empty string

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
