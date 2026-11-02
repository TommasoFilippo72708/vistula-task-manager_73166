let API = "";
let HEADERS = {};
let editingId = null;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descInput = document.getElementById("task-description");
const submitBtn = document.getElementById("task-submit");
const listEl = document.getElementById("task-list");
const statusEl = document.getElementById("status-message");

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = isError ? "error" : "";
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: { ...HEADERS, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

async function loadConfig() {
  const res = await fetch("config.json");
  if (!res.ok) throw new Error("Could not load config.json");
  const cfg = await res.json();
  API = `${cfg.supabaseUrl}/rest/v1/${cfg.tableName}`;
  HEADERS = {
    apikey: cfg.supabasePublishableKey,
    Authorization: `Bearer ${cfg.supabasePublishableKey}`,
    "Content-Type": "application/json",
  };
}

function render(tasks) {
  listEl.innerHTML = "";
  if (!tasks.length) {
    listEl.innerHTML = '<p class="empty">No tasks yet. Add your first task above.</p>';
    return;
  }
  for (const t of tasks) {
    const item = document.createElement("div");
    item.className = "task-item" + (t.completed ? " done" : "");
    item.dataset.id = t.id;

    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = t.title;

    const desc = document.createElement("p");
    desc.className = "task-description";
    desc.textContent = t.description || "";

    const status = document.createElement("p");
    status.className = "task-status";
    status.textContent = t.completed ? "Completed" : "Not completed";

    const actions = document.createElement("div");
    actions.className = "actions";

    const toggle = document.createElement("button");
    toggle.className = "toggle-task";
    toggle.type = "button";
    toggle.textContent = t.completed ? "Mark incomplete" : "Mark complete";
    toggle.addEventListener("click", () => toggleTask(t));

    const edit = document.createElement("button");
    edit.className = "edit-task";
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => startEdit(t));

    const del = document.createElement("button");
    del.className = "delete-task";
    del.type = "button";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteTask(t.id));

    actions.append(toggle, edit, del);
    item.append(title, desc, status, actions);
    listEl.appendChild(item);
  }
}

async function loadTasks() {
  try {
    const tasks = await api("?select=*&order=id.asc");
    render(tasks);
  } catch (e) {
    setStatus("Could not load tasks. " + e.message, true);
  }
}

function startEdit(t) {
  editingId = t.id;
  titleInput.value = t.title;
  descInput.value = t.description || "";
  submitBtn.textContent = "Save changes";
  titleInput.focus();
  setStatus("Editing task #" + t.id);
}

function resetForm() {
  editingId = null;
  form.reset();
  submitBtn.textContent = "Add task";
}

async function toggleTask(t) {
  try {
    await api(`?id=eq.${t.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: !t.completed }),
    });
    setStatus("Task updated.");
    await loadTasks();
  } catch (e) {
    setStatus("Could not update task. " + e.message, true);
  }
}

async function deleteTask(id) {
  try {
    await api(`?id=eq.${id}`, { method: "DELETE" });
    if (editingId === id) resetForm();
    setStatus("Task deleted.");
    await loadTasks();
  } catch (e) {
    setStatus("Could not delete task. " + e.message, true);
  }
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  if (!title) { setStatus("Title is required.", true); return; }
  try {
    if (editingId === null) {
      await api("", { method: "POST", body: JSON.stringify({ title, description }) });
      setStatus("Task added.");
    } else {
      await api(`?id=eq.${editingId}`, { method: "PATCH", body: JSON.stringify({ title, description }) });
      setStatus("Task saved.");
    }
    resetForm();
    await loadTasks();
  } catch (e) {
    setStatus("Could not save task. " + e.message, true);
  }
});

(async () => {
  try {
    await loadConfig();
    await loadTasks();
  } catch (e) {
    setStatus("Configuration error. " + e.message, true);
  }
})();
