<#
.SYNOPSIS
    Converts a list of mailboxes to shared mailboxes.

.DESCRIPTION
    This script reads a list of mailboxes from a text file, attempts to convert each
    to a shared mailbox, and outputs the results to a CSV file and a log file.

.PARAMETER InputFile
    Path to the text file containing one mailbox email address per line.
    Default: .\mailboxes.txt

.PARAMETER OutputCsv
    Path to the output CSV file for results.
    Default: .\ConversionResults.csv

.PARAMETER LogFile
    Path to the log file.
    Default: .\ConversionLog.txt

.EXAMPLE
    .\ConvertToSharedMailbox.ps1 -InputFile "C:\temp\users.txt"
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$InputFile = ".\mailboxes.txt",

    [Parameter(Mandatory = $false)]
    [string]$OutputCsv = ".\ConversionResults.csv",

    [Parameter(Mandatory = $false)]
    [string]$LogFile = ".\ConversionLog.txt"
)

# Helper function for logging
function Write-Log {
    param (
        [string]$Message,
        [string]$Type = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Type] $Message"
    Write-Host $logEntry
    Add-Content -Path $LogFile -Value $logEntry -Encoding UTF8
}

# Check if input file exists
if (-not (Test-Path $InputFile)) {
    Write-Error "Input file not found: $InputFile"
    exit 1
}

# Create/Clear log file
$null = New-Item -Path $LogFile -ItemType File -Force

Write-Log "Starting mailbox conversion process."
Write-Log "Reading mailboxes from $InputFile"

$mailboxes = Get-Content -Path $InputFile
$results = @()

foreach ($mailbox in $mailboxes) {
    if ([string]::IsNullOrWhiteSpace($mailbox)) {
        continue
    }

    $mailbox = $mailbox.Trim()
    Write-Log "Processing mailbox: $mailbox"

    $status = "Failed"
    $details = ""

    try {
        # Check if the module is loaded or command exists
        if (Get-Command Set-Mailbox -ErrorAction SilentlyContinue) {
            Set-Mailbox -Identity $mailbox -Type Shared -ErrorAction Stop
            $status = "Success"
            $details = "Successfully converted to shared mailbox."
            Write-Log "Success: $mailbox converted."
        }
        else {
            throw "The 'Set-Mailbox' command is not available. Ensure the ExchangeOnlineManagement module is connected."
        }
    }
    catch {
        $status = "Failed"
        $details = $_.Exception.Message
        Write-Log "Error processing $mailbox : $details" "ERROR"
    }

    $results += [PSCustomObject]@{
        Mailbox = $mailbox
        Status  = $status
        Details = $details
    }
}

# Export results to CSV
Write-Log "Exporting results to $OutputCsv"
$results | Export-Csv -Path $OutputCsv -NoTypeInformation -Encoding UTF8

Write-Log "Process completed."
