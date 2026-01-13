<#
.SYNOPSIS
    Adds "Full Access" and "Send As" permissions to Exchange Online mailboxes based on a CSV file.

.DESCRIPTION
    This script reads a CSV file containing mailbox and user information and grants
    Full Access and Send As permissions to the specified user for the specified mailbox.
    It uses the Exchange Online Management module.

.PARAMETER CsvFilePath
    The path to the CSV file containing the permissions data.
    Default is "PermissionsInput.csv" in the current directory.
    The CSV must have headers: "Mailbox" and "User".

.EXAMPLE
    .\AddMailboxPermissions.ps1
    Runs the script using the default "PermissionsInput.csv" file.

.EXAMPLE
    .\AddMailboxPermissions.ps1 -CsvFilePath "C:\Temp\MyPermissions.csv"
    Runs the script using a specific CSV file.
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$CsvFilePath = "PermissionsInput.csv"
)

# Check if the CSV file exists
if (-not (Test-Path $CsvFilePath)) {
    Write-Error "CSV file not found at path: $CsvFilePath"
    exit
}

# Import the CSV data
try {
    $PermissionsList = Import-Csv -Path $CsvFilePath
}
catch {
    Write-Error "Failed to import CSV file. Ensure it is a valid CSV. Error: $_"
    exit
}

# Check for required columns
if (-not ($PermissionsList[0].PSObject.Properties.Match('Mailbox').Count -and $PermissionsList[0].PSObject.Properties.Match('User').Count)) {
    Write-Error "CSV file must contain 'Mailbox' and 'User' columns."
    exit
}

# Connect to Exchange Online if not already connected
try {
    # Check connection by running a lightweight command
    Get-ExoMailbox -ResultSize 1 -ErrorAction Stop | Out-Null
}
catch {
    Write-Warning "Not connected to Exchange Online. Please authenticate."
    try {
        Connect-ExchangeOnline -ErrorAction Stop
    }
    catch {
        Write-Error "Failed to connect to Exchange Online. Error: $_"
        exit
    }
}

foreach ($Row in $PermissionsList) {
    $Mailbox = $Row.Mailbox
    $User = $Row.User

    if ([string]::IsNullOrWhiteSpace($Mailbox) -or [string]::IsNullOrWhiteSpace($User)) {
        Write-Warning "Skipping row with empty Mailbox or User."
        continue
    }

    Write-Host "Processing: Granting $User access to $Mailbox" -ForegroundColor Cyan

    # 1. Add Full Access
    try {
        Write-Host "  - Adding Full Access..." -NoNewline
        Add-MailboxPermission -Identity $Mailbox -User $User -AccessRights FullAccess -InheritanceType All -ErrorAction Stop
        Write-Host " [OK]" -ForegroundColor Green
    }
    catch {
        Write-Host " [FAILED]" -ForegroundColor Red
        Write-Error "    Failed to add Full Access for $User on $Mailbox. Error: $_"
    }

    # 2. Add Send As
    try {
        Write-Host "  - Adding Send As..." -NoNewline
        Add-RecipientPermission -Identity $Mailbox -Trustee $User -AccessRights SendAs -Confirm:$false -ErrorAction Stop
        Write-Host " [OK]" -ForegroundColor Green
    }
    catch {
        Write-Host " [FAILED]" -ForegroundColor Red
        Write-Error "    Failed to add Send As for $User on $Mailbox. Error: $_"
    }
}

Write-Host "Processing complete." -ForegroundColor Green
