<#
.SYNOPSIS
    Retrieves SharePoint Online / OneDrive for Business site information for a specified list of users.

.DESCRIPTION
    This script takes a list of User UPNs (or email addresses), attempts to locate their OneDrive for Business site,
    and reports details including Site URL, Owner, LockState, and Storage Usage.

    If the initial UPN lookup fails, it attempts to resolve the user using Exchange Online (if available)
    or SharePoint User Profiles to handle cases where the input is a PrimarySmtpAddress but not the UPN.

.PARAMETER AdminSiteUrl
    The SharePoint Online Admin Site URL (e.g., https://contoso-admin.sharepoint.com).

.PARAMETER UserListFile
    Path to the text file containing the list of users (one per line). Default is 'Users.txt'.

.PARAMETER OutputCsv
    Path for the output CSV report. Default is 'OneDriveReport.csv'.

.PARAMETER LogPath
    Directory to store 'Success.log' and 'Failed.log'. Default is 'Logs'.

.EXAMPLE
    .\Get-OneDriveSiteInfo.ps1 -AdminSiteUrl "https://contoso-admin.sharepoint.com" -UserListFile "Users.txt"

.NOTES
    Requires the SharePoint Online Management Shell.
    For best results in resolving email aliases, the Exchange Online Management module is recommended but not strictly required.
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$AdminSiteUrl,

    [Parameter(Mandatory = $false)]
    [string]$UserListFile = "Users.txt",

    [Parameter(Mandatory = $false)]
    [string]$OutputCsv = "OneDriveReport.csv",

    [Parameter(Mandatory = $false)]
    [string]$LogPath = "Logs"
)

# --- Configuration & Setup ---
$ErrorActionPreference = "Stop"

if (-not (Test-Path $UserListFile)) {
    Write-Error "Input file '$UserListFile' not found."
    exit 1
}

if (-not (Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
}

$SuccessLog = Join-Path $LogPath "Success.log"
$FailedLog = Join-Path $LogPath "Failed.log"
# Clear previous logs
if (Test-Path $SuccessLog) { Remove-Item $SuccessLog }
if (Test-Path $FailedLog) { Remove-Item $FailedLog }

function Write-Log {
    param ($Message, $Type = "Info")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Type] $Message"
    Write-Host $line
    if ($Type -eq "Success") { Add-Content -Path $SuccessLog -Value $line }
    elseif ($Type -eq "Error" -or $Type -eq "Failed") { Add-Content -Path $FailedLog -Value $line }
}

# Check for SPO Module
if (-not (Get-Module -Name "Microsoft.Online.SharePoint.PowerShell" -ListAvailable)) {
    Write-Error "SharePoint Online Management Shell module is required. Please install it."
    exit 1
}

# --- Extract Tenant Info ---
# Admin Url: https://tenant-admin.sharepoint.com
# MySite Host: https://tenant-my.sharepoint.com
try {
    $uri = [System.Uri]$AdminSiteUrl
    $hostParts = $uri.Host.Split('.')
    if ($hostParts[0].EndsWith("-admin")) {
        $tenantName = $hostParts[0].Substring(0, $hostParts[0].Length - 6)
    } else {
        $tenantName = $hostParts[0] # Fallback
    }
    $mySiteHost = "https://$tenantName-my.sharepoint.com"
} catch {
    Write-Error "Invalid Admin URL format. Expected format: https://<tenant>-admin.sharepoint.com"
    exit 1
}

# --- Connection ---
# We assume the user is either already connected or we prompt.
# Checking if Get-SPOSite works is tricky without running it.
# We'll try to Connect if no session seems active, but 'Connect-SPOService' usually handles this.
try {
    # Test connection by getting tenant info or similar lightweight command if possible.
    # But strictly, we should just run Connect-SPOService.
    # To avoid double prompt, we can try to run a command.
    # However, Connect-SPOService is the standard way.
    Write-Log "Connecting to SharePoint Online Service at $AdminSiteUrl..."
    Connect-SPOService -Url $AdminSiteUrl -ErrorAction Stop
    Write-Log "Connected successfully."
} catch {
    Write-Log "Failed to connect to SharePoint Online: $_" "Error"
    exit 1
}

