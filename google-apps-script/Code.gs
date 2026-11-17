/**
 * Sree Lakshmi Narasimha Swamy Temple
 * Google Apps Script backend.
 *
 * 1. Create a Google Sheet.
 * 2. Open Extensions -> Apps Script.
 * 3. Paste this file and Config.gs.
 * 4. Run setupSheets() once and authorize.
 * 5. Deploy as Web App.
 */

// A function (not a top-level constant) so it works whichever order Apps Script loads
// Code.gs and Config.gs in.
function sheetDefinitions_() {
  return [
    {
      name: SHEET_NAMES.REGISTRATIONS,
      headers: [
        "Registration ID", "Submission ID", "Created At", "Name", "Gothram",
        "Date of Birth", "Address", "Phone Number", "Contribution Amount",
        "Contribution Frequency", "Consent", "Status"
      ]
    },
    {
      name: SHEET_NAMES.FAMILY_MEMBERS,
      // "Date of Birth" is added as a new last column so existing rows keep their columns.
      headers: ["Family Member ID", "Registration ID", "Name", "Relation", "Age", "Created At", "Date of Birth"]
    },
    {
      name: SHEET_NAMES.REGISTRATION_SEVAS,
      headers: ["Registration Seva ID", "Registration ID", "Seva ID", "Seva Name", "Created At"]
    },
    {
      name: SHEET_NAMES.SEVA_TYPES,
      headers: ["Seva ID", "Seva Name", "Description", "Active", "Display Order"]
    },
    {
      name: SHEET_NAMES.SETTINGS,
      headers: ["Setting", "Value"]
    },
    {
      name: SHEET_NAMES.SUMMARY,
      headers: ["Metric", "Value"]
    }
  ];
}

function doGet() {
  return jsonResponse_({
    success: true,
    service: "Temple Seva Registration API",
    message: "API is running."
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!e || !e.parameter || !e.parameter.payload) {
      throw new Error("Registration payload is missing.");
    }

    const payload = JSON.parse(e.parameter.payload);
    const clean = validateAndNormalize_(payload);

    const ss = SpreadsheetApp.openById(APP_CONFIG.SPREADSHEET_ID);
    // Only checks the sheets and headers exist. The dashboard and summary are built
    // by setupSheets() / the Temple Admin menu, not on every registration.
    ensureSheetHeaders_(ss);

    const registrations = ss.getSheetByName(SHEET_NAMES.REGISTRATIONS);
    const familySheet = ss.getSheetByName(SHEET_NAMES.FAMILY_MEMBERS);
    const sevaSheet = ss.getSheetByName(SHEET_NAMES.REGISTRATION_SEVAS);

    // Idempotency: same client submission must never create two registrations.
    // Checked before the rate limit so a retry of a saved submission still gets its confirmation.
    const duplicate = findSubmission_(registrations, clean.submissionId);
    if (duplicate) {
      return jsonResponse_({
        success: true,
        duplicate: true,
        registration: buildRegistrationResponseFromRow_(ss, registrations, duplicate.row)
      });
    }

    // Lightweight public-endpoint abuse protection. This is not a replacement for CAPTCHA,
    // but it blocks simple automated submissions and repeated submissions from the same phone.
    checkRateLimit_(clean.phone);

    // Validate all selected sevas before writing anything.
    const sevaDefinitions = clean.selectedSevas.map(sevaId => getSevaById_(ss, sevaId));

    const registrationId = nextId_("REG", APP_CONFIG.REGISTRATION_PREFIX, registrations);
    const now = new Date();

    registrations.appendRow([
      registrationId,
      clean.submissionId,
      now,
      clean.name,
      clean.gothram,
      clean.dob,
      clean.address,
      clean.phone,
      clean.contributionAmount,
      clean.contributionFrequency,
      clean.consent ? "Yes" : "No",
      "Active"
    ]);

    const familyMemberRows = clean.familyMembers.map(member => [
      nextId_("FM", APP_CONFIG.FAMILY_MEMBER_PREFIX, familySheet),
      registrationId,
      member.name,
      member.relation,
      member.age,
      now,
      member.dob
    ]);

    if (familyMemberRows.length) {
      familySheet.getRange(
        familySheet.getLastRow() + 1,
        1,
        familyMemberRows.length,
        familyMemberRows[0].length
      ).setValues(familyMemberRows);
    }

    const sevaRows = sevaDefinitions.map(seva => {
      return [
        nextId_("RS", APP_CONFIG.REGISTRATION_SEVA_PREFIX, sevaSheet),
        registrationId,
        seva.id,
        seva.name,
        now
      ];
    });

    if (sevaRows.length) {
      sevaSheet.getRange(
        sevaSheet.getLastRow() + 1,
        1,
        sevaRows.length,
        sevaRows[0].length
      ).setValues(sevaRows);
    }

    SpreadsheetApp.flush();

    // Only start the rate-limit window once the registration is actually saved.
    markRateLimit_(clean.phone);

    return jsonResponse_({
      success: true,
      registration: {
        registrationId: registrationId,
        name: clean.name,
        gothram: clean.gothram,
        selectedSevas: clean.selectedSevas,
        familyMemberCount: clean.familyMembers.length,
        contributionAmount: clean.contributionAmount,
        contributionFrequency: clean.contributionFrequency,
        dateDisplay: Utilities.formatDate(now, APP_CONFIG.TIMEZONE, "dd/MM/yyyy")
      }
    });

  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({
      success: false,
      message: safeErrorMessage_(error)
    });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function setupSheets() {
  const ss = SpreadsheetApp.openById(APP_CONFIG.SPREADSHEET_ID);
  ensureSheets_(ss);
  formatSheets_(ss);
  Logger.log("Temple registration sheets are ready: " + ss.getUrl());
}

// Full setup: sheets, headers, seed data, summary and dashboard. Run from setupSheets().
function ensureSheets_(ss) {
  ensureSheetHeaders_(ss);
  seedSevas_(ss);
  seedSettings_(ss);
  setupSummary_(ss);
  setupAdminDashboard_(ss);
}

// Fast check used on every registration: creates missing sheets and fixes header rows.
function ensureSheetHeaders_(ss) {
  sheetDefinitions_().forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) sheet = ss.insertSheet(def.name);

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
    } else {
      const existing = sheet.getRange(1, 1, 1, def.headers.length).getValues()[0];
      const missing = def.headers.some((h, i) => existing[i] !== h);
      if (missing) {
        sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
      }
    }
  });
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Temple Admin")
    .addItem("Refresh Dashboard", "refreshAdminDashboard")
    .addItem("Setup / Repair Sheets", "setupSheets")
    .addToUi();
}

