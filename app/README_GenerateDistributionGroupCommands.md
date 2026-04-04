# Generate Distribution Group Commands

This utility generates **Exchange Online PowerShell commands** (`New-DistributionGroup`) from an Excel input file. It is designed to allow administrators to define group details in a structured Excel spreadsheet and automatically generate the corresponding creation commands for review and execution.

## Purpose

Automating the creation of Distribution Groups ensures consistency and reduces manual errors. This tool reads a list of groups from an Excel file and outputs the exact PowerShell commands needed to create them.

**Note:** This script **does not** execute the commands. It only generates them for you to review and run.

## Prerequisites

1.  **PowerShell 5.1** or **PowerShell Core (7+)**.
2.  **ImportExcel Module**: Required to read `.xlsx` files.
    *   Install via PowerShell Gallery: `Install-Module ImportExcel -Scope CurrentUser`
3.  **Excel File**: A source file containing the group details (template provided below).

## Excel File Structure

You can use the provided `DistributionGroupsTemplate.csv` as a template or create an Excel file (`.xlsx`) with the following headers:

| Column | Description | Example |
| :--- | :--- | :--- |
| **Name** | The name of the group. | `#DL_Ruckus-extendedstaff` |
| **Type** | The type of group (`Security` or `Distribution`). | `Security` |
| **Alias** | The mail alias for the group. | `#DL_Ruckus-extendedstaff` |
| **PrimarySmtpAddress** | The primary email address. | `#DL_Ruckus-extendedstaff@commscope.com` |
| **ManagedBy** | The alias or email of the group owner/manager. | `LOCCENA` |
| **CopyOwnerToMember** | `TRUE` to add the owner as a member, `FALSE` otherwise. | `TRUE` |
| **MemberDepartRestriction**| Restriction for members leaving (`Open` or `Closed`). | `Closed` |
| **MemberJoinRestriction** | Restriction for members joining (`Open` or `Closed`). | `Closed` |
| **RequireSenderAuthenticationEnabled** | `TRUE` to require sender auth (internal only), `FALSE` for external. | `TRUE` |
| **Members** | (Optional) Comma-separated list of members (email or alias) to add on creation. | `user1@domain.com, user2` |

## How to Use

1.  **Prepare your Input File**:
    *   Create an Excel file named `DistributionGroups.xlsx` (or use the provided CSV template).
    *   Fill in the columns with your group details.

2.  **Run the Script**:
    *   Open PowerShell.
    *   Navigate to the directory containing the script.
    *   Run the script pointing to your file:

    ```powershell
    .\GenerateDistributionGroupCommands.ps1 -InputFile "DistributionGroups.xlsx"
    ```

3.  **Review and Execute**:
    *   The script will output `New-DistributionGroup` commands to the console.
    *   Review the output for accuracy.
    *   Copy and paste the commands into your Exchange Online PowerShell session to create the groups.

## Example

**Input Row (Excel):**

| Name | Type | Alias | PrimarySmtpAddress | ManagedBy | CopyOwnerToMember | MemberDepartRestriction | MemberJoinRestriction | RequireSenderAuthenticationEnabled | Members |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| #DL_Ruckus-extendedstaff | Security | #DL_Ruckus-extendedstaff | #DL_Ruckus-extendedstaff@commscope.com | LOCCENA | TRUE | Closed | Closed | TRUE | user1@commscope.com, user2@commscope.com |

**Generated Command:**

```powershell
New-DistributionGroup -Name "#DL_Ruckus-extendedstaff" -Type "Security" -Alias "#DL_Ruckus-extendedstaff" -PrimarySmtpAddress "#DL_Ruckus-extendedstaff@commscope.com" -ManagedBy "LOCCENA" -CopyOwnerToMember -MemberDepartRestriction "Closed" -MemberJoinRestriction "Closed" -RequireSenderAuthenticationEnabled $True -Members "user1@commscope.com","user2@commscope.com"
```

## Notes

*   **Cloud-Only**: This tool is designed for **cloud-only** Exchange Online groups.
*   **Hybrid Environments**: If you are in a hybrid environment, groups synced from on-premises Active Directory should be managed on-prem. This tool does not check for hybrid status.
*   **Safety**: The script performs no destructive actions and makes no changes to your tenant. It is a text-generation utility only.
