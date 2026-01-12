# Connect parameters - Replace these with your actual App Registration details
# Leave them as is to use interactive login
$TenantId     = "YOUR_TENANT_ID"
$ClientId     = "YOUR_CLIENT_ID"
$ClientSecret = "YOUR_CLIENT_SECRET"

$CsvOutputPath = "C:\Temp\LicensedUsers.csv"

# Function to connect to Graph
function Connect-Graph {
    # Check if variables are updated from placeholders
    if ($TenantId -ne "YOUR_TENANT_ID" -and $ClientId -ne "YOUR_CLIENT_ID" -and $ClientSecret -ne "YOUR_CLIENT_SECRET") {
        Write-Host "Connecting using App Registration..." -ForegroundColor Cyan
        $tokenUri = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"
        $body = @{
            client_id     = $ClientId
            scope         = "https://graph.microsoft.com/.default"
            client_secret = $ClientSecret
            grant_type    = "client_credentials"
        }
        try {
            $tokenResponse = Invoke-RestMethod -Method Post -Uri $tokenUri -Body $body -ContentType "application/x-www-form-urlencoded"
            $secureToken = ConvertTo-SecureString $tokenResponse.access_token -AsPlainText -Force
            Connect-MgGraph -AccessToken $secureToken
            Write-Host "Connected successfully." -ForegroundColor Green
            return
        } catch {
            Write-Host "Failed to connect with App Registration. Error: $($_.Exception.Message)" -ForegroundColor Red
            # Fallback to interactive not desirable if automation intended, but useful here.
        }
    }

    # Check if already connected
    try {
        if (Get-MgContext) {
            Write-Host "Already connected to Microsoft Graph." -ForegroundColor Green
            return
        }
    } catch {
        # Not connected or command failed
    }

    Write-Host "Attempting interactive login..." -ForegroundColor Cyan
    Connect-MgGraph -Scopes "User.Read.All"
}

# Ensure directory exists
$outputDir = Split-Path $CsvOutputPath -Parent
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

Connect-Graph

Write-Host "Retrieving licensed users... This may take a moment." -ForegroundColor Cyan

# Fetch users with assigned licenses
# We request specific properties to optimize performance
# The filter "assignedLicenses/any(x:x/skuId ne null)" finds any user with at least one license
$users = Get-MgUser -All -Filter "assignedLicenses/any(x:x/skuId ne null)" -Property UserPrincipalName, Mail, ProxyAddresses, DisplayName

Write-Host "Found $($users.Count) licensed users. Exporting..." -ForegroundColor Cyan

$users | Select-Object UserPrincipalName, @{
    Name = 'PrimarySmtpAddress'
    Expression = {
        # Try to find the proxy address starting with 'SMTP:' (case sensitive)
        # In Exchange/AD, the primary SMTP address is prefixed with uppercase "SMTP:"
        $primary = $_.ProxyAddresses | Where-Object { $_ -clike "SMTP:*" }

        if ($primary) {
            # Remove the "SMTP:" prefix
            return $primary.Substring(5)
        }

        # Fallback to Mail property if explicit SMTP proxy not found
        # (Mail property is usually the primary SMTP address)
        return $_.Mail
    }
} | Export-Csv -Path $CsvOutputPath -NoTypeInformation

Write-Host "Export complete. File saved to $CsvOutputPath" -ForegroundColor Green
