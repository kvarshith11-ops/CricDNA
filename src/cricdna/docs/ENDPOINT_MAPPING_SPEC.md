# CricDNA Endpoint Mapping Specification

Status: Draft extraction contract  
Dataset analyzed: `Hackathon Data`  
Scope: 20 matches, 80 endpoint response files

This document defines the endpoint-to-domain mapping contract for `PlayerMatchRecord` and `PlayerKnowledgeModel`.

No extraction implementation, AI logic, player rating, or cricket inference is included here.

## Dataset Coverage

The dataset contains:

- India Men: 10 matches
- Australia Men: 10 matches
- 20 `summary` responses
- 20 `scorecard` responses
- 20 `comments` responses
- 20 `graphs` responses

Observed formats:

- ODI: 9 matches
- T20 International: 10 matches
- Test: 1 match

Observed innings distribution:

- 19 matches contain 2 innings
- 1 match contains 3 innings: `indVafgTest`

One file naming mismatch must be handled by fixture identity, not file basename:

- `ausVomaT20I`: present in Summary and Graphs
- `ausVomanT20IWC`: present in Scorecard and Comments
- Both refer to fixture `39205`

## 1. Endpoint Schema Report

### Summary Endpoint

Root structure:

```text
{
  fixture,
  players,
  matchReport?,
  previousBowlerId?,
  hasCommentary,
  hasScoreCard,
  fixtureTitle,
  teamForm,
  headToHead
}
```

Always-present root fields across 20 files:

| Field | Presence | Notes |
|---|---:|---|
| `fixture` | 20/20 | Full match metadata plus innings scorecard summary. |
| `players` | 20/20 | Match squad/player metadata. |
| `hasCommentary` | 20/20 | Boolean. |
| `hasScoreCard` | 20/20 | Boolean. |
| `fixtureTitle` | 20/20 | Compact title/score display. |
| `teamForm` | 20/20 | Historical team-form data; not required for PMR. |
| `headToHead` | 20/20 | Historical fixture data; not required for PMR. |

Sometimes-present root fields:

| Field | Presence | Notes |
|---|---:|---|
| `matchReport` | 16/20 | Missing in four summaries. Do not depend on it for PMR creation. |
| `previousBowlerId` | 10/20 | Present in half of summary files. Live-state artifact, not stable PMR source. |

Important nested structure:

```text
fixture
  competition
    id
    name
    formats[]
  homeTeam
  awayTeam
  venue
  innings[]
    batsmen[]
    bowlers[]
    wickets[]
  officials[]
  tour
players[]
  id
  displayName
  type
  battingHandId
  bowlingTypeId
  teamId
  isCaptain
  isWicketKeeper
  isManOfTheMatch
```

Always-present PMR-relevant paths:

| Path | Presence | Notes |
|---|---:|---|
| `fixture.id` | 20/20 | Numeric match id. Convert to string for domain `MatchId`. |
| `fixture.legacyFixtureId` | 20/20 | External legacy fixture id. Provenance candidate. |
| `fixture.gameType` | 20/20 | Values: `ODI`, `T20 International`, `Test`. |
| `fixture.startDateTime` | 20/20 | ISO datetime. |
| `fixture.endDateTime` | 20/20 | ISO datetime. |
| `fixture.homeTeam.id/name` | 20/20 | Team identity. |
| `fixture.awayTeam.id/name` | 20/20 | Team identity. |
| `fixture.homeTeam.isTossWinner` | 20/20 | Toss winner can be resolved from team flags. |
| `fixture.awayTeam.isTossWinner` | 20/20 | Toss winner can be resolved from team flags. |
| `fixture.homeTeam.isMatchWinner` | 20/20 | Match winner can be resolved from team flags. |
| `fixture.awayTeam.isMatchWinner` | 20/20 | Match winner can be resolved from team flags. |
| `fixture.tossDecision` | 20/20 | Mixed casing: `bat`, `Bat`, `field`, `Field`. |
| `fixture.resultTypeId` | 20/20 | Values observed: `HomeWin`, `AwayWin`. |
| `fixture.resultText` | 20/20 | Human readable result. |
| `fixture.venue.name/city/countryName` | 20/20 | Venue mapping source. |
| `fixture.innings[].id` | 20/20 | 41 innings total. |
| `fixture.innings[].batsmen[]` | 20/20 | 453 batsman records total. |
| `fixture.innings[].bowlers[]` | 20/20 | 254 bowler records total. |
| `players[].id` | 20/20 | 442 player entries; no missing player ids observed. |
| `players[].displayName` | 20/20 | Player name source. |
| `players[].isCaptain` | 20/20 | Behaviour flag. |
| `players[].isWicketKeeper` | 20/20 | Behaviour/role flag. |
| `players[].isManOfTheMatch` | 20/20 | Behaviour flag. |

