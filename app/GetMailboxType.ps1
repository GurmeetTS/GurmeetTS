<#
.SYNOPSIS
    Retrieves the mailbox type (UserMailbox, SharedMailbox, etc.) for a list of SMTP addresses or UserPrincipalNames.

.DESCRIPTION
    This script imports a CSV file containing SMTP addresses or UPNs, queries Exchange Online for each address,
    and exports the mailbox type and other details to a new CSV file.

    It requires the ExchangeOnlineManagement module.

.PARAMETER CsvFilePath
    The path to the input CSV file. Defaults to ".\users.csv".

.PARAMETER OutputFilePath
    The path to the output CSV file. Defaults to ".\MailboxTypes.csv".

.PARAMETER EmailColumnHeader
    The header name in the CSV file containing the email addresses. Defaults to "UserPrincipalName".

.EXAMPLE
    .\GetMailboxType.ps1 -CsvFilePath "C:\Temp\users.csv" -EmailColumnHeader "Email"
#>

param (
    [string]$CsvFilePath = ".\users.csv",
    [string]$OutputFilePath = ".\MailboxTypes.csv",
    [string]$EmailColumnHeader = "UserPrincipalName"
)

# Check if ExchangeOnlineManagement module is available
if (-not (Get-Module -ListAvailable -Name ExchangeOnlineManagement)) {
    Write-Error "The 'ExchangeOnlineManagement' module is not installed. Please install it using 'Install-Module -Name ExchangeOnlineManagement'."
    exit
}

# Connect to Exchange Online if not already connected
# Note: This checks for an active PSSession which might be simplistic, but standard Connect-ExchangeOnline handles re-auth well.
# We will just attempt to run a command, if it fails, we connect.
try {
    Get-ExoMailbox -ResultSize 1 -ErrorAction Stop | Out-Null
}
catch {
    Write-Host "Connecting to Exchange Online..." -ForegroundColor Cyan
    try {
        Connect-ExchangeOnline -ShowProgress $true -ErrorAction Stop
    }
    catch {
        Write-Error "Failed to connect to Exchange Online. Please check your internet connection and credentials."
        exit
    }
}

# Import CSV
if (-not (Test-Path $CsvFilePath)) {
    Write-Error "Input CSV file not found at: $CsvFilePath"
    exit
}

$users = Import-Csv $CsvFilePath
$results = @()

Write-Host "Processing $($users.Count) records..." -ForegroundColor Cyan

foreach ($row in $users) {
    $email = $row.$EmailColumnHeader

    if ([string]::IsNullOrWhiteSpace($email)) {
        Write-Warning "Skipping row with empty email address."
        continue
    }

    $status = "Success"
    $type = "Unknown"
    $details = ""

    try {
        # Using Get-Recipient can sometimes be faster/more generic, but Get-ExoMailbox gives RecipientTypeDetails specifically for mailboxes.
        # Get-Recipient also returns RecipientTypeDetails.
        # We'll use Get-ExoMailbox as the user specifically asked about mailboxes.
        # If it's not a mailbox (e.g. MailUser, Contact), Get-ExoMailbox might error or return nothing depending on flags.
        # Let's use Get-Recipient to be broader, then narrow down.

        $recipient = Get-Recipient -Identity $email -ErrorAction Stop
        $type = $recipient.RecipientTypeDetails
        $details = "Recipient found."

        # If we want specific properties from Get-ExoMailbox that aren't on Recipient (though RecipientTypeDetails is usually enough)
        # For this task, RecipientTypeDetails is exactly what distinguishes "UserMailbox" from "SharedMailbox".

    }
    catch {
        $status = "Error"
        $details = $_.Exception.Message
        # Try to see if it's a valid user but not a mailbox (if Get-Recipient failed for some other reason, but usually it fails if not found)
        # If the user exists in Azure AD but has no exchange attributes, Get-Recipient will fail.
        Write-Warning "Could not find recipient or error processing: $email. Error: $($_.Exception.Message)"
    }

    $results += [PSCustomObject]@{
        InputEmail           = $email
        RecipientTypeDetails = $type
        Status               = $status
        Details              = $details
    }
}

# Export Results
try {
    $results | Export-Csv -Path $OutputFilePath -NoTypeInformation
    Write-Host "Results exported to: $OutputFilePath" -ForegroundColor Green
}
catch {
    Write-Error "Failed to export results to $OutputFilePath. Error: $($_.Exception.Message)"
}
