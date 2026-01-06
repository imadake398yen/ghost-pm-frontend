"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import { api, ProjectWithTeam, Task, User, ProjectStatus } from "@/lib/api";
import { TaskBoard } from "@/components/task-board";
import { CreateTaskModal } from "@/components/create-task-modal";
import { UserMenu } from "@/components/user-menu";
import { ArrowLeft, Plus, Settings, Users, Clock } from "lucide-react";

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params.teamSlug as string;
  const projectSlug = params.projectSlug as string;

  const { isAuthenticated, hasHydrated } = useAuthStore();
  const [project, setProject] = useState<ProjectWithTeam | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch project details using slug
      const projectData = await api.getProjectBySlug(teamSlug, projectSlug);
      setProject(projectData);

      // Fetch tasks, statuses, and members using project ID (from slug lookup)
      const [tasksData, statusesData, membersData] = await Promise.all([
        api.getTasks(projectData.id),
        api.getProjectStatuses(projectData.id),
        api.getTeamMembers(projectData.teamId),
      ]);

      setTasks(tasksData);
      setStatuses(statusesData);

      const users: User[] = membersData.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        avatarUrl: m.avatarUrl,
      }));
      setTeamMembers(users);
    } catch (err) {
      console.error("Failed to fetch project data:", err);
      setError("プロジェクトの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [teamSlug, projectSlug]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    fetchData();
  }, [isAuthenticated, hasHydrated, router, fetchData]);

  const handleTaskCreate = (task: Task) => {
    setTasks((prev) => [...prev, task]);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  if (!hasHydrated || !isAuthenticated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600">{error}</p>
          <button
            onClick={() => router.back()}
            className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">プロジェクトが見つかりません</p>
          <button
            onClick={() => router.back()}
            className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-full items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/${teamSlug}`}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/${teamSlug}`}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {project.team.name}
                </Link>
                <span className="text-gray-400">/</span>
                <h1 className="text-xl font-bold">{project.name}</h1>
              </div>
              {project.description && (
                <p className="text-sm text-gray-500">{project.description}</p>
              )}
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Sub Header / Toolbar */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-full items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{teamMembers.length} メンバー</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">{tasks.length}</span>
              <span>タスク</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              タスク作成
            </button>
            <Link
              href={`/${teamSlug}/${projectSlug}/reports`}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              <Clock className="h-4 w-4" />
              工数
            </Link>
            <Link
              href={`/${teamSlug}/${projectSlug}/settings`}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content - Task Board */}
      <main className="flex-1 overflow-hidden p-4">
        <TaskBoard
          tasks={tasks}
          teamMembers={teamMembers}
          statuses={statuses}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      </main>

      {/* Create Task Modal */}
      <CreateTaskModal
        projectId={project.id}
        teamMembers={teamMembers}
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleTaskCreate}
      />
    </div>
  );
}
