# Google Sheets + Apps Script Setup

This is the next step after the frontend UI.

## 1. Create the Google Sheet

Create a new Google Sheet. Keep it private.

Copy the Spreadsheet ID from the URL:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

## 2. Add Apps Script

Open:

**Extensions → Apps Script**

Create/keep these two files:

- `Code.gs`
- `Config.gs`

Copy the matching files from `google-apps-script/` in this project.

## 3. Configure the Spreadsheet ID

In `Config.gs`, replace:

```javascript
SPREADSHEET_ID: "YOUR_GOOGLE_SHEET_ID"
```

with your real Spreadsheet ID.

Do not put this ID in the frontend.

## 4. Run setupSheets()

In Apps Script:

1. Save the project.
2. Select `setupSheets` from the function selector.
3. Click **Run**.
4. Approve the Google permissions.
5. Return to the Sheet.

The script creates:

```text
Registrations
FamilyMembers
RegistrationSevas
SevaTypes
Settings
Summary
```

## 5. Verify the sheets

### Registrations

One row per devotee registration.

```text
Registration ID
Submission ID
Created At
Name
Gothram
Date of Birth
Address
Phone Number
Contribution Amount
Contribution Frequency
Consent
Status
```

### FamilyMembers

One row per family member.

```text
Family Member ID
Registration ID
Name
Relation
Age
Created At
```

### RegistrationSevas

One row per selected seva.

```text
Registration Seva ID
Registration ID
Seva ID
Seva Name
Created At
```

### SevaTypes

Controls the available sevas.

```text
Seva ID
Seva Name
Description
Active
Display Order
```

Use `TRUE` in the Active column to make a seva available.

### Summary

Contains formulas for registration, frequency, contribution, family-member, and seva-selection totals.

## 6. Deploy the API

In Apps Script:

**Deploy → New deployment → Web app**

Use:

```text
Execute as: Me
Who has access: Anyone
```

Deploy and copy the Web App URL ending in `/exec`.

## 7. Connect the frontend

Open:

```text
js/config.js
```

Set:

```javascript
API_URL: "YOUR_WEB_APP_URL"
```

Example:

```javascript
API_URL: "https://script.google.com/macros/s/XXXXXXXX/exec"
```

Do not put Google credentials in the frontend.

## 8. First test

Before publishing the website:

1. Open the frontend.
2. Enter a test devotee.
3. Add two family members.
4. Select two or more Sevas.
5. Enter a contribution amount.
6. Select a frequency.
7. Submit.

Verify:

- One row was added to `Registrations`.
- Two rows were added to `FamilyMembers`.
- One row was created per selected Seva in `RegistrationSevas`.
- The same Registration ID links all related rows.
- A Registration ID appears on the success screen.

## 9. Duplicate-submission test

Do not repeatedly submit real data while testing.

The frontend generates a `submissionId` for each submission. If the same submission is received twice, Apps Script returns the existing registration rather than creating a second registration.

## 10. Important production rule

Keep the Google Sheet private.

The public website only needs access to the Apps Script Web App endpoint.

Never expose:

- Google credentials
- Private keys
- OAuth secrets
- Service account JSON
- Spreadsheet credentials

in the frontend repository.
