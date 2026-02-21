# SharePoint Online Multi-Site User Removal Script

## Overview
This PowerShell script facilitates the bulk removal of users from multiple SharePoint Online sites. It is designed to be compatible with **Windows PowerShell 5.1** and uses the **PnP.PowerShell** module (specifically version 1.12.0) and **Microsoft.Online.SharePoint.PowerShell** module.

The script supports a **Dry Run** mode to simulate actions without making changes, logs all activities to a CSV file, and includes built-in exclusion logic for system and service accounts.

## Prerequisites

*   **Windows PowerShell 5.1**
*   **SharePoint Online Management Shell** (`Microsoft.Online.SharePoint.PowerShell` module)
*   **PnP.PowerShell** module (Version 1.12.0 is recommended for compatibility constraints)
*   SharePoint Administrator permissions.

## Input Files

### 1. Users CSV (`-UsersFile`)
A CSV file containing the list of users to remove. Must include a header named `UserPrincipalName`.

**Example:**
```csv
UserPrincipalName
john.doe@contoso.com
jane.smith@contoso.com
```

### 2. Sites File (`-SitesFile`)
Can be a CSV file with a `SiteUrl` header OR a text file with one URL per line.

**CSV Example:**
```csv
SiteUrl
https://contoso.sharepoint.com/sites/Marketing
https://contoso.sharepoint.com/sites/Sales
```

**Text File Example:**
```text
https://contoso.sharepoint.com/sites/Marketing
https://contoso.sharepoint.com/sites/Sales
```

## Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `-UsersFile` | String | Yes | Path to the users CSV file. |
| `-SitesFile` | String | Yes | Path to the sites CSV or TXT file. |
| `-AdminUrl` | String | Yes | The URL of your SharePoint Admin Center (e.g., `https://contoso-admin.sharepoint.com`). |
| `-LogFile` | String | No | Path for the output log CSV. Defaults to a timestamped file in the current directory. |
| `-DryRun` | Switch | No | If specified, the script runs in audit mode. No users are removed. |
| `-GrantSiteCollectionAdmin` | Switch | No | If specified, grants the current user (specified by `-AdminUPN`) Site Collection Admin rights to each site before processing. |
| `-AdminUPN` | String | Conditional | Required if `-GrantSiteCollectionAdmin` is used. The User Principal Name of the admin to be granted rights. |

## Usage Examples

### 1. Dry Run (Audit Only)
```powershell
.\RemoveUsersFromSPOSites.ps1 -UsersFile "C:\Temp\Users.csv" -SitesFile "C:\Temp\Sites.csv" -AdminUrl "https://contoso-admin.sharepoint.com" -DryRun
```

### 2. Live Removal
```powershell
.\RemoveUsersFromSPOSites.ps1 -UsersFile "C:\Temp\Users.csv" -SitesFile "C:\Temp\Sites.csv" -AdminUrl "https://contoso-admin.sharepoint.com"
```

### 3. Grant Admin Rights and Remove
If you are a Tenant Admin but not explicitly a Site Collection Admin on the target sites, use this mode to ensure access:
```powershell
.\RemoveUsersFromSPOSites.ps1 -UsersFile "C:\Temp\Users.csv" -SitesFile "C:\Temp\Sites.csv" -AdminUrl "https://contoso-admin.sharepoint.com" -GrantSiteCollectionAdmin -AdminUPN "admin@contoso.com"
```

## Exclusion Logic
The script automatically excludes users matching the following criteria to prevent accidental removal of critical accounts:
*   **System Accounts:** `sharepoint\system`, `NT AUTHORITY\*`
*   **Service Accounts:** UPNs starting with `svc_`, `sp_`, or `adm_` (case-insensitive).
*   **Guest Users:** UPNs containing `#ext#`.
*   **Explicit Exclusions:** You can modify the `$ExplicitExclusions` array in the script to add specific UPNs.

## Logging
The script generates a CSV log file containing:
*   Timestamp
*   Site URL
*   User UPN
*   Action Taken (e.g., Remove User, Connect, Check Exclusion)
*   Mode (DryRun or Live)
*   Status (Success, Error, Skipped)
*   Message (Details)

## Disclaimer
**WARNING:** This script performs destructive actions (user removal). Always run a **Dry Run** first to verify the scope of impact. The author is not responsible for any data loss or service disruption.
