# Connect parameters - Replace these with your actual App Registration details
$TenantId     = "YOUR_TENANT_ID"
$ClientId     = "YOUR_CLIENT_ID"
$ClientSecret = "YOUR_CLIENT_SECRET"

# Path to the CSV file containing users to process
$CsvFilePath = "C:\Temp\CalendarUsers.csv"

# 1. Connect to Microsoft Graph
$tokenUri = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"

$body = @{
    client_id     = $ClientId
    scope         = "https://graph.microsoft.com/.default"
    client_secret = $ClientSecret
    grant_type    = "client_credentials"
}

try {
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

# 2. Import the list of users from your CSV
if (-not (Test-Path $CsvFilePath)) {
    Write-Host "CSV file not found at $CsvFilePath" -ForegroundColor Red
    exit
}

$users = Import-Csv $CsvFilePath

foreach ($row in $users) {
    $userEmail = $row.UserPrincipalName
    if ([string]::IsNullOrWhiteSpace($userEmail)) {
        Write-Host "Skipping row with empty UserPrincipalName" -ForegroundColor DarkGray
        continue
    }

    Write-Host "--- Cleaning Data for: $userEmail ---" -ForegroundColor Cyan

    try {
        # --- PART A: CALENDAR EVENTS ---
        $events = Get-MgUserEvent -UserId $userEmail -All -Property "Id,Subject,Type"
        if ($null -ne $events) {
            foreach ($event in $events) {
                Remove-MgUserEvent -UserId $userEmail -EventId $event.Id
                Write-Host "Deleted Event: $($event.Subject)" -ForegroundColor Yellow
            }
        }

        # --- PART B: TASKS & LISTS ---
        $taskLists = Get-MgUserTodoList -UserId $userEmail -All

        if ($null -ne $taskLists) {
            foreach ($list in $taskLists) {
                # 1. Get and delete all tasks within this specific list first
                $ToDoTasks = Get-MgUserTodoTask -UserId $userEmail -TodoTaskListId $list.Id -All
                foreach ($task in $ToDoTasks) {
                    Remove-MgUserTodoListTask -UserId $userEmail -TodoTaskListId $list.Id -TodoTaskId $task.Id
                    Write-Host "Deleted Task: $($task.Title)" -ForegroundColor DarkYellow
                }

                # 2. Define protected system lists that cannot be deleted
                $protectedNames = @("defaultList", "flaggedEmails", "unknownFutureValue")
                $protectedDisplayNames = @("Tasks", "Flagged Emails")

                # 3. Only delete the list if it is NOT a system folder
                if ($protectedNames -contains $list.WellKnownName -or $protectedDisplayNames -contains $list.DisplayName) {
                    Write-Host "Cleared items but kept system folder: $($list.DisplayName)" -ForegroundColor Gray
                } else {
                    Remove-MgUserTodoList -UserId $userEmail -TodoTaskListId $list.Id
                    Write-Host "Deleted Custom Task List: $($list.DisplayName)" -ForegroundColor Magenta
                }
            }
        }

        # Need to add this block in above code to remove Tasks that are assigned and created in meting
        Write-Host "Checking for Assigned Planner Tasks..." -ForegroundColor Cyan
        # We must expand the task details to get the ETag
        $plannerTasks = Get-MgUserPlannerTask -UserId $userEmail -All

        if ($null -ne $plannerTasks) {
            foreach ($pTask in $plannerTasks) {
                try {
                    # 1. Re-fetch the task specifically to get the ETag property
                    # (The list view sometimes omits the specific ETag needed for deletion)
                    $taskDetail = Get-MgPlannerTask -PlannerTaskId $pTask.Id -Property "*"

                    # 2. Use the specific ETag found in AdditionalProperties
                    $etag = $taskDetail.AdditionalProperties["@odata.etag"]

                    # 3. Delete using the precise ETag
                    Remove-MgPlannerTask -PlannerTaskId $pTask.Id -IfMatch $etag
                    Write-Host "Deleted Assigned Planner/Meeting Task: $($pTask.Title)" -ForegroundColor DarkRed
                }
                catch {
                    Write-Host "Could not delete Planner Task $($pTask.Title): $($_.Exception.Message)" -ForegroundColor Gray
                }
            }
        }

        Write-Host "Cleanup complete for $userEmail." -ForegroundColor Green
    }
    catch {
        Write-Host "Error processing $($userEmail): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# --- PART C: BOOKINGS (Optional) ---
# This section attempts to delete all appointments from all Booking Businesses.
# Ensure the App Registration has Bookings.ReadWrite.All permission.

try {
    # 1. Get all booking businesses
    Write-Host "Retrieving all booking businesses..." -ForegroundColor Yellow
    $allBookingBusinesses = Get-MgBookingBusiness -All

    if ($null -eq $allBookingBusinesses -or $allBookingBusinesses.Count -eq 0) {
        Write-Host "No booking businesses found." -ForegroundColor Gray
    } else {
        Write-Host "Found $($allBookingBusinesses.Count) booking business(es)" -ForegroundColor Green

        # 2. Process each booking business
        foreach ($business in $allBookingBusinesses) {
            Write-Host "`nProcessing business: $($business.DisplayName) (ID: $($business.Id))" -ForegroundColor Cyan

            try {
                # Get all appointments for this business
                $appointments = Get-MgBookingBusinessAppointment -BookingBusinessId $business.Id -All

                if ($null -eq $appointments -or $appointments.Count -eq 0) {
                    Write-Host "  No appointments found for this business." -ForegroundColor Gray
                    continue
                }

                Write-Host "  Found $($appointments.Count) appointment(s)" -ForegroundColor Yellow

                # 3. Delete all appointments for this business
                $deletedCount = 0
                foreach ($app in $appointments) {
                    try {
                        Remove-MgBookingBusinessAppointment -BookingBusinessId $business.Id -BookingAppointmentId $app.Id
                        $deletedCount++
                        Write-Host "    Deleted: $($app.CustomerName) - $($app.ServiceTitle) - $($app.StartDateTime)" -ForegroundColor Magenta

                        # Optional: Add a small delay to avoid throttling
                        Start-Sleep -Milliseconds 100
                    }
                    catch {
                        Write-Host "    Failed to delete appointment $($app.Id): $($_.Exception.Message)" -ForegroundColor Red
                    }
                }

                Write-Host "  Successfully deleted $deletedCount appointment(s)" -ForegroundColor Green

            }
            catch {
                Write-Host "  Error processing appointments for business $($business.Id): $($_.Exception.Message)" -ForegroundColor Red
            }
        }

        Write-Host "`nBooking Processing complete!" -ForegroundColor Green
    }
}
catch {
    Write-Host "Error in Bookings section: $($_.Exception.Message)" -ForegroundColor Red
}