function seedSevas_(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.SEVA_TYPES);
  if (sheet.getLastRow() > 1) return;

  const rows = APP_CONFIG.SEVA_TYPES.map((seva, index) => [
    seva.id, seva.name, seva.description, true, index + 1
  ]);

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function seedSettings_(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (sheet.getLastRow() > 1) return;

  const rows = [
    ["Temple Name", APP_CONFIG.TEMPLE_NAME],
    ["Temple Address", APP_CONFIG.TEMPLE_ADDRESS],
    ["Timezone", APP_CONFIG.TIMEZONE]
  ];
  sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}

function setupSummary_(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.SUMMARY);
  if (sheet.getLastRow() > 1) return;

  const formulas = [
    ["Total Registrations", `=COUNTA('${SHEET_NAMES.REGISTRATIONS}'!A2:A)`],
    ["Active Registrations", `=COUNTIF('${SHEET_NAMES.REGISTRATIONS}'!L2:L,"Active")`],
    ["Monthly Registrations", `=COUNTIF('${SHEET_NAMES.REGISTRATIONS}'!J2:J,"Monthly")`],
    ["Quarterly Registrations", `=COUNTIF('${SHEET_NAMES.REGISTRATIONS}'!J2:J,"Quarterly")`],
    ["Half-Yearly Registrations", `=COUNTIF('${SHEET_NAMES.REGISTRATIONS}'!J2:J,"Half Yearly")`],
    ["Yearly Registrations", `=COUNTIF('${SHEET_NAMES.REGISTRATIONS}'!J2:J,"Yearly")`],
    ["Total Contribution Recorded", `=SUM('${SHEET_NAMES.REGISTRATIONS}'!I2:I)`],
    ["Total Family Members", `=COUNTA('${SHEET_NAMES.FAMILY_MEMBERS}'!A2:A)`],
    ["Dhoopa Seva Selections", `=COUNTIF('${SHEET_NAMES.REGISTRATION_SEVAS}'!C2:C,"dhoopa")`],
    ["Deepa Seva Selections", `=COUNTIF('${SHEET_NAMES.REGISTRATION_SEVAS}'!C2:C,"deepa")`],
    ["Naivedhyam Seva Selections", `=COUNTIF('${SHEET_NAMES.REGISTRATION_SEVAS}'!C2:C,"naivedhyam")`]
  ];

  sheet.getRange(2, 1, formulas.length, 2).setValues(formulas);
}

