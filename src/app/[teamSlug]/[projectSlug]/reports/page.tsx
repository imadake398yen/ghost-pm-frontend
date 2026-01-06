"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import {
  api,
  ProjectWithTeam,
  WorklogReport,
  WorklogByUser,
  WorklogByTask,
} from "@/lib/api";
import { UserMenu } from "@/components/user-menu";
import { ArrowLeft, Clock, Users, ListTodo, Calendar } from "lucide-react";

type ViewMode = "byUser" | "byTask";

export default function WorklogReportPage() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params.teamSlug as string;
  const projectSlug = params.projectSlug as string;

  const { isAuthenticated, hasHydrated } = useAuthStore();
  const [project, setProject] = useState<ProjectWithTeam | null>(null);
  const [report, setReport] = useState<WorklogReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("byUser");

  // Date filter state (default to current month)
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(
    firstDayOfMonth.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    lastDayOfMonth.toISOString().split("T")[0]
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch project details using slug
      const projectData = await api.getProjectBySlug(teamSlug, projectSlug);
      setProject(projectData);

      // Fetch worklog report
      const reportData = await api.getWorklogReport(teamSlug, projectSlug, {
        startDate,
        endDate,
      });
      setReport(reportData);
    } catch (err) {
      console.error("Failed to fetch report data:", err);
      setError("レポートの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [teamSlug, projectSlug, startDate, endDate]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    fetchData();
  }, [isAuthenticated, hasHydrated, router, fetchData]);

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  if (!project || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">データが見つかりません</p>
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
              href={`/${teamSlug}/${projectSlug}`}
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
                <Link
                  href={`/${teamSlug}/${projectSlug}`}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {project.name}
                </Link>
                <span className="text-gray-400">/</span>
                <h1 className="text-xl font-bold">工数レポート</h1>
              </div>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Filters and Controls */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-full flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
              <span className="text-gray-500">〜</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-md bg-gray-100 p-1">
            <button
              onClick={() => setViewMode("byUser")}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ${
                viewMode === "byUser"
                  ? "bg-white text-gray-900 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users className="h-4 w-4" />
              メンバー別
            </button>
            <button
              onClick={() => setViewMode("byTask")}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ${
                viewMode === "byTask"
                  ? "bg-white text-gray-900 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ListTodo className="h-4 w-4" />
              タスク別
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="mx-auto max-w-6xl">
          {/* Summary Card */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-3">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">総工数</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatHours(report.totalHours)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-6 text-sm text-gray-600">
              <div>
                <span className="font-medium">{report.byUser.length}</span> 人が作業
              </div>
              <div>
                <span className="font-medium">{report.byTask.length}</span> タスクに記録
              </div>
              <div>
                <span className="font-medium">{report.entries.length}</span> 件の作業記録
              </div>
            </div>
          </div>

          {/* Data Table */}
          {viewMode === "byUser" ? (
            <ByUserView data={report.byUser} formatHours={formatHours} formatDate={formatDate} />
          ) : (
            <ByTaskView data={report.byTask} formatHours={formatHours} formatDate={formatDate} />
          )}
        </div>
      </main>
    </div>
  );
}

function ByUserView({
  data,
  formatHours,
  formatDate,
}: {
  data: WorklogByUser[];
  formatHours: (h: number) => string;
  formatDate: (d: string) => string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow">
        <Users className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-4 text-gray-500">この期間の作業記録はありません</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white shadow">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              メンバー
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
              工数
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
              件数
            </th>
          </tr>
        </thead>
        <tbody>
          {data
            .sort((a, b) => b.totalHours - a.totalHours)
            .map((user) => (
              <>
                <tr
                  key={user.userId}
                  className="border-b cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setExpanded(expanded === user.userId ? null : user.userId)
                  }
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{user.userName}</p>
                      <p className="text-sm text-gray-500">{user.userEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-blue-600">
                      {formatHours(user.totalHours)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {user.entries.length}件
                  </td>
                </tr>
                {expanded === user.userId && (
                  <tr key={`${user.userId}-expanded`}>
                    <td colSpan={3} className="bg-gray-50 px-4 py-2">
                      <div className="space-y-2">
                        {user.entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-medium">{entry.taskTitle}</p>
                              {entry.description && (
                                <p className="text-gray-500">{entry.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-blue-600">
                                {formatHours(entry.hours)}
                              </p>
                              <p className="text-gray-400">
                                {formatDate(entry.loggedAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function ByTaskView({
  data,
  formatHours,
  formatDate,
}: {
  data: WorklogByTask[];
  formatHours: (h: number) => string;
  formatDate: (d: string) => string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow">
        <ListTodo className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-4 text-gray-500">この期間の作業記録はありません</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white shadow">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              タスク
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
              工数
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
              件数
            </th>
          </tr>
        </thead>
        <tbody>
          {data
            .sort((a, b) => b.totalHours - a.totalHours)
            .map((task) => (
              <>
                <tr
                  key={task.taskId}
                  className="border-b cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setExpanded(expanded === task.taskId ? null : task.taskId)
                  }
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{task.taskTitle}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-blue-600">
                      {formatHours(task.totalHours)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {task.entries.length}件
                  </td>
                </tr>
                {expanded === task.taskId && (
                  <tr key={`${task.taskId}-expanded`}>
                    <td colSpan={3} className="bg-gray-50 px-4 py-2">
                      <div className="space-y-2">
                        {task.entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-medium">{entry.userName}</p>
                              {entry.description && (
                                <p className="text-gray-500">{entry.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-blue-600">
                                {formatHours(entry.hours)}
                              </p>
                              <p className="text-gray-400">
                                {formatDate(entry.loggedAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
        </tbody>
      </table>
    </div>
  );
}
