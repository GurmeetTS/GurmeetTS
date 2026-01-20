<#
.SYNOPSIS
    Imports shared mailbox permissions from a CSV file with domain fallback logic.

.DESCRIPTION
    This script reads a CSV file containing mailbox permissions.
    It attempts to resolve the trustee (user) by checking for their existence in the following domains, in order:
    1. @ruckusnetworks.com
    2. @auroranetworks.com
    3. @vistancenetworks.com

    It then applies 'FullAccess' and/or 'SendAs' permissions.

.PARAMETER CsvFilePath
    Path to the input CSV file. Expected columns: 'Identity' (or 'Mailbox'), 'User' (or 'Trustee'), 'AccessRights'.

.PARAMETER LogFilePath
    Path to the output log file (CSV). Default is "ImportPermissionsLog.csv".

.EXAMPLE
    .\ImportSharedMailboxPermissions.ps1 -CsvFilePath "permissions.csv"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$CsvFilePath,

    [string]$LogFilePath = "ImportPermissionsLog.csv"
)

# Check for Exchange Online module
if (-not (Get-Module -Name ExchangeOnlineManagement)) {
    Write-Warning "ExchangeOnlineManagement module is not loaded. Attempting to load..."
    Import-Module ExchangeOnlineManagement -ErrorAction SilentlyContinue
    if (-not (Get-Module -Name ExchangeOnlineManagement)) {
        Write-Error "ExchangeOnlineManagement module is required. Please install/import it."
        exit
    }
}

if (-not (Test-Path $CsvFilePath)) {
    Write-Error "CSV file not found: $CsvFilePath"
    exit
}

$csv = Import-Csv $CsvFilePath
$results = @()
$domains = @("ruckusnetworks.com", "auroranetworks.com", "vistancenetworks.com")

foreach ($row in $csv) {
    # Normalize column names
    $mailboxIdentity = if ($row.Identity) { $row.Identity } else { $row.Mailbox }
    $userInput = if ($row.User) { $row.User } else { $row.Trustee }
    $rights = $row.AccessRights

    if (-not $mailboxIdentity -or -not $userInput) {
        Write-Warning "Skipping row with missing Mailbox or User: $($row | Out-String)"
        continue
    }

    # Extract local part of the user email
    if ($userInput -match "^(?<localPart>[^@]+)") {
        $localPart = $Matches.localPart
    } else {
        $localPart = $userInput
    }

    $resolvedUser = $null
    $resolutionStatus = "NotFound"

    foreach ($domain in $domains) {
        $candidateUPN = "$localPart@$domain"
        try {
            $recipient = Get-Recipient -Identity $candidateUPN -ErrorAction Stop
            if ($recipient) {
                $resolvedUser = $candidateUPN
                $resolutionStatus = "Resolved-$domain"
                Write-Verbose "Found user: $resolvedUser"
                break
            }
        } catch {
            # Continue to next domain
        }
    }

    $status = "Skipped"
    $details = "User not found in target domains"

    if ($resolvedUser) {
        $status = "Success"
        $details = ""

        try {
            if ($rights -match "FullAccess") {
                Add-MailboxPermission -Identity $mailboxIdentity -User $resolvedUser -AccessRights FullAccess -InheritanceType All -ErrorAction Stop
                $details += "Added FullAccess; "
            }
            if ($rights -match "SendAs") {
                Add-RecipientPermission -Identity $mailboxIdentity -Trustee $resolvedUser -AccessRights SendAs -Confirm:$false -ErrorAction Stop
                $details += "Added SendAs; "
            }
        } catch {
            $status = "Error"
            $details = $_.Exception.Message
        }
    } else {
        Write-Warning "Could not resolve user '$userInput' in any of the target domains."
    }

    $results += [PSCustomObject]@{
        Mailbox = $mailboxIdentity
        OriginalUser = $userInput
        ResolvedUser = $resolvedUser
        ResolutionStatus = $resolutionStatus
        AccessRights = $rights
        Status = $status
        Details = $details
        Timestamp = Get-Date
    }
}

$results | Export-Csv -Path $LogFilePath -NoTypeInformation
Write-Host "Import completed. Log saved to $LogFilePath"
