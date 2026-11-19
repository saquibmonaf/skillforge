/**
 * Renders skill-gap roadmaps and tracks task progress.
 * Requires api.js to be loaded first.
 */
const state = { careerId: null };

document.addEventListener("DOMContentLoaded", init);

async function init() {
  if (!requireAuth()) return;

  const user = Token.getUser();
  const greeting = document.getElementById("greeting");
  if (greeting && user && user.name) greeting.textContent = `Hi, ${user.name}!`;

  const logoutButton = document.getElementById("logoutBtn");
  if (logoutButton) {
    logoutButton.onclick = () => {
      Token.clear();
      Token.clearUser();
      location.replace("login.html");
    };
  }

  const careerSelect = document.getElementById("careerSelect");
  if (careerSelect) careerSelect.addEventListener("change", onCareerChange);

  const gapForm = document.getElementById("gapForm");
  if (gapForm) {
    gapForm.addEventListener("submit", (event) => {
      event.preventDefault();
      runGapAnalysis();
    });
  }

  await loadCareers();
}

async function loadCareers() {
  try {
    const { careers } = await api.get("/careers");
    const select = document.getElementById("careerSelect");
    if (!select) return;

    select.innerHTML = '<option value="">Select a career path</option>';
    careers.forEach((career) => {
      const option = document.createElement("option");
      option.value = career._id;
      option.textContent = career.difficultyLevel
        ? `${career.title} (${career.difficultyLevel})`
        : career.title;
      select.appendChild(option);
    });
  } catch (error) {
    showStatus("error", `Failed to load careers: ${error.message}`);
  }
}

async function onCareerChange(event) {
  state.careerId = event.target.value;
  if (!state.careerId) {
    clearDashboard();
    return;
  }
  await runGapAnalysis();
  await loadProgress();
}

async function runGapAnalysis() {
  if (!state.careerId) return;

  const possessedSkills = Array.from(
    document.querySelectorAll("#possessedSkills input[type=checkbox]:checked")
  ).map((checkbox) => checkbox.value);

  try {
    const data = await api.post("/gap-analysis", {
      careerId: state.careerId,
      possessedSkills,
    });
    renderRoadmap(data);
  } catch (error) {
    showStatus("error", `Gap analysis failed: ${error.message}`);
  }
}

function renderRoadmap({ missingSkills = [], totalRequired = 0, missingCount = 0 }) {
  const roadmap = document.getElementById("roadmap");
  if (!roadmap) return;
  roadmap.replaceChildren();

  const summary = document.createElement("p");
  summary.className = "roadmap-summary";
  summary.textContent =
    `${totalRequired - missingCount} of ${totalRequired} skills acquired — ` +
    `${missingCount} remaining to go.`;
  roadmap.appendChild(summary);

  if (missingSkills.length === 0) {
    const message = document.createElement("p");
    message.className = "success";
    message.textContent = "You already meet all required skills for this career!";
    roadmap.appendChild(message);
    return;
  }

  missingSkills.forEach((skill) => {
    const card = document.createElement("div");
    card.className = "skill-card";

    const heading = document.createElement("h4");
    heading.textContent = `${skill.orderIndex}. ${skill.skillName}`;
    card.appendChild(heading);

    const list = document.createElement("ul");
    (skill.tasks || []).forEach((task) => {
      const item = document.createElement("li");
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.skill = skill.skillName;
      checkbox.dataset.task = task;
      checkbox.addEventListener("change", onTaskToggle);
      label.append(checkbox, document.createTextNode(` ${task}`));
      item.appendChild(label);
      list.appendChild(item);
    });
    card.appendChild(list);
    roadmap.appendChild(card);
  });
}

async function loadProgress() {
  try {
    const response = await api.get(`/progress/${state.careerId}`);
    const data = response.data || response;
    setProgress(data.completionPercentage || 0);
    applySavedChecks(data.completedTasksList || data.completedTasks || []);
  } catch (error) {
    setProgress(0);
    applySavedChecks([]);
    showStatus("error", `Failed to load progress: ${error.message}`);
  }
}

function applySavedChecks(completedTasks) {
  document.querySelectorAll("#roadmap input[type=checkbox]").forEach((checkbox) => {
    const match = completedTasks.find(
      (task) =>
        task.skillName === checkbox.dataset.skill &&
        task.task === checkbox.dataset.task &&
        task.completed
    );
    checkbox.checked = Boolean(match);
  });
}

async function onTaskToggle(event) {
  const checkbox = event.target;
  try {
    const response = await api.patch("/progress", {
      careerId: state.careerId,
      updates: [{
        skillName: checkbox.dataset.skill,
        task: checkbox.dataset.task,
        completed: checkbox.checked,
      }],
    });
    const data = response.data || response;
    setProgress(data.completionPercentage || 0);
    showStatus("success", checkbox.checked ? "Task marked complete" : "Task unmarked");
  } catch (error) {
    checkbox.checked = !checkbox.checked;
    showStatus("error", `Could not save progress: ${error.message}`);
  }
}

function setProgress(percentage) {
  const value = Math.max(0, Math.min(100, Math.round(Number(percentage) || 0)));
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  if (progressBar) progressBar.style.width = `${value}%`;
  if (progressText) progressText.textContent = `${value}% complete`;
}

function clearDashboard() {
  const roadmap = document.getElementById("roadmap");
  if (roadmap) roadmap.replaceChildren();
  setProgress(0);
}

function showStatus(type, message) {
  const status = document.getElementById("statusMsg");
  if (!status) {
    if (type === "error") alert(message);
    return;
  }
  status.textContent = message;
  status.className = `status ${type}`;
  clearTimeout(showStatus.timer);
  showStatus.timer = setTimeout(() => {
    status.textContent = "";
    status.className = "status";
  }, 4000);
}