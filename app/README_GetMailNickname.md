# Get Mail Nickname Script

This PowerShell script retrieves user details from Microsoft Entra ID (Azure AD) for a list of users provided in a text file. It uses the Microsoft Graph API to fetch `DisplayName`, `UserPrincipalName`, `Mail`, `MailNickname`, and `Status` (AccountEnabled).

## Features

*   **Bulk Retrieval**: Processes a list of users from a text file.
*   **Entra ID Integration**: Uses Microsoft Graph API for up-to-date information.
*   **CSV Export**: Exports the results to a CSV file for easy analysis.
*   **Error Handling**: Logs errors for individual users without stopping the entire process.

## Prerequisites

*   **PowerShell 5.1 or later**, or **PowerShell Core (7+)**.
*   **Microsoft Graph PowerShell Module**. You can install it using:
    ```powershell
    Install-Module Microsoft.Graph -Scope CurrentUser
    ```
*   **Microsoft Azure App Registration**: You need an App Registration in Azure AD with the necessary API permissions.

### Required API Permissions

The application requires the following **Application** permissions (not Delegated) in Microsoft Graph:

*   `User.Read.All` (to read user profiles)

**Note**: Ensure you grant "Admin Consent" for these permissions in the Azure Portal.

## Configuration

### 1. Credentials
Open the `GetMailNickname.ps1` script and update the following variables at the top of the file with your Azure App Registration details:

```powershell
$TenantId     = "YOUR_TENANT_ID"
$ClientId     = "YOUR_CLIENT_ID"
$ClientSecret = "YOUR_CLIENT_SECRET"
```

### 2. Input File
Prepare a text file containing the list of UserPrincipalNames (one per line).
By default, the script looks for `C:\Temp\users.txt`. You can change this path in the script variable `$InputFilePath`.

Example `users.txt`:
```text
user1@example.com
user2@example.com
```

## Usage

1.  Open a PowerShell terminal.
2.  Navigate to the directory containing the script.
3.  Run the script:

    ```powershell
    .\GetMailNickname.ps1
    ```

4.  The script will output progress to the console.
5.  Results will be exported to `C:\Temp\UserMailNicknames.csv` (or the path configured in `$OutputCsvPath`).

## Output

The generated CSV will contain the following columns:
*   `DisplayName`
*   `UserPrincipalName`
*   `Mail`
*   `MailNickname`
*   `Status` (Enabled/Disabled)
