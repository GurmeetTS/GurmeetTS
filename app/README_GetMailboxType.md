# Get Mailbox Type Script

This PowerShell script identifies whether an Exchange Online account is a **User Mailbox**, **Shared Mailbox**, or another recipient type. It processes a list of SMTP addresses (or UserPrincipalNames) from a CSV file and exports the results.

## Prerequisites

1.  **PowerShell 5.1** or **PowerShell Core (7+)**.
2.  **Exchange Online PowerShell Module**.
    *   Install it by running:
        ```powershell
        Install-Module -Name ExchangeOnlineManagement -Scope CurrentUser
        ```
3.  **Permissions**: You must have permissions to read recipient information in Exchange Online (e.g., Global Reader, Exchange Administrator, or Global Administrator).

## Usage

### 1. Prepare Input File
Create a CSV file (e.g., `users.csv`) containing the email addresses you want to check. Ensure it has a header.

**Example `users.csv`:**
```csv
UserPrincipalName
john.doe@contoso.com
info@contoso.com
jane.smith@contoso.com
```

### 2. Run the Script

Open PowerShell and navigate to the directory containing the script.

**Basic Usage:**
```powershell
.\GetMailboxType.ps1
```
*   Defaults to reading `.\users.csv`.
*   Defaults to looking for a column named `UserPrincipalName`.
*   Defaults to exporting to `.\MailboxTypes.csv`.

**Custom Usage:**
If your CSV has a different name or header:
```powershell
.\GetMailboxType.ps1 -CsvFilePath "C:\MyData\emails.csv" -EmailColumnHeader "EmailAddress" -OutputFilePath ".\Results.csv"
```

### 3. Output
The script generates a CSV file with the following columns:
*   **InputEmail**: The email address processed.
*   **RecipientTypeDetails**: The type of mailbox (e.g., `UserMailbox`, `SharedMailbox`, `RoomMailbox`, `MailUser`, etc.).
*   **Status**: `Success` or `Error`.
*   **Details**: Additional info or error messages.

## Troubleshooting

*   **"The 'ExchangeOnlineManagement' module is not installed"**: Run `Install-Module -Name ExchangeOnlineManagement`.
*   **"Failed to connect to Exchange Online"**: Check your internet connection and ensure you have the correct credentials and permissions.
*   **"Input CSV file not found"**: Verify the path provided in `-CsvFilePath`.