Sometimes-present nested fields:

| Path | Presence | Notes |
|---|---:|---|
| `fixture.homeTeam.isWomensTeam` | 1/20 | `awayTeam.isWomensTeam` is present 20/20. Use `fixture.isWomensMatch` if needed. |
| `fixture.innings[].balls` | 13/20 | Not guaranteed. |
| `fixture.innings[].ballsRemaining` | 12/20 | Not guaranteed. |
| `fixture.innings[].requiredRunRate` | 13/20 | Not guaranteed; live/chase-specific. |
| `fixture.innings[].wickets[].inningsBallId` | 7/20 | Ball id unavailable for most summary wicket entries. |
| `fixture.winTypeId` | 7/20 | Not guaranteed. |
| `fixture.winningMargin` | 7/20 | Not guaranteed. |

Structural differences:

- Summary includes `teamForm` and `headToHead`; scorecard does not.
- Summary includes optional `matchReport`; scorecard does not.
- Summary innings contain batsmen, bowlers, and wicket lists, but no over-by-over or ball-by-ball arrays.
- Summary player arrays are usually 22 players, but two matches contain 23 players.

### Scorecard Endpoint

Root structure:

```text
{
  fixture,
  fixtureTitle,
  players,
  dataSupport,
  responseError
}
```

Always-present root fields:

| Field | Presence | Notes |
|---|---:|---|
| `fixture` | 20/20 | Primary source for scorecard-level PMR facts. |
| `fixtureTitle` | 20/20 | Compact display score. |
| `players` | 20/20 | Player lookup and behaviour flags. |
| `dataSupport` | 20/20 | `isReliableData` observed true in all files. |
| `responseError` | 20/20 | Observed false in all files. |

Important nested structure:

```text
fixture
  competition
  homeTeam
  awayTeam
  venue
  innings[]
    batsmen[]
    bowlers[]
    wickets[]
players[]
dataSupport
```

Always-present PMR-relevant paths:

| Path | Presence | Notes |
|---|---:|---|
| `fixture.id` | 20/20 | Match id. |
| `fixture.gameType` | 20/20 | Format source. |
| `fixture.startDateTime` | 20/20 | Match date source. |
| `fixture.venue.name` | 20/20 | Venue source. |
| `fixture.innings[].id` | 20/20 | Innings id. |
| `fixture.innings[].inningNumber` | 20/20 | Innings number. |
| `fixture.innings[].batsmen[].playerId` | 20/20 | Batter id. |
| `fixture.innings[].batsmen[].ballsFaced` | 20/20 | Balls faced; present even for yet-to-bat records as 0. |
| `fixture.innings[].batsmen[].dismissalTypeId` | 20/20 | Missing on some individual batsman objects, but present in all files. |
| `fixture.innings[].bowlers[].playerId` | 20/20 | Bowler id. |
| `fixture.innings[].bowlers[].oversBowled` | 20/20 | String value, e.g. `"10"`, `"42.2"`. |
| `fixture.innings[].bowlers[].totalBallsBowled` | 20/20 | Numeric ball count. Prefer over `ballsBowled`. |
| `fixture.innings[].bowlers[].dotBalls` | 20/20 | Direct bowling stat. |
| `players[].id` | 20/20 | Player identity lookup. |
| `players[].displayName` | 20/20 | Player name lookup. |
| `players[].isCaptain` | 20/20 | Behaviour flag. |
| `players[].isWicketKeeper` | 20/20 | Behaviour flag. |
| `players[].isManOfTheMatch` | 20/20 | Behaviour flag. |
| `dataSupport.isReliableData` | 20/20 | Data quality flag. |
| `responseError` | 20/20 | Error flag. |

Sometimes-present or object-level optional fields:

| Path | Presence | Notes |
|---|---:|---|
| `fixture.innings[].batsmen[].runsScored` | 20/20 files, 357/453 batsman rows | Missing for some yet-to-bat rows. Treat absent as optional, not necessarily zero. |
| `fixture.innings[].batsmen[].bowledByPlayerId` | 20/20 files, 288 values | Missing for NotOut/yet-to-bat/non-bowler dismissals. |
| `fixture.innings[].batsmen[].dismissedByPlayerId` | 20/20 files, 257 values | Missing for NotOut/yet-to-bat and some dismissal types. |
| `fixture.innings[].wickets[].inningsBallId` | 7/20 files | Do not require ball id from scorecard wickets. |

Structural differences:

- Scorecard has no over-by-over arrays.
- Scorecard has no ball-by-ball detail.
- Test match contains 3 innings; limited-overs matches contain 2.
- `players[]` count can be 22 or 23.
- `oversBowled` is a string; `totalBallsBowled` is numeric.
- `ballsBowled` exists but is often `0`, even when `totalBallsBowled` is non-zero. It should not be used as the canonical balls-bowled source.

