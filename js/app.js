(() => {
  "use strict";

  const state = {
    familyMembers: [],
    selectedSevas: new Set(),
    selectedFrequency: ""
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    renderSevas();
    renderFrequencies();
    bindEvents();
    setMaxDob();
    updateAddressCount();
  }

  function bindEvents() {
    $("#addFamilyMember").addEventListener("click", addFamilyMember);
    $("#registrationForm").addEventListener("submit", handleSubmit);
    $("#address").addEventListener("input", updateAddressCount);
    $("#phone").addEventListener("input", normalizePhoneInput);
    $("#newRegistration").addEventListener("click", startNewRegistration);
    $("#printConfirmation").addEventListener("click", () => window.print());

    $("#familyMembers").addEventListener("input", handleFamilyInput);
    $("#familyMembers").addEventListener("change", handleFamilyChange);
    $("#familyMembers").addEventListener("click", handleFamilyClick);

    $("#sevaOptions").addEventListener("change", handleSevaChange);
    $("#frequencyOptions").addEventListener("change", handleFrequencyChange);
  }

  function setMaxDob() {
    const today = new Date();
    $("#dob").max = today.toISOString().split("T")[0];
  }

  function renderFrequencies() {
    $("#frequencyOptions").innerHTML = APP_CONFIG.FREQUENCIES.map((frequency, index) => `
      <label class="frequency-card">
        <input type="radio" name="frequency" value="${escapeHtml(frequency)}" ${index === 0 ? "" : ""}>
        <span class="frequency-card-inner">
          <span class="frequency-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="6" width="24" height="22" rx="2"/><path d="M4 12h24M10 3v6M22 3v6"/><g fill="currentColor" stroke="none"><rect x="8" y="15" width="3" height="3"/><rect x="14.5" y="15" width="3" height="3"/><rect x="21" y="15" width="3" height="3"/><rect x="8" y="21" width="3" height="3"/><rect x="14.5" y="21" width="3" height="3"/><rect x="21" y="21" width="3" height="3"/></g></svg></span>
          <span>${escapeHtml(frequency)}</span>
        </span>
      </label>
    `).join("");
  }

  function renderSevas() {
    $("#sevaOptions").innerHTML = APP_CONFIG.SEVA_TYPES.map(seva => `
      <label class="seva-card" data-seva-card="${escapeHtml(seva.id)}">
        <input type="checkbox" value="${escapeHtml(seva.id)}" aria-label="${escapeHtml(seva.name)}">
        <span class="checkmark" aria-hidden="true">✓</span>
        <span class="seva-icon" aria-hidden="true">${seva.icon || "🪔"}</span>
        <span class="seva-copy">
          <strong>${escapeHtml(seva.name)}</strong>
          <small>${escapeHtml(seva.description || "")}</small>
        </span>
      </label>
    `).join("");
  }

  function addFamilyMember() {
    if (state.familyMembers.length >= APP_CONFIG.MAX_FAMILY_MEMBERS) {
      showFormError(`You can add up to ${APP_CONFIG.MAX_FAMILY_MEMBERS} family members.`);
      return;
    }

    state.familyMembers.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `fm-${Date.now()}-${Math.random()}`,
      name: "",
      relation: "",
      otherRelation: "",
      age: ""
    });

    renderFamilyMembers();
    clearFormError();
    const last = $(".family-member-card:last-child input", $("#familyMembers"));
    if (last) last.focus();
  }

  function removeFamilyMember(id) {
    state.familyMembers = state.familyMembers.filter(member => member.id !== id);
    renderFamilyMembers();
  }

  function renderFamilyMembers() {
    const container = $("#familyMembers");
    container.innerHTML = state.familyMembers.map((member, index) => `
      <article class="family-member-card" data-member-id="${escapeHtml(member.id)}">
        <div class="member-card-header">
          <h4>Family Member ${index + 1}</h4>
          <button type="button" class="remove-button" data-remove-member="${escapeHtml(member.id)}">Remove</button>
        </div>
        <div class="member-grid">
          <div class="field">
            <label for="member-${index}-name">Name <span>*</span></label>
            <input id="member-${index}-name" data-member-field="name" type="text" maxlength="100" value="${escapeAttr(member.name)}" placeholder="Enter name">
            <small class="field-error" data-member-error="name"></small>
          </div>
          <div class="field">
            <label for="member-${index}-relation">Relation <span>*</span></label>
            <select id="member-${index}-relation" data-member-field="relation">
              <option value="">Select relation</option>
              ${APP_CONFIG.FAMILY_RELATIONS.map(relation =>
                `<option value="${escapeAttr(relation)}" ${member.relation === relation ? "selected" : ""}>${escapeHtml(relation)}</option>`
              ).join("")}
            </select>
            <small class="field-error" data-member-error="relation"></small>
          </div>
          <div class="field">
            <label for="member-${index}-age">Age <span>*</span></label>
            <input id="member-${index}-age" data-member-field="age" type="number" min="0" max="120" step="1" inputmode="numeric" value="${escapeAttr(member.age)}" placeholder="Age">
            <small class="field-error" data-member-error="age"></small>
          </div>
          ${member.relation === "Other" ? `
            <div class="field field-full">
              <label for="member-${index}-other">Specify Relation <span>*</span></label>
              <input id="member-${index}-other" data-member-field="otherRelation" type="text" maxlength="100" value="${escapeAttr(member.otherRelation)}" placeholder="Enter relation">
              <small class="field-error" data-member-error="otherRelation"></small>
            </div>` : ""}
        </div>
      </article>
    `).join("");

    $("#familyCount").textContent = `${state.familyMembers.length} ${state.familyMembers.length === 1 ? "member" : "members"}`;
  }

  function handleFamilyInput(event) {
    const field = event.target.dataset.memberField;
    if (!field) return;
    const card = event.target.closest(".family-member-card");
    const member = state.familyMembers.find(item => item.id === card.dataset.memberId);
    if (!member) return;
    member[field] = event.target.value;
  }

  function handleFamilyChange(event) {
    const field = event.target.dataset.memberField;
    if (!field) return;
    const card = event.target.closest(".family-member-card");
    const member = state.familyMembers.find(item => item.id === card.dataset.memberId);
    if (!member) return;
    member[field] = event.target.value;
    if (field === "relation") renderFamilyMembers();
  }

  function handleFamilyClick(event) {
    const button = event.target.closest("[data-remove-member]");
    if (button) removeFamilyMember(button.dataset.removeMember);
  }

  function handleSevaChange(event) {
    const id = event.target.value;
    if (event.target.checked) state.selectedSevas.add(id);
    else state.selectedSevas.delete(id);

    updateSevaUI();
  }

  function updateSevaUI() {
    $$("[data-seva-card]", $("#sevaOptions")).forEach(card => {
      const checkbox = $("input", card);
      card.classList.toggle("selected", checkbox.checked);
    });

    const count = state.selectedSevas.size;
    $("#sevaCount").textContent = `${count} selected`;

    if (count) {
      const names = APP_CONFIG.SEVA_TYPES
        .filter(seva => state.selectedSevas.has(seva.id))
        .map(seva => seva.name);
      $("#sevaSummary").hidden = false;
      $("#sevaSummary").innerHTML = `<strong>Selected:</strong> ${names.map(escapeHtml).join(" · ")}`;
    } else {
      $("#sevaSummary").hidden = true;
      $("#sevaSummary").textContent = "";
    }
  }

  function handleFrequencyChange(event) {
    state.selectedFrequency = event.target.value;
  }

  function updateAddressCount() {
    $("#addressCount").textContent = `${$("#address").value.length} / 500`;
  }

  function normalizePhoneInput(event) {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
  }

  function validateForm() {
    clearErrors();
    let valid = true;

    const name = $("#name").value.trim();
    const gothram = $("#gothram").value.trim();
    const dob = $("#dob").value;
    const address = $("#address").value.trim();
    const phone = $("#phone").value.trim();
    const amount = Number($("#amount").value);

    if (name.length < 2) { setFieldError("name", "Please enter a valid name."); valid = false; }
    if (gothram.length < 2) { setFieldError("gothram", "Please enter your gothram."); valid = false; }
    if (!dob || new Date(dob) > new Date()) { setFieldError("dob", "Please enter a valid date of birth."); valid = false; }
    if (address.length < 5) { setFieldError("address", "Please enter your full address."); valid = false; }
    if (!/^[6-9]\d{9}$/.test(phone)) { setFieldError("phone", "Please enter a valid 10-digit Indian mobile number."); valid = false; }
    if (!Number.isInteger(amount) || amount < 1 || amount > APP_CONFIG.MAX_CONTRIBUTION) {
      setFieldError("amount", `Enter an amount between ₹1 and ₹${APP_CONFIG.MAX_CONTRIBUTION.toLocaleString("en-IN")}.`);
      valid = false;
    }
    if (!state.selectedFrequency) { setFieldError("frequency", "Please select a contribution frequency."); valid = false; }
    if (state.selectedSevas.size === 0) {
      $("#sevaError").textContent = "Please select at least one seva.";
      valid = false;
    }
    if (!$("#consent").checked) { setFieldError("consent", "Please confirm the information provided."); valid = false; }

    state.familyMembers.forEach((member, index) => {
      const card = $(`.family-member-card[data-member-id="${CSS.escape(member.id)}"]`);
      if (!member.name.trim()) { memberError(card, "name", "Enter the member name."); valid = false; }
      if (!member.relation) { memberError(card, "relation", "Select a relation."); valid = false; }
      if (!Number.isInteger(Number(member.age)) || Number(member.age) < 0 || Number(member.age) > 120) {
        memberError(card, "age", "Enter an age from 0 to 120."); valid = false;
      }
      if (member.relation === "Other" && !member.otherRelation.trim()) {
        memberError(card, "otherRelation", "Please specify the relation."); valid = false;
      }
    });

    if (!valid) {
      const firstError = $(".field-error:not(:empty)");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return valid;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearFormError();

    if (!validateForm()) return;

    const payload = {
      submissionId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      website: $("#website").value.trim(),
      name: $("#name").value.trim(),
      gothram: $("#gothram").value.trim(),
      dob: $("#dob").value,
      address: $("#address").value.trim(),
      phone: $("#phone").value.trim(),
      familyMembers: state.familyMembers.map(member => ({
        name: member.name.trim(),
        relation: member.relation,
        otherRelation: member.relation === "Other" ? member.otherRelation.trim() : "",
        age: Number(member.age)
      })),
      selectedSevas: [...state.selectedSevas],
      contributionAmount: Number($("#amount").value),
      contributionFrequency: state.selectedFrequency,
      consent: true
    };

    setSubmitting(true);

    try {
      if (!APP_CONFIG.API_URL) {
        throw new Error("API_NOT_CONFIGURED");
      }

      const body = new URLSearchParams({
        payload: JSON.stringify(payload)
      });

      const response = await fetch(APP_CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Registration could not be completed.");
      }

      showSuccess(result.registration);
    } catch (error) {
      console.error("Registration error:", error);
      if (error.message === "API_NOT_CONFIGURED") {
        showFormError("The registration service is not configured yet. Please add the Google Apps Script Web App URL in js/config.js.");
      } else {
        showFormError("We could not complete the registration right now. Please check your internet connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function showSuccess(registration) {
    $("#registration").hidden = true;
    $("#successSection").hidden = false;

    const sevaNames = (registration.selectedSevas || []).map(id => {
      const seva = APP_CONFIG.SEVA_TYPES.find(item => item.id === id);
      return seva ? seva.name : id;
    });

    $("#confirmationContent").innerHTML = `
      <div class="confirmation-id">
        <span>Registration ID</span>
        <strong>${escapeHtml(registration.registrationId)}</strong>
      </div>
      <dl>
        <div><dt>Devotee</dt><dd>${escapeHtml(registration.name)}</dd></div>
        <div><dt>Gothram</dt><dd>${escapeHtml(registration.gothram)}</dd></div>
        <div><dt>Selected Sevas</dt><dd>${sevaNames.map(name => `<span class="tag">${escapeHtml(name)}</span>`).join(" ")}</dd></div>
        <div><dt>Family Members</dt><dd>${registration.familyMemberCount} ${registration.familyMemberCount === 1 ? "member" : "members"}</dd></div>
        <div><dt>Contribution</dt><dd>₹${Number(registration.contributionAmount).toLocaleString("en-IN")}</dd></div>
        <div><dt>Frequency</dt><dd>${escapeHtml(registration.contributionFrequency)}</dd></div>
        <div><dt>Date</dt><dd>${escapeHtml(registration.dateDisplay)}</dd></div>
      </dl>
    `;

    $("#successSection").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startNewRegistration() {
    $("#registrationForm").reset();
    state.familyMembers = [];
    state.selectedSevas.clear();
    state.selectedFrequency = "";
    renderFamilyMembers();
    updateSevaUI();
    clearErrors();
    $("#successSection").hidden = true;
    $("#registration").hidden = false;
    updateAddressCount();
    $("#registration").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setSubmitting(submitting) {
    const button = $("#submitButton");
    button.disabled = submitting;
    $("#submitLabel").textContent = submitting ? "Saving..." : "Save Registration";
  }

  function setFieldError(field, message) {
    const element = $(`[data-error-for="${field}"]`);
    if (element) element.textContent = message;
  }

  function memberError(card, field, message) {
    const element = $(`[data-member-error="${field}"]`, card);
    if (element) element.textContent = message;
  }

  function clearErrors() {
    $$(".field-error").forEach(el => el.textContent = "");
    $("#sevaError").textContent = "";
    clearFormError();
  }

  function showFormError(message) {
    const box = $("#formError");
    box.textContent = message;
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearFormError() {
    const box = $("#formError");
    box.hidden = true;
    box.textContent = "";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
