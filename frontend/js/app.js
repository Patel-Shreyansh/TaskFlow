// ---- Auth guard: nothing below runs without a valid-looking session ----
if (!TokenStore.get()) {
  window.location.href = "login.html";
}

// ---- App state (kept in sync with the backend after every mutation) ----
let members = [];
let teams = [];
let tasks = [];

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

// ---- Theme ----
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("themeToggle").textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem("taskflow_theme", theme);
}

function initTheme() {
  const saved = localStorage.getItem("taskflow_theme") || "light";
  applyTheme(saved);

  document.getElementById("themeToggle").onclick = () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  };
}

// ---- Topbar / logout ----
function initTopbar() {
  const user = TokenStore.getUser();
  if (user) {
    document.getElementById("usernameBadge").textContent = `👤 ${user.username}`;
  }

  document.getElementById("logoutBtn").onclick = () => {
    TokenStore.clear();
    window.location.href = "login.html";
  };
}

// ---- Navigation ----
function initNavigation() {
  document.querySelectorAll(".menu-item").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".menu-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const page = btn.dataset.page;
      document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
      document.getElementById(page).classList.add("active");
      document.getElementById("pageTitle").innerText = btn.innerText;

      if (page === "progress") renderProgress();
    };
  });
}

// ---- Members ----
async function loadMembers() {
  try {
    const data = await Api.getMembers();
    members = data.members;
    renderMembers();
    updateAssigneeOptions();
  } catch (err) {
    Toast.error(err.message);
  }
}

function renderMembers() {
  const list = document.getElementById("membersList");

  if (members.length === 0) {
    list.innerHTML = `<p class="empty-state">No members yet. Add your first teammate above.</p>`;
  } else {
    list.innerHTML = members
      .map(
        (m) => `
        <div class="list-row">
          <span>${escapeHtml(m.name)}${m.email ? ` <span style="color:var(--text-muted)">(${escapeHtml(m.email)})</span>` : ""}</span>
          <button class="danger" onclick="removeMember(${m.id})">Remove</button>
        </div>`
      )
      .join("");
  }

  document.getElementById("totalMembers").innerText = members.length;
}

async function removeMember(id) {
  try {
    await Api.deleteMember(id);
    Toast.success("Member removed");
    await loadMembers();
    await loadTeams();
  } catch (err) {
    Toast.error(err.message);
  }
}

function initMembers() {
  document.getElementById("memberAdd").onclick = async () => {
    const nameInput = document.getElementById("memberName");
    const emailInput = document.getElementById("memberEmail");
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!name) {
      Toast.error("Enter a member name");
      return;
    }

    try {
      await Api.createMember({ name, email: email || undefined });
      nameInput.value = "";
      emailInput.value = "";
      Toast.success("Member added");
      await loadMembers();
    } catch (err) {
      Toast.error(err.message);
    }
  };
}

// ---- Teams ----
async function loadTeams() {
  try {
    const data = await Api.getTeams();
    teams = data.teams;
    renderTeams();
    updateAssigneeOptions();
  } catch (err) {
    Toast.error(err.message);
  }
}

function renderTeams() {
  const list = document.getElementById("teamsList");

  if (teams.length === 0) {
    list.innerHTML = `<p class="empty-state">No teams yet. Group your members into a team above.</p>`;
  } else {
    list.innerHTML = teams
      .map((t) => {
        const memberNames = t.memberIds
          .map((id) => members.find((m) => m.id === id)?.name)
          .filter(Boolean)
          .join(", ");
        return `
        <div class="list-row">
          <span><strong>${escapeHtml(t.name)}</strong>${memberNames ? ` &mdash; ${escapeHtml(memberNames)}` : ""}</span>
          <button class="danger" onclick="removeTeam(${t.id})">Delete</button>
        </div>`;
      })
      .join("");
  }
}

async function removeTeam(id) {
  try {
    await Api.deleteTeam(id);
    Toast.success("Team deleted");
    await loadTeams();
  } catch (err) {
    Toast.error(err.message);
  }
}

