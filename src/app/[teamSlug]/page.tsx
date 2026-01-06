"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, notFound } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import { api, TeamDetail, Project, TeamMember } from "@/lib/api";
import { Header } from "@/components/header";
import { RESERVED_TEAM_SLUGS } from "@/types";

type TabType = "projects";

export default function TeamPage() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params.teamSlug as string;
  const { isAuthenticated, hasHydrated } = useAuthStore();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("projects");
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  // Check if this is a reserved slug
  useEffect(() => {
    if (RESERVED_TEAM_SLUGS.includes(teamSlug.toLowerCase() as typeof RESERVED_TEAM_SLUGS[number])) {
      notFound();
    }
  }, [teamSlug]);

  const fetchTeamData = useCallback(async () => {
    try {
      const [teamData, projectsData, membersData] = await Promise.all([
        api.getTeamBySlug(teamSlug),
        api.getProjectsByTeamSlug(teamSlug),
        api.getTeamMembersBySlug(teamSlug).catch(() => [] as TeamMember[]),
      ]);

      setTeam(teamData);
      setProjects(projectsData);
      setMembers(membersData);
    } catch (error) {
      console.error("Failed to fetch team data:", error);
    } finally {
      setLoading(false);
    }
  }, [teamSlug]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    fetchTeamData();
  }, [isAuthenticated, hasHydrated, router, fetchTeamData]);

  if (!hasHydrated || !isAuthenticated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">
            チームが見つかりません
          </h2>
          <p className="mt-2 text-gray-600">
            チームが存在しないか、アクセス権限がありません
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        navItems={[
          { label: "ダッシュボード", href: "/dashboard" },
          { label: team.name, href: `/${team.slug}`, active: true },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-gray-700">
            ダッシュボード
          </Link>
          <span>/</span>
          <span className="text-gray-900">{team.name}</span>
        </nav>

        {/* Team Header */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{team.name}</h2>
                <p className="text-gray-500">/{team.slug}</p>
                {team.description && (
                  <p className="mt-2 text-gray-600">{team.description}</p>
                )}
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                team.role === "owner"
                  ? "bg-purple-100 text-purple-700"
                  : team.role === "admin" || team.role === "ADMIN"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {team.role === "owner"
                ? "オーナー"
                : team.role === "admin" || team.role === "ADMIN"
                ? "管理者"
                : "メンバー"}
            </span>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6 sm:grid-cols-4">
            <div>
              <p className="text-sm text-gray-500">プロジェクト数</p>
              <p className="mt-1 text-2xl font-bold">{projects.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">メンバー数</p>
              <p className="mt-1 text-2xl font-bold">{members.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">作成日</p>
              <p className="mt-1 text-lg font-medium">
                {new Date(team.createdAt).toLocaleDateString("ja-JP")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">最終更新</p>
              <p className="mt-1 text-lg font-medium">
                {new Date(team.updatedAt).toLocaleDateString("ja-JP")}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab("projects")}
              className={`border-b-2 pb-4 text-sm font-medium transition-colors ${
                activeTab === "projects"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              プロジェクト ({projects.length})
            </button>
            <Link
              href={`/${teamSlug}/members`}
              className="border-b-2 border-transparent pb-4 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
            >
              メンバー ({members.length})
            </Link>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "projects" && (
          <ProjectsTab
            projects={projects}
            teamSlug={teamSlug}
            canManage={team.role === "owner" || team.role === "admin" || team.role === "ADMIN"}
            onCreateClick={() => setShowCreateProjectModal(true)}
          />
        )}

      </main>

      {/* Create Project Modal */}
      {showCreateProjectModal && team && (
        <CreateProjectModal
          teamId={team.id}
          teamSlug={teamSlug}
          onClose={() => setShowCreateProjectModal(false)}
          onSuccess={() => {
            setShowCreateProjectModal(false);
            fetchTeamData();
          }}
        />
      )}
    </div>
  );
}

interface ProjectsTabProps {
  projects: Project[];
  teamSlug: string;
  canManage: boolean;
  onCreateClick: () => void;
}

function ProjectsTab({
  projects,
  teamSlug,
  canManage,
  onCreateClick,
}: ProjectsTabProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg bg-white p-12 text-center shadow">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          プロジェクトがありません
        </h3>
        <p className="mt-2 text-gray-600">
          最初のプロジェクトを作成して、タスク管理を始めましょう
        </p>
        {canManage && (
          <button
            onClick={onCreateClick}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            プロジェクトを作成
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            プロジェクトを作成
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/${teamSlug}/${project.slug}`}
            className="group block rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-500">/{project.slug}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  project.status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : project.status === "ARCHIVED"
                    ? "bg-gray-100 text-gray-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {project.status === "ACTIVE"
                  ? "アクティブ"
                  : project.status === "ARCHIVED"
                  ? "アーカイブ"
                  : project.status}
              </span>
            </div>

            {project.description && (
              <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                {project.description}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              {project._count && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  {project._count.tasks} タスク
                </span>
              )}
              <span className="text-sm text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                開く →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

interface CreateProjectModalProps {
  teamId: string;
  teamSlug: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateProjectModal({
  teamId,
  teamSlug,
  onClose,
  onSuccess,
}: CreateProjectModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const project = await api.createProject(teamId, {
        name,
        slug,
        description: description || undefined,
      });
      onSuccess();
      // Navigate to new project using slug-based URL
      router.push(`/${teamSlug}/${project.slug}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "プロジェクトの作成に失敗しました"
      );
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">新規プロジェクト作成</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="project-name"
              className="block text-sm font-medium text-gray-700"
            >
              プロジェクト名 <span className="text-red-500">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="例: Webアプリ開発"
            />
          </div>

          <div>
            <label
              htmlFor="project-slug"
              className="block text-sm font-medium text-gray-700"
            >
              スラッグ <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                /{teamSlug}/
              </span>
              <input
                id="project-slug"
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="block w-full rounded-none rounded-r-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="web-app"
                pattern="[a-z0-9-]+"
                title="英小文字、数字、ハイフンのみ使用できます"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              URLに使用されます（英小文字、数字、ハイフンのみ）
            </p>
          </div>

          <div>
            <label
              htmlFor="project-description"
              className="block text-sm font-medium text-gray-700"
            >
              説明
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="プロジェクトの説明を入力（任意）"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !name || !slug}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "作成中..." : "作成する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
