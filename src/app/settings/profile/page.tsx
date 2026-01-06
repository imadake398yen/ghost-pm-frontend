"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { Header } from "@/components/header";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated, setAuth, accessToken, refreshToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // フォームの状態
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // 初期値を設定
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setAvatarUrl(user.avatarUrl || "");
      setLoading(false);
    }
  }, [isAuthenticated, hasHydrated, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const updateData: { name?: string; avatarUrl?: string | null } = {};

      // 名前が変更されている場合のみ送信
      if (name !== user?.name) {
        updateData.name = name;
      }

      // アバターURLが変更されている場合のみ送信
      const currentAvatarUrl = user?.avatarUrl || "";
      if (avatarUrl !== currentAvatarUrl) {
        updateData.avatarUrl = avatarUrl || null;
      }

      // 変更がない場合は何もしない
      if (Object.keys(updateData).length === 0) {
        setSuccess("変更はありません");
        setSaving(false);
        return;
      }

      const updatedUser = await api.updateProfile(updateData);

      // 認証ストアのユーザー情報を更新
      if (accessToken && refreshToken) {
        setAuth(
          {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            avatarUrl: updatedUser.avatarUrl,
          },
          accessToken,
          refreshToken
        );
      }

      setSuccess("プロフィールを更新しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "プロフィールの更新に失敗しました");
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        breadcrumbs={[
          { label: "設定" },
          { label: "プロフィール" },
        ]}
      />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">プロフィール設定</h1>
          <p className="mt-1 text-sm text-gray-500">
            アカウント情報を確認・編集できます
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="rounded-lg bg-white p-6 shadow">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ユーザー名 */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                ユーザー名
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="例: 山田太郎"
              />
              <p className="mt-1 text-xs text-gray-500">
                他のユーザーに表示される名前です
              </p>
            </div>

            {/* メールアドレス（編集不可） */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500 shadow-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                メールアドレスは変更できません
              </p>
            </div>

            {/* アバターURL */}
            <div>
              <label
                htmlFor="avatarUrl"
                className="block text-sm font-medium text-gray-700"
              >
                アバターURL（任意）
              </label>
              <input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="https://example.com/avatar.png"
              />
              <p className="mt-1 text-xs text-gray-500">
                プロフィール画像のURLを入力してください（PNG、JPG、GIF）
              </p>

              {/* アバタープレビュー */}
              {avatarUrl && (
                <div className="mt-3">
                  <p className="mb-2 text-xs text-gray-500">プレビュー:</p>
                  <div className="flex items-center gap-4">
                    <img
                      src={avatarUrl}
                      alt="アバタープレビュー"
                      className="h-16 w-16 rounded-full object-cover border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                      onLoad={(e) => {
                        (e.target as HTMLImageElement).style.display = "block";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setAvatarUrl("")}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 保存ボタン */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </form>
        </div>

        {/* アカウント情報 */}
        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">アカウント情報</h2>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">ユーザーID</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <code className="rounded bg-gray-100 px-2 py-1">{user?.id}</code>
              </dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
