# This script sets EmailAddressPolicyEnabled to True for a list of users.
# It requires the Exchange Management Shell (on-premises) to be available.

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

foreach ($row in $users) {
    $userEmail = $row.UserPrincipalName

    if ([string]::IsNullOrWhiteSpace($userEmail)) {
        Write-Host "Skipping row with empty UserPrincipalName" -ForegroundColor DarkGray
        continue
    }

    Write-Host "Processing User: $userEmail" -ForegroundColor Cyan

    try {
        # Check if Set-RemoteMailbox is available
        if (Get-Command Set-RemoteMailbox -ErrorAction SilentlyContinue) {
             # Set EmailAddressPolicyEnabled to $true
             Set-RemoteMailbox -Identity $userEmail -EmailAddressPolicyEnabled $true -ErrorAction Stop
             Write-Host "Successfully set EmailAddressPolicyEnabled to True for $userEmail" -ForegroundColor Green
        } else {
             Write-Host "Command 'Set-RemoteMailbox' is not available. Please ensure you are running this script in the Exchange Management Shell on your on-premises Exchange Server." -ForegroundColor Red
             break
        }
    }
    catch {
        Write-Host "Error processing $($userEmail): $($_.Exception.Message)" -ForegroundColor Red
    }
}
