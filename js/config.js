// Frontend configuration.
// Replace API_URL with your deployed Google Apps Script Web App URL in Step 8.
const APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxFb-1rJPW7mrJ9rxPEhlXBN-xvNnqz4tKP2OGc7P_-Sca9Xj5VLLsuU6dY6MvjBEp5/exec",
  TEMPLE_NAME: "Sree Lakshmi Narasimha Swamy Temple",
  MAX_FAMILY_MEMBERS: 20,
  MAX_CONTRIBUTION: 1000000,
  SEVA_TYPES: [
    { id: "dhoopa", name: "Dhoopa Seva", description: "Daily Dhoopa Seva", icon: "🪔" },
    { id: "deepa", name: "Deepa Seva", description: "Daily Deepa Seva", icon: "🪔" },
    { id: "naivedhyam", name: "Naivedhyam Seva", description: "Daily Naivedhyam Seva", icon: "🍚" }
  ],
  FREQUENCIES: ["Monthly", "Quarterly", "Half Yearly", "Yearly"],
  FAMILY_RELATIONS: [
    "Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister",
    "Grandfather", "Grandmother", "Father-in-law", "Mother-in-law", "Other"
  ]
};
