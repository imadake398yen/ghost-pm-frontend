"use client";

import { useState } from "react";
import { api, TeamMember } from "@/lib/api";
import { UserPlus, Trash2 } from "lucide-react";

interface MemberSettingsProps {
  projectId: string;
  members: TeamMember[];
  currentUserId: string;
  canManage: boolean;
  onMembersChange: () => void;
}

export function MemberSettings({
  projectId,
  members,
  currentUserId,
  canManage,
  onMembersChange,
}: MemberSettingsProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">プロジェクトメンバー</h2>
            <p className="mt-1 text-sm text-gray-500">
              このプロジェクトにアクセスできるメンバーを管理します
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              メンバーを追加
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {members.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed p-8 text-center">
            <UserPlus className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              プロジェクトメンバーがいません
            </p>
            {canManage && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="mt-4 text-sm text-blue-600 hover:underline"
              >
                メンバーを追加する
              </button>
            )}
          </div>
        ) : (
          <MemberList
            projectId={projectId}
            members={members}
            currentUserId={currentUserId}
            canManage={canManage}
            onMembersChange={onMembersChange}
            setError={setError}
          />
        )}
      </div>

      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-medium">プロジェクトメンバーについて</p>
        <ul className="mt-2 list-inside list-disc text-xs space-y-1">
          <li>チームメンバーは自動的にプロジェクトにアクセスできます</li>
          <li>プロジェクト固有のメンバーは、チーム外のユーザーを招待できます</li>
          <li>PM: タスク・メンバー管理、プロジェクト設定の変更が可能</li>
          <li>Worker: タスクの閲覧・更新のみ可能</li>
        </ul>
      </div>

      {showInviteModal && (
        <InviteProjectMemberModal
          projectId={projectId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            onMembersChange();
          }}
        />
      )}
    </div>
  );
}

interface MemberListProps {
  projectId: string;
  members: TeamMember[];
  currentUserId: string;
  canManage: boolean;
  onMembersChange: () => void;
  setError: (error: string) => void;
}

function MemberList({
  members,
  currentUserId,
  canManage,
}: MemberListProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              メンバー
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              役割
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              参加日
            </th>
            {canManage && (
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                操作
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <span className="text-xs font-medium">
                        {member.name?.charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.name}
                      {member.id === currentUserId && (
                        <span className="ml-2 text-xs text-gray-500">(あなた)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    member.role === "PM"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {member.role === "PM" ? "PM" : "メンバー"}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {new Date(member.joinedAt).toLocaleDateString("ja-JP")}
              </td>
              {canManage && (
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button
                    disabled
                    className="rounded p-1 text-gray-400 cursor-not-allowed"
                    title="この機能は準備中です"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface InviteProjectMemberModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function InviteProjectMemberModal({
  projectId,
  onClose,
  onSuccess,
}: InviteProjectMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"PM" | "WORKER">("WORKER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.inviteProjectMember(projectId, { email, role });
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
          <h2 className="text-xl font-bold">プロジェクトメンバーを追加</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label htmlFor="project-invite-email" className="block text-sm font-medium text-gray-700">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              id="project-invite-email"
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
            <label htmlFor="project-invite-role" className="block text-sm font-medium text-gray-700">
              役割 <span className="text-red-500">*</span>
            </label>
            <select
              id="project-invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "PM" | "WORKER")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="WORKER">メンバー（Worker）</option>
              <option value="PM">PM</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              PM: タスク・メンバー管理、設定変更が可能 / メンバー: タスク閲覧・更新のみ
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
              {loading ? "追加中..." : "追加する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
