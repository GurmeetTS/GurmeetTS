# Connect parameters - Replace these with your actual App Registration details
$TenantId     = "YOUR_TENANT_ID"
$ClientId     = "YOUR_CLIENT_ID"
$ClientSecret = "YOUR_CLIENT_SECRET"

# Path to the text file containing users to process (UserPrincipalName per line)
$InputFilePath = "C:\Temp\users.txt"
$OutputCsvPath = "C:\Temp\UserMailNicknames.csv"

# 1. Connect to Microsoft Graph
$tokenUri = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"

$body = @{
    client_id     = $ClientId
    scope         = "https://graph.microsoft.com/.default"
    client_secret = $ClientSecret
    grant_type    = "client_credentials"
}

try {
    Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Cyan
    $tokenResponse = Invoke-RestMethod `
      -Method Post `
      -Uri $tokenUri `
      -Body $body `
      -ContentType "application/x-www-form-urlencoded"

    $AccessToken = $tokenResponse.access_token

    $SecureAccessToken = ConvertTo-SecureString `
        $AccessToken `
        -AsPlainText -Force

    Connect-MgGraph -AccessToken $SecureAccessToken
    Write-Host "Successfully connected to Microsoft Graph." -ForegroundColor Green
}
catch {
    Write-Host "Failed to connect to Microsoft Graph. Please check your credentials." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit
}

# 2. Process the list of users from the text file
if (-not (Test-Path $InputFilePath)) {
    Write-Host "Input file not found at $InputFilePath" -ForegroundColor Red
    exit
}

$users = Get-Content $InputFilePath
$results = @()

Write-Host "Processing users from $InputFilePath..." -ForegroundColor Cyan

foreach ($upn in $users) {
    if ([string]::IsNullOrWhiteSpace($upn)) { continue }

    try {
        # Fetch user details
        $user = Get-MgUser -UserId $upn -Property DisplayName, UserPrincipalName, Mail, MailNickname, AccountEnabled -ErrorAction Stop

        $status = if ($user.AccountEnabled) { "Enabled" } else { "Disabled" }

        $results += [PSCustomObject]@{
            DisplayName       = $user.DisplayName
            UserPrincipalName = $user.UserPrincipalName
            Mail              = $user.Mail
            MailNickname      = $user.MailNickname
            Status            = $status
        }
        Write-Host "Found: $upn ($($user.MailNickname))" -ForegroundColor Green
    }
    catch {
        Write-Host "Error processing $upn : $($_.Exception.Message)" -ForegroundColor Red
        $results += [PSCustomObject]@{
            DisplayName       = ""
            UserPrincipalName = $upn
            Mail              = ""
            MailNickname      = ""
            Status            = "Error: $($_.Exception.Message)"
        }
    }
}

# 3. Export results to CSV
$results | Export-Csv -Path $OutputCsvPath -NoTypeInformation
Write-Host "Exported results to $OutputCsvPath" -ForegroundColor Cyan
