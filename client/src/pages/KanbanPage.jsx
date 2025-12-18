import { Container, Text } from '@mantine/core';
import { useTranslation } from '../hooks/useTranslation.js';
import { useTasks } from '../hooks/useTasks.js';
import { useModalManager } from '../hooks/useModalManager.js';
import { useDragAndDrop } from '../hooks/useDragAndDrop.js';
import { useTaskActions } from '../hooks/useTaskActions.js';
import { KanbanBoard } from '../components/KanbanBoard.jsx';
import { KanbanDebug } from '../components/KanbanDebug.jsx';
import { TaskDetailsModal } from '../components/TaskDetailModal.jsx';

import { useEffect } from 'react';

export function KanbanPage({ selectedProject, onBackToProjects, refreshTrigger }) {
  const { t } = useTranslation();
  const { 
    tasks, 
    loading, 
    taskStatuses, 
    getTasksByStatus,
    refreshTasks 
  } = useTasks(selectedProject);
  
  // Refresh tasks when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refreshTasks();
    }
  }, [refreshTrigger, refreshTasks]);
  
  // Use custom hooks for better separation of concerns
  const { openModals, openModal, closeModal, updateModalTask } = useModalManager();
  const { handleDragEnd } = useDragAndDrop({ tasks, getTasksByStatus, refreshTasks, selectedProject });
  const { handleTaskEdit, handleModalClose, handleTaskSave } = useTaskActions({ 
    refreshTasks, openModal, closeModal, updateModalTask, selectedProject 
  });

  if (loading) {
    return (
      <Container size="xl" py="xl" mt="md">
        <Text>{t('common.loading')}</Text>
      </Container>
    );
  }

  return (
    <>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '16px', paddingTop: '80px' }}>
        <KanbanBoard
          taskStatuses={taskStatuses}
          getTasksByStatus={getTasksByStatus}
          onTaskEdit={handleTaskEdit}
          onDragEnd={handleDragEnd}
        />
      </div>

      {/* Debug component */}
      <KanbanDebug
        selectedProject={selectedProject}
        tasks={tasks}
        openModals={openModals}
        loading={loading}
        taskStatuses={taskStatuses}
        getTasksByStatus={getTasksByStatus}
      />

      {/* Multiple Task Detail Modals */}
      {openModals.map(modal => (
        <TaskDetailsModal
          key={modal.id}
          task={modal.task}
          taskStatuses={taskStatuses}
          opened={true}
          onClose={() => handleModalClose(modal.id)}
          onSave={(updatedTask) => handleTaskSave(modal.id, updatedTask)}
        />
      ))}
    </>
  );
} 