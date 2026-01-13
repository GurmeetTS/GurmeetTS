<#
.SYNOPSIS
    Exports mailbox permissions (Full Access, Send As, Send on Behalf) from Exchange Online.

.DESCRIPTION
    This script connects to Exchange Online and retrieves permissions for specified or all mailboxes.
    It exports Full Access, Send As, and Send on Behalf permissions to a CSV file.
    It excludes inherited permissions and system accounts.

.PARAMETER InputFile
    Optional path to a text file containing one UserPrincipalName per line.
    If provided, only permissions for these mailboxes will be exported.
    If omitted, all User, Shared, Room, and Equipment mailboxes are processed.

.PARAMETER OutputFile
    Path to the output CSV file. Defaults to "MailboxPermissions.csv" in the script directory.

.EXAMPLE
    .\ExportMailboxPermissions.ps1
    Exports permissions for all mailboxes to MailboxPermissions.csv.

.EXAMPLE
    .\ExportMailboxPermissions.ps1 -InputFile "C:\Temp\Mailboxes.txt" -OutputFile "C:\Temp\Report.csv"
    Exports permissions for mailboxes listed in Mailboxes.txt to Report.csv.
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$InputFile,

    [Parameter(Mandatory = $false)]
    [string]$OutputFile = "$PSScriptRoot\MailboxPermissions.csv"
)

# Connect to Exchange Online if not already connected
try {
    Get-EXOMailbox -ResultSize 1 -ErrorAction Stop | Out-Null
}
catch {
    Write-Host "Connecting to Exchange Online..." -ForegroundColor Cyan
    try {
        Connect-ExchangeOnline -ErrorAction Stop
    }
    catch {
        Write-Error "Failed to connect to Exchange Online. Please ensure the ExchangeOnlineManagement module is installed and you have valid credentials."
        exit
    }
}

$mailboxes = @()

if ($InputFile) {
    if (-not (Test-Path $InputFile)) {
        Write-Error "Input file not found: $InputFile"
        exit
    }

    Write-Host "Reading mailboxes from $InputFile..." -ForegroundColor Cyan
    $identities = Get-Content $InputFile

    foreach ($id in $identities) {
        if (-not [string]::IsNullOrWhiteSpace($id)) {
            try {
                $mbx = Get-EXOMailbox -Identity $id.Trim() -Properties GrantSendOnBehalfTo, RecipientTypeDetails -ErrorAction Stop
                $mailboxes += $mbx
            }
            catch {
                Write-Warning "Could not find mailbox: $id"
            }
        }
    }
}
else {
    Write-Host "Retrieving all mailboxes (User, Shared, Room, Equipment)..." -ForegroundColor Cyan
    $mailboxes = Get-EXOMailbox -ResultSize Unlimited -Properties GrantSendOnBehalfTo, RecipientTypeDetails -RecipientTypeDetails UserMailbox, SharedMailbox, RoomMailbox, EquipmentMailbox
}

if ($mailboxes.Count -eq 0) {
    Write-Warning "No mailboxes found to process."
    exit
}

$results = [System.Collections.Generic.List[PSCustomObject]]::new()
$total = $mailboxes.Count
$current = 0

Write-Host "Processing $total mailboxes..." -ForegroundColor Cyan

foreach ($mbx in $mailboxes) {
    $current++
    $percent = ($current / $total) * 100
    Write-Progress -Activity "Exporting Permissions" -Status "Processing $($mbx.UserPrincipalName)" -PercentComplete $percent

    $upn = $mbx.UserPrincipalName
    $type = $mbx.RecipientTypeDetails

    # 1. Send On Behalf
    if ($mbx.GrantSendOnBehalfTo) {
        foreach ($delegate in $mbx.GrantSendOnBehalfTo) {
             # $delegate is an object, we cast to string to get the name/DN
             $results.Add([PSCustomObject]@{
                 Mailbox        = $upn
                 MailboxType    = $type
                 PermissionType = "SendOnBehalf"
                 AssignedTo     = $delegate.ToString()
             })
        }
    }

    # 2. Full Access
    try {
        $perms = Get-MailboxPermission -Identity $upn -ResultSize Unlimited -ErrorAction Stop | Where-Object {
            $_.IsInherited -eq $false -and $_.User -notlike "NT AUTHORITY\*" -and $_.User -notlike "S-1-5-*" -and $_.AccessRights -contains "FullAccess"
        }
        foreach ($p in $perms) {
            $results.Add([PSCustomObject]@{
                 Mailbox        = $upn
                 MailboxType    = $type
                 PermissionType = "FullAccess"
                 AssignedTo     = $p.User
             })
        }
    }
    catch {
        Write-Warning "Failed to retrieve Full Access permissions for $upn : $_"
    }

    # 3. Send As
    try {
        $sendAs = Get-RecipientPermission -Identity $upn -ResultSize Unlimited -ErrorAction Stop | Where-Object {
            $_.IsInherited -eq $false -and $_.Trustee -notlike "NT AUTHORITY\*" -and $_.Trustee -notlike "S-1-5-*" -and $_.AccessRights -contains "SendAs"
        }
        foreach ($s in $sendAs) {
             $results.Add([PSCustomObject]@{
                 Mailbox        = $upn
                 MailboxType    = $type
                 PermissionType = "SendAs"
                 AssignedTo     = $s.Trustee
             })
        }
    }
    catch {
         Write-Warning "Failed to retrieve Send As permissions for $upn : $_"
    }
}

if ($results.Count -gt 0) {
    Write-Host "Exporting results to $OutputFile..." -ForegroundColor Cyan
    $results | Export-Csv -Path $OutputFile -NoTypeInformation -Encoding UTF8
    Write-Host "Done." -ForegroundColor Green
}
else {
    Write-Warning "No permissions found to export."
}