# --- Helper: Resolve UPN ---
function Resolve-UserUPN {
    param ($InputUser)

    # 1. Try Exchange Online if available (Best for PrimarySmtpAddress check)
    if (Get-Command Get-Mailbox -ErrorAction SilentlyContinue) {
        try {
            $mbx = Get-Mailbox -Identity $InputUser -ErrorAction Stop
            return $mbx.UserPrincipalName
        } catch {
            # Try Get-User
            try {
                $u = Get-User -Identity $InputUser -ErrorAction Stop
                return $u.UserPrincipalName
            } catch {
                # Ignore
            }
        }
    }

    # 2. Try SPO User (Check against Root Site)
    # Root Site URL: https://<tenant>.sharepoint.com
    $rootSite = "https://$tenantName.sharepoint.com"
    try {
        # This only works if the user exists in the UserInfoList of the root site
        $spoUser = Get-SPOUser -Site $rootSite -LoginName $InputUser -ErrorAction Stop
        # LoginName usually is the UPN (starting with i:0#.f|membership|)
        if ($spoUser.LoginName -match "membership\|(.*)") {
            return $matches[1]
        }
        return $spoUser.LoginName
    } catch {
        # Ignore
    }

    return $null
}

# --- Main Loop ---
$users = Get-Content $UserListFile
$results = @()

foreach ($u in $users) {
    if ([string]::IsNullOrWhiteSpace($u)) { continue }
    $u = $u.Trim()

    Write-Host "Processing user: $u" -ForegroundColor Cyan

    $targetUpn = $u
    $siteFound = $false
    $siteInfo = $null

    # Loop to allow retry with resolved UPN
    $attempts = 0
    $resolved = $false

    while (-not $siteFound -and $attempts -lt 2) {
        $attempts++

        # Construct Personal Site URL
        # Format: https://tenant-my.sharepoint.com/personal/user_domain_com
        $formattedUpn = $targetUpn.Replace(".", "_").Replace("@", "_")
        $siteUrl = "$mySiteHost/personal/$formattedUpn"

        try {
            $site = Get-SPOSite -Identity $siteUrl -Detailed -ErrorAction Stop

            $siteInfo = [PSCustomObject]@{
                "User UPN"            = $targetUpn # Use the one that worked
                "Site URL"            = $site.Url
                "Site Owner"          = $site.Owner
                "LockState"           = $site.LockState
                "StorageUsageCurrent" = $site.StorageUsageCurrent # In MB
            }
            $siteFound = $true
            $results += $siteInfo
            Write-Log "Found site for $targetUpn: $($site.Url)" "Success"

        } catch {
            # If 404 or similar
            if ($attempts -eq 1) {
                Write-Host "  Site not found for UPN: $targetUpn. Attempting resolution..." -ForegroundColor Yellow
                # Try to resolve UPN if input might be alias
                $resolvedUpn = Resolve-UserUPN -InputUser $u
                if ($resolvedUpn -and $resolvedUpn -ne $targetUpn) {
                    Write-Host "  Resolved '$u' to '$resolvedUpn'. Retrying..." -ForegroundColor Green
                    $targetUpn = $resolvedUpn
                    $resolved = $true
                    # Continue loop to try with new UPN
                } else {
                    # Cannot resolve or same result
                    break
                }
            }
        }
    }

    if (-not $siteFound) {
        Write-Log "Failed to find OneDrive site for input: $u" "Failed"
    }
}

# --- Export ---
if ($results.Count -gt 0) {
    $results | Export-Csv -Path $OutputCsv -NoTypeInformation
    Write-Log "Report exported to $OutputCsv"
} else {
    Write-Log "No sites found. CSV not created." "Info"
}
