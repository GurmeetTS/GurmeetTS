# Export Mailbox Permissions

This PowerShell script exports various permissions for a list of mailboxes in Exchange Online. It checks for:
*   **Full Access**
*   **Send As**
*   **Send on Behalf**

The script outputs a comprehensive CSV report detailing which users have which type of access to the specified mailboxes.

## Prerequisites

1.  **Exchange Online PowerShell Module**: You must have the `ExchangeOnlineManagement` module installed.
    ```powershell
    Install-Module -Name ExchangeOnlineManagement
    ```
2.  **Permissions**: You need to be an Exchange Administrator or have sufficient permissions to view mailbox settings in your tenant.

## Setup

1.  Prepare a text file containing the list of mailboxes you want to audit. The file should contain one UserPrincipalName per line.

    Example `Mailboxes.txt`:
    ```text
    ceo@contoso.com
    finance@contoso.com
    shared-mailbox@contoso.com
    ```

## Usage

1.  Open PowerShell.
2.  Navigate to the directory containing the script.
3.  Run the script. By default, it looks for `Mailboxes.txt` in the same directory.

    ```powershell
    .\ExportMailboxPermissions.ps1
    ```

### Custom Input/Output

You can specify custom input and output file paths using the parameters:

```powershell
.\ExportMailboxPermissions.ps1 -InputFile "C:\Temp\MyList.txt" -OutputCsv "C:\Reports\AccessReport.csv"
```

## Output

The script generates a CSV file (default: `MailboxPermissionsReport.csv`) with the following columns:

*   **Mailbox**: The UserPrincipalName of the mailbox being checked.
*   **User**: The user or group that has access.
*   **AccessType**: The type of access (`Full Access`, `Send As`, or `Send on Behalf`).
*   **AccessRights**: The specific rights (e.g., `FullAccess`, `SendAs`).

## Notes

*   The script attempts to connect to Exchange Online (`Connect-ExchangeOnline`) if not already connected.
*   It automatically filters out default system permissions like `NT AUTHORITY\SELF`.
