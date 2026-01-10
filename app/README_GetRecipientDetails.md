# Get Recipient Details Script

This PowerShell script (`GetRecipientDetails.ps1`) allows you to look up Exchange Online recipient details using any of their SMTP addresses (primary or alternative). It is useful when you have a list of email addresses and need to find the corresponding UserPrincipalName, DisplayName, or Recipient Type.

## Prerequisites

*   **PowerShell 5.1** or later.
*   **Exchange Online PowerShell Module** (`ExchangeOnlineManagement`).
    *   To install: `Install-Module -Name ExchangeOnlineManagement`
*   **Permissions**: You must be able to connect to Exchange Online and have permission to run `Get-Recipient`.

## Input

The script expects a CSV file containing a single column with the header `SmtpAddress`.

**Default Input File:** `InputAddresses.csv` (located in the same directory as the script).

**Example CSV Content:**
```csv
SmtpAddress
alias@domain.com
user.name@domain.com
info@domain.com
```

## Usage

1.  Prepare your input CSV file (e.g., `InputAddresses.csv`).
2.  Open PowerShell and navigate to the script directory.
3.  Run the script:

    ```powershell
    .\GetRecipientDetails.ps1
    ```

    The script will:
    *   Check for the `ExchangeOnlineManagement` module.
    *   Connect to Exchange Online (if not already connected).
    *   Read the input CSV.
    *   Query Exchange Online for each address.
    *   Export the results to `RecipientDetails.csv`.

### Custom File Paths

You can specify custom input and output file paths using parameters:

```powershell
.\GetRecipientDetails.ps1 -InputCsv "C:\Path\To\MyList.csv" -OutputCsv "C:\Path\To\Results.csv"
```

## Output

The script generates a CSV file (default: `RecipientDetails.csv`) with the following columns:

*   **InputSmtpAddress**: The address read from the input file.
*   **DisplayName**: The display name of the found recipient.
*   **UserPrincipalName**: The UPN (often the login ID) of the recipient.
*   **PrimarySmtpAddress**: The primary email address.
*   **RecipientType**: The type of recipient (e.g., UserMailbox, MailUser).
*   **RecipientTypeDetails**: More specific details (e.g., SharedMailbox, RoomMailbox).

If a recipient is not found, the `DisplayName` will be "NOT FOUND".
If an error occurs, the `DisplayName` will be "ERROR" and the `UserPrincipalName` column will contain the error message.
