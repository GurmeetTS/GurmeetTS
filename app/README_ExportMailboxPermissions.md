# Export Mailbox Permissions

This PowerShell script exports mailbox permissions (Full Access, Send As, and Send on Behalf) from Exchange Online to a CSV file.

## Prerequisites

*   **Exchange Online Management Module**: The script requires the `ExchangeOnlineManagement` PowerShell module.
    ```powershell
    Install-Module -Name ExchangeOnlineManagement
    ```
*   **Permissions**: You must be connected to Exchange Online with an account that has permissions to view mailbox settings (e.g., Exchange Administrator).

## Usage

1.  Open PowerShell.
2.  Navigate to the directory containing `ExportMailboxPermissions.ps1`.
3.  Run the script.

### Syntax

```powershell
.\ExportMailboxPermissions.ps1 [[-InputFile] <String>] [[-OutputFile] <String>]
```

### Parameters

*   **InputFile** (Optional): Path to a text file containing a list of UserPrincipalNames (one per line) to process. If omitted, the script processes *all* User, Shared, Room, and Equipment mailboxes in the tenant.
*   **OutputFile** (Optional): Path where the CSV report will be saved. Defaults to `MailboxPermissions.csv` in the current directory.

## Input File Format

If you use the `-InputFile` parameter, the file should contain one email address (UserPrincipalName) per line:

```text
john.doe@contoso.com
jane.smith@contoso.com
shared.mailbox@contoso.com
```

## Output Format

The script generates a CSV file with the following columns:

*   **Mailbox**: The UserPrincipalName of the mailbox.
*   **MailboxType**: The type of mailbox (e.g., UserMailbox, SharedMailbox).
*   **PermissionType**: The type of permission granted (`FullAccess`, `SendAs`, or `SendOnBehalf`).
*   **AssignedTo**: The user or entity that has been granted the permission.

**Note**: The script automatically excludes inherited permissions and system accounts (e.g., `NT AUTHORITY\SELF`).

## Examples

### Example 1: Export permissions for all mailboxes

```powershell
.\ExportMailboxPermissions.ps1
```

### Example 2: Export permissions for specific mailboxes

```powershell
.\ExportMailboxPermissions.ps1 -InputFile "Mailboxes.txt"
```

### Example 3: Specify custom output file

```powershell
.\ExportMailboxPermissions.ps1 -OutputFile "C:\Reports\PermissionsReport.csv"
```
