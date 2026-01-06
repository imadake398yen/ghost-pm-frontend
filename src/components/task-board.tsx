"use client";

import { useState, useCallback, useMemo } from "react";
import { Task, TaskStatus, User, ProjectStatus, api } from "@/lib/api";
import { TaskCard } from "./task-card";
import { TaskDetailModal } from "./task-detail-modal";
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface TaskBoardProps {
  tasks: Task[];
  teamMembers: User[];
  statuses: ProjectStatus[];
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onStatusesReorder?: (statuses: ProjectStatus[]) => void;
}

// 後方互換用のデフォルトステータス
const DEFAULT_STATUSES: ProjectStatus[] = [
  { id: "todo", projectId: "", name: "TODO", slug: "todo", color: "#6B7280", position: 0, isDone: 0, createdAt: "" },
  { id: "in_progress", projectId: "", name: "進行中", slug: "in_progress", color: "#3B82F6", position: 1, isDone: 0, createdAt: "" },
  { id: "in_review", projectId: "", name: "レビュー中", slug: "in_review", color: "#F59E0B", position: 2, isDone: 0, createdAt: "" },
  { id: "done", projectId: "", name: "完了", slug: "done", color: "#10B981", position: 3, isDone: 1, createdAt: "" },
];

// 古いstatus enumから新しいstatusIdへのマッピング
const STATUS_SLUG_MAP: Record<TaskStatus, string> = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  DONE: "done",
};

// ドラッグ可能なタスクカード
function DraggableTaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none"
    >
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}