Observed scorecard dismissal values:

- `Bowled`
- `Caught`
- `Caught and bowled`
- `CaughtSub`
- `Lbw`
- `NotOut`
- `Retired Not Out`
- `RunOut`
- `Stumped`
- `yet to bat`

### Comments Endpoint

Root structure:

```text
{
  innings,
  homeTeam,
  awayTeam,
  players,
  nextPage?,
  fixtureTitle,
  responseError
}
```

Always-present root fields:

| Field | Presence | Notes |
|---|---:|---|
| `innings` | 20/20 | Contains innings summaries and paginated overs/balls. |
| `homeTeam` | 20/20 | Team metadata. |
| `awayTeam` | 20/20 | Team metadata. |
| `players` | 20/20 | Player lookup and behaviour flags. |
| `fixtureTitle` | 20/20 | Display title/score. |
| `responseError` | 20/20 | Observed false in all files. |

Sometimes-present root fields:

| Field | Presence | Notes |
|---|---:|---|
| `nextPage` | 10/20 | Indicates the local file only contains a page of comments. Do not assume complete ball history from this endpoint. |

Important nested structure:

```text
innings[]
  id
  fixtureId
  inningNumber
  battingTeamId
  bowlingTeamId
  batsmen[]?
  bowlers[]?
  overs[]?
    balls[]
      ballNumber
      battingPlayerId
      nonStrikeBattingPlayerId
      bowlerPlayerId
      runsScored
      runsConceded
      extras
      isWicket
      dismissalPlayerId?
      dismissalTypeId?
      fieldingPosition?
      comments[]
        message
        commentTypeId
```

Always-present PMR-relevant paths:

| Path | Presence | Notes |
|---|---:|---|
| `innings[].fixtureId` | 20/20 | Match id is nested here, not at root. |
| `innings[].id` | 20/20 | Innings id. |
| `innings[].inningNumber` | 20/20 | Innings number. |
| `innings[].overs[].id` | 20/20 | Over id. |
| `innings[].overs[].overNumber` | 20/20 | Over number. |
| `innings[].overs[].balls[].ballNumber` | 20/20 | Ball in over. |
| `innings[].overs[].balls[].battingPlayerId` | 20/20 | Batter id. |
| `innings[].overs[].balls[].nonStrikeBattingPlayerId` | 20/20 | Non-striker id. |
| `innings[].overs[].balls[].bowlerPlayerId` | 20/20 | Bowler id. |
| `innings[].overs[].balls[].runsScored` | 20/20 | Batter runs on ball. |
| `innings[].overs[].balls[].runsConceded` | 20/20 | Bowler/team runs conceded on ball. |
| `innings[].overs[].balls[].isWicket` | 20/20 | Ball wicket flag. |
| `innings[].overs[].balls[].comments[].message` | 20/20 | Commentary text. |
| `players[].id` | 20/20 | Player lookup. |
| `players[].displayName` | 20/20 | Player name lookup. |
| `players[].isCaptain` | 20/20 | Behaviour flag. |
| `players[].isWicketKeeper` | 20/20 | Behaviour flag. |

Sometimes-present nested fields:

| Path | Presence | Notes |
|---|---:|---|
| `innings[].batsmen[]` | 20/20 files, but only 220 rows | Comments endpoint does not provide full batting scorecard rows. |
| `innings[].bowlers[]` | 20/20 files, but only 124 rows | Comments endpoint does not provide full bowling scorecard rows. |
| `innings[].overs[].balls[].dismissalPlayerId` | 20/20 files, 101 values | Only wicket balls. |
| `innings[].overs[].balls[].dismissalTypeId` | 20/20 files, 101 values | Only wicket balls. |
| `innings[].overs[].balls[].fieldingPosition` | 20/20 files, 2103 values, 12 empty strings | Present on many balls, not always meaningful. |

Structural differences:

- Comments root has no `fixture` object.
- `fixtureId` is available through `innings[].fixtureId`.
- Comments files can be paginated. Ten files include `nextPage`.
- Comments files contain ball-level detail, but the local dataset may not contain every page.
- Comments innings may include only partial batsmen/bowlers arrays relative to scorecard.

Observed comment dismissal values:

- `Bowled`
- `Caught`
- `CaughtAndBowled`
- `Lbw`
- `RunOut`

### Graphs Endpoint

Root structure:

```text
{
  fixture,
  fixtureTitle
}
```

Always-present root fields:

| Field | Presence | Notes |
|---|---:|---|
| `fixture` | 20/20 | Compact match metadata and over-level progression. |
| `fixtureTitle` | 20/20 | Compact title/score. |

Important nested structure:

```text
fixture
  competition
  homeTeam
  awayTeam
  venue
  innings[]
    overs[]
      overNumber
      runrate
      runsConceded
      wickets
      totalInningRuns
      totalInningWickets
      totalRuns
```

