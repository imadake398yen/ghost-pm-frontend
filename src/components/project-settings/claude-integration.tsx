"use client";

import { useState } from "react";
import { Project, ProjectStatus } from "@/lib/api";
import { Download, Copy, Check, FileText, ExternalLink } from "lucide-react";

interface ClaudeIntegrationProps {
  project: Project;
  statuses: ProjectStatus[];
}

export function ClaudeIntegration({ project, statuses }: ClaudeIntegrationProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = async (text: string, itemId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItem(itemId);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const generateSkillsContent = () => {
    const statusList = statuses
      .map((s) => `| ${s.name} | ${s.slug} | \`${s.id}\` | ${s.isDone ? "完了" : "-"} |`)
      .join("\n");

    return `# GhostPM タスク管理

このプロジェクトは GhostPM でタスク管理されています。

## プロジェクト情報

- プロジェクトID: \`${project.id}\`
- プロジェクト名: ${project.name}
- チームID: \`${project.teamId}\`
${project.description ? `- 説明: ${project.description}` : ""}

## ステータス一覧

| ステータス名 | slug | ID | 完了扱い |
|-------------|------|-----|---------|
${statusList}

## ルール

### 作業フロー

1. **作業開始時**: 該当タスクのステータスを「進行中」に変更
2. **PR作成時**: タスクのステータスを「レビュー中」に変更
3. **マージ後**: タスクのステータスを「完了」に変更
4. **作業完了後**: 作業時間をログに記録

### タスク作成ルール

- タスクは **機能単位** で作成する（細かく分割しすぎない）
- 詳細な作業は description 内に **Markdown チェックリスト** で記載
- 1タスク = 数時間〜1日程度の作業量を目安に

## MCP ツール

以下のツールを使ってタスクを操作できます:

- \`ghost_list_tasks\`: タスク一覧を取得
- \`ghost_get_task\`: タスク詳細を取得
- \`ghost_create_task\`: タスクを作成
- \`ghost_update_task\`: タスクを更新
- \`ghost_update_task_status\`: ステータスを変更
- \`ghost_add_comment\`: コメントを追加
- \`ghost_log_work\`: 作業時間を記録
`;
  };

  const downloadSkillsFile = () => {
    const content = generateSkillsContent();
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ghost-pm.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const skillsCommand = `mkdir -p .claude/skills && curl -s "${apiUrl}/public/projects/${project.id}/skills-template" > .claude/skills/ghost-pm.md`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Claude 連携</h2>
        <p className="mt-1 text-sm text-gray-500">
          Claude Code でこのプロジェクトを操作するための設定
        </p>
      </div>

      {/* Skills セットアップ */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-purple-100 p-2">
            <FileText className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Skills セットアップ</h3>
            <p className="mt-1 text-sm text-gray-500">
              プロジェクト固有のルールを Claude Code に伝えるための設定ファイル
            </p>

            <div className="mt-4 rounded-lg bg-purple-50 border border-purple-200 p-4">
              <p className="text-sm font-medium text-purple-800">
                Claude Code に以下のように指示:
              </p>
              <p className="mt-2 rounded-lg bg-white p-3 text-sm text-gray-800 border">
                「このプロジェクトに GhostPM の Skills を設定して」
              </p>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                または、以下のコマンドを実行:
              </p>
              <div className="relative">
                <pre className="rounded-lg bg-gray-900 p-3 text-xs text-gray-100 overflow-x-auto">
                  {skillsCommand}
                </pre>
                <button
                  onClick={() => copyToClipboard(skillsCommand, "skills-cmd")}
                  className="absolute right-2 top-2 rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
                >
                  {copiedItem === "skills-cmd" ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                手動でダウンロードする場合
              </summary>
              <div className="mt-2 flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <code className="text-sm text-gray-700">.claude/skills/ghost-pm.md</code>
                <button
                  onClick={downloadSkillsFile}
                  className="flex items-center gap-2 rounded-md bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700"
                >
                  <Download className="h-4 w-4" />
                  ダウンロード
                </button>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* MCP Server / API キー設定へのリンク */}
      <div className="rounded-lg border bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-700">MCP Server / API キーの設定</p>
            <p className="text-sm text-gray-500">
              Claude Code/Desktop との連携に必要な設定は「連携機能」ページで行います
            </p>
          </div>
          <a
            href="/settings/integrations"
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            連携機能を開く
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* プロジェクト情報 */}
      <div className="rounded-lg border bg-gray-50 p-4">
        <h4 className="text-sm font-medium text-gray-700">プロジェクト情報</h4>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-gray-500">プロジェクト ID:</span>
          <code className="rounded bg-white px-2 py-1 text-sm">{project.id}</code>
          <button
            onClick={() => copyToClipboard(project.id, "project-id")}
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          >
            {copiedItem === "project-id" ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