function setupAdminDashboard_(ss) {
  let sheet = ss.getSheetByName("AdminDashboard");
  if (!sheet) sheet = ss.insertSheet("AdminDashboard");
  refreshAdminDashboard();
}

function refreshAdminDashboard() {
  const ss = SpreadsheetApp.openById(APP_CONFIG.SPREADSHEET_ID);
  const dash = ss.getSheetByName("AdminDashboard") || ss.insertSheet("AdminDashboard");

  dash.clear();
  dash.getRange("A1:H1").merge().setValue(APP_CONFIG.TEMPLE_NAME + " — Admin Dashboard");
  dash.getRange("A1:H1").setFontSize(18).setFontWeight("bold").setFontColor("#FFFFFF").setBackground("#7A0000");
  dash.getRange("A2:H2").merge().setValue("Use the Registrations, FamilyMembers and RegistrationSevas tabs for detailed records. This dashboard is read-only summary information.");
  dash.getRange("A2:H2").setWrap(true).setFontColor("#555555");

  const metrics = [
    ["Total Registrations", `=COUNTA('${SHEET_NAMES.REGISTRATIONS}'!A2:A)`],
    ["Active Registrations", `=COUNTIF('${SHEET_NAMES.REGISTRATIONS}'!L2:L,"Active")`],
    ["Registrations Today", `=COUNTIF('${SHEET_NAMES.REGISTRATIONS}'!C2:C,">="&TODAY())`],
    ["Registrations This Month", `=COUNTIFS('${SHEET_NAMES.REGISTRATIONS}'!C2:C,">="&EOMONTH(TODAY(),-1)+1,'${SHEET_NAMES.REGISTRATIONS}'!C2:C,"<"&EOMONTH(TODAY(),0)+1)`],
    ["Total Contribution", `=SUM('${SHEET_NAMES.REGISTRATIONS}'!I2:I)`],
    ["Total Family Members", `=COUNTA('${SHEET_NAMES.FAMILY_MEMBERS}'!A2:A)`]
  ];
  dash.getRange(4,1,metrics.length,2).setValues(metrics);
  dash.getRange(4,1,metrics.length,1).setFontWeight("bold");
  dash.getRange(8,2).setNumberFormat('₹#,##0');

  dash.getRange("D4:E4").setValues([["Seva", "Selections"]]).setFontWeight("bold").setBackground("#F4E5B0");
  const sevaRows = APP_CONFIG.SEVA_TYPES.map(seva => [seva.name, `=COUNTIF('${SHEET_NAMES.REGISTRATION_SEVAS}'!C2:C,"${seva.id}")`]);
  dash.getRange(5,4,sevaRows.length,2).setValues(sevaRows);

  dash.getRange("G4:H4").setValues([["Frequency", "Registrations"]]).setFontWeight("bold").setBackground("#F4E5B0");
  const frequencyRows = APP_CONFIG.FREQUENCIES.map(freq => [freq, `=COUNTIF('${SHEET_NAMES.REGISTRATIONS}'!J2:J,"${freq}")`]);
  dash.getRange(5,7,frequencyRows.length,2).setValues(frequencyRows);

  dash.setFrozenRows(2);
  dash.autoResizeColumns(1,8);
  dash.getRange("A1:H12").setVerticalAlignment("middle");
}

function rateLimitKey_(phone) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, phone);
  return "RATE_" + digest.map(b => (b + 256) % 256).map(b => b.toString(16).padStart(2, "0")).join("");
}

function checkRateLimit_(phone) {
  if (CacheService.getScriptCache().get(rateLimitKey_(phone))) {
    const minutes = Math.ceil(APP_CONFIG.RATE_LIMIT_SECONDS / 60);
    throw new Error(`A registration was already submitted recently for this mobile number. Please try again after ${minutes} minutes.`);
  }
}

