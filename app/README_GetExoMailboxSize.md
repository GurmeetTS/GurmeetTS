# GetExoMailboxSize

This utility retrieves mailbox size statistics for a list of users in Microsoft 365 (Exchange Online).

## Description

The script reads a text file containing UserPrincipalNames (one per line) and queries Exchange Online for mailbox statistics using `Get-EXOMailboxStatistics`. It outputs a CSV file containing:
*   UserPrincipalName
*   DisplayName
*   ItemCount
*   TotalItemSize
*   LastLogonTime

## Prerequisites

1.  **PowerShell 5.1+** or **PowerShell 7+**.
2.  **ExchangeOnlineManagement** PowerShell module.
    ```powershell
    Install-Module -Name ExchangeOnlineManagement
    ```
3.  Active connection to Exchange Online.
    ```powershell
    Connect-ExchangeOnline
    ```

## Usage

1.  Prepare a text file (default `users.txt`) with the list of users you want to report on.
2.  Run the script.

### Default Usage
```powershell
.\GetExoMailboxSize.ps1
```
Reads from `users.txt` in the current directory and outputs to `MailboxReport.csv`.

### Custom Files
```powershell
.\GetExoMailboxSize.ps1 -InputFile "C:\Path\To\MyUsers.txt" -OutputFile "C:\Reports\FebruarySize.csv"
```

## Input File Format (`users.txt`)

The input file should be a plain text file with one email address (UserPrincipalName) per line.

```text
user1@domain.com
user2@domain.com
admin@domain.com
```
