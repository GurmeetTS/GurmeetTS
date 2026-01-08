# This script sets EmailAddressPolicyEnabled to True for a list of users.
# It requires the Exchange Management Shell (on-premises) to be available.
# It generates a CSV report of the actions taken.

param (
    [string]$CsvFilePath = "users.csv"
)

# Validate CSV path
if (-not (Test-Path $CsvFilePath)) {
    Write-Host "CSV file not found at $CsvFilePath" -ForegroundColor Red
    exit
}

# Import users
$users = Import-Csv $CsvFilePath

# Initialize a list to store results
$results = @()

# Check if Set-RemoteMailbox is available once before loop
if (-not (Get-Command Set-RemoteMailbox -ErrorAction SilentlyContinue)) {
    Write-Host "Command 'Set-RemoteMailbox' is not available. Please ensure you are running this script in the Exchange Management Shell on your on-premises Exchange Server." -ForegroundColor Red
    exit
}

foreach ($row in $users) {
    $userEmail = $row.UserPrincipalName
    $status = "Failed"
    $message = ""

    if ([string]::IsNullOrWhiteSpace($userEmail)) {
        Write-Host "Skipping row with empty UserPrincipalName" -ForegroundColor DarkGray
        continue
    }

    Write-Host "Processing User: $userEmail" -ForegroundColor Cyan

    try {
        # Set EmailAddressPolicyEnabled to $true
        Set-RemoteMailbox -Identity $userEmail -EmailAddressPolicyEnabled $true -ErrorAction Stop
        $status = "Success"
        $message = "Successfully set EmailAddressPolicyEnabled to True"
        Write-Host $message -ForegroundColor Green
    }
    catch {
        $status = "Failed"
        $message = $_.Exception.Message
        Write-Host "Error processing $($userEmail): $message" -ForegroundColor Red
    }

    # Add result object to list
    $results += [PSCustomObject]@{
        UserPrincipalName = $userEmail
        Status            = $status
        Message           = $message
        Timestamp         = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
}

# Generate Report Filename with Timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = "SetEmailAddressPolicy_Report_$timestamp.csv"

# Export results to CSV
try {
    $results | Export-Csv -Path $reportPath -NoTypeInformation
    Write-Host "`nProcessing complete. Report saved to: $reportPath" -ForegroundColor Green
}
catch {
    Write-Host "`nFailed to save report to $reportPath. Error: $($_.Exception.Message)" -ForegroundColor Red
}
