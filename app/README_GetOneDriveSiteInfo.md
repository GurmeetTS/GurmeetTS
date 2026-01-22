# Get OneDrive Site Info Script

This PowerShell script retrieves SharePoint Online / OneDrive for Business site information for a specified list of users.

## Features

- **Retrieves Site Info**: Gets `Site URL`, `Site Owner`, `LockState`, and `StorageUsageCurrent` for each user.
- **Input Flexibility**: Accepts a text file with a list of UPNs or email addresses.
- **Auto-Resolution**: If a user's OneDrive site is not found using the provided input (e.g., if an email alias is used instead of UPN), the script attempts to resolve the correct UPN using SharePoint User Profiles or Exchange Online (if available).
- **Logging**: Generates `Success.log` and `Failed.log` for easy auditing.
- **CSV Export**: Exports successfully retrieved data to a CSV file.

## Prerequisites

1.  **SharePoint Online Management Shell**:
    - Install via: `Install-Module -Name Microsoft.Online.SharePoint.PowerShell`
2.  **(Optional) Exchange Online Management**:
    - Recommended for better UPN resolution if input data contains email aliases.
    - Install via: `Install-Module -Name ExchangeOnlineManagement`
3.  **Permissions**:
    - SharePoint Admin role (or Global Admin) to access OneDrive sites.

## Usage

1.  **Prepare Input File**:
    Create a text file (e.g., `Users.txt`) with one user per line:
    ```text
    user1@contoso.com
    jane.doe@contoso.com
    alias@contoso.com
    ```

2.  **Run the Script**:
    ```powershell
    .\Get-OneDriveSiteInfo.ps1 -AdminSiteUrl "https://contoso-admin.sharepoint.com" -UserListFile "Users.txt"
    ```

### Parameters

- `-AdminSiteUrl` (Required): The URL of your SharePoint Admin Center (e.g., `https://<tenant>-admin.sharepoint.com`).
- `-UserListFile` (Optional): Path to the input text file. Default is `Users.txt`.
- `-OutputCsv` (Optional): Path for the output CSV report. Default is `OneDriveReport.csv`.
- `-LogPath` (Optional): Folder to store logs. Default is `Logs`.

## Output

- **CSV File** (`OneDriveReport.csv`):
    - `User UPN`
    - `Site URL`
    - `Site Owner`
    - `LockState`
    - `StorageUsageCurrent` (in MB)
- **Logs**:
    - `Logs/Success.log`: List of sites successfully found.
    - `Logs/Failed.log`: List of users whose sites could not be found or resolved.

## Troubleshooting

- **Site not found**: If the script logs "Site not found" and you are sure the user has a OneDrive:
    - Ensure the user is licensed and the site is provisioned.
    - If using an alias, ensure `ExchangeOnlineManagement` is installed for better resolution, or try running `Get-SPOUser` on the root site to ensure the user is known to SharePoint.
