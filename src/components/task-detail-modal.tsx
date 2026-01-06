"use client";

import { useState, useEffect } from "react";
import {
  Task,
  TaskStatus,
  TaskPriority,
  UpdateTaskData,
  Worklog,
  Comment,
  User,
  ProjectStatus,
  api,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  X,
  Save,
  Trash2,
  Plus,
  Clock,
  Calendar,
  User as UserIcon,
  MessageSquare,
  Send,
} from "lucide-react";
import { priorityConfig } from "./task-card";

interface TaskDetailModalProps {
  task: Task;
  teamMembers: User[];
  statuses: ProjectStatus[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
}

const PRIORITY_OPTIONS: TaskPriority[] = [1, 2, 3, 4];

type TabType = "details" | "comments" | "worklogs";

export function TaskDetailModal({
  task,
  teamMembers,
  statuses,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [editData, setEditData] = useState<UpdateTaskData>({});

  // Worklogs state
  const [worklogs, setWorklogs] = useState<Worklog[]>([]);
  const [showWorklogForm, setShowWorklogForm] = useState(false);
  const [worklogHours, setWorklogHours] = useState("");
  const [worklogDescription, setWorklogDescription] = useState("");
  const [isSubmittingWorklog, setIsSubmittingWorklog] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      setEditData({
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        statusId: task.statusId ?? undefined,
        priority: task.priority,
        assigneeId: task.assigneeId ?? undefined,
        dueDate: task.dueDate ?? undefined,
        estimatedHours: task.estimatedHours ?? undefined,
      });
      fetchWorklogs();
      fetchComments();
    }
  }, [isOpen, task]);

  const fetchWorklogs = async () => {
    try {
      const data = await api.getWorklogs(task.id);
      setWorklogs(data);
    } catch (error) {
      console.error("Failed to fetch worklogs:", error);
    }
  };

  const fetchComments = async () => {
    try {
      const data = await api.getComments(task.id);
      setComments(data);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedTask = await api.updateTask(task.id, editData);
      onUpdate(updatedTask);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (statusId: string) => {
    try {
      const updatedTask = await api.updateTaskStatusById(task.id, statusId);
      onUpdate({ ...task, ...updatedTask, statusId });
      setEditData((prev) => ({ ...prev, statusId }));
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("このタスクを削除しますか?")) return;
    try {
      await api.deleteTask(task.id);
      onDelete(task.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const handleAddWorklog = async () => {
    const hours = parseFloat(worklogHours);
    if (isNaN(hours) || hours <= 0) return;

    setIsSubmittingWorklog(true);
    try {
      const worklog = await api.createWorklog(task.id, {
        hours,
        description: worklogDescription || undefined,
      });
      setWorklogs((prev) => [...prev, worklog]);
      setWorklogHours("");
      setWorklogDescription("");
      setShowWorklogForm(false);
    } catch (error) {
      console.error("Failed to add worklog:", error);
    } finally {
      setIsSubmittingWorklog(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const comment = await api.createComment(task.id, { content: newComment.trim() });
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const totalWorklogHours = worklogs.reduce((sum, w) => sum + w.hours, 0);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "details", label: "詳細", icon: null },
    { id: "comments", label: "コメント", icon: <MessageSquare className="h-4 w-4" />, count: comments.length },
    { id: "worklogs", label: "工数", icon: <Clock className="h-4 w-4" />, count: worklogs.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">タスク詳細</h2>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  保存
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  キャンセル
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                >
                  編集
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-4">
          {/* Details Tab */}
          {activeTab === "details" && (
            <div>
              {/* Title */}
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  タイトル
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.title ?? ""}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="w-full rounded-md border px-3 py-2 text-lg font-medium focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <h3 className="text-lg font-medium">{task.title}</h3>
                )}
              </div>

              {/* Status & Priority */}
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    ステータス
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {statuses.map((status) => (
                      <button
                        key={status.id}
                        onClick={() => handleStatusChange(status.id)}
                        className={cn(
                          "rounded-md px-3 py-1 text-sm transition-colors",
                          (editData.statusId ?? task.statusId) === status.id
                            ? "text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                        style={
                          (editData.statusId ?? task.statusId) === status.id
                            ? { backgroundColor: status.color }
                            : undefined
                        }
                      >
                        {status.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    優先度
                  </label>
                  {isEditing ? (
                    <select
                      value={editData.priority ?? task.priority}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          priority: Number(e.target.value) as TaskPriority,
                        }))
                      }
                      className="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none"
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {priorityConfig[p].label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-sm font-medium",
                        priorityConfig[task.priority].bgColor,
                        priorityConfig[task.priority].color
                      )}
                    >
                      {priorityConfig[task.priority].label}
                    </span>
                  )}
                </div>
              </div>

              {/* Assignee & Due Date */}
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                    <UserIcon className="h-3 w-3" />
                    担当者
                  </label>
                  {isEditing ? (
                    <select
                      value={editData.assigneeId ?? ""}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          assigneeId: e.target.value || null,
                        }))
                      }
                      className="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">未割当</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm">
                      {task.assignee?.name ?? "未割当"}
                    </span>
                  )}
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                    <Calendar className="h-3 w-3" />
                    期限
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editData.dueDate?.split("T")[0] ?? ""}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          dueDate: e.target.value || null,
                        }))
                      }
                      className="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <span className="text-sm">
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString("ja-JP")
                        : "未設定"}
                    </span>
                  )}
                </div>
              </div>

              {/* Estimated Hours */}
              <div className="mb-4">
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                  <Clock className="h-3 w-3" />
                  見積工数
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editData.estimatedHours ?? ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        estimatedHours: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      }))
                    }
                    placeholder="時間"
                    className="w-32 rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <span className="text-sm">
                    {task.estimatedHours ? `${task.estimatedHours}h` : "未設定"}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  説明
                </label>
                {isEditing ? (
                  <textarea
                    value={editData.description ?? ""}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={4}
                    className="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="タスクの詳細を入力..."
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {task.description || "説明なし"}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === "comments" && (
            <div className="space-y-4">
              {/* Comment Input */}
              <div className="rounded-lg border bg-gray-50 p-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="コメントを入力... (Cmd/Ctrl + Enter で送信)"
                  rows={3}
                  className="w-full resize-none rounded-md border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    送信
                  </button>
                </div>
              </div>

              {/* Comments List */}
              {comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-lg border bg-white p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                            {comment.user?.name?.charAt(0).toUpperCase() ?? "?"}
                          </div>
                          <span className="text-sm font-medium">
                            {comment.user?.name ?? "Unknown"}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleString("ja-JP", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-gray-700">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="mb-2 h-12 w-12 text-gray-300" />
                  <p className="text-sm text-gray-500">コメントはまだありません</p>
                  <p className="text-xs text-gray-400">
                    最初のコメントを投稿してみましょう
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Worklogs Tab */}
          {activeTab === "worklogs" && (
            <div>
              {/* Summary */}
              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">総工数</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {totalWorklogHours}h
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">見積工数</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {task.estimatedHours ?? "-"}h
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">差分</p>
                    <p
                      className={cn(
                        "text-2xl font-bold",
                        task.estimatedHours
                          ? totalWorklogHours > task.estimatedHours
                            ? "text-red-600"
                            : "text-green-600"
                          : "text-gray-400"
                      )}
                    >
                      {task.estimatedHours
                        ? `${totalWorklogHours - task.estimatedHours > 0 ? "+" : ""}${(totalWorklogHours - task.estimatedHours).toFixed(1)}h`
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Add Worklog Button */}
              <div className="mb-4">
                <button
                  onClick={() => setShowWorklogForm(!showWorklogForm)}
                  className="flex items-center gap-1 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
                >
                  <Plus className="h-4 w-4" />
                  工数を記録
                </button>
              </div>

              {/* Worklog Form */}
              {showWorklogForm && (
                <div className="mb-4 rounded-lg border bg-gray-50 p-4">
                  <div className="mb-3 grid grid-cols-[100px_1fr] gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        時間
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        value={worklogHours}
                        onChange={(e) => setWorklogHours(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        作業内容（任意）
                      </label>
                      <input
                        type="text"
                        value={worklogDescription}
                        onChange={(e) => setWorklogDescription(e.target.value)}
                        placeholder="作業内容を入力..."
                        className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddWorklog}
                      disabled={isSubmittingWorklog}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      登録
                    </button>
                    <button
                      onClick={() => setShowWorklogForm(false)}
                      className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-200"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}

              {/* Worklogs List */}
              {worklogs.length > 0 ? (
                <div className="space-y-2">
                  {worklogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-gray-900">
                          {log.hours}h
                        </span>
                        {log.description && (
                          <span className="text-sm text-gray-600">
                            {log.description}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.loggedAt).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="mb-2 h-12 w-12 text-gray-300" />
                  <p className="text-sm text-gray-500">工数記録はまだありません</p>
                  <p className="text-xs text-gray-400">
                    上のボタンから工数を記録してみましょう
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