Always-present PMR-relevant paths:

| Path | Presence | Notes |
|---|---:|---|
| `fixture.id` | 20/20 | Match id. |
| `fixture.legacyFixtureId` | 20/20 | Provenance candidate. |
| `fixture.startDateTime` | 20/20 | Match date source if summary/scorecard unavailable. |
| `fixture.endDateTime` | 20/20 | End datetime. |
| `fixture.innings[].id` | 20/20 | Innings id. |
| `fixture.innings[].inningNumber` | 20/20 | Innings number. |
| `fixture.innings[].overs[].overNumber` | 20/20 | Over progression key. |
| `fixture.innings[].overs[].runrate` | 20/20 | Over-level run-rate. |
| `fixture.innings[].overs[].runsConceded` | 20/20 | Runs in over. |
| `fixture.innings[].overs[].totalInningRuns` | 20/20 | Cumulative innings runs by over. |
| `fixture.innings[].overs[].totalInningWickets` | 20/20 | Cumulative wickets by over. |
| `fixture.innings[].overs[].wickets` | 20/20 | Wickets in over. |
| `fixtureTitle.score` | 20/20 | Display score only. |

Sometimes-present fields:

| Path | Presence | Notes |
|---|---:|---|
| `fixture.innings[].balls` | 13/20 | Not guaranteed. |
| `fixture.innings[].ballsRemaining` | 12/20 | Not guaranteed. |
| `fixture.innings[].requiredRunRate` | 13/20 | Not guaranteed. |
| `fixture.innings[].overs[].runsExtras` | 7/20 | Not guaranteed. |

Structural differences:

- Graphs has no `players[]`.
- Graphs has no batsmen or bowlers arrays.
- Graphs has no ball-level arrays.
- Graphs is the strongest source for over-level team progression, not player-level progression.

## 2. PMR Mapping Matrix

Legend:

- Direct: field can be copied or normalized from one source path.
- Derived: field requires a deterministic join, aggregation, parsing, or normalization.
- Mandatory: required to create a valid PMR.
- Optional: should be nullable/absent if source data is missing.

### Identity

| PMR Field | Endpoint | JSON Path | Direct/Derived | Optional |
|---|---|---|---|---|
| `identity.playerId` | Scorecard | `players[].id` or `fixture.innings[].batsmen[].playerId` / `fixture.innings[].bowlers[].playerId` | Direct, normalize number to string | Mandatory |
| `identity.playerName` | Scorecard | `players[].displayName` | Direct | Optional |
| `identity.matchId` | Scorecard | `fixture.id` | Direct, normalize number to string | Mandatory |
| `identity.team.id` | Scorecard | `players[].teamId` joined to `fixture.homeTeam.id` / `fixture.awayTeam.id` | Derived join | Mandatory |
| `identity.team.name` | Scorecard | `fixture.homeTeam.name` or `fixture.awayTeam.name` after `players[].teamId` join | Derived join | Mandatory |
| `identity.opponent.id` | Scorecard | Opposite of joined player team in `fixture.homeTeam.id` / `fixture.awayTeam.id` | Derived join | Mandatory |
| `identity.opponent.name` | Scorecard | Opposite of joined player team in `fixture.homeTeam.name` / `fixture.awayTeam.name` | Derived join | Mandatory |
| `identity.role` | Scorecard | `players[].type` | Direct with enum normalization | Optional |
| `identity.battingHand` | Scorecard | `players[].battingHandId` | Direct with enum normalization | Optional |
| `identity.bowlingStyle` | Scorecard | `players[].bowlingTypeId` | Direct with enum normalization | Optional |

### Context

| PMR Field | Endpoint | JSON Path | Direct/Derived | Optional |
|---|---|---|---|---|
| `context.format` | Scorecard or Summary | `fixture.gameType` | Direct with enum normalization | Mandatory |
| `context.matchDate` | Scorecard or Summary | `fixture.startDateTime` | Derived date extraction from ISO datetime | Mandatory |
| `context.venue.ground` | Scorecard or Summary | `fixture.venue.name` | Direct | Optional |
| `context.venue.city` | Scorecard or Summary | `fixture.venue.city` | Direct | Optional |
| `context.venue.country` | Scorecard or Summary | `fixture.venue.countryName` | Direct | Optional |
| `context.competition.id` | Scorecard or Summary | `fixture.competition.id` | Direct, normalize number to string | Optional |
| `context.competition.name` | Scorecard or Summary | `fixture.competition.name` | Direct | Optional |
| `context.competition.season` | Scorecard or Summary | `fixture.competition.name` or `fixture.competition.startDateTime` | Derived only if a deterministic season rule is later defined | Optional |
| `context.inningsPlayed` | Scorecard | `fixture.innings[].inningNumber` filtered by player presence in batting/bowling/fielding | Derived | Mandatory |
| `context.tossWinner.id` | Scorecard or Summary | `fixture.homeTeam.isTossWinner`, `fixture.awayTeam.isTossWinner` | Derived from team flag | Optional |
| `context.tossWinner.name` | Scorecard or Summary | `fixture.homeTeam.name`, `fixture.awayTeam.name` | Derived from team flag | Optional |
| `context.tossDecision` | Scorecard or Summary | `fixture.tossDecision` | Direct with case normalization | Optional |
| `context.matchResult` | Scorecard or Summary | `fixture.resultTypeId`, `fixture.resultText` | Derived enum mapping | Mandatory |
| `context.playerTeamResult` | Scorecard or Summary | `players[].teamId` + `fixture.homeTeam.isMatchWinner` / `fixture.awayTeam.isMatchWinner` | Derived join | Optional |
| `context.homeAwayNeutral` | Scorecard or Summary | `players[].teamId` + `fixture.homeTeam.id` / `fixture.awayTeam.id` | Derived join | Optional |

