import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn.jsx';

export function KanbanBoard({ taskStatuses, getTasksByStatus, onTaskEdit, onDragEnd }) {
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'nowrap', 
          overflowX: 'auto', 
          gap: '16px', 
          height: '100%',
          paddingBottom: '16px' // Space for scrollbar
        }}
      >
        {taskStatuses.map(status => (
          <KanbanColumn 
            key={status} 
            status={status} 
            tasks={getTasksByStatus(status)} 
            onTaskEdit={onTaskEdit}
          />
        ))}
      </div>
    </DndContext>
  );
}
