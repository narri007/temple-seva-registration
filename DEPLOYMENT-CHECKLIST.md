# Temple Seva Registration — Deployment Checklist

## Frontend

- [ ] Desktop UI reviewed against the approved reference design
- [ ] Mobile layout checked
- [ ] Family member add/remove tested
- [ ] Multiple Seva selection tested
- [ ] Required-field validation tested
- [ ] Print confirmation tested
- [ ] No browser console errors

## Google Sheets

- [ ] Sheet created
- [ ] Spreadsheet ID configured in Apps Script only
- [ ] `setupSheets()` executed successfully
- [ ] Required sheets created
- [ ] Sheet kept private

## Apps Script

- [ ] `doGet()` returns API running response
- [ ] Web App deployed as the owner
- [ ] Access set to Anyone
- [ ] `/exec` URL copied
- [ ] Frontend `API_URL` configured

## End-to-end testing

- [ ] One registration submitted
- [ ] Registration row verified
- [ ] Family member rows verified
- [ ] Seva rows verified
- [ ] Registration ID verified
- [ ] Summary formulas verified
- [ ] Duplicate submission behavior tested
- [ ] Invalid mobile rejected
- [ ] Missing Seva rejected
- [ ] Invalid family member rejected

## Production

- [ ] Test data removed from production sheet
- [ ] Admin access limited to required people
- [ ] Final GitHub Pages URL tested
- [ ] Final mobile browser test completed
- [ ] Temple administrator understands how to view registrations

## Production hardening added in Step 4

- [ ] Honeypot anti-bot field tested
- [ ] Same-mobile short-window rate limiting tested
- [ ] AdminDashboard created and reviewed
- [ ] Google Sheet remains private
- [ ] Admin users have only the required Sheet access
- [ ] Production deployment updated after backend changes
