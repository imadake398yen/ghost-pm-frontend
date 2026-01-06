import { useAuthStore } from "@/stores/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

// Type definitions
export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamDetail extends Team {
  _count?: {
    projects: number;
    members: number;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  joinedAt: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: string;
  teamId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}

export interface ProjectWithTeam extends Project {
  team: {
    id: string;
    slug: string;
    name: string;
  };
  role?: string;
}

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = 1 | 2 | 3 | 4; // 1: urgent, 2: high, 3: medium, 4: low

export interface ProjectStatus {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  isDone: number; // 0 or 1
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  statusId?: string | null;
  priority: TaskPriority;
  projectId: string;
  assigneeId?: string | null;
  assignee?: User | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Worklog {
  id: string;
  taskId: string;
  userId: string;
  hours: number;
  description?: string | null;
  loggedAt: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority?: TaskPriority;
  statusId?: string;
  assigneeId?: string;
  dueDate?: string;
  estimatedHours?: number;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  statusId?: string | null;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
}

export interface DashboardStats {
  totalTeams: number;
  totalProjects: number;
  assignedTasks: number;
  pendingTasks: number;
}

export interface WorklogEntry {
  id: string;
  taskId: string;
  userId: string;
  hours: number;
  description?: string | null;
  loggedAt: string;
  createdAt: string;
  taskTitle: string;
  userName: string;
  userEmail: string;
}

export interface WorklogByUser {
  userId: string;
  userName: string;
  userEmail: string;
  totalHours: number;
  entries: WorklogEntry[];
}

export interface WorklogByTask {
  taskId: string;
  taskTitle: string;
  totalHours: number;
  entries: WorklogEntry[];
}

export interface WorklogReport {
  totalHours: number;
  byUser: WorklogByUser[];
  byTask: WorklogByTask[];
  entries: WorklogEntry[];
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const { accessToken, logout } = useAuthStore.getState();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  if (!skipAuth && accessToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401) {
    logout();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  // レスポンスがJSONかどうかを確認
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    // JSONでないが成功の場合（deleteなど）
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "API Error");
  }

  return data.data;
}

// API helpers
export const api = {
  // Auth
  getMe: () => apiFetch<{ id: string; name: string; email: string; avatarUrl?: string }>("/auth/me"),

  // Teams
  getTeams: () => apiFetch<Team[]>("/teams"),
  createTeam: (data: { name: string; slug: string; description?: string }) =>
    apiFetch<Team>("/teams", { method: "POST", body: JSON.stringify(data) }),
  getTeam: (teamId: string) => apiFetch<TeamDetail>(`/teams/${teamId}`),
  getTeamMembers: (teamId: string) => apiFetch<TeamMember[]>(`/teams/${teamId}/members`),

  // Projects
  getProjects: (teamId: string) => apiFetch<Project[]>(`/teams/${teamId}/projects`),
  createProject: (teamId: string, data: { name: string; slug: string; description?: string }) =>
    apiFetch<Project>(`/teams/${teamId}/projects`, { method: "POST", body: JSON.stringify(data) }),

  // Projects (single)
  getProject: (projectId: string) => apiFetch<Project>(`/projects/${projectId}`),

  // Project Statuses
  getProjectStatuses: (projectId: string) =>
    apiFetch<ProjectStatus[]>(`/projects/${projectId}/statuses`),
  createStatus: (
    projectId: string,
    data: { name: string; slug: string; color: string; position: number; isDone: number }
  ) =>
    apiFetch<ProjectStatus>(`/projects/${projectId}/statuses`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateStatus: (
    projectId: string,
    statusId: string,
    data: { name?: string; color?: string; isDone?: number }
  ) =>
    apiFetch<ProjectStatus>(`/projects/${projectId}/statuses/${statusId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteStatus: (projectId: string, statusId: string) =>
    apiFetch<void>(`/projects/${projectId}/statuses/${statusId}`, { method: "DELETE" }),
  reorderStatuses: (projectId: string, statusIds: string[]) =>
    apiFetch<ProjectStatus[]>(`/projects/${projectId}/statuses/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ statusIds }),
    }),

  // Tasks
  getTasks: (projectId: string, params?: { status?: TaskStatus; assigneeId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.assigneeId) searchParams.set("assigneeId", params.assigneeId);
    const query = searchParams.toString();
    return apiFetch<Task[]>(`/projects/${projectId}/tasks${query ? `?${query}` : ""}`);
  },
  getTask: (taskId: string) => apiFetch<Task>(`/tasks/${taskId}`),
  createTask: (projectId: string, data: CreateTaskData) =>
    apiFetch<Task>(`/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(data) }),
  updateTask: (taskId: string, data: UpdateTaskData) =>
    apiFetch<Task>(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) }),
  updateTaskStatus: (taskId: string, status: TaskStatus) =>
    apiFetch<Task>(`/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  updateTaskStatusById: (taskId: string, statusId: string) =>
    apiFetch<Task>(`/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ statusId }) }),
  deleteTask: (taskId: string) =>
    apiFetch<void>(`/tasks/${taskId}`, { method: "DELETE" }),

  // Worklogs
  getWorklogs: (taskId: string) =>
    apiFetch<Worklog[]>(`/tasks/${taskId}/worklogs`),
  createWorklog: (taskId: string, data: { hours: number; description?: string; loggedAt?: string }) =>
    apiFetch<Worklog>(`/tasks/${taskId}/worklogs`, { method: "POST", body: JSON.stringify(data) }),

  // Comments
  getComments: (taskId: string) =>
    apiFetch<Comment[]>(`/tasks/${taskId}/comments`),
  createComment: (taskId: string, data: { content: string }) =>
    apiFetch<Comment>(`/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify(data) }),

  // My Tasks
  getMyTasks: (params?: { status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    const query = searchParams.toString();
    return apiFetch<Task[]>(`/users/me/tasks${query ? `?${query}` : ""}`);
  },

  // Dashboard Stats
  getDashboardStats: () => apiFetch<DashboardStats>("/users/me/dashboard"),

  // API Keys
  getApiKeys: () =>
    apiFetch<
      Array<{
        id: string;
        name: string;
        keyPrefix: string;
        lastUsedAt: string | null;
        createdAt: string;
        expiresAt: string | null;
      }>
    >("/users/me/api-keys"),
  createApiKey: (name: string) =>
    apiFetch<{ id: string; name: string; key: string; keyPrefix: string; createdAt: string }>(
      "/users/me/api-keys",
      {
        method: "POST",
        body: JSON.stringify({ name }),
      }
    ),
  deleteApiKey: (keyId: string) =>
    apiFetch(`/users/me/api-keys/${keyId}`, { method: "DELETE" }),

  // User Profile
  getProfile: () =>
    apiFetch<{
      id: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
      createdAt: string;
      updatedAt: string;
    }>("/users/me"),
  updateProfile: (data: { name?: string; email?: string; avatarUrl?: string | null }) =>
    apiFetch<{
      id: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
      updatedAt: string;
    }>("/users/me", { method: "PATCH", body: JSON.stringify(data) }),

  // ============================================
  // Slug-based API methods
  // ============================================

  // Team by slug
  getTeamBySlug: (teamSlug: string) => apiFetch<TeamDetail>(`/t/${teamSlug}`),
  getTeamMembersBySlug: (teamSlug: string) => apiFetch<TeamMember[]>(`/t/${teamSlug}/members`),
  getProjectsByTeamSlug: (teamSlug: string) => apiFetch<Project[]>(`/t/${teamSlug}/projects`),

  // Project by slug
  getProjectBySlug: (teamSlug: string, projectSlug: string) =>
    apiFetch<ProjectWithTeam>(`/t/${teamSlug}/${projectSlug}`),
  getTasksBySlug: (teamSlug: string, projectSlug: string) =>
    apiFetch<Task[]>(`/t/${teamSlug}/${projectSlug}/tasks`),
  getStatusesBySlug: (teamSlug: string, projectSlug: string) =>
    apiFetch<ProjectStatus[]>(`/t/${teamSlug}/${projectSlug}/statuses`),
  getProjectMembersBySlug: (teamSlug: string, projectSlug: string) =>
    apiFetch<TeamMember[]>(`/t/${teamSlug}/${projectSlug}/members`),

  // Worklog Reports
  getWorklogReport: (
    teamSlug: string,
    projectSlug: string,
    params?: { startDate?: string; endDate?: string }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    const query = searchParams.toString();
    return apiFetch<WorklogReport>(`/t/${teamSlug}/${projectSlug}/worklogs${query ? `?${query}` : ""}`);
  },

  // ============================================
  // Team Member Management
  // ============================================
  inviteTeamMember: (teamId: string, data: { email: string; role: "ADMIN" | "PM" | "WORKER" }) =>
    apiFetch<{ id: string; name: string; email: string; role: string }>(
      `/teams/${teamId}/members`,
      { method: "POST", body: JSON.stringify(data) }
    ),
  updateTeamMemberRole: (teamId: string, userId: string, role: "ADMIN" | "PM" | "WORKER") =>
    apiFetch<{ userId: string; role: string }>(
      `/teams/${teamId}/members/${userId}`,
      { method: "PATCH", body: JSON.stringify({ role }) }
    ),
  removeTeamMember: (teamId: string, userId: string) =>
    apiFetch<{ success: boolean }>(
      `/teams/${teamId}/members/${userId}`,
      { method: "DELETE" }
    ),

  // ============================================
  // Project Member Management
  // ============================================
  inviteProjectMember: (projectId: string, data: { email: string; role: "PM" | "WORKER" }) =>
    apiFetch<{ id: string; name: string; email: string; role: string }>(
      `/projects/${projectId}/members`,
      { method: "POST", body: JSON.stringify(data) }
    ),
};
