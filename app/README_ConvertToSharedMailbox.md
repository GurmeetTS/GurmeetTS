# Convert To Shared Mailbox Utility

This script converts a list of Exchange Online mailboxes to Shared Mailboxes. It processes a plain text input file, attempts the conversion for each mailbox, and outputs the results to a CSV file and a detailed log file.

## Prerequisites

- **PowerShell 5.1 or later**, or **PowerShell Core (pwsh)**.
- **Exchange Online PowerShell Module**: You must have the `ExchangeOnlineManagement` module installed and connected.
  - Install: `Install-Module -Name ExchangeOnlineManagement`
  - Connect: `Connect-ExchangeOnline`

## Usage

1. **Prepare the Input File**:
   Create a plain text file (default: `mailboxes.txt`) listing one mailbox email address per line.

   Example `mailboxes.txt`:
   ```text
   jane.doe@contoso.com
   john.smith@contoso.com
   info@contoso.com
   ```

2. **Run the Script**:
   Execute the script in PowerShell. You can specify custom paths for input, output, and logs.

   ```powershell
   # Run with defaults (looks for mailboxes.txt in current dir)
   .\ConvertToSharedMailbox.ps1

   # Run with custom file paths
   .\ConvertToSharedMailbox.ps1 -InputFile "C:\Path\To\users.txt" -OutputCsv "C:\Path\To\results.csv" -LogFile "C:\Path\To\run.log"
   ```

## Parameters

- `-InputFile`: Path to the input text file. Default: `.\mailboxes.txt`
- `-OutputCsv`: Path to the output CSV file. Default: `.\ConversionResults.csv`
- `-LogFile`: Path to the log file. Default: `.\ConversionLog.txt`

## Outputs

### 1. CSV Results File (`ConversionResults.csv`)
Contains a structured summary of the operation.
- **Mailbox**: The email address processed.
- **Status**: `Success` or `Failed`.
- **Details**: Success message or specific error message.

### 2. Log File (`ConversionLog.txt`)
Contains a sequential log of operations, including timestamps, processing steps, and full error details.

## Troubleshooting

- **"The 'Set-Mailbox' command is not available"**:
  - Ensure you have run `Connect-ExchangeOnline` before running this script.
- **"Input file not found"**:
  - Check that the file path provided to `-InputFile` is correct.
- **"Access Denied" / Permissions errors**:
  - Ensure the account you used to connect to Exchange Online has sufficient permissions (e.g., Organization Management or Recipient Management roles) to modify mailboxes.
