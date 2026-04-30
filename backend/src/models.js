import { DataTypes, Sequelize } from "sequelize";
import fs from "node:fs";
import path from "node:path";

const storage = process.env.DB_STORAGE || "./data/team-task-manager.sqlite";
const storageDir = path.dirname(storage);

// Ensure SQLite directory exists in all environments (local + Railway).
if (storageDir && storageDir !== ".") {
  fs.mkdirSync(storageDir, { recursive: true });
}

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage,
  logging: false,
});

export const User = sequelize.define("User", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM("ADMIN", "MEMBER"),
    allowNull: false,
    defaultValue: "MEMBER",
  },
});

export const Project = sequelize.define("Project", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
});

export const ProjectMember = sequelize.define("ProjectMember", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
});

export const Task = sequelize.define("Task", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  status: {
    type: DataTypes.ENUM("TODO", "IN_PROGRESS", "DONE"),
    allowNull: false,
    defaultValue: "TODO",
  },
  dueDate: { type: DataTypes.DATE },
});

User.hasMany(Project, { foreignKey: "createdById", as: "createdProjects" });
Project.belongsTo(User, { foreignKey: "createdById", as: "creator" });

Project.belongsToMany(User, { through: ProjectMember, foreignKey: "projectId", as: "members" });
User.belongsToMany(Project, { through: ProjectMember, foreignKey: "userId", as: "projects" });

Project.hasMany(Task, { foreignKey: "projectId", as: "tasks" });
Task.belongsTo(Project, { foreignKey: "projectId", as: "project" });

User.hasMany(Task, { foreignKey: "assignedToId", as: "assignedTasks" });
Task.belongsTo(User, { foreignKey: "assignedToId", as: "assignee" });

export async function initDatabase() {
  await sequelize.sync();
}
