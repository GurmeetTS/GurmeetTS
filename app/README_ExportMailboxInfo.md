
# Export Mailbox Info Script

This PowerShell utility exports mailbox information from Exchange Online to a Markdown table format.

## Features

- **Fast Retrieval**: Uses `Get-EXOMailbox` (Exchange Online PowerShell V2 module) with `-ResultSize Unlimited` and specific property sets for high performance.
- **Markdown Output**: Generates a formatted Markdown table suitable for documentation or reports.
- **Robust Error Handling**: Skips mailboxes that encounter errors during processing.
- **Customizable**: Retrieves `DisplayName`, `UserPrincipalName`, `PrimarySmtpAddress`, `RecipientTypeDetails`, and `Alias`.

## Prerequisites

- **PowerShell 5.1** or **PowerShell Core (7+)**.
- **Exchange Online Management Module**:
  ```powershell
  Install-Module -Name ExchangeOnlineManagement
  ```
- **Connection**: You must be connected to Exchange Online before running the script:
  ```powershell
  Connect-ExchangeOnline
  ```

## Usage

1. Open PowerShell.
2. Connect to Exchange Online:
   ```powershell
   Connect-ExchangeOnline
   ```
3. Run the script:
   ```powershell
   .\ExportMailboxInfo.ps1
   ```
4. To save to a file:
   ```powershell
   .\ExportMailboxInfo.ps1 > MailboxReport.md
   ```

## Output Format

The script outputs a Markdown table with the following columns:

| DisplayName | UserPrincipalName | PrimarySmtpAddress | RecipientTypeDetails | Alias |
|-------------|-------------------|--------------------|----------------------|-------|
| John Doe    | john@contoso.com  | john@contoso.com   | UserMailbox          | john  |

## Notes

- Empty cells indicate missing data for that field.
- Rows with errors during retrieval are excluded (warnings are shown in the error stream).