### Batting

| PMR Field | Endpoint | JSON Path | Direct/Derived | Optional |
|---|---|---|---|---|
| `batting.innings[].inningsId` | Scorecard | `fixture.innings[].id` | Direct, normalize number to string | Mandatory for batting row |
| `batting.innings[].inningsNumber` | Scorecard | `fixture.innings[].inningNumber` | Direct | Mandatory for batting row |
| `batting.innings[].battingPosition` | Scorecard | `fixture.innings[].batsmen[].battingOrder` | Direct | Optional |
| `batting.innings[].didBat` | Scorecard | `fixture.innings[].batsmen[].dismissalTypeId`, `ballsFaced`, `runsScored` | Derived from row presence and `YetToBat` variants | Mandatory |
| `batting.innings[].runs` | Scorecard | `fixture.innings[].batsmen[].runsScored` | Direct when present | Mandatory if `didBat=true`; optional otherwise |
| `batting.innings[].ballsFaced` | Scorecard | `fixture.innings[].batsmen[].ballsFaced` | Direct | Mandatory if batting row exists |
| `batting.innings[].fours` | Scorecard | `fixture.innings[].batsmen[].foursScored` | Direct | Optional |
| `batting.innings[].sixes` | Scorecard | `fixture.innings[].batsmen[].sixesScored` | Direct | Optional |
| `batting.innings[].minutes` | Scorecard | `fixture.innings[].batsmen[].battingMinutes` | Direct | Optional |
| `batting.innings[].dismissal.kind` | Scorecard | `fixture.innings[].batsmen[].dismissalTypeId` | Direct with enum normalization | Optional |
| `batting.innings[].dismissal.bowlerId` | Scorecard | `fixture.innings[].batsmen[].bowledByPlayerId` | Direct when present | Optional |
| `batting.innings[].dismissal.bowlerName` | Scorecard | `bowledByPlayerId` joined to `players[].displayName` | Derived join | Optional |
| `batting.innings[].dismissal.fielderIds` | Scorecard or Comments | `fixture.innings[].batsmen[].dismissedByPlayerId`; comments ball fielder source is incomplete | Direct/Derived depending dismissal type | Optional |
| `batting.innings[].dismissal.fielderNames` | Scorecard | `dismissedByPlayerId` joined to `players[].displayName` | Derived join | Optional |
| `batting.innings[].dismissal.ballRef` | Comments preferred, Scorecard fallback | `innings[].overs[].balls[]` wicket ball; fallback `fixture.innings[].wickets[].overBallDisplay` | Derived match by batter/dismissal/score | Optional |

### Bowling

| PMR Field | Endpoint | JSON Path | Direct/Derived | Optional |
|---|---|---|---|---|
| `bowling.spells[].inningsId` | Scorecard | `fixture.innings[].id` | Direct | Mandatory for bowling row |
| `bowling.spells[].inningsNumber` | Scorecard | `fixture.innings[].inningNumber` | Direct | Mandatory for bowling row |
| `bowling.spells[].didBowl` | Scorecard | `fixture.innings[].bowlers[].playerId` | Derived from row presence | Mandatory |
| `bowling.spells[].overs` | Scorecard | `fixture.innings[].bowlers[].oversBowled` | Direct after string-to-number normalization | Mandatory if bowled |
| `bowling.spells[].balls` | Scorecard | `fixture.innings[].bowlers[].totalBallsBowled` | Direct | Mandatory if bowled |
| `bowling.spells[].maidens` | Scorecard | `fixture.innings[].bowlers[].maidensBowled` | Direct | Mandatory if bowled |
| `bowling.spells[].runsConceded` | Scorecard | `fixture.innings[].bowlers[].runsConceded` | Direct | Mandatory if bowled |
| `bowling.spells[].wickets` | Scorecard | `fixture.innings[].bowlers[].wicketsTaken` | Direct | Mandatory if bowled |
| `bowling.spells[].noBalls` | Scorecard | `fixture.innings[].bowlers[].noBalls` | Direct | Mandatory if bowled |
| `bowling.spells[].wides` | Scorecard | `fixture.innings[].bowlers[].wideBalls` | Direct | Mandatory if bowled |
| `bowling.spells[].dotBalls` | Scorecard | `fixture.innings[].bowlers[].dotBalls` | Direct | Optional |
| `bowling.wickets[].batterId` | Scorecard | Batting rows where `bowledByPlayerId` equals bowler player id | Derived | Optional |
| `bowling.wickets[].batterName` | Scorecard | Batter id joined to `players[].displayName` | Derived join | Optional |
| `bowling.wickets[].dismissalKind` | Scorecard | `fixture.innings[].batsmen[].dismissalTypeId` | Direct with enum normalization | Optional |
| `bowling.wickets[].ballRef` | Comments preferred | `innings[].overs[].balls[]` where `bowlerPlayerId` and `dismissalPlayerId` match wicket | Derived | Optional |