// ドラッグ可能なカラム
function SortableColumn({
  status,
  tasks,
  isOver,
  onTaskClick,
}: {
  status: ProjectStatus;
  tasks: Task[];
  isOver: boolean;
  onTaskClick: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${status.id}`,
    data: { type: "column", status },
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `droppable-${status.id}`,
    data: { type: "column", statusId: status.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`flex min-w-[280px] flex-1 flex-col rounded-lg transition-colors ${
        isOver ? "bg-blue-100 ring-2 ring-blue-400" : "bg-gray-100"
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      {/* Column Header - ドラッグハンドル */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between border-b border-gray-200 px-3 py-2 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-400" />
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <h3 className="text-sm font-medium text-gray-700">{status.name}</h3>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Task List - ドロップエリア */}
      <div
        ref={setDroppableRef}
        className={`flex flex-1 flex-col gap-2 p-2 min-h-[200px] ${
          isOver ? "bg-blue-50" : ""
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <p className="text-sm text-gray-400">ここにドロップ</p>
            </div>
          ) : (
            tasks.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export function TaskBoard({
  tasks,
  teamMembers,
  statuses,
  onTaskUpdate,
  onTaskDelete,
  onStatusesReorder,
}: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeType, setActiveType] = useState<"task" | "column" | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  // ローカルでカラム順序を管理
  const [localStatuses, setLocalStatuses] = useState<ProjectStatus[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // より敏感に
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ステータスが空の場合はデフォルトを使用
  const columns = useMemo(() => {
    const baseStatuses = statuses.length > 0 ? statuses : DEFAULT_STATUSES;
    // localStatusesが更新されていればそれを使う
    if (localStatuses.length > 0 && localStatuses[0]?.projectId === baseStatuses[0]?.projectId) {
      return localStatuses;
    }
    return baseStatuses;
  }, [statuses, localStatuses]);

  // statusesが変更されたらlocalStatusesを更新
  useMemo(() => {
    if (statuses.length > 0) {
      setLocalStatuses(statuses);
    }
  }, [statuses]);

  // タスクをステータスIDでグループ化
  const tasksByStatusId = useMemo(() => {
    const result: Record<string, Task[]> = {};

    columns.forEach((status) => {
      result[status.id] = [];
    });

    tasks.forEach((task) => {
      let statusId = task.statusId;
      if (!statusId) {
        const slug = STATUS_SLUG_MAP[task.status];
        const matchingStatus = columns.find((s) => s.slug === slug);
        statusId = matchingStatus?.id || columns[0]?.id;
      }

      if (statusId && result[statusId]) {
        result[statusId]!.push(task);
      } else if (columns[0]) {
        result[columns[0].id]?.push(task);
      }
    });

    return result;
  }, [tasks, columns]);

  // アクティブなアイテムを取得
  const activeTask = useMemo(() => {
    if (activeType !== "task" || !activeId) return null;
    return tasks.find((t) => t.id === activeId) || null;
  }, [activeId, activeType, tasks]);

  const activeColumn = useMemo(() => {
    if (activeType !== "column" || !activeId) return null;
    const columnId = activeId.toString().replace("column-", "");
    return columns.find((c) => c.id === columnId) || null;
  }, [activeId, activeType, columns]);

  const handleTaskClick = useCallback((task: Task) => {
    // ドラッグ中はクリックを無視
    if (activeId) return;
    setSelectedTask(task);
    setModalOpen(true);
  }, [activeId]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedTask(null);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    onTaskUpdate(updatedTask);
    setSelectedTask(updatedTask);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);

    if (active.id.toString().startsWith("column-")) {
      setActiveType("column");
    } else {
      setActiveType("task");
    }
  };

  const handleDragOver = (event: DragEndEvent) => {
    const { over } = event;

    if (!over) {
      setOverColumnId(null);
      return;
    }

    // ドロップ先のカラムIDを特定
    if (over.id.toString().startsWith("droppable-")) {
      setOverColumnId(over.id.toString().replace("droppable-", ""));
    } else if (over.id.toString().startsWith("column-")) {
      setOverColumnId(over.id.toString().replace("column-", ""));
    } else {
      // タスクの上にいる場合、そのタスクのカラムを取得
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) {
        let statusId = overTask.statusId;
        if (!statusId) {
          const slug = STATUS_SLUG_MAP[overTask.status];
          const matchingStatus = columns.find((s) => s.slug === slug);
          statusId = matchingStatus?.id || null;
        }
        setOverColumnId(statusId);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);
    setOverColumnId(null);

    if (!over) return;

    // カラムの並び替え
    if (active.id.toString().startsWith("column-") && over.id.toString().startsWith("column-")) {
      const activeColumnId = active.id.toString().replace("column-", "");
      const overColumnId = over.id.toString().replace("column-", "");

      if (activeColumnId !== overColumnId) {
        const oldIndex = columns.findIndex((c) => c.id === activeColumnId);
        const newIndex = columns.findIndex((c) => c.id === overColumnId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newColumns = arrayMove(columns, oldIndex, newIndex);
          setLocalStatuses(newColumns);

          // APIで並び替えを保存
          if (onStatusesReorder) {
            onStatusesReorder(newColumns);
          }

          // projectIdが存在する場合のみAPIを呼ぶ
          const projectId = columns[0]?.projectId;
          if (projectId && projectId !== "") {
            try {
              console.log("[reorder] Calling API with:", { projectId, statusIds: newColumns.map((c) => c.id) });
              await api.reorderStatuses(projectId, newColumns.map((c) => c.id));
            } catch (error: unknown) {
              const err = error as Error & { message?: string };
              console.error("Failed to reorder statuses:", err.message || error);
              alert(`ステータス並び替えエラー: ${err.message || "不明なエラー"}`);
              // エラー時は元に戻す
              setLocalStatuses(columns);
            }
          }
        }
      }
      return;
    }

    // タスクの移動
    if (activeType === "task") {
      const taskId = active.id as string;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      let targetStatusId: string | null = null;

      if (over.id.toString().startsWith("droppable-")) {
        targetStatusId = over.id.toString().replace("droppable-", "");
      } else if (over.id.toString().startsWith("column-")) {
        targetStatusId = over.id.toString().replace("column-", "");
      } else {
        const overTask = tasks.find((t) => t.id === over.id);
        if (overTask) {
          targetStatusId = overTask.statusId || null;
          if (!targetStatusId) {
            const slug = STATUS_SLUG_MAP[overTask.status];
            const matchingStatus = columns.find((s) => s.slug === slug);
            targetStatusId = matchingStatus?.id || null;
          }
        }
      }

      let currentStatusId = task.statusId;
      if (!currentStatusId) {
        const slug = STATUS_SLUG_MAP[task.status];
        const matchingStatus = columns.find((s) => s.slug === slug);
        currentStatusId = matchingStatus?.id || null;
      }

      if (targetStatusId && targetStatusId !== currentStatusId) {
        // 楽観的更新
        onTaskUpdate({ ...task, statusId: targetStatusId });

        try {
          await api.updateTaskStatusById(taskId, targetStatusId);
        } catch (error) {
          console.error("Failed to update task status:", error);
          // エラー時は元に戻す
          onTaskUpdate(task);
        }
      }
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columns.map((c) => `column-${c.id}`)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((status) => (
              <SortableColumn
                key={status.id}
                status={status}
                tasks={tasksByStatusId[status.id] || []}
                isOver={overColumnId === status.id && activeType === "task"}
                onTaskClick={handleTaskClick}
              />
            ))}
          </div>
        </SortableContext>

        {/* ドラッグ中のオーバーレイ */}
        <DragOverlay>
          {activeTask && (
            <div className="rotate-2 scale-105 shadow-xl">
              <TaskCard task={activeTask} onClick={() => {}} />
            </div>
          )}
          {activeColumn && (
            <div className="min-w-[280px] rounded-lg bg-gray-100 shadow-xl opacity-90">
              <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
                <GripVertical className="h-4 w-4 text-gray-400" />
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: activeColumn.color }}
                />
                <h3 className="text-sm font-medium text-gray-700">
                  {activeColumn.name}
                </h3>
              </div>
              <div className="p-2 min-h-[100px]">
                <p className="text-sm text-gray-400 text-center py-4">
                  {tasksByStatusId[activeColumn.id]?.length || 0} タスク
                </p>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          teamMembers={teamMembers}
          statuses={columns}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleTaskUpdate}
          onDelete={onTaskDelete}
        />
      )}
    </>
  );
}
