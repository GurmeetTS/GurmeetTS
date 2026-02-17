# Get OneDrive Usage Report

This PowerShell script retrieves the total size of the OneDrive for Business usage across the tenant and reports the total number of files.

## Features

- **Total Storage Used**: Retrieves the total storage consumed by all OneDrives in the tenant.
- **Total File Count**: Retrieves the total number of files stored in OneDrive across the tenant.
- **Plain Text Summary**: Outputs a simple, readable summary of the metrics.
- **Validation**: Checks if the retrieved values are valid and alerts if data is missing.

## Prerequisites

- **PowerShell 5.1 or later**, or **PowerShell Core (7+)**.
- **Microsoft Graph PowerShell Module**. Specifically `Microsoft.Graph.Reports`.
  ```powershell
  Install-Module Microsoft.Graph.Reports -Scope CurrentUser
  ```
- **Permissions**: The script requires the `Reports.Read.All` permission to access usage reports.

## Usage

1.  Open a PowerShell terminal.
2.  Navigate to the directory containing the script.
3.  Run the script:

    ```powershell
    .\GetOneDriveUsageReport.ps1
    ```

4.  If prompted, sign in with an account that has the required permissions.

## Output Example

```text
Retrieving OneDrive usage reports...

OneDrive Usage Summary
----------------------
Total Storage Used: 1024.50 GB (1.0005 TB)
Total Files:        50000
Total Folders:      N/A (Requires extensive crawling, not available in summary reports)

Validation:
Success: Retrieved valid metrics from Microsoft Graph.
```

## Limitations

- **Folder Count**: The script does not report the number of folders. This metric is not available in the standard Microsoft Graph usage reports. Obtaining folder counts would require crawling every OneDrive site, which is resource-intensive and slow.
- **Data Latency**: Microsoft Graph usage reports may have a delay of 24-48 hours.