### Fielding

| PMR Field | Endpoint | JSON Path | Direct/Derived | Optional |
|---|---|---|---|---|
| `fielding.innings[].inningsId` | Scorecard | `fixture.innings[].id` | Direct | Mandatory for fielding row |
| `fielding.innings[].inningsNumber` | Scorecard | `fixture.innings[].inningNumber` | Direct | Mandatory for fielding row |
| `fielding.innings[].catches` | Scorecard | `fixture.innings[].batsmen[].dismissalTypeId` + `dismissedByPlayerId` | Derived count | Optional |
| `fielding.innings[].stumpings` | Scorecard | `dismissalTypeId=Stumped` + `dismissedByPlayerId` | Derived count | Optional |
| `fielding.innings[].runOutsDirect` | Comments preferred | Ball-level `dismissalTypeId=RunOut`, commentary/fielding detail if available | Derived; direct-vs-assisted not guaranteed | Optional |
| `fielding.innings[].runOutsAssisted` | Comments preferred | Ball-level `dismissalTypeId=RunOut`, commentary/fielding detail if available | Derived; direct-vs-assisted not guaranteed | Optional |
| `fielding.innings[].byesConceded` | Scorecard | `fixture.innings[].byesRuns` joined to wicketkeeper for bowling side | Derived assignment | Optional |

### Behaviour

| PMR Field | Endpoint | JSON Path | Direct/Derived | Optional |
|---|---|---|---|---|
| `behaviour.captain` | Scorecard | `players[].isCaptain` | Direct | Mandatory with default false |
| `behaviour.wicketKeeper` | Scorecard | `players[].isWicketKeeper` | Direct | Mandatory with default false |
| `behaviour.substitute` | Scorecard | `players[].isTwelthMan` | Direct | Mandatory with default false |
| `behaviour.playerOfMatch` | Scorecard | `players[].isManOfTheMatch` | Direct | Mandatory with default false |
| `behaviour.events[].eventType` | Comments | `innings[].overs[].balls[].comments[].commentTypeId` | Direct when event extraction is configured | Optional |
| `behaviour.events[].description` | Comments | `innings[].overs[].balls[].comments[].message` | Direct | Optional |
| `behaviour.events[].ballRef` | Comments | `innings[].inningNumber`, `overs[].overNumber`, `balls[].ballNumber` | Derived ref object | Optional |
| `behaviour.events[].sourceCommentaryId` | Comments | No stable comment id observed | Not available | Optional |

### Progression

| PMR Field | Endpoint | JSON Path | Direct/Derived | Optional |
|---|---|---|---|---|
| `progression.battingTimeline[].ballRef` | Comments | `innings[].inningNumber`, `overs[].overNumber`, `balls[].ballNumber` | Derived ref object | Optional |
| `progression.battingTimeline[].teamRuns` | Comments or Graphs | Comments `balls[].teamRuns`; Graphs `overs[].totalInningRuns` | Direct at ball/over grain | Optional |
| `progression.battingTimeline[].playerRuns` | Comments | Accumulate `balls[].runsScored` for `battingPlayerId` | Derived cumulative sum | Optional |
| `progression.battingTimeline[].playerBallsFaced` | Comments | Count legal balls for `battingPlayerId` | Derived; requires legal-ball rule | Optional |
| `progression.battingTimeline[].wicketsDown` | Comments or Graphs | Comments accumulate `isWicket`; Graphs `overs[].totalInningWickets` | Derived/direct depending source | Optional |
| `progression.bowlingTimeline[].ballRef` | Comments | `innings[].inningNumber`, `overs[].overNumber`, `balls[].ballNumber` | Derived ref object | Optional |
| `progression.bowlingTimeline[].runsConcededToDate` | Comments | Accumulate `balls[].runsConceded` for `bowlerPlayerId` | Derived cumulative sum | Optional |
| `progression.bowlingTimeline[].ballsBowledToDate` | Comments | Count legal balls for `bowlerPlayerId` | Derived; requires legal-ball rule | Optional |
| `progression.bowlingTimeline[].wicketsToDate` | Comments | Accumulate wicket balls for `bowlerPlayerId` | Derived | Optional |