function markRateLimit_(phone) {
  CacheService.getScriptCache().put(rateLimitKey_(phone), "1", APP_CONFIG.RATE_LIMIT_SECONDS);
}

function formatSheets_(ss) {
  Object.keys(SHEET_NAMES).forEach(key => {
    const sheet = ss.getSheetByName(SHEET_NAMES[key]);
    if (!sheet) return;

    const lastColumn = sheet.getLastColumn();
    if (!lastColumn) return;

    const header = sheet.getRange(1, 1, 1, lastColumn);
    header.setFontWeight("bold");
    header.setBackground("#7A0000");
    header.setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, lastColumn);

    if (sheet.getName() === SHEET_NAMES.REGISTRATIONS) {
      sheet.getRange("C:C").setNumberFormat("dd/MM/yyyy HH:mm:ss");
      sheet.getRange("F:F").setNumberFormat("dd/MM/yyyy");
      sheet.getRange("I:I").setNumberFormat('₹#,##0');
    }

    if (sheet.getName() === SHEET_NAMES.FAMILY_MEMBERS) {
      sheet.getRange("F:F").setNumberFormat("dd/MM/yyyy HH:mm:ss");
      sheet.getRange("G:G").setNumberFormat("dd/MM/yyyy");
    }

    if (sheet.getName() === SHEET_NAMES.REGISTRATION_SEVAS) {
      sheet.getRange("E:E").setNumberFormat("dd/MM/yyyy HH:mm:ss");
    }
  });
}

function validateAndNormalize_(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid registration data.");
  }

  const name = String(payload.name || "").trim();
  const gothram = String(payload.gothram || "").trim();
  const dob = String(payload.dob || "").trim();
  const address = String(payload.address || "").trim();
  const phone = String(payload.phone || "").replace(/\D/g, "");
  const contributionAmount = Number(payload.contributionAmount);
  const contributionFrequency = String(payload.contributionFrequency || "").trim();
  const submissionId = String(payload.submissionId || "").trim();
  const website = String(payload.website || "").trim();

  if (website) throw new Error("Invalid registration submission.");
  if (!submissionId || submissionId.length > 100) throw new Error("Invalid submission.");
  if (name.length < 2 || name.length > 100) throw new Error("Invalid devotee name.");
  if (gothram.length < 2 || gothram.length > 100) throw new Error("Invalid gothram.");
  if (!isValidDate_(dob) || dob > todayIso_()) throw new Error("Invalid date of birth.");
  if (address.length < 5 || address.length > 500) throw new Error("Invalid address.");
  if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("Invalid mobile number.");
  if (!Number.isInteger(contributionAmount) || contributionAmount < 1 || contributionAmount > APP_CONFIG.MAX_CONTRIBUTION) {
    throw new Error("Invalid contribution amount.");
  }
  if (APP_CONFIG.FREQUENCIES.indexOf(contributionFrequency) === -1) {
    throw new Error("Invalid contribution frequency.");
  }
  if (payload.consent !== true) throw new Error("Consent is required.");

  const familyMembers = Array.isArray(payload.familyMembers) ? payload.familyMembers : [];
  if (familyMembers.length > APP_CONFIG.MAX_FAMILY_MEMBERS) {
    throw new Error("Too many family members.");
  }

  const normalizedFamily = familyMembers.map((member, index) => {
    const memberName = String(member.name || "").trim();
    const relation = String(member.relation || "").trim();
    const otherRelation = String(member.otherRelation || "").trim();
    const memberDob = String(member.dob || "").trim();
    let age;

    if (memberName.length < 2 || memberName.length > 100) {
      throw new Error(`Invalid family member name at position ${index + 1}.`);
    }
    if (APP_CONFIG.FAMILY_RELATIONS.indexOf(relation) === -1) {
      throw new Error(`Invalid family member relation at position ${index + 1}.`);
    }
    if (relation === "Other" && (otherRelation.length < 2 || otherRelation.length > 100)) {
      throw new Error(`Please specify the relation for family member ${index + 1}.`);
    }

    if (memberDob) {
      // Current website: date of birth. Age is worked out here, not trusted from the browser.
      if (!isValidDate_(memberDob) || memberDob > todayIso_()) {
        throw new Error(`Invalid date of birth for family member ${index + 1}.`);
      }
      age = ageFromDob_(memberDob);
      if (age > 120) {
        throw new Error(`Invalid date of birth for family member ${index + 1}.`);
      }
    } else {
      // Older version of the website that only sends an age (e.g. a cached page).
      age = Number(member.age);
      if (member.age === "" || member.age == null || !Number.isInteger(age) || age < 0 || age > 120) {
        throw new Error(`Invalid age for family member ${index + 1}.`);
      }
    }

    return {
      name: memberName,
      relation: relation === "Other" ? otherRelation : relation,
      age: age,
      dob: memberDob
    };
  });

  const selectedSevas = Array.isArray(payload.selectedSevas)
    ? [...new Set(payload.selectedSevas.map(String))]
    : [];

  if (!selectedSevas.length) throw new Error("Select at least one seva.");

  return {
    submissionId,
    name,
    gothram,
    dob,
    address,
    phone,
    contributionAmount,
    contributionFrequency,
    consent: true,
    familyMembers: normalizedFamily,
    selectedSevas,
    website: ""
  };
}

