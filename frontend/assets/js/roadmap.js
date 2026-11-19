const roadmapState = {
  careerId: null,
  possessedSkills: [],
  career: null,
  completedTasks: [],
};

document.addEventListener("DOMContentLoaded", initializeRoadmap);

async function initializeRoadmap() {
  if (!requireAuth()) return;

  roadmapState.careerId = localStorage.getItem("sf_career_id");
  if (!roadmapState.careerId) {
    location.replace("skill-gap.html");
    return;
  }

  try {
    const savedSkills = JSON.parse(localStorage.getItem("sf_possessed_skills") || "[]");
    roadmapState.possessedSkills = Array.isArray(savedSkills) ? savedSkills : [];
  } catch (error) {
    setRoadmapStatus("error", `Saved skill selection is invalid: ${error.message}`);
    roadmapState.possessedSkills = [];
  }

  try {
    const [careersResponse, gapResponse, progressResponse] = await Promise.all([
      api.get("/careers"),
      api.post("/gap-analysis", {
        careerId: roadmapState.careerId,
        possessedSkills: roadmapState.possessedSkills,
      }),
      api.get(`/progress/${roadmapState.careerId}`),
    ]);

    roadmapState.career = (careersResponse.careers || []).find(
      (career) => career._id === roadmapState.careerId
    );
    if (!roadmapState.career) {
      throw new Error("The selected career was not found. Choose a career again.");
    }

    document.getElementById("careerTitle").textContent =
      `${roadmapState.career.title} — Execution Roadmap`;
    renderRoadmapTasks(gapResponse.missingSkills || []);

    const progress = progressResponse.data || progressResponse;
    roadmapState.completedTasks = progress.completedTasksList || [];
    applySavedTasks();
    updateProgress(progress);
  } catch (error) {
    setRoadmapStatus("error", `Could not load roadmap: ${error.message}`);
  }
}

function renderRoadmapTasks(missingSkills) {
  const container = document.getElementById("roadmap");
  container.replaceChildren();

  if (missingSkills.length === 0) {
    const message = document.createElement("p");
    message.className = "badge badge-success";
    message.textContent = "You already meet all required skills for this career.";
    container.appendChild(message);
    return;
  }

  missingSkills.forEach((skill) => {
    const section = document.createElement("section");
    section.className = "roadmap-skill";

    const heading = document.createElement("h3");
    heading.textContent = `${skill.orderIndex}. ${skill.skillName}`;
    section.appendChild(heading);

    const list = document.createElement("ul");
    list.className = "roadmap-task-list";
    (skill.tasks || []).forEach((task) => {
      const item = document.createElement("li");
      const label = document.createElement("label");
      label.className = "roadmap-task";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.skill = skill.skillName;
      checkbox.dataset.task = task;
      checkbox.addEventListener("change", onRoadmapTaskChange);

      const taskText = document.createElement("span");
      taskText.textContent = task;
      label.append(checkbox, taskText);
      item.appendChild(label);
      list.appendChild(item);
    });
    section.appendChild(list);
    container.appendChild(section);
  });
}

function applySavedTasks() {
  document.querySelectorAll("#roadmap input[type=checkbox]").forEach((checkbox) => {
    checkbox.checked = roadmapState.completedTasks.some(
      (task) =>
        task.skillName === checkbox.dataset.skill &&
        task.task === checkbox.dataset.task &&
        task.completed
    );
  });
}

async function onRoadmapTaskChange(event) {
  const checkbox = event.target;
  checkbox.disabled = true;

  try {
    const response = await api.patch("/progress", {
      careerId: roadmapState.careerId,
      updates: [{
        skillName: checkbox.dataset.skill,
        task: checkbox.dataset.task,
        completed: checkbox.checked,
      }],
    });
    const progress = response.data || response;
    roadmapState.completedTasks = progress.completedTasksList || roadmapState.completedTasks;
    updateProgress(progress);
    setRoadmapStatus("success", checkbox.checked ? "Task marked complete." : "Task marked incomplete.");
  } catch (error) {
    checkbox.checked = !checkbox.checked;
    setRoadmapStatus("error", `Could not save progress: ${error.message}`);
  } finally {
    checkbox.disabled = false;
  }
}

function updateProgress(progress) {
  const percentage = Math.max(0, Math.min(100, Math.round(Number(progress.completionPercentage) || 0)));
  const completed = Number(progress.completedTasks) || 0;
  const total = Number(progress.totalTasks) || 0;

  document.getElementById("progressBar").style.width = `${percentage}%`;
  document.getElementById("percentage-label").textContent = `${percentage}%`;
  document.getElementById("progressText").textContent =
    `${completed} / ${total} Tasks Completed`;
}

function setRoadmapStatus(type, message) {
  const status = document.getElementById("statusMsg");
  status.textContent = message;
  status.className = `status ${type}`.trim();
}