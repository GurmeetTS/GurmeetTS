# Get Shared Mailbox Permission Report

This PowerShell script generates a report on shared mailbox permissions. It retrieves "Explicitly assigned permissions" (Full Access, Send As, Send on Behalf), ignoring inherited permissions and "SELF" permissions.

## Features

*   **Explicit Permissions Only**: Filters out inherited and "SELF" permissions to show only explicitly assigned access.
*   **CSV Export**: Outputs the report to a CSV file.
*   **MFA Support**: Compatible with accounts that have Multi-Factor Authentication (MFA) enabled.
*   **Flexible Scope**: Can process all shared mailboxes or a specific list provided via an input file.
*   **Permission Filtering**: Allows filtering by specific permission types (Full Access, Send As, Send on Behalf).
*   **Scheduler Friendly**: Supports passing credentials as parameters for automated execution.

## Prerequisites

*   **Exchange Online PowerShell Module**: The script requires the `ExchangeOnlineManagement` module. It will attempt to install it if not present.

## Usage

Run the script from a PowerShell console.

### Parameters

*   `-FullAccess`: (Switch) Include Full Access permissions in the report.
*   `-SendAs`: (Switch) Include Send As permissions in the report.
*   `-SendOnBehalf`: (Switch) Include Send on Behalf permissions in the report.
*   `-MBNamesFile`: (String) Path to a CSV file containing the display names of mailboxes to check (Header must be "DisplayName").
*   `-UserName`: (String) Username for non-interactive authentication (not recommended for MFA accounts).
*   `-Password`: (String) Password for non-interactive authentication.

### Examples

**1. Report all permissions for all shared mailboxes:**

```powershell
.\GetSharedMailboxPermissionReport.ps1
```

**2. Report only "Send As" permissions for all shared mailboxes:**

```powershell
.\GetSharedMailboxPermissionReport.ps1 -SendAs
```

**3. Report permissions for mailboxes listed in a file:**

```powershell
.\GetSharedMailboxPermissionReport.ps1 -MBNamesFile "C:\path\to\mailboxes.csv"
```

**4. Run with credentials (for scheduling):**

```powershell
.\GetSharedMailboxPermissionReport.ps1 -UserName "admin@contoso.com" -Password "SecretPassword"
```

## Output

The script generates a CSV file named `SharedMBPermissionReport_<Timestamp>.csv` in the current directory.

**Columns:**
*   Display Name
*   User PrinciPal Name
*   Primary SMTP Address
*   Access Type
*   User With Access
*   Email Aliases

## Source

Original script by [o365reports.com](https://o365reports.com/2020/01/03/shared-mailbox-permission-report-to-csv/).
