const skillGapState = {
  careers: [],
  career: null,
};

const GUEST_GAP_LIMIT = 5;
const GUEST_GAP_USES_KEY = "sf_guest_gap_uses";

document.addEventListener("DOMContentLoaded", initializeSkillGap);

async function initializeSkillGap() {
  renderSessionInfo();
  const careerSelect = document.getElementById("careerSelect");
  careerSelect.addEventListener("change", onCareerSelection);
  document.getElementById("load-gap-btn").addEventListener("click", () => computeGap(false));
  document.getElementById("gapForm").addEventListener("submit", (event) => {
    event.preventDefault();
    computeGap(true);
  });

  try {
    const response = await api.get("/careers");
    skillGapState.careers = response.careers || [];
    careerSelect.replaceChildren(new Option("-- Select Career Track --", ""));
    skillGapState.careers.forEach((career) => {
      careerSelect.appendChild(new Option(career.title, career._id));
    });

    const previousCareerId = localStorage.getItem("sf_career_id");
    if (previousCareerId && skillGapState.careers.some((career) => career._id === previousCareerId)) {
      careerSelect.value = previousCareerId;
      onCareerSelection();
    }
  } catch (error) {
    setSkillGapStatus("error", `Could not load careers: ${error.message}`);
  }
}

function renderSessionInfo() {
  const sessionInfo = document.getElementById("user-session-info");
  if (!Token.get()) {
    const loginLink = document.createElement("a");
    loginLink.href = buildAuthUrl("login.html", getCurrentPageReturnTo());
    loginLink.textContent = "Log in";

    const registerLink = document.createElement("a");
    registerLink.href = buildAuthUrl("register.html", getCurrentPageReturnTo());
    registerLink.textContent = "Register";

    let remainingUses = 0;
    try {
      const guestUsage = getGuestGapUses();
      remainingUses = Math.max(0, GUEST_GAP_LIMIT - guestUsage.count);
      if (guestUsage.corrupted) {
        setSkillGapStatus("error", "Guest assessment data was invalid. Log in to continue.");
      }
    } catch (error) {
      setSkillGapStatus("error", error.message);
    }
    const guestNote = document.createElement("span");
    guestNote.textContent = ` — ${remainingUses} free guest assessment${remainingUses === 1 ? "" : "s"} remaining`;

    sessionInfo.replaceChildren(
      loginLink,
      document.createTextNode(" or "),
      registerLink,
      guestNote
    );
    document.getElementById("save-assessment-btn").textContent =
      "Save & Open Roadmap (log in required)";
    return;
  }

  document.getElementById("save-assessment-btn").textContent =
    "Save Profile & Proceed to Roadmap →";

  const user = Token.getUser();
  const greeting = document.createElement("span");
  greeting.textContent = `Signed in as ${(user && user.name) || "Student"}`;

  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.className = "btn-editorial btn-outline";
  logoutButton.textContent = "Logout";
  logoutButton.addEventListener("click", () => {
    Token.clear();
    Token.clearUser();
    redirectToLogin("skill-gap.html", "login-required");
  });

  sessionInfo.replaceChildren(greeting, logoutButton);
}

function onCareerSelection() {
  const careerId = document.getElementById("careerSelect").value;
  skillGapState.career = skillGapState.careers.find((career) => career._id === careerId) || null;

  const checklist = document.getElementById("skillsContainer");
  checklist.replaceChildren();
  document.getElementById("gap-results").hidden = true;
  setSkillGapStatus("", "");

  if (!skillGapState.career || skillGapState.career.requiredSkills.length === 0) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = skillGapState.career
      ? "No required skills are defined for this career yet."
      : "Choose a career track to load its required skills.";
    checklist.appendChild(message);
    return;
  }

  const savedCareerId = localStorage.getItem("sf_career_id");
  let savedSkills = [];
  if (savedCareerId === careerId) {
    try {
      const parsedSkills = JSON.parse(localStorage.getItem("sf_possessed_skills") || "[]");
      if (Array.isArray(parsedSkills)) savedSkills = parsedSkills;
    } catch (error) {
      setSkillGapStatus("error", `Saved skill selection is invalid: ${error.message}`);
    }
  }

  skillGapState.career.requiredSkills.forEach((skill) => {
    const label = document.createElement("label");
    label.className = "skill-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "possessedSkills";
    checkbox.value = skill.skillName;
    checkbox.checked = savedSkills.includes(skill.skillName);

    const skillName = document.createElement("span");
    skillName.textContent = skill.skillName;
    label.append(checkbox, skillName);
    checklist.appendChild(label);
  });
}

