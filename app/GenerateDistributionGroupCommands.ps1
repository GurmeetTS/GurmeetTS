<#
.SYNOPSIS
    Generates New-DistributionGroup commands from an Excel or CSV input file.

.DESCRIPTION
    This script reads an Excel file (or CSV) containing Distribution Group details and outputs
    PowerShell commands to create those groups. It does not execute the commands.

    It is designed to help Exchange Administrators generate bulk creation scripts for review.

.PARAMETER InputFile
    Path to the Excel (.xlsx) or CSV (.csv) file.
    Defaults to 'DistributionGroupsTemplate.xlsx' if not specified, but checks for CSV as well.

.EXAMPLE
    .\GenerateDistributionGroupCommands.ps1 -InputFile "NewGroups.xlsx"

.EXAMPLE
    .\GenerateDistributionGroupCommands.ps1 -InputFile "app/DistributionGroupsTemplate.csv"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$InputFile = "DistributionGroupsTemplate.xlsx"
)

# 1. Validate Input File
if (-not (Test-Path $InputFile)) {
    # Fallback check for CSV if default was not found and user didn't specify
    if ($InputFile -eq "DistributionGroupsTemplate.xlsx" -and (Test-Path "DistributionGroupsTemplate.csv")) {
        $InputFile = "DistributionGroupsTemplate.csv"
        Write-Verbose "Default .xlsx not found, using .csv instead."
    } elseif ($InputFile -eq "DistributionGroupsTemplate.xlsx" -and (Test-Path "app/DistributionGroupsTemplate.csv")) {
        # Check in app/ folder just in case we are running from root
        $InputFile = "app/DistributionGroupsTemplate.csv"
        Write-Verbose "Default .xlsx not found, using app/DistributionGroupsTemplate.csv instead."
    } else {
        Write-Error "Input file '$InputFile' not found."
        exit 1
    }
}

$fullPath = Resolve-Path $InputFile
Write-Verbose "Reading from: $fullPath"

# 2. Import Data
$extension = [System.IO.Path]::GetExtension($InputFile)
$rows = $null

if ($extension -eq ".xlsx") {
    # Check for ImportExcel module
    if (-not (Get-Module -ListAvailable -Name ImportExcel)) {
        Write-Error "The 'ImportExcel' module is required for .xlsx files. Please install it (Install-Module ImportExcel) or use a .csv file."
        exit 1
    }
    try {
        $rows = Import-Excel -Path $InputFile
    } catch {
        Write-Error "Failed to import Excel file. Error: $_"
        exit 1
    }
} elseif ($extension -eq ".csv") {
    try {
        $rows = Import-Csv -Path $InputFile
    } catch {
        Write-Error "Failed to import CSV file. Error: $_"
        exit 1
    }
} else {
    Write-Error "Unsupported file format '$extension'. Please use .xlsx or .csv."
    exit 1
}

# 3. Process Rows and Generate Commands
foreach ($row in $rows) {
    # Skip empty rows if any
    if ([string]::IsNullOrWhiteSpace($row.Name)) { continue }

    # Initialize command parts list
    $parts = @()
    $parts += "New-DistributionGroup"

    # Add String parameters
    # Using double quotes to handle potential spaces, though user input should be clean.
    $parts += "-Name `"$($row.Name)`""
    $parts += "-Type `"$($row.Type)`""
    $parts += "-Alias `"$($row.Alias)`""
    $parts += "-PrimarySmtpAddress `"$($row.PrimarySmtpAddress)`""
    $parts += "-ManagedBy `"$($row.ManagedBy)`""

    # Add Switch parameter: CopyOwnerToMember
    # Logic: If TRUE (or similar truthy value), add the switch. Else omit.
    $copyOwnerRaw = $row.CopyOwnerToMember -as [string]
    if ($copyOwnerRaw -match '^(True|Yes|1)$') {
        $parts += "-CopyOwnerToMember"
    }

    # Add String parameters (Restrictions)
    $parts += "-MemberDepartRestriction `"$($row.MemberDepartRestriction)`""
    $parts += "-MemberJoinRestriction `"$($row.MemberJoinRestriction)`""

    # Add Boolean parameter: RequireSenderAuthenticationEnabled
    # Logic: Explicitly set $True or $False
    $authRaw = $row.RequireSenderAuthenticationEnabled -as [string]
    if ($authRaw -match '^(True|Yes|1)$') {
        $parts += "-RequireSenderAuthenticationEnabled `$True"
    } else {
        $parts += "-RequireSenderAuthenticationEnabled `$False"
    }

    # 4. Output the final command string
    Write-Host ($parts -join " ")
}