function initTeams() {
  document.getElementById("teamAdd").onclick = async () => {
    const nameInput = document.getElementById("teamName");
    const name = nameInput.value.trim();
    const selected = Array.from(document.getElementById("teamMembers").selectedOptions).map((o) =>
      parseInt(o.value, 10)
    );

    if (!name) {
      Toast.error("Enter a team name");
      return;
    }

    try {
      await Api.createTeam({ name, memberIds: selected });
      nameInput.value = "";
      Toast.success("Team created");
      await loadTeams();
    } catch (err) {
      Toast.error(err.message);
    }
  };
}

// ---- Shared assignee dropdowns ----
function updateAssigneeOptions() {
  const taskDropdown = document.getElementById("taskAssignee");
  const current = taskDropdown.value;
  taskDropdown.innerHTML = `<option value="">Assign to</option>`;

  members.forEach((m) => {
    taskDropdown.innerHTML += `<option value="member:${m.id}">${escapeHtml(m.name)}</option>`;
  });
  teams.forEach((t) => {
    taskDropdown.innerHTML += `<option value="team:${t.id}">Team: ${escapeHtml(t.name)}</option>`;
  });
  taskDropdown.value = current || "";

  const teamMembersSelect = document.getElementById("teamMembers");
  teamMembersSelect.innerHTML = members
    .map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`)
    .join("");
}

function assigneeLabel(task) {
  if (!task.assigneeType || !task.assigneeId) return "Unassigned";
  if (task.assigneeType === "member") {
    return members.find((m) => m.id === task.assigneeId)?.name || "Unassigned";
  }
  return teams.find((t) => t.id === task.assigneeId)?.name
    ? `Team: ${teams.find((t) => t.id === task.assigneeId).name}`
    : "Unassigned";
}

// ---- Tasks ----
async function loadTasks() {
  try {
    const search = document.getElementById("taskSearch").value.trim();
    const priority = document.getElementById("priorityFilter").value;
    const params = {};
    if (search) params.search = search;
    if (priority) params.priority = priority;

    const data = await Api.getTasks(params);
    tasks = data.tasks;
    renderTasks();
  } catch (err) {
    Toast.error(err.message);
  }
}

function isOverdue(task) {
  if (!task.deadline || task.status === "completed") return false;
  const today = new Date().toISOString().slice(0, 10);
  return task.deadline < today;
}

function renderTasks() {
  ["todoList", "inprogressList", "completedList"].forEach((id) => {
    document.getElementById(id).innerHTML = "";
  });

  const counts = { todo: 0, inprogress: 0, completed: 0 };

  tasks.forEach((t) => {
    counts[t.status] = (counts[t.status] || 0) + 1;

    const div = document.createElement("div");
    div.className = "task-card" + (isOverdue(t) ? " overdue" : "");
    div.draggable = true;
    div.dataset.id = t.id;

    div.innerHTML = `
      <button class="remove-btn" title="Delete task">✕</button>
      <strong>${escapeHtml(t.title)}</strong>
      ${t.description ? `<div style="font-size:13px;color:var(--text-muted)">${escapeHtml(t.description)}</div>` : ""}
      <div class="task-meta">
        <span class="priority-badge priority-${t.priority}">${t.priority}</span>
        <span>${escapeHtml(assigneeLabel(t))}</span>
      </div>
      ${t.deadline ? `<div class="task-meta"><span>${isOverdue(t) ? "⚠️ Overdue" : "Due"}</span><span>${t.deadline}</span></div>` : ""}
    `;

    div.querySelector(".remove-btn").onclick = () => deleteTask(t.id);

    div.ondragstart = (e) => {
      e.dataTransfer.setData("text/plain", String(t.id));
    };

    const targetList = document.getElementById(`${t.status}List`);
    if (targetList) targetList.appendChild(div);
  });

  document.getElementById("todoCount").innerText = counts.todo;
  document.getElementById("inprogressCount").innerText = counts.inprogress;
  document.getElementById("completedCount").innerText = counts.completed;

  enableDragTargets();
  refreshDashboardFromLocalState();
}

function enableDragTargets() {
  document.querySelectorAll(".column").forEach((col) => {
    col.ondragover = (e) => {
      e.preventDefault();
      col.classList.add("drag-over");
    };
    col.ondragleave = () => col.classList.remove("drag-over");

    col.ondrop = async (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");

      const id = e.dataTransfer.getData("text/plain");
      const task = tasks.find((t) => String(t.id) === id);
      if (!task || task.status === col.dataset.status) return;

      try {
        await Api.updateTask(task.id, { status: col.dataset.status });
        task.status = col.dataset.status;
        renderTasks();
        loadDashboardStats();
      } catch (err) {
        Toast.error(err.message);
      }
    };
  });
}

async function deleteTask(id) {
  try {
    await Api.deleteTask(id);
    tasks = tasks.filter((t) => t.id !== id);
    renderTasks();
    loadDashboardStats();
  } catch (err) {
    Toast.error(err.message);
  }
}

function initTasks() {
  document.getElementById("createTask").onclick = async () => {
    const titleInput = document.getElementById("taskTitle");
    const descInput = document.getElementById("taskDescription");
    const priority = document.getElementById("taskPriority").value;
    const assigneeValue = document.getElementById("taskAssignee").value;
    const deadlineInput = document.getElementById("taskDeadline");

    const title = titleInput.value.trim();
    if (!title) {
      Toast.error("Enter a task title");
      return;
    }

    let assigneeType;
    let assigneeId;
    if (assigneeValue) {
      const [type, id] = assigneeValue.split(":");
      assigneeType = type;
      assigneeId = parseInt(id, 10);
    }

    try {
      await Api.createTask({
        title,
        description: descInput.value.trim() || undefined,
        priority,
        assigneeType,
        assigneeId,
        deadline: deadlineInput.value || undefined,
      });

      titleInput.value = "";
      descInput.value = "";
      deadlineInput.value = "";
      Toast.success("Task created");
      await loadTasks();
      loadDashboardStats();
    } catch (err) {
      Toast.error(err.message);
    }
  };

  let searchTimer;
  document.getElementById("taskSearch").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadTasks, 300);
  });
  document.getElementById("priorityFilter").addEventListener("change", loadTasks);
}

// ---- Dashboard ----
async function loadDashboardStats() {
  try {
    const stats = await Api.getTaskStats();
    document.getElementById("totalTasks").innerText = stats.total;
    document.getElementById("completedTasks").innerText = stats.completed;
    document.getElementById("inProgressTasks").innerText = stats.inProgress;
    document.getElementById("overdueTasks").innerText = stats.overdue;
  } catch (err) {
    Toast.error(err.message);
  }
}

// Cheap local refresh (used right after task list re-renders) so the
// dashboard doesn't feel stale between full stats refetches.
function refreshDashboardFromLocalState() {
  document.getElementById("totalMembers").innerText = members.length;
}

// ---- Progress ----
function renderProgress() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "completed").length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  document.getElementById("progressBar").style.width = `${percent}%`;
  document.getElementById("progressText").innerText = total
    ? `${percent}% completed (${done} of ${total} tasks)`
    : "No tasks yet - create one from the Tasks tab.";

  const priorities = ["high", "medium", "low"];
  document.getElementById("priorityBreakdown").innerHTML = priorities
    .map((p) => {
      const count = tasks.filter((t) => t.priority === p).length;
      return `
        <div class="card">
          <span class="priority-badge priority-${p}">${p}</span>
          <h2>${count}</h2>
        </div>`;
    })
    .join("");
}

// ---- Boot ----
async function boot() {
  initTheme();
  initTopbar();
  initNavigation();
  initMembers();
  initTeams();
  initTasks();

  await Promise.all([loadMembers(), loadTeams()]);
  await loadTasks();
  await loadDashboardStats();
}

boot();
