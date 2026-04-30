import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { initDatabase, Project, ProjectMember, Task, User } from "./models.js";
import {
  createTaskSchema,
  loginSchema,
  projectMemberSchema,
  projectSchema,
  signupSchema,
  updateTaskStatusSchema,
} from "./validators.js";

const app = express();
const PORT = Number(process.env.PORT || 5001);

app.use(cors());
app.use(express.json());

const signToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Token is required" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.userId);
    if (!user) return res.status(401).json({ message: "Invalid token user" });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied for this role" });
  }
  return next();
};

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "team-task-manager-backend" });
});

app.post(
  "/api/auth/signup",
  asyncHandler(async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const existing = await User.findOne({ where: { email: parsed.data.email } });
    if (existing) return res.status(409).json({ message: "Email already exists" });

    const user = await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: parsed.data.role || "MEMBER",
    });

    return res.status(201).json({
      token: signToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const user = await User.findOne({ where: { email: parsed.data.email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    return res.json({
      token: signToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

app.post(
  "/api/projects",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const project = await Project.create({
      name: parsed.data.name,
      description: parsed.data.description,
      createdById: req.user.id,
    });

    await ProjectMember.create({ projectId: project.id, userId: req.user.id });
    return res.status(201).json(project);
  })
);

app.get(
  "/api/projects",
  requireAuth,
  asyncHandler(async (req, res) => {
    const memberships = await ProjectMember.findAll({
      where: { userId: req.user.id },
      attributes: ["projectId"],
    });
    const ids = memberships.map((m) => m.projectId);
    const projects = await Project.findAll({
      where: { id: { [Op.in]: ids.length ? ids : [0] } },
      include: [{ model: User, as: "members", attributes: ["id", "name", "email", "role"] }],
      order: [["createdAt", "DESC"]],
    });

    return res.json(projects);
  })
);

app.get(
  "/api/users",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const users = await User.findAll({
      attributes: ["id", "name", "email", "role"],
      order: [["createdAt", "DESC"]],
    });
    return res.json(users);
  })
);

app.post(
  "/api/projects/:projectId/members",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = projectMemberSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const project = await Project.findByPk(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const user = await User.findByPk(parsed.data.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const [member] = await ProjectMember.findOrCreate({
      where: { projectId: project.id, userId: user.id },
      defaults: { projectId: project.id, userId: user.id },
    });

    return res.status(201).json(member);
  })
);

app.post(
  "/api/projects/:projectId/tasks",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const project = await Project.findByPk(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isMember = await ProjectMember.findOne({
      where: { projectId: project.id, userId: parsed.data.assignedToId },
    });
    if (!isMember) {
      return res.status(400).json({ message: "Assignee must be a member of the project" });
    }

    const task = await Task.create({
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      assignedToId: parsed.data.assignedToId,
      projectId: project.id,
      status: "TODO",
    });
    return res.status(201).json(task);
  })
);

app.get(
  "/api/tasks",
  requireAuth,
  asyncHandler(async (req, res) => {
    const where = req.user.role === "ADMIN" ? {} : { assignedToId: req.user.id };
    const tasks = await Task.findAll({
      where,
      include: [
        { model: Project, as: "project", attributes: ["id", "name"] },
        { model: User, as: "assignee", attributes: ["id", "name", "email"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    return res.json(tasks);
  })
);

app.patch(
  "/api/tasks/:taskId/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = updateTaskStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const task = await Task.findByPk(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const canUpdate = req.user.role === "ADMIN" || task.assignedToId === req.user.id;
    if (!canUpdate) return res.status(403).json({ message: "You cannot update this task" });

    task.status = parsed.data.status;
    await task.save();
    return res.json(task);
  })
);

app.get(
  "/api/dashboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const baseWhere = req.user.role === "ADMIN" ? {} : { assignedToId: req.user.id };

    const [todo, inProgress, done, overdue] = await Promise.all([
      Task.count({ where: { ...baseWhere, status: "TODO" } }),
      Task.count({ where: { ...baseWhere, status: "IN_PROGRESS" } }),
      Task.count({ where: { ...baseWhere, status: "DONE" } }),
      Task.count({
        where: {
          ...baseWhere,
          dueDate: { [Op.lt]: now },
          status: { [Op.ne]: "DONE" },
        },
      }),
    ]);

    const tasks = await Task.findAll({
      where: baseWhere,
      include: [{ model: Project, as: "project", attributes: ["id", "name"] }],
      order: [["dueDate", "ASC"]],
    });

    return res.json({
      summary: { todo, inProgress, done, overdue },
      tasks,
    });
  })
);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in .env");
  }
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
