# Batting Volume Primitive Metrics

This document defines the first real Metric Engine family:

```text
Primitive Metrics -> Batting -> Volume
```

These metrics consume only `PlayerKnowledgeModel.history.records[].batting`.

They do not read raw APIs, calculate ratings, calculate averages, calculate strike rates, produce summaries, infer traits, or use AI.

## Shared Rules

All metrics:

- Category: `Batting`
- Level: `Primitive`
- Version: `1.0.0`
- Dependencies: none
- Input: `PlayerKnowledgeModel`
- Output: `MetricResult`

Shared validation:

- Empty career returns `FAILED_VALIDATION`.
- Invalid innings number returns `FAILED_VALIDATION`.
- Negative `runs`, `ballsFaced`, `fours`, or `sixes` returns `FAILED_VALIDATION`.
- Successful metrics use `confidence = 1`.
- Failed validation uses `confidence = 0` and `value = null`.

## Metrics

### `bat.matches`

Definition:

Number of PMRs in the PKM career history.

Formula:

```text
PKM.history.records.length
```

PKM Inputs:

- `history.records`

Output:

- Numeric count

Unit:

- `matches`

Validation Rules:

- Career must not be empty.
- Match count cannot be negative.

Edge Cases:

- A match where the player did not bat still counts as a match.

### `bat.innings`

Definition:

Number of batting innings where `didBat = true`.

Formula:

```text
count(record.batting.innings[] where didBat = true)
```

PKM Inputs:

- `history.records[].batting.innings[].didBat`

Output:

- Numeric count

Unit:

- `innings`

Validation Rules:

- Career must not be empty.
- Batting innings cannot exceed batting history rows.

Edge Cases:

- Yet-to-bat rows with `didBat = false` are excluded.
- A non-empty career may have zero batting innings.

### `bat.runs`

Definition:

Total batting runs across batting innings.

Formula:

```text
sum(record.batting.innings[].runs)
```

PKM Inputs:

- `history.records[].batting.innings[].runs`

Output:

- Numeric total

Unit:

- `runs`

Validation Rules:

- Career must not be empty.
- Runs cannot be negative.

Edge Cases:

- Zero innings returns `0` for a non-empty career.

### `bat.balls_faced`

Definition:

Total balls faced across batting innings.

Formula:

```text
sum(record.batting.innings[].ballsFaced)
```

PKM Inputs:

- `history.records[].batting.innings[].ballsFaced`

Output:

- Numeric total

Unit:

- `balls`

Validation Rules:

- Career must not be empty.
- Balls faced cannot be negative.

Edge Cases:

- Zero innings returns `0` for a non-empty career.

### `bat.not_outs`

Definition:

Number of batting innings where the player batted and was not out.

Formula:

```text
count(didBat = true and (dismissal missing or dismissal.kind = NotOut))
```

PKM Inputs:

- `history.records[].batting.innings[].didBat`
- `history.records[].batting.innings[].dismissal.kind`

Output:

- Numeric count

Unit:

- `innings`

Validation Rules:

- Career must not be empty.
- Not outs cannot exceed batting innings.

Edge Cases:

- Missing dismissal on a batted innings is treated as not out.
- `didBat = false` rows are excluded.

### `bat.highest_score`

Definition:

Highest individual innings score.

Formula:

```text
max(record.batting.innings[].runs where didBat = true)
```

PKM Inputs:

- `history.records[].batting.innings[].didBat`
- `history.records[].batting.innings[].runs`

Output:

- Numeric value

Unit:

- `runs`

Validation Rules:

- Career must not be empty.
- Highest score cannot exceed total career runs.

Edge Cases:

- Zero batting innings returns `0` for a non-empty career.

### `bat.fifties`

Definition:

Number of innings with scores from 50 to 99 inclusive.

Formula:

```text
count(didBat = true and runs >= 50 and runs < 100)
```

PKM Inputs:

- `history.records[].batting.innings[].didBat`
- `history.records[].batting.innings[].runs`

Output:

- Numeric count

Unit:

- `innings`

Validation Rules:

- Career must not be empty.
- Fifties cannot exceed batting innings.

Edge Cases:

- Scores of 100+ are not counted as fifties.

### `bat.hundreds`

Definition:

Number of innings with scores from 100 to 199 inclusive.

Formula:

```text
count(didBat = true and runs >= 100 and runs < 200)
```

PKM Inputs:

- `history.records[].batting.innings[].didBat`
- `history.records[].batting.innings[].runs`

Output:

- Numeric count

Unit:

- `innings`

Validation Rules:

- Career must not be empty.
- Hundreds cannot exceed batting innings.

Edge Cases:

- Double hundreds are counted separately by `bat.double_hundreds`.

### `bat.double_hundreds`

Definition:

Number of innings with scores of 200 or more.

Formula:

```text
count(didBat = true and runs >= 200)
```

PKM Inputs:

- `history.records[].batting.innings[].didBat`
- `history.records[].batting.innings[].runs`

Output:

- Numeric count

Unit:

- `innings`

Validation Rules:

- Career must not be empty.
- Double hundreds cannot exceed total innings with 100+ scores.

Edge Cases:

- Scores of exactly 200 count as double hundreds.
