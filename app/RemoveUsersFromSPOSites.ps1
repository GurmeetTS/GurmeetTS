# Requires -Version 5.1

<#
.SYNOPSIS
    Removes users from multiple SharePoint Online sites.

.DESCRIPTION
    This script removes users specified in a CSV file from a list of SharePoint Online sites specified in another file.
    It supports Dry Run mode, exclusion logic, and logs actions to a CSV file.
    Designed for Windows PowerShell 5.1 and PnP.PowerShell 1.12.0.

.PARAMETER UsersFile
    Path to the CSV file containing users to remove. Must have a 'UserPrincipalName' column.

.PARAMETER SitesFile
    Path to the CSV or TXT file containing site URLs. Must have a 'SiteUrl' column (CSV) or one URL per line (TXT).

.PARAMETER LogFile
    Path to the output CSV log file. Defaults to current directory with timestamp.

.PARAMETER AdminUrl
    The SharePoint Admin Center URL (e.g., https://tenant-admin.sharepoint.com). Required for initial connection.

.PARAMETER DryRun
    If specified, no changes will be made. Actions will be logged as 'Would remove'.

.PARAMETER GrantSiteCollectionAdmin
    If specified, adds the current user as a Site Collection Admin to each site before processing.
#>

[CmdletBinding()]
Param(
    [Parameter(Mandatory=$true)]
    [ValidateScript({Test-Path $_ -PathType Leaf})]
    [string]$UsersFile,

    [Parameter(Mandatory=$true)]
    [ValidateScript({Test-Path $_ -PathType Leaf})]
    [string]$SitesFile,

    [Parameter(Mandatory=$false)]
    [string]$LogFile,

    [Parameter(Mandatory=$true)]
    [string]$AdminUrl,

    [Switch]$DryRun,

    [Switch]$GrantSiteCollectionAdmin,

    [Parameter(Mandatory=$false)]
    [string]$AdminUPN
)

# Set Default Log File if not provided
if (-not $LogFile) {
    $LogFile = ".\SPOUserRemovalLog_$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
}

# --- Exclusion Lists ---
$SystemAccounts = @(
    "sharepoint\system",
    "NT AUTHORITY\*"
)

# Regex for Service Accounts (starts with svc_, sp_, adm_)
$ServiceAccountRegex = "^(svc_|sp_|adm_)"

# Regex for Guest Users
$GuestUserRegex = "#ext#"

# Explicit Exclusion List (Add specific UPNs here if needed)
$ExplicitExclusions = @(
    # "admin@contoso.com"
)

# --- Helper Function for Logging ---
function Write-Log {
    param (
        [string]$SiteUrl,
        [string]$User,
        [string]$Action,
        [string]$Mode,
        [string]$Status,
        [string]$Message
    )

    $logEntry = [PSCustomObject]@{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Site      = $SiteUrl
        User      = $User
        Action    = $Action
        Mode      = $Mode
        Status    = $Status
        Message   = $Message
    }

    $logEntry | Export-Csv -Path $LogFile -Append -NoTypeInformation

    # Console Output with Color
    $consoleMsg = "[$($logEntry.Timestamp)] [$($logEntry.Status)] Site: $SiteUrl | User: $User | Action: $Action | Msg: $Message"
    if ($Status -eq "Error") {
        Write-Host $consoleMsg -ForegroundColor Red
    } elseif ($Status -eq "Skipped") {
        Write-Host $consoleMsg -ForegroundColor Yellow
    } else {
        Write-Host $consoleMsg -ForegroundColor Green
    }
}

# --- Prerequisite Checks ---
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

if ($PSVersionTable.PSVersion.Major -ne 5) {
    Write-Warning "This script is designed for Windows PowerShell 5.1. You are running version $($PSVersionTable.PSVersion)."
}

if (-not (Get-Module -ListAvailable -Name Microsoft.Online.SharePoint.PowerShell)) {
    Throw "Module 'Microsoft.Online.SharePoint.PowerShell' is required but not found."
}

if (-not (Get-Module -ListAvailable -Name PnP.PowerShell)) {
    Throw "Module 'PnP.PowerShell' is required but not found."
}

# --- Input Validation and Loading ---
Write-Host "Reading input files..." -ForegroundColor Cyan

try {
    $usersInput = Import-Csv -Path $UsersFile
    if (-not $usersInput[0].PSObject.Properties['UserPrincipalName']) {
        Throw "Users CSV must have a 'UserPrincipalName' column."
    }
} catch {
    Throw "Failed to read Users CSV: $_"
}

try {
    # Determine if SitesFile is CSV or TXT based on extension or content
    if ($SitesFile -match "\.csv$") {
        $sitesInput = Import-Csv -Path $SitesFile
        if (-not $sitesInput[0].PSObject.Properties['SiteUrl']) {
             Throw "Sites CSV must have a 'SiteUrl' column."
        }
        $siteUrls = $sitesInput.SiteUrl
    } else {
        # Assume TXT with one URL per line
        $siteUrls = Get-Content -Path $SitesFile
    }
} catch {
    Throw "Failed to read Sites file: $_"
}

# --- Connect to SPO Admin ---
Write-Host "Connecting to SharePoint Online Admin: $AdminUrl" -ForegroundColor Cyan
try {
    Connect-SPOService -Url $AdminUrl -ErrorAction Stop
} catch {
    Throw "Failed to connect to SharePoint Online Admin: $_"
}

# Validate AdminUPN if GrantSiteCollectionAdmin is used
if ($GrantSiteCollectionAdmin -and [string]::IsNullOrWhiteSpace($AdminUPN)) {
    Throw "Parameter 'AdminUPN' is required when using -GrantSiteCollectionAdmin switch."
}

# --- Main Processing Loop ---

if ($DryRun) { $Mode = "DryRun" } else { $Mode = "Live" }
Write-Host "Starting processing in $Mode mode..." -ForegroundColor Cyan

foreach ($siteUrl in $siteUrls) {
    if ([string]::IsNullOrWhiteSpace($siteUrl)) { continue }

    Write-Host "Processing Site: $siteUrl" -ForegroundColor Cyan

    try {
        # 1. Grant SCA if requested
        if ($GrantSiteCollectionAdmin) {
            try {
                Set-SPOUser -Site $siteUrl -LoginName $AdminUPN -IsSiteCollectionAdmin $true -ErrorAction Stop
                Write-Log -SiteUrl $siteUrl -User $AdminUPN -Action "Grant SCA" -Mode "Setup" -Status "Success" -Message "Granted Site Collection Admin rights"
            } catch {
                Write-Log -SiteUrl $siteUrl -User $AdminUPN -Action "Grant SCA" -Mode "Setup" -Status "Error" -Message "Failed to grant SCA: $_"
                # Continue anyway, as we might already have access
            }
        }

        # 2. Connect to Site
        # PnP PowerShell 1.12.0 -Interactive
        # Check if already connected to this URL?
        # Disconnect-PnPOnline -ErrorAction SilentlyContinue # Clear previous connection context

        try {
            Connect-PnPOnline -Url $siteUrl -Interactive -ErrorAction Stop
            Write-Log -SiteUrl $siteUrl -User "N/A" -Action "Connect" -Mode $Mode -Status "Success" -Message "Connected to site"
        } catch {
            Write-Log -SiteUrl $siteUrl -User "N/A" -Action "Connect" -Mode $Mode -Status "Error" -Message "Failed to connect: $_"
            continue # Skip to next site
        }

        # 3. Process Users
        foreach ($userRow in $usersInput) {
            $upn = $userRow.UserPrincipalName

            if ([string]::IsNullOrWhiteSpace($upn)) { continue }

            # --- Exclusion Logic ---
            $isExcluded = $false
            $exclusionReason = ""

            # Check explicit list
            if ($ExplicitExclusions -contains $upn) {
                $isExcluded = $true
                $exclusionReason = "Explicit Exclusion"
            }

            # Check System Accounts
            if (-not $isExcluded) {
                foreach ($sys in $SystemAccounts) {
                    if ($upn -like $sys) {
                        $isExcluded = $true
                        $exclusionReason = "System Account"
                        break
                    }
                }
            }

            # Check Service Accounts (Regex)
            if (-not $isExcluded -and $upn -match $ServiceAccountRegex) {
                $isExcluded = $true
                $exclusionReason = "Service Account Pattern"
            }

            # Check Guest Users (Regex)
            if (-not $isExcluded -and $upn -match $GuestUserRegex) {
                $isExcluded = $true
                $exclusionReason = "Guest User"
            }

            if ($isExcluded) {
                Write-Log -SiteUrl $siteUrl -User $upn -Action "Check Exclusion" -Mode $Mode -Status "Skipped" -Message "User excluded: $exclusionReason"
                continue
            }

            # --- User Removal Logic ---
            try {
                # Check if user exists on site
                $pnpUser = Get-PnPUser -Identity $upn -ErrorAction SilentlyContinue

                if (-not $pnpUser) {
                    Write-Log -SiteUrl $siteUrl -User $upn -Action "Check Existence" -Mode $Mode -Status "Skipped" -Message "User not found on site"
                    continue
                }

                # Found user
                if ($DryRun) {
                    Write-Log -SiteUrl $siteUrl -User $upn -Action "Remove User" -Mode $Mode -Status "Success" -Message "Would remove user (Dry Run)"
                } else {
                    # Live Removal
                    # Remove-PnPUser removes from Site User Info List, effectively removing from groups and direct permissions.
                    Remove-PnPUser -Identity $upn -Force -ErrorAction Stop
                    Write-Log -SiteUrl $siteUrl -User $upn -Action "Remove User" -Mode $Mode -Status "Success" -Message "User removed from site"
                }

            } catch {
                Write-Log -SiteUrl $siteUrl -User $upn -Action "Remove User" -Mode $Mode -Status "Error" -Message "Failed to remove user: $_"
            }
        }

    } catch {
        Write-Log -SiteUrl $siteUrl -User "N/A" -Action "Process Site" -Mode $Mode -Status "Error" -Message "Unexpected error processing site: $_"
    }
}

Write-Host "Processing complete. Logs saved to $LogFile" -ForegroundColor Cyan
