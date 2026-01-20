# Import Shared Mailbox Permissions Script

This utility (`ImportSharedMailboxPermissions.ps1`) is designed to import mailbox permissions (Full Access, Send As) from a CSV file. It includes a specific logic to resolve the target user (trustee) across multiple domains.

## Features

- **Domain Fallback Logic**: Automatically checks for the user's existence in the following domains (in order):
  1. `@ruckusnetworks.com`
  2. `@auroranetworks.com`
  3. `@vistancenetworks.com`
- **Flexible CSV Input**: Accepts standard export formats with columns for Identity/Mailbox, User/Trustee, and AccessRights.
- **Detailed Logging**: Generates a CSV log (`ImportPermissionsLog.csv`) detailing the resolution status and the outcome of the permission assignment for each row.
- **Permission Types**: Supports both `FullAccess` and `SendAs` permissions.

## Usage

### Prerequisites
- **PowerShell 5.1+** or **PowerShell Core**.
- **Exchange Online PowerShell Module** (`ExchangeOnlineManagement`).
- Connected to Exchange Online (`Connect-ExchangeOnline`).

### Syntax
```powershell
.\ImportSharedMailboxPermissions.ps1 -CsvFilePath <PathToCSV> [-LogFilePath <PathToLog>]
```

### Parameters
- `-CsvFilePath`: The path to the input CSV file containing the permissions to import.
- `-LogFilePath`: (Optional) The path to save the execution log. Defaults to `ImportPermissionsLog.csv`.

### Input CSV Format
The CSV should have the following headers (case-insensitive):
- **Mailbox** (or `Identity`): The email address or identity of the shared mailbox.
- **User** (or `Trustee`): The alias or email address of the user receiving permissions.
- **AccessRights**: The permissions to grant (e.g., `FullAccess`, `SendAs`).

Example `permissions.csv`:
```csv
Mailbox,User,AccessRights
shared1@ruckusnetworks.com,john.doe,FullAccess
shared2@ruckusnetworks.com,jane.smith,SendAs
```

## Logic Detail
For each row in the CSV:
1. The script extracts the local part (alias) of the `User`.
2. It attempts to resolve this user by appending the priority domains:
   - Checks `alias@ruckusnetworks.com`
   - Checks `alias@auroranetworks.com`
   - Checks `alias@vistancenetworks.com`
3. If a valid recipient is found, the script attempts to assign the specified permissions.
4. If the user is not found in any of these domains, the row is skipped and logged as "Not Found".