### Metadata

| PMR Field | Endpoint | JSON Path | Direct/Derived | Optional |
|---|---|---|---|---|
| `metadata.schemaVersion` | Extractor config | Not in source | Derived from extraction contract version | Mandatory |
| `metadata.createdAt` | Extraction runtime | Not in source | Derived timestamp | Mandatory |
| `metadata.updatedAt` | Extraction runtime | Not in source | Derived timestamp | Mandatory |
| `metadata.provenance.sourceSystem` | Extractor config | Dataset/source identifier | Derived | Optional |
| `metadata.provenance.sourceEntityId` | Scorecard/Summary | `fixture.id`, `fixture.legacyFixtureId` | Derived | Optional |
| `metadata.provenance.ingestionBatchId` | Ingestion runtime | Not in source | Derived | Optional |
| `metadata.provenance.observedAt` | Ingestion runtime | Not in source | Derived | Optional |

### PlayerKnowledgeModel Mapping

| PKM Field | Source | Mapping | Direct/Derived | Optional |
|---|---|---|---|---|
| `identity.playerId` | PMR | `PlayerMatchRecord.identity.playerId` | Direct | Mandatory |
| `identity.playerName` | PMR | First stable `identity.playerName` for player id | Derived selection | Optional |
| `identity.primaryTeam` | PMR | Not determinable without policy when player appears for multiple teams | Derived only if policy is later defined | Optional |
| `history.records` | PMR collection | All PMRs for the same `playerId` | Direct aggregation | Mandatory |
| `history.index[].matchId` | PMR | `record.identity.matchId` | Direct | Mandatory |
| `history.index[].matchDate` | PMR | `record.context.matchDate` | Direct | Mandatory |
| `history.index[].format` | PMR | `record.context.format` | Direct | Mandatory |
| `history.index[].team` | PMR | `record.identity.team` | Direct | Mandatory |
| `history.index[].opponent` | PMR | `record.identity.opponent` | Direct | Mandatory |
| `metadata.*` | Aggregation runtime | PKM builder metadata | Derived | Mandatory/Optional per metadata field |

## 3. Data Quality Report

### Identity and File Matching

- No missing `players[].id` values were observed in Summary, Scorecard, or Comments.
- 182 unique player ids were observed.
- No player id mapped to multiple `displayName` values within this dataset.
- No duplicate player ids were found within a single `players[]` array.
- File basename is not a reliable cross-endpoint join key because `ausVomaT20I` and `ausVomanT20IWC` refer to the same fixture. Use `fixture.id` or `innings[].fixtureId`.

### Optional and Missing Fields

- `matchReport` is missing in 4/20 summaries.
- `previousBowlerId` appears in 10/20 summaries and should not be part of stable PMR mapping.
- `nextPage` appears in 10/20 comments files. These comments files are incomplete pages unless all pages are fetched later.
- `fixture.homeTeam.isWomensTeam` appears in only 1/20 summary files, while other women/match flags appear elsewhere.
- `fixture.innings[].wickets[].inningsBallId` appears in only 7/20 scorecard files.
- `runsScored` is absent on some batsman rows, especially yet-to-bat rows.
- `bowledByPlayerId` and `dismissedByPlayerId` are absent for NotOut, yet-to-bat, and some dismissal cases.

### Format and Type Inconsistencies

- Player ids, team ids, fixture ids, and innings ids are numeric in source data but string-like in domain model aliases. Extractors should normalize to strings.
- `fixture.tossDecision` has mixed casing: `bat`, `Bat`, `field`, `Field`.
- `fixture.gameType` values include `T20 International`, which must normalize to domain `MatchFormat.T20`.
- `fixture.innings[].bowlers[].oversBowled` is a string.
- `fixture.innings[].bowlers[].ballsBowled` is present but not reliable for total balls; it is often `0`. Prefer `totalBallsBowled`.
- Player `dob` uses `DD/MM/YYYY`, while fixture dates use ISO datetime strings.
- Dismissal values differ between Scorecard and Comments: scorecard uses `Caught and bowled`; comments uses `CaughtAndBowled`.
- Scorecard has `yet to bat` lowercase with spaces in some rows; comments sample also shows `YetToBat` in some contexts.

### Array and Completeness Issues

