# Sree Lakshmi Narasimha Swamy Temple — Seva Registration

A mobile-first temple seva registration website using:

- Static HTML/CSS/JavaScript frontend
- GitHub Pages for hosting
- Google Apps Script Web App for the backend
- Google Sheets as the data store

No paid hosting or database is required for the initial version.

## Project structure

```text
temple-seva-registration/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   └── config.js
├── assets/
│   └── temple-photo.jpg
├── google-apps-script/
│   ├── Code.gs
│   └── Config.gs
└── README.md
```

## Current functionality

- Responsive temple-themed single-page UI
- Devotee name, Gothram, DOB, address, mobile number
- Family members can be added one by one
  - Name
  - Relation
  - Age
  - Up to 20 members
- Multiple seva selection
- Contribution amount
- Monthly / Quarterly / Half Yearly / Yearly frequency
- Consent checkbox
- Client-side validation
- Success confirmation
- Print/save confirmation
- Google Sheets backend code
- Server-side validation
- Server-generated registration IDs
- Duplicate submission protection using `submissionId`
- Separate sheets for registrations, family members and selected sevas
- Summary sheet

## Google Sheet setup

1. Create a new Google Sheet.
2. Copy the Spreadsheet ID from its URL.

Example:

```text
https://docs.google.com/spreadsheets/d/ABC123XYZ/edit
                                      ^^^^^^^^^^
                                      Spreadsheet ID
```

3. Open **Extensions → Apps Script**.
4. Create two script files:
   - `Code.gs`
   - `Config.gs`
5. Copy the files from `google-apps-script/` into the Apps Script project.
6. In `Config.gs`, replace:

```javascript
SPREADSHEET_ID: "YOUR_GOOGLE_SHEET_ID"
```

with your actual Spreadsheet ID.
7. Save.
8. Select `setupSheets` from the function dropdown and click **Run**.
9. Grant the requested Google permissions.

The following sheets will be created:

```text
Registrations
FamilyMembers
RegistrationSevas
SevaTypes
Settings
Summary
```

## Deploy Apps Script

In Apps Script:

1. Click **Deploy → New deployment**.
2. Select **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Deploy.
6. Copy the Web App URL.

Do not make the Google Sheet itself public. Only the Apps Script Web App endpoint is public.

## Connect the frontend

Open:

```text
js/config.js
```

Set:

```javascript
API_URL: "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL"
```

Example:

```javascript
API_URL: "https://script.google.com/macros/s/XXXXXXXX/exec"
```

Do not put the Google Sheet ID or any Google credentials in frontend code.

## GitHub Pages

1. Create a GitHub repository.
2. Upload the contents of this project.
3. Go to **Settings → Pages**.
4. Select deployment from the `main` branch.
5. Select `/root`.
6. Save.
7. Open the generated GitHub Pages URL.

## Important security notes

The Google Sheet should remain private.

The public website should never contain:

- Google service account credentials
- Private keys
- OAuth client secrets
- Spreadsheet credentials

The backend performs server-side validation even though the frontend also validates the form.

## Data model

### Registrations

One row per devotee registration:

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

One row per family member:

```text
Family Member ID
Registration ID
Name
Relation
Age
Created At
```

### RegistrationSevas

One row per selected seva:

```text
Registration Seva ID
Registration ID
Seva ID
Seva Name
Created At
```

This means one registration can have many family members and many sevas without storing comma-separated values.

## Changing Sevas

In Apps Script `Config.gs`, change:

```javascript
SEVA_TYPES: [
  {
    id: "dhoopa",
    name: "Dhoopa Seva",
    description: "Daily Dhoopa Seva"
  }
]
```

Then update the `SevaTypes` sheet or recreate it as appropriate.

For a production deployment, keep the `SevaTypes` sheet as the source of truth and deactivate old sevas rather than deleting historical records.

## Local development

Because this is a static frontend, you can open `index.html` directly for UI work.

For API testing, a small local HTTP server is preferable:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

The registration API will not work until `API_URL` is configured.

## Recommended development sequence

1. Test the frontend UI.
2. Configure the Google Sheet.
3. Run `setupSheets()`.
4. Deploy Apps Script.
5. Add the Web App URL to `js/config.js`.
6. Test one registration.
7. Verify all three data sheets.
8. Test multiple family members.
9. Test multiple sevas.
10. Test duplicate submission.
11. Test mobile browsers.
12. Deploy to GitHub Pages.

## Payment

This version records a **contribution amount**. It does not process online payment.

Do not describe the recorded contribution as a payment received unless a payment gateway is added and the payment is verified.

## Future extensions

The architecture can later be extended with:

- Online payment/UPI
- Receipts
- Admin dashboard
- Devotee search
- Seva management
- SMS/WhatsApp confirmation
- Email confirmation
- PDF receipts
- Reports
