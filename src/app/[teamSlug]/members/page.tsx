"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import { api, TeamDetail, TeamMember } from "@/lib/api";
import { Header } from "@/components/header";
import { RESERVED_TEAM_SLUGS } from "@/types";
import { UserPlus, Pencil, Trash2 } from "lucide-react";

export default function TeamMembersPage() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params.teamSlug as string;
  const { isAuthenticated, hasHydrated, user } = useAuthStore();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState<TeamMember | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check if this is a reserved slug
  useEffect(() => {
    if (RESERVED_TEAM_SLUGS.includes(teamSlug.toLowerCase() as typeof RESERVED_TEAM_SLUGS[number])) {
      router.push("/404");
    }
  }, [teamSlug, router]);

  const fetchData = useCallback(async () => {
    try {
      const [teamData, membersData] = await Promise.all([
        api.getTeamBySlug(teamSlug),
        api.getTeamMembersBySlug(teamSlug),
      ]);

      setTeam(teamData);
      setMembers(membersData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("データの取得に失敗しました");
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

    fetchData();
  }, [isAuthenticated, hasHydrated, router, fetchData]);

  const handleRemoveMember = async (member: TeamMember) => {
    if (member.id === user?.id) {
      if (!confirm("チームから退出してもよろしいですか？")) return;
    } else {
      if (!confirm(`${member.name} をチームから削除してもよろしいですか？`)) return;
    }

    setActionLoading(member.id);
    setError("");
    try {
      await api.removeTeamMember(team!.id, member.id);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "メンバーの削除に失敗しました");
    } finally {
      setActionLoading(null);
    }
  };

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
          <h2 className="text-xl font-bold text-gray-900">チームが見つかりません</h2>
          <p className="mt-2 text-gray-600">チームが存在しないか、アクセス権限がありません</p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    );
  }

  const canManage = team.role === "owner" || team.role === "admin" || team.role === "ADMIN";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        navItems={[
          { label: "ダッシュボード", href: "/dashboard" },
          { label: team.name, href: `/${team.slug}` },
          { label: "メンバー", href: `/${team.slug}/members`, active: true },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-gray-700">ダッシュボード</Link>
          <span>/</span>
          <Link href={`/${team.slug}`} className="hover:text-gray-700">{team.name}</Link>
          <span>/</span>
          <span className="text-gray-900">メンバー</span>
        </nav>

        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">メンバー管理</h1>
            <p className="mt-1 text-gray-500">{team.name} のメンバーを管理します</p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <UserPlus className="h-5 w-5" />
              メンバーを招待
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {/* Members Table */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  メンバー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  メールアドレス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  役割
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  参加日
                </th>
                {canManage && (
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    操作
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="h-10 w-10 rounded-full" />
                        ) : (
                          <span className="text-sm font-medium">
                            {member.name?.charAt(0).toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.name}
                          {member.id === user?.id && (
                            <span className="ml-2 text-xs text-gray-500">(あなた)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {member.email || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        member.role === "ADMIN"
                          ? "bg-blue-100 text-blue-700"
                          : member.role === "PM"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {member.role === "ADMIN" ? "管理者" : member.role === "PM" ? "PM" : "メンバー"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(member.joinedAt).toLocaleDateString("ja-JP")}
                  </td>
                  {canManage && (
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setShowRoleModal(member)}
                          disabled={actionLoading === member.id}
                          className="rounded p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          title="権限を変更"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member)}
                          disabled={actionLoading === member.id}
                          className="rounded p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                          title={member.id === user?.id ? "チームから退出" : "メンバーを削除"}
                        >
                          {actionLoading === member.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Invite Modal */}
      {showInviteModal && team && (
        <InviteMemberModal
          teamId={team.id}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            fetchData();
          }}
        />
      )}

      {/* Role Change Modal */}
      {showRoleModal && team && (
        <ChangeRoleModal
          teamId={team.id}
          member={showRoleModal}
          onClose={() => setShowRoleModal(null)}
          onSuccess={() => {
            setShowRoleModal(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

interface InviteMemberModalProps {
  teamId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function InviteMemberModal({ teamId, onClose, onSuccess }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "PM" | "WORKER">("WORKER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.inviteTeamMember(teamId, { email, role });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "招待に失敗しました");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">メンバーを招待</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="user@example.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              既にGhostPMに登録されているユーザーのメールアドレスを入力してください
            </p>
          </div>

          <div>
            <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
              役割 <span className="text-red-500">*</span>
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "PM" | "WORKER")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="WORKER">メンバー（Worker）</option>
              <option value="PM">PM</option>
              <option value="ADMIN">管理者（Admin）</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              管理者: チーム設定、メンバー管理が可能 / PM: プロジェクト作成が可能 / メンバー: タスク作業のみ
            </p>
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
              disabled={loading || !email}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "招待中..." : "招待する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ChangeRoleModalProps {
  teamId: string;
  member: TeamMember;
  onClose: () => void;
  onSuccess: () => void;
}

function ChangeRoleModal({ teamId, member, onClose, onSuccess }: ChangeRoleModalProps) {
  const [role, setRole] = useState<"ADMIN" | "PM" | "WORKER">(member.role as "ADMIN" | "PM" | "WORKER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === member.role) {
      onClose();
      return;
    }

    setError("");
    setLoading(true);

    try {
      await api.updateTeamMemberRole(teamId, member.id, role);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "権限の変更に失敗しました");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">権限を変更</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600">
              {member.avatarUrl ? (
                <img src={member.avatarUrl} alt={member.name} className="h-10 w-10 rounded-full" />
              ) : (
                <span className="text-sm font-medium">{member.name?.charAt(0).toUpperCase() || "?"}</span>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{member.name}</p>
              <p className="text-sm text-gray-500">{member.email || "-"}</p>
            </div>
          </div>

          <div>
            <label htmlFor="change-role" className="block text-sm font-medium text-gray-700">
              新しい役割
            </label>
            <select
              id="change-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "PM" | "WORKER")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="WORKER">メンバー（Worker）</option>
              <option value="PM">PM</option>
              <option value="ADMIN">管理者（Admin）</option>
            </select>
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
              disabled={loading || role === member.role}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "変更中..." : "変更する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
