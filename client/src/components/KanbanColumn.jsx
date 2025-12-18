import { Paper, Stack, Text, Badge, Box, Group } from '@mantine/core';
import { useTranslation } from '../hooks/useTranslation.js';
import { TaskCard } from './TaskCard.jsx';
import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Draggable Task Card Wrapper
function DraggableTaskCard({ task, onTaskEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    data: {
      type: 'task',
      task: task
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...attributes}
      {...listeners}
    >
      <TaskCard 
        task={task} 
        onEdit={onTaskEdit}
      />
    </div>
  );
}

export function KanbanColumn({ status, tasks, onTaskEdit }) {
  const { t, translateStatus } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: 'calc(100vh - 140px)', 
      flex: '0 0 320px',
      maxWidth: '320px'
    }}>
      {/* Column title */}
      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
        <Group gap="xs" align="center">
          <Text fw={600} size="lg">
            {translateStatus(status)}
          </Text>
          <Badge size="sm" variant="light">
            {tasks.length}
          </Badge>
        </Group>
      </Box>
      
      {/* Column content */}
      <Paper 
        ref={setNodeRef}
        p="md" 
        withBorder 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: isOver ? 'rgba(59, 130, 246, 0.1)' : undefined,
          borderColor: isOver ? 'var(--mantine-color-blue-6)' : undefined,
          borderWidth: isOver ? '2px' : undefined,
          transition: 'all 0.2s ease'
        }}
      >
        <Box 
          style={{ 
            flex: 1, 
            overflowY: 'auto',
            padding: '8px'
          }}
        >
          {tasks.length === 0 ? (
            <Box style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flex: 1,
              border: '2px dashed #ccc',
              borderRadius: '8px',
              margin: '8px 0',
              minHeight: '100px'
            }}>
              <Text size="sm" c="dimmed" ta="center">
                {t('kanban.noTasksInColumn')}
              </Text>
            </Box>
          ) : (
            <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
              <Stack gap="xs">
                {tasks.map(task => (
                  <DraggableTaskCard 
                    key={task.id} 
                    task={task} 
                    onTaskEdit={onTaskEdit}
                  />
                ))}
              </Stack>
            </SortableContext>
          )}
        </Box>
      </Paper>
    </div>
  );
} 