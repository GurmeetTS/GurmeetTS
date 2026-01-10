<#
.SYNOPSIS
    Retrieves recipient details based on an alternative SMTP address.

.DESCRIPTION
    This script reads a list of SMTP addresses from a CSV file, finds the corresponding
    recipient in Exchange Online, and exports the DisplayName, UserPrincipalName,
    PrimarySmtpAddress, RecipientType, and RecipientTypeDetails to a new CSV file.

.PARAMETER InputCsv
    The path to the input CSV file containing the 'SmtpAddress' column.
    Default is "InputAddresses.csv" in the script directory.

.PARAMETER OutputCsv
    The path to the output CSV file.
    Default is "RecipientDetails.csv" in the script directory.

.EXAMPLE
    .\GetRecipientDetails.ps1
#>

param (
    [string]$InputCsv = "$PSScriptRoot\InputAddresses.csv",
    [string]$OutputCsv = "$PSScriptRoot\RecipientDetails.csv"
)

# Check if the ExchangeOnlineManagement module is available
if (-not (Get-Module -ListAvailable -Name ExchangeOnlineManagement)) {
    Write-Warning "ExchangeOnlineManagement module is not installed. Please install it using 'Install-Module ExchangeOnlineManagement'."
    # We don't exit here to allow running in environments where it might be loaded differently,
    # but the subsequent command will fail if not present.
}

# Connect to Exchange Online if not already connected
# This simple check looks for a command from the module.
if (-not (Get-Command Get-Recipient -ErrorAction SilentlyContinue)) {
    Write-Host "Connecting to Exchange Online..."
    try {
        Connect-ExchangeOnline -ErrorAction Stop
    }
    catch {
        Write-Error "Failed to connect to Exchange Online. Please ensure the module is installed and you have permissions."
        exit
    }
}

# Check if input file exists
if (-not (Test-Path $InputCsv)) {
    Write-Error "Input CSV file not found: $InputCsv"
    exit
}

$smtpAddresses = Import-Csv $InputCsv
$results = @()

foreach ($row in $smtpAddresses) {
    $smtp = $row.SmtpAddress
    if ([string]::IsNullOrWhiteSpace($smtp)) {
        continue
    }

    Write-Host "Processing: $smtp"

    try {
        # Search for the recipient by email address using a filter
        $recipient = Get-Recipient -Filter "EmailAddresses -eq '$smtp'" -ErrorAction Stop

        if ($recipient) {
            foreach ($recip in $recipient) {
                $upn = $recip.UserPrincipalName

                # If UPN is missing, try to fetch it via Get-User
                if ([string]::IsNullOrWhiteSpace($upn)) {
                    try {
                        $user = Get-User -Identity $recip.Id -ErrorAction SilentlyContinue
                        if ($user) {
                            $upn = $user.UserPrincipalName
                        }
                    } catch {
                        # Ignore errors if Get-User fails, just leave UPN empty
                    }
                }

                 $results += [PSCustomObject]@{
                    InputSmtpAddress     = $smtp
                    DisplayName          = $recip.DisplayName
                    UserPrincipalName    = $upn
                    PrimarySmtpAddress   = $recip.PrimarySmtpAddress
                    RecipientType        = $recip.RecipientType
                    RecipientTypeDetails = $recip.RecipientTypeDetails
                }
            }
        } else {
            Write-Warning "No recipient found for: $smtp"
             $results += [PSCustomObject]@{
                InputSmtpAddress     = $smtp
                DisplayName          = "NOT FOUND"
                UserPrincipalName    = $null
                PrimarySmtpAddress   = $null
                RecipientType        = $null
                RecipientTypeDetails = $null
            }
        }
    } catch {
        Write-Error "Error processing $smtp : $_"
         $results += [PSCustomObject]@{
                InputSmtpAddress     = $smtp
                DisplayName          = "ERROR"
                UserPrincipalName    = $_.Exception.Message
                PrimarySmtpAddress   = $null
                RecipientType        = $null
                RecipientTypeDetails = $null
            }
    }
}

# Export results
$results | Export-Csv -Path $OutputCsv -NoTypeInformation
Write-Host "Results exported to $OutputCsv"
