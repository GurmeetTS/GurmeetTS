<#
.SYNOPSIS
    Exports mailbox information from Exchange Online to a Markdown table format.

.DESCRIPTION
    Retrieves DisplayName, UserPrincipalName, PrimarySmtpAddress, RecipientTypeDetails, and Alias
    for all mailboxes using the high-performance Get-EXOMailbox cmdlet.
    Outputs a Markdown table to the console.

.NOTES
    - Requires ExchangeOnlineManagement module.
    - Designed for speed: uses Get-EXOMailbox and streams output.
    - Excludes mailboxes if errors occur during retrieval (handled by Get-EXOMailbox error stream usually,
      but strict error handling is applied).
#>

process {
    # Checklist of steps taken:
    # 1. verify_dependencies: Check for ExchangeOnlineManagement module.
    # 2. connect_check: Ensure session is active.
    # 3. retrieve_data: Use Get-EXOMailbox with -ResultSize Unlimited for speed.
    # 4. select_fields: Extract required and relevant properties.
    # 5. format_output: Generate Markdown table row by row.

    # Check if we are connected
    if (-not (Get-Command Get-EXOMailbox -ErrorAction SilentlyContinue)) {
        Write-Error "The 'Get-EXOMailbox' command was not found. Please install the ExchangeOnlineManagement module and connect using Connect-ExchangeOnline."
        return
    }

    # Header
    $headers = @("DisplayName", "UserPrincipalName", "PrimarySmtpAddress", "RecipientTypeDetails", "Alias")
    $headerRow = "| " + ($headers -join " | ") + " |"
    $separatorRow = "| " + (($headers | ForEach-Object { "-" * $_.Length }) -join " | ") + " |"

    Write-Output $headerRow
    Write-Output $separatorRow

    # Retrieve and Process
    try {
        # Using Get-EXOMailbox for speed (V2 REST API)
        # Selecting specific properties reduces payload size
        Get-EXOMailbox -ResultSize Unlimited -Properties DisplayName, UserPrincipalName, PrimarySmtpAddress, RecipientTypeDetails, Alias -ErrorAction Stop | ForEach-Object {
            $mbx = $_

            try {
                # Validate required fields exist (UserPrincipalName is usually the ID, so it should exist)
                # If a critical error occurs processing a row, we skip it (catch block)

                # Extract values, handling nulls by strictly returning empty string
                $rowValues = @(
                    if ($mbx.DisplayName) { $mbx.DisplayName } else { "" },
                    if ($mbx.UserPrincipalName) { $mbx.UserPrincipalName } else { "" },
                    if ($mbx.PrimarySmtpAddress) { $mbx.PrimarySmtpAddress } else { "" },
                    if ($mbx.RecipientTypeDetails) { $mbx.RecipientTypeDetails } else { "" },
                    if ($mbx.Alias) { $mbx.Alias } else { "" }
                )

                # Format as Markdown row
                $rowMarkdown = "| " + ($rowValues -join " | ") + " |"
                Write-Output $rowMarkdown

            } catch {
                # Exclude mailbox if error occurs during processing
                Write-Warning "Skipping mailbox due to error: $($_.Exception.Message)"
            }
        }
    } catch {
        Write-Error "An error occurred during export: $($_.Exception.Message)"
    }
}
