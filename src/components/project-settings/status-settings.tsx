"use client";

import { useState } from "react";
import { ProjectStatus, api } from "@/lib/api";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  GripVertical,
  Trash2,
  Edit2,
  Check,
  X,
  CheckCircle,
} from "lucide-react";

interface StatusSettingsProps {
  projectId: string;
  statuses: ProjectStatus[];
  onStatusesUpdate: (statuses: ProjectStatus[]) => void;
}

interface EditingStatus {
  id: string;
  name: string;
  color: string;
  isDone: boolean;
}

const colors = [
  "#6B7280", // gray
  "#EF4444", // red
  "#F59E0B", // amber
  "#10B981", // emerald
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
];

interface SortableStatusItemProps {
  status: ProjectStatus;
  editingStatus: EditingStatus | null;
  onEdit: (status: ProjectStatus) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (statusId: string) => void;
  onEditingChange: (status: EditingStatus) => void;
  canDelete: boolean;
}

function SortableStatusItem({
  status,
  editingStatus,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditingChange,
  canDelete,
}: SortableStatusItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isEditing = editingStatus?.id === status.id;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 ${isDragging ? "bg-gray-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {isEditing && editingStatus ? (
        /* Edit Mode */
        <div className="flex flex-1 items-center gap-4">
          <input
            type="text"
            value={editingStatus.name}
            onChange={(e) =>
              onEditingChange({ ...editingStatus, name: e.target.value })
            }
            className="rounded-md border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex gap-1">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => onEditingChange({ ...editingStatus, color })}
                className={`h-6 w-6 rounded-full ${
                  editingStatus.color === color
                    ? "ring-2 ring-offset-2 ring-blue-500"
                    : ""
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editingStatus.isDone}
              onChange={(e) =>
                onEditingChange({
                  ...editingStatus,
                  isDone: e.target.checked,
                })
              }
              className="rounded"
            />
            完了扱い
          </label>
          <div className="ml-auto flex gap-1">
            <button
              onClick={onSaveEdit}
              className="rounded p-1.5 text-green-600 hover:bg-green-50"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={onCancelEdit}
              className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* View Mode */
        <>
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <span className="flex-1 font-medium">{status.name}</span>
          {status.isDone === 1 && (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              <CheckCircle className="h-3 w-3" />
              完了
            </span>
          )}
          <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {status.slug}
          </code>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(status)}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(status.id)}
              className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              disabled={!canDelete}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </li>
  );
}

export function StatusSettings({
  projectId,
  statuses,
  onStatusesUpdate,
}: StatusSettingsProps) {
  const [editingStatus, setEditingStatus] = useState<EditingStatus | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newStatus, setNewStatus] = useState({
    name: "",
    color: "#6B7280",
    isDone: false,
  });
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px動かすとドラッグ開始
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = statuses.findIndex((s) => s.id === active.id);
      const newIndex = statuses.findIndex((s) => s.id === over.id);

      const newStatuses = arrayMove(statuses, oldIndex, newIndex);

      // Optimistic update
      onStatusesUpdate(newStatuses);

      try {
        setError(null);
        const statusIds = newStatuses.map((s) => s.id);
        await api.reorderStatuses(projectId, statusIds);
      } catch (err) {
        console.error("Failed to reorder statuses:", err);
        setError("ステータスの並び替えに失敗しました");
        // Revert on error
        onStatusesUpdate(statuses);
      }
    }
  };

  const handleEdit = (status: ProjectStatus) => {
    setEditingStatus({
      id: status.id,
      name: status.name,
      color: status.color,
      isDone: status.isDone === 1,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingStatus) return;

    try {
      setError(null);
      const updated = await api.updateStatus(projectId, editingStatus.id, {
        name: editingStatus.name,
        color: editingStatus.color,
        isDone: editingStatus.isDone ? 1 : 0,
      });

      onStatusesUpdate(
        statuses.map((s) => (s.id === editingStatus.id ? updated : s))
      );
      setEditingStatus(null);
    } catch (err) {
      console.error("Failed to update status:", err);
      setError("ステータスの更新に失敗しました");
    }
  };

  const handleCancelEdit = () => {
    setEditingStatus(null);
  };

  const handleCreate = async () => {
    if (!newStatus.name.trim()) return;

    try {
      setError(null);
      const slug = newStatus.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

      const created = await api.createStatus(projectId, {
        name: newStatus.name,
        slug: slug || `status_${Date.now()}`,
        color: newStatus.color,
        isDone: newStatus.isDone ? 1 : 0,
        position: statuses.length,
      });

      onStatusesUpdate([...statuses, created]);
      setNewStatus({ name: "", color: "#6B7280", isDone: false });
      setIsCreating(false);
    } catch (err) {
      console.error("Failed to create status:", err);
      setError("ステータスの作成に失敗しました");
    }
  };

  const handleDelete = async (statusId: string) => {
    const status = statuses.find((s) => s.id === statusId);
    if (!status) return;

    if (!confirm(`「${status.name}」を削除しますか？このステータスのタスクは最初のステータスに移動されます。`)) {
      return;
    }

    try {
      setError(null);
      await api.deleteStatus(projectId, statusId);
      onStatusesUpdate(statuses.filter((s) => s.id !== statusId));
    } catch (err) {
      console.error("Failed to delete status:", err);
      setError("ステータスの削除に失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">ステータス設定</h2>
        <p className="mt-1 text-sm text-gray-500">
          プロジェクトのワークフローに合わせてステータスをカスタマイズ（ドラッグで並び替え可能）
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-white">
        {/* Status List */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={statuses.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y">
              {statuses.map((status) => (
                <SortableStatusItem
                  key={status.id}
                  status={status}
                  editingStatus={editingStatus}
                  onEdit={handleEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onDelete={handleDelete}
                  onEditingChange={setEditingStatus}
                  canDelete={statuses.length > 1}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {/* Create New Status */}
        {isCreating ? (
          <div className="border-t p-4">
            <div className="flex items-center gap-4">
              <div className="w-5" />
              <input
                type="text"
                value={newStatus.name}
                onChange={(e) =>
                  setNewStatus({ ...newStatus, name: e.target.value })
                }
                placeholder="ステータス名"
                className="rounded-md border px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewStatus({ ...newStatus, color })}
                    className={`h-6 w-6 rounded-full ${
                      newStatus.color === color
                        ? "ring-2 ring-offset-2 ring-blue-500"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newStatus.isDone}
                  onChange={(e) =>
                    setNewStatus({ ...newStatus, isDone: e.target.checked })
                  }
                  className="rounded"
                />
                完了扱い
              </label>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newStatus.name.trim()}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  追加
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewStatus({ name: "", color: "#6B7280", isDone: false });
                  }}
                  className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t p-4">
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" />
              ステータスを追加
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-medium">ヒント</p>
        <ul className="mt-1 list-inside list-disc space-y-1">
          <li>ドラッグ&ドロップでステータスの順番を変更できます</li>
          <li>「完了扱い」にチェックを入れたステータスは、進捗計算で完了タスクとしてカウントされます</li>
        </ul>
      </div>
    </div>
  );
}
