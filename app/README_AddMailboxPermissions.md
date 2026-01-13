# Add Mailbox Permissions Script

This PowerShell script simplifies the process of granting "Full Access" and "Send As" permissions to Exchange Online mailboxes for specific users using a CSV file.

## Features

*   **Bulk Processing**: Reads a CSV file to apply permissions to multiple mailboxes at once.
*   **Dual Permissions**: Automatically grants both:
    *   **Full Access**: Allows the user to open the mailbox, view folders, and manage items.
    *   **Send As**: Allows the user to send emails as if they were the mailbox owner.
*   **Safety Checks**: Validates CSV format and ensures Exchange Online connection.

## Prerequisites

1.  **Exchange Online Management Module**: Ensure you have the module installed.
    ```powershell
    Install-Module -Name ExchangeOnlineManagement
    ```
2.  **Permissions**: You must be an Exchange Administrator or have sufficient permissions to modify mailbox settings.

## Input CSV Format

The script requires a CSV file (default: `PermissionsInput.csv`) with the following headers:

*   `Mailbox`: The email address (UserPrincipalName) of the mailbox you want to grant access *to*.
*   `User`: The email address (UserPrincipalName) of the user who needs access.

**Example content:**

```csv
Mailbox,User
shared.mailbox@contoso.com,john.doe@contoso.com
info@contoso.com,jane.smith@contoso.com
```

## Usage

1.  **Prepare the CSV file**:
    Create a file named `PermissionsInput.csv` in the same directory as the script, or create a CSV anywhere and note its path. Populate it with the mailboxes and users.

2.  **Run the script**:

    *   **Using the default CSV (`PermissionsInput.csv` in the current folder):**
        ```powershell
        .\AddMailboxPermissions.ps1
        ```

    *   **Using a custom CSV file:**
        ```powershell
        .\AddMailboxPermissions.ps1 -CsvFilePath "C:\Path\To\Your\Input.csv"
        ```

3.  **Authentication**:
    If you are not already connected to Exchange Online, the script will prompt you to authenticate.

## Output

The script provides color-coded output in the console:
*   **Cyan**: Processing details.
*   **Green**: Successful operations.
*   **Red**: Errors or failed operations.

## Notes

*   **Full Access Automapping**: By default, this script uses `InheritanceType All`. Exchange Online typically enables Automapping for Full Access delegates, meaning the mailbox will automatically appear in the user's Outlook.
*   **Propagation Time**: Permissions changes in Exchange Online may take anywhere from a few minutes to an hour to fully propagate and become effective.
