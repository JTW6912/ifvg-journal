## ADDED Requirements

### Requirement: One modern overview period
The modern overview SHALL apply the selected inclusive range to financial summaries, monthly detail, company financial totals and recorded account progress, while preserving classic behavior and showing current account state separately.

#### Scenario: Select a partial cross-year range
- **WHEN** the user selects a range spanning part of December and January
- **THEN** month and company cash flows include only entries inside that range
- **AND** period labels and month/year navigation accurately reflect its boundaries

### Requirement: Explainable cohort conversion
Funnel stage counts MUST represent unique accounts with recorded progress inside the range. Conversion ratios MUST use the preceding stage's same interval cohort and chronological conversion through the range end, never independent stage-count division.

#### Scenario: Different interval cohorts
- **WHEN** ten accounts were bought and eight passed during the interval, but only three of the ten purchased accounts passed by the cutoff
- **THEN** the connection shows 30% and 3/10
- **AND** the passed stage opens eight accounts while the conversion opens the matching three

#### Scenario: Missing historical date
- **WHEN** a known progress record has no valid date
- **THEN** the system discloses the limitation rather than inventing a date or claiming unqualified complete statistics

### Requirement: Preserve informative funnel summaries
The funnel SHALL use the approved continuous narrowing horizontal shape, keep both bottom explanations and compute pass attempts and cost per funded account under an explicit period attribution.

#### Scenario: Repeated failed attempts
- **WHEN** a reset evaluation fails more than once in the interval
- **THEN** each recorded failed attempt contributes to the resolved-attempt denominator
- **AND** a zero denominator is displayed as not applicable

### Requirement: Inspect progress and current state without writes
Drill-downs SHALL share IDs with displayed counts, open existing details and clean up obsolete context. Current-state links SHALL apply exact current statuses, keep company/group scope and not apply historical dates.

#### Scenario: Navigate current funded accounts
- **WHEN** the user clicks the funded count in the current-state panel
- **THEN** My Accounts shows only currently funded accounts in the same company/group scope
- **AND** no additional request, ledger mutation or reporting-date filter occurs
