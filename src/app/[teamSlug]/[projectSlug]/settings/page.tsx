"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import { api, ProjectWithTeam, ProjectStatus, TeamMember } from "@/lib/api";
import { UserMenu } from "@/components/user-menu";
import { ArrowLeft, Bot, Palette, Settings2, Users } from "lucide-react";
import { ClaudeIntegration } from "@/components/project-settings/claude-integration";
import { StatusSettings } from "@/components/project-settings/status-settings";
import { MemberSettings } from "@/components/project-settings/member-settings";

type SettingsTab = "general" | "statuses" | "claude" | "members";

export default function ProjectSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params.teamSlug as string;
  const projectSlug = params.projectSlug as string;

  const { isAuthenticated, hasHydrated, user } = useAuthStore();
  const [project, setProject] = useState<ProjectWithTeam | null>(null);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("claude");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch project using slug
      const projectData = await api.getProjectBySlug(teamSlug, projectSlug);
      setProject(projectData);

      // Fetch statuses and members using project ID
      const [statusesData, membersData] = await Promise.all([
        api.getProjectStatuses(projectData.id),
        api.getProjectMembersBySlug(teamSlug, projectSlug).catch(() => [] as TeamMember[]),
      ]);
      setStatuses(statusesData);
      setMembers(membersData);
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

  const handleStatusesUpdate = (updatedStatuses: ProjectStatus[]) => {
    setStatuses(updatedStatuses);
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

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600">{error || "プロジェクトが見つかりません"}</p>
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

  const tabs = [
    { id: "claude" as const, label: "Claude連携", icon: Bot },
    { id: "statuses" as const, label: "ステータス", icon: Palette },
    { id: "members" as const, label: "メンバー", icon: Users },
    { id: "general" as const, label: "一般設定", icon: Settings2 },
  ];

  const canManage = project.role === "PM" || project.role === "ADMIN";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-full items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/${teamSlug}/${projectSlug}`}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">プロジェクト設定</h1>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Link href={`/${teamSlug}`} className="hover:text-gray-700">
                  {project.team.name}
                </Link>
                <span>/</span>
                <Link href={`/${teamSlug}/${projectSlug}`} className="hover:text-gray-700">
                  {project.name}
                </Link>
              </div>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <nav className="w-64 border-r bg-white p-4">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content Area */}
        <main className="flex-1 p-6">
          {activeTab === "claude" && (
            <ClaudeIntegration project={project} statuses={statuses} />
          )}
          {activeTab === "statuses" && (
            <StatusSettings
              projectId={project.id}
              statuses={statuses}
              onStatusesUpdate={handleStatusesUpdate}
            />
          )}
          {activeTab === "members" && (
            <MemberSettings
              projectId={project.id}
              members={members}
              currentUserId={user?.id || ""}
              canManage={canManage}
              onMembersChange={fetchData}
            />
          )}
          {activeTab === "general" && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">一般設定</h2>
              <p className="text-gray-500">準備中...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
