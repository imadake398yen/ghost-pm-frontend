"use client";

import { useState, useEffect } from "react";
import {
  Task,
  TaskStatus,
  TaskPriority,
  UpdateTaskData,
  Worklog,
  User,
  api,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { X, Save, Trash2, Plus, Clock, Calendar, User as UserIcon } from "lucide-react";
import { priorityConfig, statusConfig } from "./task-card";

interface TaskModalProps {
  task: Task;
  teamMembers: User[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
}

const STATUS_OPTIONS: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const PRIORITY_OPTIONS: TaskPriority[] = [1, 2, 3, 4];

export function TaskModal({
  task,
  teamMembers,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: TaskModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [editData, setEditData] = useState<UpdateTaskData>({});
  const [worklogs, setWorklogs] = useState<Worklog[]>([]);
  const [showWorklogForm, setShowWorklogForm] = useState(false);
  const [worklogHours, setWorklogHours] = useState("");
  const [worklogDescription, setWorklogDescription] = useState("");

  useEffect(() => {
    if (isOpen && task) {
      setEditData({
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId ?? undefined,
        dueDate: task.dueDate ?? undefined,
        estimatedHours: task.estimatedHours ?? undefined,
      });
      fetchWorklogs();
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

  const handleStatusChange = async (status: TaskStatus) => {
    try {
      const updatedTask = await api.updateTaskStatus(task.id, status);
      onUpdate(updatedTask);
      setEditData((prev) => ({ ...prev, status }));
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("このタスクを削除しますか？")) return;
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
    }
  };

  const totalWorklogHours = worklogs.reduce((sum, w) => sum + w.hours, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
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

        {/* Content */}
        <div className="p-4">
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
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={cn(
                      "rounded-md px-3 py-1 text-sm transition-colors",
                      (editData.status ?? task.status) === status
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    {statusConfig[status].label}
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

          {/* Worklogs */}
          <div className="border-t pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-1 text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4" />
                工数記録
                <span className="ml-2 text-xs text-gray-500">
                  (合計: {totalWorklogHours}h / 見積: {task.estimatedHours ?? "-"}h)
                </span>
              </h4>
              <button
                onClick={() => setShowWorklogForm(!showWorklogForm)}
                className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
              >
                <Plus className="h-3 w-3" />
                追加
              </button>
            </div>

            {showWorklogForm && (
              <div className="mb-3 rounded-md border bg-gray-50 p-3">
                <div className="mb-2 flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={worklogHours}
                    onChange={(e) => setWorklogHours(e.target.value)}
                    placeholder="時間"
                    className="w-24 rounded-md border px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={worklogDescription}
                    onChange={(e) => setWorklogDescription(e.target.value)}
                    placeholder="作業内容（任意）"
                    className="flex-1 rounded-md border px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddWorklog}
                    className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  >
                    登録
                  </button>
                  <button
                    onClick={() => setShowWorklogForm(false)}
                    className="rounded-md px-3 py-1 text-sm text-gray-600 hover:bg-gray-200"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            {worklogs.length > 0 ? (
              <div className="space-y-2">
                {worklogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{log.hours}h</span>
                      {log.description && (
                        <span className="ml-2 text-gray-600">
                          - {log.description}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(log.loggedAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">工数記録はありません</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