- Summary and Scorecard provide complete scorecard-level batsmen/bowlers arrays.
- Comments provides ball-level detail but only a page in many matches.
- Comments batsmen/bowlers arrays are partial relative to scorecard.
- Graphs has over-level progression only and no player array.
- One Test match has 3 innings, not 4. Extractors must not assume Tests always have 4 innings.
- Player list size can be 22 or 23.

### Nulls and Empty Values

- No nulls were observed in the PMR-relevant paths checked.
- Empty strings are common for non-required metadata fields.
- `fieldingPosition` in comments contains some empty strings.
- Many URL/social/media/player bio fields are empty strings and should be ignored for PMR.

## 4. Extractor Design Recommendations

### Cross-Endpoint Orchestration

Responsibilities:

- Group endpoint files by canonical fixture id, not file name.
- Use Scorecard as the primary source for PMR identity, context, batting, bowling, fielding scorecard facts, and behaviour flags.
- Use Summary as a fallback/enrichment source for context, match report availability, team form/head-to-head exclusion, and consistency checks.
- Use Comments only for ball-level facts and commentary-backed events.
- Use Graphs only for over-level team progression.

Do not assume:

- All endpoint filenames match.
- Comments contains the full match.
- Every match has exactly 2 innings.
- Every player appears in every innings.
- Every batsman row has runs or dismissal actor fields.

### Summary Extractor Recommendations

Responsibilities:

- Extract fixture metadata.
- Extract team, venue, competition, toss, result, and innings summary data.
- Extract player lookup metadata if scorecard is unavailable.
- Normalize format, toss decision casing, and ids.

Edge cases:

- Missing `matchReport`.
- Optional `previousBowlerId`.
- Optional innings run-rate/chase fields.
- Missing `homeTeam.isWomensTeam`.

Do not assume:

- `matchReport` exists.
- `teamForm` or `headToHead` belongs in PMR.
- Summary contains ball-level progression.

### Scorecard Extractor Recommendations

Responsibilities:

- Build canonical player lookup by `players[].id`.
- Build batting innings records from `fixture.innings[].batsmen[]`.
- Build bowling spell records from `fixture.innings[].bowlers[]`.
- Build scorecard-derived wicket and fielding counts.
- Build behaviour flags from `players[]`.
- Preserve `dataSupport.isReliableData` in extraction diagnostics/provenance.

Edge cases:

- `players[]` length can be 22 or 23.
- `runsScored` may be absent for yet-to-bat rows.
- `dismissalTypeId` values need normalization.
- `oversBowled` is string; `totalBallsBowled` is numeric.
- `inningsBallId` is mostly unavailable in wicket records.

Do not assume:

- `ballsBowled` is the total balls bowled.
- A missing dismissal actor is a data error.
- Yet-to-bat rows should be treated as real batting innings with zero runs unless `didBat` rules say so.

### Comments Extractor Recommendations

Responsibilities:

- Extract ball references: innings, over, ball.
- Extract ball participants: batter, non-striker, bowler.
- Extract ball outcomes: runs, extras, wickets, dismissal fields.
- Extract commentary messages as optional behaviour/source events.
- Provide ball-level progression only when all required pages are available.

Edge cases:

- `nextPage` means local comments are incomplete.
- Some comments files only include recent/last overs.
- `fieldingPosition` may be empty or not a fielder identity.
- Wicket fielder identity is not consistently explicit.

Do not assume:

- The local comments file is a complete match commentary.
- `fieldingPosition` is a player name.
- Ball-level data can always reconstruct complete batting/bowling timelines.
- Legal-ball counting rules can be skipped.

### Graphs Extractor Recommendations

Responsibilities:

- Extract innings over-level progression.
- Extract cumulative team runs and wickets by over.
- Provide fallback progression when comments are incomplete.

Edge cases:

- No player ids or player arrays are present.
- No ball-level detail is present.
- Optional `runsExtras` appears in only some graph files.

Do not assume:

- Graphs can produce player-level progression by itself.
- Over-level progression can replace ball-level progression.
- Graphs can identify individual batting or bowling contributions.

### PMR Builder Recommendations

Responsibilities:

- Create exactly one PMR per `(playerId, matchId)`.
- Use deterministic source precedence:
  1. Scorecard for scorecard stats and player lookup.
  2. Summary for context fallback.
  3. Comments for ball-level event enrichment.
  4. Graphs for over-level progression enrichment.
- Store provenance for every PMR.
- Keep all derived values mechanical and auditable.

Edge cases:

- Players in `players[]` who did not bat or bowl still need PMRs if they are part of the match squad.
- Substitute/twelfth-man flags should remain behaviour flags, not selection assumptions.
- Missing optional fields should not block PMR creation unless they are mandatory identity/context fields.

Do not implement:

- Player ratings.
- AI summaries.
- Form inference.
- Cricket DNA scores.
- Tactical interpretation.
- Sentiment or behavioural inference from commentary.
