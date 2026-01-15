# Import Shared Mailbox Permissions

This PowerShell utility allows administrators to bulk-import permissions for shared mailboxes from a CSV or JSON file. It specifically supports granting 'Full Access' and 'Send As' permissions to a designated user (Trustee).

## Prerequisites

*   **Exchange Online Management Module**: Ensure you have the `ExchangeOnlineManagement` module installed and connected.
    ```powershell
    Connect-ExchangeOnline
    ```

## Usage

```powershell
.\ImportSharedMailboxPermissions.ps1 -InputFile <PathToFile> -Trustee <UserPrincipalName>
```

### Parameters

*   `-InputFile`: Path to the input CSV or JSON file containing mailbox addresses and permissions.
*   `-Trustee`: The email address or UserPrincipalName of the user who will receive the permissions.

## Input Formats

### CSV Format
The CSV file must have headers `mailbox_address` and `permissions`. Multiple permissions should be separated by a semicolon `;`.

**Example (`permissions.csv`):**
```csv
mailbox_address,permissions
shared1@example.com,FullAccess;SendAs
shared2@example.com,FullAccess
shared3@example.com,SendAs
```

### JSON Format
The JSON file must be an array of objects. Each object should have a `mailbox` property and a `permissions` property (which can be an array of strings or a single string).

**Example (`permissions.json`):**
```json
[
  {
    "mailbox": "shared1@example.com",
    "permissions": ["FullAccess", "SendAs"]
  },
  {
    "mailbox": "shared2@example.com",
    "permissions": ["FullAccess"]
  },
  {
    "mailbox": "shared3@example.com",
    "permissions": ["SendAs"]
  }
]
```

## Output

The script outputs a table report to the console detailing the processing status for each mailbox.

| mailbox_address      | permissions        | status  | error               |
|---------------------|-------------------|---------|---------------------|
| shared1@example.com | FullAccess;SendAs | Success |                     |
| shared3@example.com | SendAs            | Failed  | Permission denied   |

## Notes

*   This script requires appropriate administrative permissions in Exchange Online.
*   "Full Access" is granted using `Add-MailboxPermission`.
*   "Send As" is granted using `Add-RecipientPermission`.