function getSevaById_(ss, sevaId) {
  const sheet = ss.getSheetByName(SHEET_NAMES.SEVA_TYPES);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][0] || "");
    const active = values[i][3] === true || String(values[i][3]).toUpperCase() === "TRUE";
    if (id === sevaId && active) {
      return { id: id, name: String(values[i][1] || "") };
    }
  }

  throw new Error("One of the selected sevas is not available.");
}

function findSubmission_(sheet, submissionId) {
  if (sheet.getLastRow() < 2) return null;

  const values = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === submissionId) {
      return { row: i + 2 };
    }
  }
  return null;
}

function nextId_(type, prefix, sheet) {
  const year = Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, "yyyy");
  const propertyKey = `NEXT_${type}_NUMBER_${year}`;
  const props = PropertiesService.getScriptProperties();
  const current = Number(props.getProperty(propertyKey) || "0") + 1;
  props.setProperty(propertyKey, String(current));
  return `${prefix}-${year}-${String(current).padStart(6, "0")}`;
}

function buildRegistrationResponseFromRow_(ss, sheet, row) {
  const values = sheet.getRange(row, 1, 1, 12).getValues()[0];
  const registrationId = String(values[0]);
  const familySheet = ss.getSheetByName(SHEET_NAMES.FAMILY_MEMBERS);
  const sevaSheet = ss.getSheetByName(SHEET_NAMES.REGISTRATION_SEVAS);

  let familyMemberCount = 0;
  if (familySheet && familySheet.getLastRow() >= 2) {
    const familyRows = familySheet.getRange(2, 2, familySheet.getLastRow() - 1, 1).getValues();
    familyMemberCount = familyRows.filter(row => String(row[0]) === registrationId).length;
  }

  const selectedSevas = [];
  if (sevaSheet && sevaSheet.getLastRow() >= 2) {
    const sevaRows = sevaSheet.getRange(2, 2, sevaSheet.getLastRow() - 1, 2).getValues();
    sevaRows.forEach(row => {
      if (String(row[0]) === registrationId) selectedSevas.push(String(row[1]));
    });
  }

  return {
    registrationId: registrationId,
    name: String(values[3]),
    gothram: String(values[4]),
    selectedSevas: selectedSevas,
    familyMemberCount: familyMemberCount,
    contributionAmount: Number(values[8]),
    contributionFrequency: String(values[9]),
    dateDisplay: Utilities.formatDate(new Date(values[2]), APP_CONFIG.TIMEZONE, "dd/MM/yyyy")
  };
}

// True only for a real calendar date in YYYY-MM-DD form (rejects e.g. 2023-02-31).
function isValidDate_(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Today's date in the temple's timezone, as YYYY-MM-DD.
function todayIso_() {
  return Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
}

function ageFromDob_(dob) {
  const [year, month, day] = dob.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = todayIso_().split("-").map(Number);
  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) age -= 1;
  return age;
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeErrorMessage_(error) {
  const message = error && error.message ? error.message : "Unable to complete registration.";
  return message.length > 200 ? "Unable to complete registration." : message;
}
