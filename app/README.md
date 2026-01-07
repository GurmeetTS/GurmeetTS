# Calendar Item Deletion Script

This PowerShell script is designed to perform a comprehensive cleanup of calendar events, tasks, and booking appointments for a list of users. It uses the Microsoft Graph API to authenticate and perform deletions.

**WARNING: This script performs destructive actions. It deletes data permanently. Please ensure you have a backup and have tested this in a non-production environment before running it against live data.**

## Features

The script iterates through a list of users provided in a CSV file and performs the following actions for each user:

1.  **Calendar Events**: Deletes all calendar events.
2.  **Tasks & Lists**:
    *   Deletes all tasks within task lists.
    *   Deletes custom task lists.
    *   Clears but preserves system task lists (e.g., "Tasks", "Flagged Emails").
3.  **Planner Tasks**: Deletes assigned Planner tasks (often created in meetings).
4.  **Bookings**: Deletes all appointments from all Booking Businesses visible to the application.

## Prerequisites

*   **PowerShell 5.1 or later**, or **PowerShell Core (7+)**.
*   **Microsoft Graph PowerShell Module**. You can install it using:
    ```powershell
    Install-Module Microsoft.Graph -Scope CurrentUser
    ```
*   **Microsoft Azure App Registration**: You need an App Registration in Azure AD with the necessary API permissions.

### Required API Permissions

The application requires the following **Application** permissions (not Delegated) in Microsoft Graph:

*   `Calendars.ReadWrite` (to delete events)
*   `Tasks.ReadWrite.All` (to delete tasks and lists)
*   `Bookings.ReadWrite.All` (to delete booking appointments)
*   `User.Read.All` (potentially required to look up users)

**Note**: Ensure you grant "Admin Consent" for these permissions in the Azure Portal.

## Configuration

### 1. Credentials
Open the `CalendarItemDeletion.ps1` script and update the following variables at the top of the file with your Azure App Registration details:

```powershell
$TenantId     = "YOUR_TENANT_ID"
$ClientId     = "YOUR_CLIENT_ID"
$ClientSecret = "YOUR_CLIENT_SECRET"
```

> **Security Note**: Hardcoding credentials in scripts is not recommended for production environments. Consider using Azure Key Vault or environment variables for better security.

### 2. User List (CSV)
Prepare a CSV file containing the list of users you want to process. The CSV must have a header named `UserPrincipalName`.

Example `CalendarUsers.csv`:
```csv
UserPrincipalName
john.doe@example.com
jane.smith@example.com
```

Update the `$CsvFilePath` variable in the script to point to your CSV file:

```powershell
$CsvFilePath = "C:\Path\To\Your\CalendarUsers.csv"
```

## Usage

1.  Open a PowerShell terminal.
2.  Navigate to the directory containing the script.
3.  Run the script:

    ```powershell
    .\CalendarItemDeletion.ps1
    ```

4.  The script will output its progress to the console, showing which items are being deleted.

## Error Handling

*   The script includes `try-catch` blocks to handle errors during processing.
*   If an error occurs for a specific user or item, it will be logged to the console in Red, and the script will attempt to continue with the next item.
*   If the connection to Microsoft Graph fails, the script will exit.

## Disclaimer

This script is provided "as-is" without warranty of any kind. The author is not responsible for any data loss or damage resulting from the use of this script. **Use at your own risk.**
