<#
.SYNOPSIS
    Retrieves the total size of the OneDrive database and the number of files.

.DESCRIPTION
    This script connects to Microsoft Graph to retrieve tenant-level usage reports for OneDrive.
    It reports the total storage used and total file count across all users.
    Folder counts are not available in standard reports and require extensive crawling, which is noted.

.NOTES
    Prerequisites:
    - Microsoft Graph PowerShell SDK (Microsoft.Graph.Reports)
    - Permissions: Reports.Read.All
#>

[CmdletBinding()]
param()

# Check for Microsoft Graph module
if (-not (Get-Module -ListAvailable -Name Microsoft.Graph.Reports)) {
    Write-Warning "Microsoft Graph Reports module not found. Please install it using: Install-Module Microsoft.Graph.Reports"
    # Attempt to continue, assuming it might be loaded or available in session
}

# Connect to Microsoft Graph
try {
    # Check if already connected
    if (-not (Get-MgContext)) {
        Connect-MgGraph -Scopes "Reports.Read.All" -ErrorAction Stop -NoWelcome
    }
}
catch {
    Write-Error "Failed to connect to Microsoft Graph. Please ensure you have the necessary permissions."
    exit
}

Write-Host "Retrieving OneDrive usage reports..." -ForegroundColor Cyan

# Define temporary file paths
$storageReportPath = "$env:TEMP\OneDriveStorageReport.csv"
$fileCountReportPath = "$env:TEMP\OneDriveFileCountReport.csv"

# Get Storage Usage (Last 7 Days)
try {
    # Get-MgReportOneDriveUsageStorage returns a raw CSV stream, we save it to file
    Get-MgReportOneDriveUsageStorage -Period D7 -OutFile $storageReportPath -ErrorAction Stop
}
catch {
    Write-Error "Failed to retrieve storage report: $_"
    exit
}

# Get File Count (Last 7 Days)
try {
    Get-MgReportOneDriveUsageFileCount -Period D7 -OutFile $fileCountReportPath -ErrorAction Stop
}
catch {
    Write-Error "Failed to retrieve file count report: $_"
    exit
}

# Import and Process Storage Report
$totalStorageBytes = 0
if (Test-Path $storageReportPath) {
    $storageData = Import-Csv $storageReportPath
    # Get the latest entry
    $latestStorage = $storageData | Sort-Object "Report Refresh Date" -Descending | Select-Object -First 1

    # Calculate Total Storage
    # The report typically contains `Storage Used (Byte)` column.
    if ($latestStorage."Storage Used (Byte)") {
        $totalStorageBytes = [int64]$latestStorage."Storage Used (Byte)"
    } elseif ($latestStorage."Storage Used (Bytes)") { # Potential header variation
        $totalStorageBytes = [int64]$latestStorage."Storage Used (Bytes)"
    } else {
        Write-Warning "Storage Used column not found in report."
    }
} else {
    Write-Error "Storage report file not found."
    exit
}

$totalStorageGB = [math]::Round($totalStorageBytes / 1GB, 2)
$totalStorageTB = [math]::Round($totalStorageBytes / 1TB, 4)

# Import and Process File Count Report
$totalFiles = 0
if (Test-Path $fileCountReportPath) {
    $fileData = Import-Csv $fileCountReportPath
    # Get the latest entry
    $latestFileCount = $fileData | Sort-Object "Report Refresh Date" -Descending | Select-Object -First 1

    if ($latestFileCount.Total) {
        $totalFiles = [int64]$latestFileCount.Total
    } else {
        Write-Warning "Total files column not found in report."
    }
} else {
    Write-Error "File count report file not found."
    exit
}

# Clean up temporary files
Remove-Item $storageReportPath -ErrorAction SilentlyContinue
Remove-Item $fileCountReportPath -ErrorAction SilentlyContinue

# Output Summary
Write-Host "`nOneDrive Usage Summary" -ForegroundColor Green
Write-Host "----------------------"
Write-Host "Total Storage Used: $totalStorageGB GB ($totalStorageTB TB)"
Write-Host "Total Files:        $totalFiles"
Write-Host "Total Folders:      N/A (Requires extensive crawling, not available in summary reports)"

# Validation
Write-Host "`nValidation:" -ForegroundColor Yellow
if ($totalStorageBytes -gt 0 -and $totalFiles -gt 0) {
    Write-Host "Success: Retrieved valid metrics from Microsoft Graph." -ForegroundColor Green
} else {
    Write-Host "Warning: One or more values are zero or missing. Verify tenant usage or report availability." -ForegroundColor Red
    Write-Host "Note: It may take up to 48 hours for new tenants to generate usage reports." -ForegroundColor Gray
}
