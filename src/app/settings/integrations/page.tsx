"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { Header } from "@/components/header";
import { Copy, Check, Terminal, Key, Plus, Trash2 } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // 新規作成用
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchApiKeys();
  }, [isAuthenticated, hasHydrated, router]);

  const fetchApiKeys = async () => {
    try {
      const data = await api.getApiKeys();
      setApiKeys(data);
    } catch {
      setError("APIキーの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreating(true);
    setError("");

    try {
      const result = await api.createApiKey(newKeyName.trim());
      setNewlyCreatedKey(result.key);
      setApiKeys([
        ...apiKeys,
        {
          id: result.id,
          name: result.name,
          keyPrefix: result.keyPrefix,
          createdAt: result.createdAt,
          lastUsedAt: null,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "APIキーの作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("このAPIキーを削除してもよろしいですか？")) return;

    setDeleting(keyId);
    try {
      await api.deleteApiKey(keyId);
      setApiKeys(apiKeys.filter((key) => key.id !== keyId));
    } catch {
      setError("APIキーの削除に失敗しました");
    } finally {
      setDeleting(null);
    }
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItem(itemId);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setNewKeyName("");
    setNewlyCreatedKey(null);
  };

  const credentialsExample = `{
  "apiKey": "${newlyCreatedKey || apiKeys[0]?.keyPrefix + "..." || "gpm_xxxx..."}",
  "apiUrl": "http://localhost:3001"
}`;

  const mcpConfigClaude = `{
  "mcpServers": {
    "ghost-pm": {
      "command": "node",
      "args": ["/path/to/ghost-pm/packages/mcp/dist/index.js"]
    }
  }
}`;

  if (!hasHydrated || !isAuthenticated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header breadcrumbs={[{ label: "設定" }, { label: "連携機能" }]} />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">連携機能</h1>
          <p className="mt-1 text-sm text-gray-500">
            Claude Code / Claude Desktop との連携設定
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* API キー管理セクション */}
        <section className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-amber-100 p-2">
              <Key className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">API キー</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    MCP Server や外部ツールからアクセスするための認証キー
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700"
                >
                  <Plus className="h-4 w-4" />
                  新規発行
                </button>
              </div>

              {apiKeys.length === 0 ? (
                <div className="mt-4 rounded-lg border-2 border-dashed p-6 text-center">
                  <Key className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    APIキーがありません。「新規発行」から作成してください。
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-xs text-gray-500">
                          <code className="rounded bg-gray-100 px-1">
                            {key.keyPrefix}...
                          </code>
                          {" ・ "}
                          {key.lastUsedAt
                            ? `最終使用: ${new Date(key.lastUsedAt).toLocaleDateString("ja-JP")}`
                            : "未使用"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        disabled={deleting === key.id}
                        className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* MCP Server セットアップセクション */}
        <section className="mt-6 rounded-lg bg-white p-6 shadow">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-blue-100 p-2">
              <Terminal className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">MCP Server セットアップ</h2>
              <p className="mt-1 text-sm text-gray-500">
                Claude Code / Desktop で GhostPM のタスクを操作するためのサーバー設定
              </p>

              <div className="mt-4 space-y-4">
                {/* Step 1 */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      1
                    </span>
                    <h3 className="font-medium">認証情報ファイルを作成</h3>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    <code className="rounded bg-gray-100 px-1">~/.ghost-pm/credentials</code>
                  </p>
                  <div className="relative mt-2">
                    <pre className="rounded-lg bg-gray-900 p-3 text-sm text-gray-100">
                      {credentialsExample}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(credentialsExample, "credentials")}
                      className="absolute right-2 top-2 rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
                    >
                      {copiedItem === "credentials" ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      2
                    </span>
                    <h3 className="font-medium">Claude に MCP Server を登録</h3>
                  </div>

                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Claude Code:</p>
                      <div className="relative mt-1">
                        <pre className="rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                          claude mcp add ghost-pm node /path/to/ghost-pm/packages/mcp/dist/index.js
                        </pre>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              "claude mcp add ghost-pm node /path/to/ghost-pm/packages/mcp/dist/index.js",
                              "claude-code"
                            )
                          }
                          className="absolute right-2 top-2 rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
                        >
                          {copiedItem === "claude-code" ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700">Claude Desktop:</p>
                      <p className="text-xs text-gray-500">
                        ~/Library/Application Support/Claude/claude_desktop_config.json
                      </p>
                      <div className="relative mt-1">
                        <pre className="max-h-32 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                          {mcpConfigClaude}
                        </pre>
                        <button
                          onClick={() => copyToClipboard(mcpConfigClaude, "desktop-config")}
                          className="absolute right-2 top-2 rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
                        >
                          {copiedItem === "desktop-config" ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                <p className="font-medium">MCP Server とは？</p>
                <p className="mt-1 text-xs">
                  Model Context Protocol (MCP) を使って Claude がタスク一覧の取得、
                  ステータス更新、コメント追加などを直接実行できるようになります。
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            {newlyCreatedKey ? (
              <>
                <h2 className="text-lg font-semibold">APIキーを作成しました</h2>
                <div className="mt-4 rounded-md bg-yellow-50 p-4">
                  <p className="text-sm text-yellow-800">
                    このキーは一度しか表示されません。必ずコピーして保存してください。
                  </p>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded bg-gray-100 p-3 text-sm">
                      {newlyCreatedKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(newlyCreatedKey, "new-key")}
                      className="rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                    >
                      {copiedItem === "new-key" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleCloseModal}
                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    閉じる
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">新規APIキー発行</h2>
                <form onSubmit={handleCreateKey} className="mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      キー名
                    </label>
                    <input
                      type="text"
                      required
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="例: Claude Code - MacBook Pro"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={creating || !newKeyName.trim()}
                      className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {creating ? "作成中..." : "発行"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
