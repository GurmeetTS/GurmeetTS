<#
.SYNOPSIS
    Retrieves Exchange Online mailbox sizes for a list of users provided in a text file.

.DESCRIPTION
    This script reads a text file containing UserPrincipalNames (one per line) and retrieves
    mailbox statistics (TotalItemSize, ItemCount) for each user using Get-EXOMailboxStatistics.
    It requires the ExchangeOnlineManagement module.

.PARAMETER InputFile
    Path to the text file containing users. Default is "users.txt" in the current directory.

.PARAMETER OutputCsv
    Path to the output CSV file. Default is "MailboxSizes.csv".

.EXAMPLE
    .\GetExoMailboxSize.ps1 -InputFile "users.txt"
    Gets mailbox sizes for users in users.txt and exports to MailboxSizes.csv.
#>

param (
    [string]$InputFile = "$PSScriptRoot/users.txt",
    [string]$OutputCsv = "$PSScriptRoot/MailboxSizes.csv"
)

# Check if ExchangeOnlineManagement module is available
if (-not (Get-Module -ListAvailable -Name ExchangeOnlineManagement)) {
    Write-Warning "ExchangeOnlineManagement module is not installed."
    Write-Warning "Please install it using: Install-Module -Name ExchangeOnlineManagement"
    # Attempt to continue, assuming it might be loaded or available in the session
}

# Connect to Exchange Online if not already connected
Write-Host "Checking Exchange Online connection..." -ForegroundColor Cyan

$isConnected = $false
try {
    # Try a lightweight command to check connection
    $null = Get-EXOMailbox -ResultSize 1 -ErrorAction Stop
    $isConnected = $true
} catch {
    # Not connected or other error
    $isConnected = $false
}

if (-not $isConnected) {
    Write-Host "Not connected. Running Connect-ExchangeOnline..."
    try {
        Connect-ExchangeOnline -ErrorAction Stop
    } catch {
        Write-Error "Failed to connect to Exchange Online: $_"
        exit
    }
} else {
    Write-Host "Already connected to Exchange Online." -ForegroundColor Green
}

# Check input file
if (-not (Test-Path $InputFile)) {
    Write-Error "Input file not found: $InputFile"
    exit
}

$users = Get-Content $InputFile | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
$results = @()

foreach ($user in $users) {
    $user = $user.Trim()
    Write-Host "Processing user: $user" -ForegroundColor Cyan

    try {
        $stats = Get-EXOMailboxStatistics -Identity $user -ErrorAction Stop

        # TotalItemSize is a complex object (deserialized).
        # It typically converts to string as "1.2 GB (1,234,567 bytes)"
        $sizeString = $stats.TotalItemSize.ToString()
        $bytes = 0

        # Extract bytes using regex
        if ($sizeString -match "\(([\d,]+)\s*bytes\)") {
            # Remove commas and parse
            $bytesStr = $matches[1] -replace ",", ""
            [long]$bytes = $bytesStr
        }

        $sizeObj = [PSCustomObject]@{
            UserPrincipalName = $user
            DisplayName       = $stats.DisplayName
            ItemCount         = $stats.ItemCount
            TotalItemSize     = $sizeString
            TotalItemSizeBytes = $bytes
            LastLogonTime     = $stats.LastLogonTime
        }

        $results += $sizeObj
        Write-Host "  Size: $sizeString" -ForegroundColor Green
    }
    catch {
        Write-Error "  Failed to retrieve mailbox statistics for $user. Error: $($_.Exception.Message)"

        # Add error record to results
        $results += [PSCustomObject]@{
            UserPrincipalName = $user
            DisplayName       = "Error"
            ItemCount         = 0
            TotalItemSize     = "Error: $($_.Exception.Message)"
            TotalItemSizeBytes = 0
            LastLogonTime     = $null
        }
    }
}

# Export to CSV
if ($results.Count -gt 0) {
    $results | Export-Csv -Path $OutputCsv -NoTypeInformation
    Write-Host "`nResults exported to $OutputCsv" -ForegroundColor Green
} else {
    Write-Warning "No results to export."
}
