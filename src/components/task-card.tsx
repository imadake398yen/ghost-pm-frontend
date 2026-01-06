"use client";

import { Task, TaskPriority, TaskStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Calendar, Clock, User } from "lucide-react";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const priorityConfig: Record<
  TaskPriority,
  { label: string; color: string; bgColor: string }
> = {
  1: { label: "緊急", color: "text-red-700", bgColor: "bg-red-100" },
  2: { label: "高", color: "text-orange-700", bgColor: "bg-orange-100" },
  3: { label: "中", color: "text-blue-700", bgColor: "bg-blue-100" },
  4: { label: "低", color: "text-gray-700", bgColor: "bg-gray-100" },
};

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  TODO: { label: "TODO", color: "bg-gray-400" },
  IN_PROGRESS: { label: "進行中", color: "bg-blue-500" },
  IN_REVIEW: { label: "レビュー中", color: "bg-yellow-500" },
  DONE: { label: "完了", color: "bg-green-500" },
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md",
        isOverdue && "border-red-300 bg-red-50"
      )}
    >
      {/* Priority Badge */}
      <div className="mb-2 flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            priority.bgColor,
            priority.color
          )}
        >
          {priority.label}
        </span>
        <div className={cn("h-2 w-2 rounded-full", status.color)} title={status.label} />
      </div>

      {/* Title */}
      <h4 className="mb-2 text-sm font-medium text-gray-900 line-clamp-2">
        {task.title}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="mb-3 text-xs text-gray-500 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{task.assignee.name}</span>
          </div>
        )}

        {/* Due date */}
        {task.dueDate && (
          <div
            className={cn(
              "flex items-center gap-1",
              isOverdue && "font-medium text-red-600"
            )}
          >
            <Calendar className="h-3 w-3" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
        )}

        {/* Estimated hours */}
        {task.estimatedHours && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {task.actualHours ?? 0}/{task.estimatedHours}h
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export { priorityConfig, statusConfig };
