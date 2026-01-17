<#
.SYNOPSIS
    Exports mailbox permissions (Full Access, Send As, Send on Behalf) to a CSV file.

.DESCRIPTION
    This script reads a list of mailboxes from a plain text file (one identity per line) and retrieves:
    - Full Access: Using Get-MailboxPermission
    - Send As: Using Get-RecipientPermission
    - Send on Behalf: Using Get-Mailbox (GrantSendOnBehalfTo property)

    The script aggregates these permissions and exports them to a CSV file.
    It requires the ExchangeOnlineManagement module and an active connection to Exchange Online.

.PARAMETER InputFile
    Path to the input text file containing a list of mailbox UserPrincipalNames (one per line).
    Default is 'Mailboxes.txt' in the script directory.

.PARAMETER OutputCsv
    Path to the output CSV file where results will be saved.
    Default is 'MailboxPermissionsReport.csv' in the script directory.

.EXAMPLE
    .\ExportMailboxPermissions.ps1 -InputFile "MyMailboxes.txt"

.EXAMPLE
    .\ExportMailboxPermissions.ps1 -OutputCsv "Report.csv"
#>

param (
    [string]$InputFile = "$PSScriptRoot\Mailboxes.txt",
    [string]$OutputCsv = "$PSScriptRoot\MailboxPermissionsReport.csv"
)

# ---------------------------------------------------------------------------
# Check Prerequisites
# ---------------------------------------------------------------------------

# Check if ExchangeOnlineManagement module is available
if (-not (Get-Module -Name ExchangeOnlineManagement -ListAvailable)) {
    Write-Warning "ExchangeOnlineManagement module is not installed."
    Write-Warning "Please install it using: Install-Module -Name ExchangeOnlineManagement"
    exit
}

# Ensure connection to Exchange Online
try {
    # Try a lightweight command to check connection
    $null = Get-Mailbox -Identity "scan-me-to-check-connection-status" -ErrorAction SilentlyContinue
} catch {
    # If we are not connected, we might want to connect.
    Write-Host "It seems you are not connected to Exchange Online." -ForegroundColor Cyan
    Write-Host "Attempting to connect..." -ForegroundColor Cyan
    Connect-ExchangeOnline
}

# ---------------------------------------------------------------------------
# Validate Input
# ---------------------------------------------------------------------------

if (-not (Test-Path $InputFile)) {
    Write-Error "Input file '$InputFile' not found. Please create the file or specify a valid path."
    exit
}

# Read the file and filter out empty lines or comments
$mailboxes = Get-Content $InputFile | Where-Object { -not [string]::IsNullOrWhiteSpace($_) -and -not $_.StartsWith("#") }

if (-not $mailboxes) {
    Write-Error "Input file '$InputFile' is empty."
    exit
}

Write-Host "Found $($mailboxes.Count) mailboxes to process." -ForegroundColor Green

# ---------------------------------------------------------------------------
# Process Mailboxes
# ---------------------------------------------------------------------------

$results = @()

foreach ($upn in $mailboxes) {
    $upn = $upn.Trim()

    Write-Host "Processing mailbox: $upn" -ForegroundColor Cyan

    try {
        $mailbox = Get-Mailbox -Identity $upn -ErrorAction Stop

        # 1. Full Access
        # We filter out inherited permissions and 'NT AUTHORITY\SELF'
        $fullAccess = Get-MailboxPermission -Identity $upn | Where-Object {
            (-not $_.IsInherited) -and
            ($_.User -notlike "NT AUTHORITY\SELF") -and
            ($_.AccessRights -like "*FullAccess*")
        }

        foreach ($perm in $fullAccess) {
            $results += [PSCustomObject]@{
                Mailbox      = $upn
                User         = $perm.User
                AccessType   = "Full Access"
                AccessRights = ($perm.AccessRights -join ", ")
            }
        }

        # 2. Send As
        # We filter out 'NT AUTHORITY\SELF'
        $sendAs = Get-RecipientPermission -Identity $upn | Where-Object {
            ($_.Trustee -notlike "NT AUTHORITY\SELF") -and
            ($_.AccessRights -like "*SendAs*")
        }

        foreach ($perm in $sendAs) {
            $results += [PSCustomObject]@{
                Mailbox      = $upn
                User         = $perm.Trustee
                AccessType   = "Send As"
                AccessRights = ($perm.AccessRights -join ", ")
            }
        }

        # 3. Send on Behalf
        # This is a property on the mailbox object
        if ($mailbox.GrantSendOnBehalfTo) {
            foreach ($delegate in $mailbox.GrantSendOnBehalfTo) {
                # $delegate can be a distinguished name or object depending on environment
                # We convert it to string for the report
                $results += [PSCustomObject]@{
                    Mailbox      = $upn
                    User         = $delegate.ToString()
                    AccessType   = "Send on Behalf"
                    AccessRights = "SendOnBehalf"
                }
            }
        }

    } catch {
        Write-Error "Failed to process mailbox '$upn': $_"
    }
}

# ---------------------------------------------------------------------------
# Export Results
# ---------------------------------------------------------------------------

if ($results.Count -gt 0) {
    $results | Export-Csv -Path $OutputCsv -NoTypeInformation
    Write-Host "Processing complete." -ForegroundColor Green
    Write-Host "Results exported to: $OutputCsv" -ForegroundColor Green
} else {
    Write-Warning "No permissions found or no mailboxes processed."
}
