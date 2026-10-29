## ADDED Requirements

### Requirement: Unified local financial range
The modern Prop overview SHALL derive investment, received payouts, net return, ROI and the cumulative curve from the same company/group-scoped entries and inclusive date range, without a new network request.

#### Scenario: Confirm a custom range
- **WHEN** the user selects two valid dates
- **THEN** the ordered inclusive range is applied to all financial fields
- **AND** the current account stage distribution is not converted into historical state

#### Scenario: Cancel an unfinished range
- **WHEN** the user dismisses a picker with only one draft date selected
- **THEN** the previously applied range and financial result remain unchanged

### Requirement: Accounting and trend integrity
The panel MUST retain existing refund and pending-payout semantics and the curve MUST start at zero and end at the displayed net result.

#### Scenario: Refund exceeds range costs
- **WHEN** refunds exceed fees in the chosen interval
- **THEN** investment remains negative, ROI is not applicable, and no misleading received-profit segment is drawn

#### Scenario: Empty or unlocatable cash flow
- **WHEN** the range has no effective cash flow or a flow cannot be assigned a valid date
- **THEN** the view provides an honest empty/unavailable trend state rather than invented data

### Requirement: Modern presentation with existing compatibility
The feature SHALL preserve classic markup and existing theme, language and owner-only boundaries.

#### Scenario: Read field help
- **WHEN** the user hovers, focuses or taps a field info icon
- **THEN** the corresponding explanation is accessible and dismissible without opening a centralized menu

#### Scenario: Leave the financial panel
- **WHEN** the user changes page, layout or account context
- **THEN** obsolete range and tooltip UI is cleaned up without writing business data