async function computeGap(proceedToRoadmap) {
  const isAuthenticated = Boolean(Token.get());
  const career = skillGapState.career;
  if (!career) {
    setSkillGapStatus("error", "Select a career track first.");
    return;
  }

  let guestUses = 0;
  if (!isAuthenticated) {
    let guestUsage;
    try {
      guestUsage = getGuestGapUses();
    } catch (error) {
      setSkillGapStatus("error", error.message);
      redirectToLogin(
        proceedToRoadmap ? "roadmap.html" : "skill-gap.html",
        "storage-unavailable"
      );
      return;
    }
    guestUses = guestUsage.count;
    if (guestUsage.corrupted) {
      setSkillGapStatus("error", "Guest assessment data was invalid. Log in to continue.");
      redirectToLogin(
        proceedToRoadmap ? "roadmap.html" : "skill-gap.html",
        "guest-limit"
      );
      return;
    }
    if (guestUses >= GUEST_GAP_LIMIT) {
      setSkillGapStatus("error", "Your 5 free assessments are used. Log in or register to continue.");
      redirectToLogin(
        proceedToRoadmap ? "roadmap.html" : "skill-gap.html",
        "guest-limit"
      );
      return;
    }
  }

  const possessedSkills = Array.from(
    document.querySelectorAll('#skillsContainer input[name="possessedSkills"]:checked')
  ).map((checkbox) => checkbox.value);
  const computeButton = document.getElementById("load-gap-btn");
  const saveButton = document.getElementById("save-assessment-btn");
  computeButton.disabled = true;
  saveButton.disabled = true;
  setSkillGapStatus("", "");
  if (isAuthenticated && proceedToRoadmap) rememberAuthReturnTo("roadmap.html");

  try {
    const result = isAuthenticated
      ? await api.post("/gap-analysis", {
          careerId: career._id,
          possessedSkills,
        })
      : calculateGapLocally(career, possessedSkills);

    try {
      localStorage.setItem("sf_career_id", career._id);
      localStorage.setItem("sf_possessed_skills", JSON.stringify(possessedSkills));
      if (!isAuthenticated) setGuestGapUses(guestUses + 1);
    } catch (error) {
      setSkillGapStatus("error", error.message);
      if (!isAuthenticated) {
        redirectToLogin(
          proceedToRoadmap ? "roadmap.html" : "skill-gap.html",
          "storage-unavailable"
        );
      } else clearPendingAuthReturnTo();
      return;
    }
    if (!isAuthenticated) {
      renderSessionInfo();
    }
    renderGapResult(result);

    if (proceedToRoadmap) {
      if (isAuthenticated) {
        clearPendingAuthReturnTo();
        location.href = "roadmap.html";
        return;
      }
      redirectToLogin("roadmap.html", "roadmap-required");
      return;
    }
    setSkillGapStatus("success", "Gap computed. Review your missing skills below.");
  } catch (error) {
    if (!error.authRedirect) clearPendingAuthReturnTo();
    setSkillGapStatus("error", `Gap analysis failed: ${error.message}`);
  } finally {
    computeButton.disabled = false;
    saveButton.disabled = false;
  }
}

function getGuestGapUses() {
  let storedUses;
  try {
    storedUses = localStorage.getItem(GUEST_GAP_USES_KEY);
  } catch {
    throw new Error("Guest assessments require browser storage. Log in to continue.");
  }
  if (storedUses === null) return { count: 0, corrupted: false };

  if (!/^(0|[1-9]\d*)$/.test(storedUses)) {
    setGuestGapUses(GUEST_GAP_LIMIT);
    return { count: GUEST_GAP_LIMIT, corrupted: true };
  }

  const uses = Number(storedUses);
  if (!Number.isSafeInteger(uses) || uses > GUEST_GAP_LIMIT) {
    setGuestGapUses(GUEST_GAP_LIMIT);
    return { count: GUEST_GAP_LIMIT, corrupted: true };
  }
  return { count: uses, corrupted: false };
}

function setGuestGapUses(uses) {
  try {
    localStorage.setItem(GUEST_GAP_USES_KEY, String(uses));
  } catch {
    throw new Error("Could not save guest assessment usage. Log in to continue.");
  }
}

function calculateGapLocally(career, possessedSkills) {
  const normalize = (skill) => skill.trim().toLowerCase();
  const possessedSet = new Set(possessedSkills.map(normalize));
  const missingSkills = career.requiredSkills
    .filter((skill) => !possessedSet.has(normalize(skill.skillName)))
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((skill) => ({
      skillName: skill.skillName,
      orderIndex: skill.orderIndex,
      tasks: skill.tasks,
    }));

  return {
    totalRequired: career.requiredSkills.length,
    missingCount: missingSkills.length,
    missingSkills,
  };
}

function renderGapResult(result) {
  const results = document.getElementById("gap-results");
  results.replaceChildren();
  results.hidden = false;

  const heading = document.createElement("h3");
  heading.textContent =
    `${result.totalRequired - result.missingCount}/${result.totalRequired} skills acquired`;
  results.appendChild(heading);

  const missingSkills = result.missingSkills || [];
  const summary = document.createElement("p");
  summary.textContent = `${missingSkills.length} skills remain for ${skillGapState.career.title}.`;
  results.appendChild(summary);

  if (missingSkills.length === 0) {
    const completeMessage = document.createElement("p");
    completeMessage.className = "badge badge-success";
    completeMessage.textContent = "All required skills are already covered.";
    results.appendChild(completeMessage);
    return;
  }

  const list = document.createElement("ul");
  missingSkills.forEach((skill) => {
    const item = document.createElement("li");
    const taskCount = (skill.tasks || []).length;
    item.textContent = `${skill.skillName} — ${taskCount} learning task${taskCount === 1 ? "" : "s"}`;
    list.appendChild(item);
  });
  results.appendChild(list);
}

function setSkillGapStatus(type, message) {
  const status = document.getElementById("statusMsg");
  status.textContent = message;
  status.className = `status ${type}`.trim();
}