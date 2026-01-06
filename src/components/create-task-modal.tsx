"use client";

import { useState } from "react";
import { Task, TaskPriority, CreateTaskData, User, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { X, Calendar, Clock, User as UserIcon } from "lucide-react";
import { priorityConfig } from "./task-card";

interface CreateTaskModalProps {
  projectId: string;
  teamMembers: User[];
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: Task) => void;
}

const PRIORITY_OPTIONS: TaskPriority[] = [1, 2, 3, 4];

export function CreateTaskModal({
  projectId,
  teamMembers,
  isOpen,
  onClose,
  onCreate,
}: CreateTaskModalProps) {
  const [isSubmitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateTaskData>({
    title: "",
    description: "",
    priority: 3,
    assigneeId: undefined,
    dueDate: undefined,
    estimatedHours: undefined,
  });
  const [errors, setErrors] = useState<{ title?: string }>({});

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: 3,
      assigneeId: undefined,
      dueDate: undefined,
      estimatedHours: undefined,
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    const newErrors: { title?: string } = {};
    if (!formData.title.trim()) {
      newErrors.title = "タイトルは必須です";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const task = await api.createTask(projectId, {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        priority: formData.priority,
        assigneeId: formData.assigneeId || undefined,
        dueDate: formData.dueDate || undefined,
        estimatedHours: formData.estimatedHours || undefined,
      });
      onCreate(task);
      handleClose();
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">新規タスク作成</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Title */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className={cn(
                "w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none",
                errors.title && "border-red-500"
              )}
              placeholder="タスクのタイトルを入力..."
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              説明
            </label>
            <textarea
              value={formData.description ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="タスクの詳細を入力..."
            />
          </div>

          {/* Priority */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              優先度
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, priority: p }))}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    formData.priority === p
                      ? cn(priorityConfig[p].bgColor, priorityConfig[p].color, "ring-2 ring-offset-1")
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {priorityConfig[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee & Due Date */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                <UserIcon className="h-4 w-4" />
                担当者
              </label>
              <select
                value={formData.assigneeId ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    assigneeId: e.target.value || undefined,
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
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4" />
                期限
              </label>
              <input
                type="date"
                value={formData.dueDate ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    dueDate: e.target.value || undefined,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Estimated Hours */}
          <div className="mb-6">
            <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
              <Clock className="h-4 w-4" />
              見積工数（時間）
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={formData.estimatedHours ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  estimatedHours: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                }))
              }
              placeholder="0"
              className="w-32 rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
