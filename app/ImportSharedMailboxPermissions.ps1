<#
.SYNOPSIS
    Imports permissions for multiple shared mailboxes from a CSV or JSON file.

.DESCRIPTION
    This script reads a list of shared mailboxes and permissions from a file (CSV or JSON)
    and grants the specified permissions (FullAccess, SendAs) to a target user (Trustee).

    Input File Requirements:
    - CSV Format: mailbox_address,permissions
      Example: shared1@example.com,FullAccess;SendAs
    - JSON Format: Array of objects
      Example: [{"mailbox": "shared1@example.com", "permissions": ["FullAccess", "SendAs"]}]

    Supported Permissions:
    - FullAccess
    - SendAs

.PARAMETER InputFile
    Path to the CSV or JSON input file.

.PARAMETER Trustee
    The user principal name or email address of the user to whom permissions will be granted.

.EXAMPLE
    .\ImportSharedMailboxPermissions.ps1 -InputFile "permissions.csv" -Trustee "admin@contoso.com"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, HelpMessage="Path to the input CSV or JSON file.")]
    [string]$InputFile,

    [Parameter(Mandatory=$true, HelpMessage="The user (Trustee) to grant permissions to.")]
    [string]$Trustee
)

# Function to create a report entry
function New-ReportEntry {
    param($Mailbox, $Permissions, $Status, $ErrorMsg = "")
    [PSCustomObject]@{
        mailbox_address = $Mailbox
        permissions     = $Permissions
        status          = $Status
        error           = $ErrorMsg
    }
}

# Validate input file existence
if (-not (Test-Path $InputFile)) {
    Write-Error "Input file not found: $InputFile"
    exit 1
}

# Determine file format and parse data
$extension = [System.IO.Path]::GetExtension($InputFile).ToLower()
$data = $null

try {
    if ($extension -eq ".json") {
        $jsonContent = Get-Content $InputFile -Raw | ConvertFrom-Json
        if ($jsonContent -isnot [System.Array]) { $data = @($jsonContent) } else { $data = $jsonContent }
    }
    elseif ($extension -eq ".csv") {
        $data = Import-Csv $InputFile
    }
    else {
        Write-Error "Unsupported file format. Please use .csv or .json"
        exit 1
    }
}
catch {
    Write-Error "Failed to parse input file: $_"
    exit 1
}

$report = @()

foreach ($item in $data) {
    # Normalize property names
    # CSV header: mailbox_address | JSON property: mailbox
    $mailbox = if ($item.PSObject.Properties['mailbox']) { $item.mailbox } else { $item.mailbox_address }

    # Normalize permissions
    $permsRaw = $item.permissions
    $permsToApply = @()

    if ($permsRaw -is [string]) {
        # CSV format "FullAccess;SendAs"
        $permsToApply = $permsRaw -split ";" | ForEach-Object { $_.Trim() }
    }
    elseif ($permsRaw -is [System.Array]) {
        # JSON format ["FullAccess", "SendAs"]
        $permsToApply = $permsRaw
    }
    elseif ($null -ne $permsRaw) {
        $permsToApply = @($permsRaw.ToString())
    }

    $permsStr = $permsToApply -join ";"
    $currentErrors = @()
    $isSuccess = $true

    if ([string]::IsNullOrWhiteSpace($mailbox)) {
        $report += New-ReportEntry -Mailbox "Unknown" -Permissions $permsStr -Status "Failed" -ErrorMsg "Mailbox address missing"
        continue
    }

    # Process permissions
    foreach ($perm in $permsToApply) {
        try {
            if ($perm -eq "FullAccess") {
                Write-Host "Granting FullAccess to $Trustee on $mailbox..." -NoNewline
                Add-MailboxPermission -Identity $mailbox -User $Trustee -AccessRights FullAccess -InheritanceType All -ErrorAction Stop | Out-Null
                Write-Host " Success." -ForegroundColor Green
            }
            elseif ($perm -eq "SendAs") {
                Write-Host "Granting SendAs to $Trustee on $mailbox..." -NoNewline
                Add-RecipientPermission -Identity $mailbox -Trustee $Trustee -AccessRights SendAs -Confirm:$false -ErrorAction Stop | Out-Null
                Write-Host " Success." -ForegroundColor Green
            }
            else {
                $msg = "Unknown permission type: $perm"
                Write-Host " Failed ($msg)" -ForegroundColor Red
                $currentErrors += $msg
                $isSuccess = $false
            }
        }
        catch {
            $msg = $_.Exception.Message
            Write-Host " Failed ($msg)" -ForegroundColor Red
            $currentErrors += $msg
            $isSuccess = $false
        }
    }

    $status = if ($isSuccess -and $currentErrors.Count -eq 0) { "Success" } else { "Failed" }
    $errorDetails = $currentErrors -join "; "

    $report += New-ReportEntry -Mailbox $mailbox -Permissions $permsStr -Status $status -ErrorMsg $errorDetails
}

# Output the final report table
$report | Format-Table -AutoSize
