import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function Card({ title, value }) {
  return (
    <div className="card small">
      <p className="muted">{title}</p>
      <h3>{value}</h3>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", role: "MEMBER" });
  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [memberForm, setMemberForm] = useState({ projectId: "", userId: "" });
  const [taskForm, setTaskForm] = useState({
    projectId: "",
    title: "",
    description: "",
    dueDate: "",
    assignedToId: "",
  });

  const isAdmin = useMemo(() => user?.role === "ADMIN", [user]);
  const selectedProjectForMembers = projects.find((p) => String(p.id) === memberForm.projectId);
  const selectedProjectForTask = projects.find((p) => String(p.id) === taskForm.projectId);
  const assigneeOptions = selectedProjectForTask?.members || [];

  const loadAll = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [projectData, taskData, dashboardData, usersData] = await Promise.all([
        request("/projects", { token }),
        request("/tasks", { token }),
        request("/dashboard", { token }),
        isAdmin ? request("/users", { token }) : Promise.resolve([]),
      ]);
      setProjects(projectData);
      setTasks(taskData);
      setDashboard(dashboardData);
      setUsers(usersData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [token, isAdmin]);

  useEffect(() => {
    if (!selectedProjectForTask) return;
    const stillValid = assigneeOptions.some((member) => String(member.id) === taskForm.assignedToId);
    if (!stillValid) {
      setTaskForm((prev) => ({ ...prev, assignedToId: assigneeOptions[0] ? String(assigneeOptions[0].id) : "" }));
    }
  }, [taskForm.projectId, projects]);

  const onAuthSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const path = mode === "signup" ? "/auth/signup" : "/auth/login";
      const payload = mode === "signup" ? authForm : { email: authForm.email, password: authForm.password };
      const data = await request(path, { method: "POST", body: payload });
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await request("/projects", { method: "POST", token, body: projectForm });
      setProjectForm({ name: "", description: "" });
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    setError("");
    if (!memberForm.projectId || !memberForm.userId) {
      setError("Please select both project and user.");
      return;
    }
    try {
      await request(`/projects/${memberForm.projectId}/members`, {
        method: "POST",
        token,
        body: { userId: Number(memberForm.userId) },
      });
      setMemberForm((prev) => ({ ...prev, userId: "" }));
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    setError("");
    if (!taskForm.projectId || !taskForm.assignedToId) {
      setError("Please select project and assignee.");
      return;
    }
    try {
      await request(`/projects/${taskForm.projectId}/tasks`, {
        method: "POST",
        token,
        body: {
          title: taskForm.title,
          description: taskForm.description || undefined,
          dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
          assignedToId: Number(taskForm.assignedToId),
        },
      });
      setTaskForm({ projectId: "", title: "", description: "", dueDate: "", assignedToId: "" });
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const setTaskStatus = async (taskId, status) => {
    setError("");
    try {
      await request(`/tasks/${taskId}/status`, { method: "PATCH", token, body: { status } });
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    setProjects([]);
    setUsers([]);
    setTasks([]);
    setDashboard(null);
    setError("");
  };

  if (!token) {
    return (
      <main className="container">
        <section className="card auth-card">
          <h1>Team Task Manager</h1>
          <form onSubmit={onAuthSubmit} className="form">
            {mode === "signup" && (
              <>
                <input
                  placeholder="Name"
                  value={authForm.name}
                  onChange={(e) => setAuthForm((v) => ({ ...v, name: e.target.value }))}
                  required
                />
                <select value={authForm.role} onChange={(e) => setAuthForm((v) => ({ ...v, role: e.target.value }))}>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </>
            )}
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm((v) => ({ ...v, email: e.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm((v) => ({ ...v, password: e.target.value }))}
              required
            />
            <button type="submit">{mode === "login" ? "Login" : "Create Account"}</button>
          </form>
          <p className="switch-label">or</p>
          <button className="ghost switch-auth" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            Switch to {mode === "login" ? "Signup" : "Login"}
          </button>
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="topbar">
        <div>
          <h1>Team Task Manager</h1>
          <p className="muted">Logged in as {user?.name} ({user?.role})</p>
        </div>
        <button onClick={logout}>Logout</button>
      </header>
      {error && <p className="error">{error}</p>}
      <section className="grid four">
        <Card title="TODO" value={dashboard?.summary?.todo || 0} />
        <Card title="IN_PROGRESS" value={dashboard?.summary?.inProgress || 0} />
        <Card title="DONE" value={dashboard?.summary?.done || 0} />
        <Card title="OVERDUE" value={dashboard?.summary?.overdue || 0} />
      </section>
      {isAdmin && (
        <section className="grid three">
          <form className="card form" onSubmit={createProject}>
            <h3>Create Project</h3>
            <input
              placeholder="Project name"
              value={projectForm.name}
              onChange={(e) => setProjectForm((v) => ({ ...v, name: e.target.value }))}
              required
            />
            <textarea
              placeholder="Description"
              value={projectForm.description}
              onChange={(e) => setProjectForm((v) => ({ ...v, description: e.target.value }))}
            />
            <button type="submit">Create</button>
          </form>
          <form className="card form" onSubmit={addMember}>
            <h3>Add Member to Project</h3>
            <select value={memberForm.projectId} onChange={(e) => setMemberForm((v) => ({ ...v, projectId: e.target.value }))} required>
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project.id} value={String(project.id)}>
                  {project.name} (ID: {project.id})
                </option>
              ))}
            </select>
            <select value={memberForm.userId} onChange={(e) => setMemberForm((v) => ({ ...v, userId: e.target.value }))} required>
              <option value="">Select User</option>
              {users.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name} ({u.email}) - {u.role}
                </option>
              ))}
            </select>
            {selectedProjectForMembers ? (
              <p className="muted">Current members: {selectedProjectForMembers.members?.length || 0}</p>
            ) : null}
            <button type="submit">Add</button>
          </form>
          <form className="card form" onSubmit={createTask}>
            <h3>Create Task</h3>
            <select
              value={taskForm.projectId}
              onChange={(e) => setTaskForm((v) => ({ ...v, projectId: e.target.value, assignedToId: "" }))}
              required
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project.id} value={String(project.id)}>
                  {project.name} (ID: {project.id})
                </option>
              ))}
            </select>
            <input
              placeholder="Task title"
              value={taskForm.title}
              onChange={(e) => setTaskForm((v) => ({ ...v, title: e.target.value }))}
              required
            />
            <textarea
              placeholder="Task description"
              value={taskForm.description}
              onChange={(e) => setTaskForm((v) => ({ ...v, description: e.target.value }))}
            />
            <input
              type="datetime-local"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm((v) => ({ ...v, dueDate: e.target.value }))}
            />
            <select
              value={taskForm.assignedToId}
              onChange={(e) => setTaskForm((v) => ({ ...v, assignedToId: e.target.value }))}
              required
              disabled={!taskForm.projectId}
            >
              <option value="">{taskForm.projectId ? "Select Assignee" : "Select project first"}</option>
              {assigneeOptions.map((member) => (
                <option key={member.id} value={String(member.id)}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
            <button type="submit">Create</button>
          </form>
        </section>
      )}
      <section className="grid two">
        <div className="card">
          <h3>Projects</h3>
          <ul className="list">
            {projects.map((project) => (
              <li key={project.id}>
                <b>{project.name}</b> (ID: {project.id}) - Members: {project.members?.length || 0}
              </li>
            ))}
            {!projects.length && <li className="muted">No projects yet</li>}
          </ul>
        </div>
        <div className="card">
          <h3>Tasks</h3>
          {loading ? <p className="muted">Loading...</p> : null}
          <ul className="list">
            {tasks.map((task) => (
              <li key={task.id}>
                <div>
                  <b>{task.title}</b> (ID: {task.id}) - {task.status}
                </div>
                <div className="muted">
                  Project: {task.project?.name || "-"} | Assignee: {task.assignee?.name || "-"}
                </div>
                <div className="actions">
                  <button onClick={() => setTaskStatus(task.id, "TODO")}>TODO</button>
                  <button onClick={() => setTaskStatus(task.id, "IN_PROGRESS")}>IN_PROGRESS</button>
                  <button onClick={() => setTaskStatus(task.id, "DONE")}>DONE</button>
                </div>
              </li>
            ))}
            {!tasks.length && <li className="muted">No tasks yet</li>}
          </ul>
        </div>
      </section>
    </main>
  );
}
