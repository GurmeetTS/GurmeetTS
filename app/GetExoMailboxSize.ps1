<#
.SYNOPSIS
    Retrieves mailbox size statistics for a list of users.

.DESCRIPTION
    This script reads a list of UserPrincipalNames from a text file, retrieves their mailbox statistics
    (ItemCount, TotalItemSize, LastLogonTime), and exports the results to a CSV file.
    It requires the ExchangeOnlineManagement module and an active session.

.PARAMETER InputFile
    The path to the text file containing one UserPrincipalName per line. Default is "users.txt".

.PARAMETER OutputFile
    The path to the output CSV file. Default is "MailboxReport.csv".

.EXAMPLE
    .\GetExoMailboxSize.ps1 -InputFile "myusers.txt" -OutputFile "Sizes.csv"
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$InputFile = "users.txt",

    [Parameter(Mandatory = $false)]
    [string]$OutputFile = "MailboxReport.csv"
)

# Check if input file exists
if (-not (Test-Path -Path $InputFile)) {
    Write-Error "Input file not found: $InputFile"
    exit 1
}

# Check for ExchangeOnlineManagement module
if (-not (Get-Module -Name ExchangeOnlineManagement -ListAvailable)) {
    Write-Warning "ExchangeOnlineManagement module is not installed."
}

# Read users from file
$users = Get-Content -Path $InputFile | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

$report = @()

foreach ($user in $users) {
    Write-Host "Processing user: $user" -ForegroundColor Cyan
    try {
        $stats = Get-EXOMailboxStatistics -Identity $user -ErrorAction Stop

        $props = [PSCustomObject]@{
            UserPrincipalName = $user
            DisplayName       = $stats.DisplayName
            ItemCount         = $stats.ItemCount
            TotalItemSize     = $stats.TotalItemSize.ToString()
            LastLogonTime     = $stats.LastLogonTime
        }
        $report += $props
    }
    catch {
        Write-Warning "Failed to retrieve mailbox statistics for $user. Error: $_"
        # Add a record indicating failure
        $report += [PSCustomObject]@{
            UserPrincipalName = $user
            DisplayName       = "Error"
            ItemCount         = $null
            TotalItemSize     = "Error: $_"
            LastLogonTime     = $null
        }
    }
}

# Export to CSV
try {
    $report | Export-Csv -Path $OutputFile -NoTypeInformation -Encoding UTF8
    Write-Host "Report successfully saved to $OutputFile" -ForegroundColor Green
}
catch {
    Write-Error "Failed to save report to $OutputFile. Error: $_"
}
