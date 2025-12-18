import { useState, useEffect } from 'react';
import { 
  Modal, 
  Stack, 
  TextInput, 
  Textarea, 
  Select, 
  NumberInput, 
  MultiSelect, 
  Button, 
  Group, 
  Badge, 
  Text,
  ActionIcon,
  Box,
  Switch
} from '@mantine/core';
import { 
  IconUser, 
  IconCalendar, 
  IconX, 
  IconEdit,
  IconDeviceFloppy,
  IconGitBranch,
  IconGitPullRequest,
  IconLock
} from '@tabler/icons-react';
import { useTranslation } from '../hooks/useTranslation.js';
import { useTags } from '../hooks/useTags.js';
import { useUsers } from '../hooks/useUsers.js';

export function TaskDetailsModal({ 
  task, 
  taskStatuses = ['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'], // Default fallback
  opened, 
  onClose, 
  onSave
}) {
  const { t, translatePriority, translateStatus } = useTranslation();
  const { tags = [] } = useTags();
  const { users = [] } = useUsers();
  const [editedTask, setEditedTask] = useState(null);

  // Initialize edited task when modal opens
  useEffect(() => {
    if (task && opened) {
      setEditedTask({
        ...task,
        tags: task.tags && Array.isArray(task.tags) ? task.tags.map(tag => tag?.tag || tag).filter(Boolean) : [],
        isBlocked: Boolean(task.isBlocked),
        blockedReason: task.blockedReason || '',
        gitFeatureBranch: task.gitFeatureBranch || '',
        gitPullRequestUrl: task.gitPullRequestUrl || ''
      });
    }
  }, [task, opened]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'red';
      case 'HIGH': return 'orange';
      case 'MEDIUM': return 'yellow';
      case 'LOW': return 'blue';
      default: return 'gray';
    }
  };

  const handleSave = () => {
    if (onSave && editedTask) {
      // Validate that blocked reason is provided when task is blocked
      if (editedTask.isBlocked && (!editedTask.blockedReason || editedTask.blockedReason.trim() === '')) {
        alert('Please provide a reason when marking a task as blocked.');
        return;
      }
      
      const tagColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'];
      const tagsWithColors = editedTask.tags.map((tagName, index) => ({
        tag: tagName,
        color: tagColors[index % tagColors.length]
      }));
      
      // Normalize empty strings to null for cleaner data
      const normalizedTask = {
        ...editedTask,
        blockedReason: editedTask.blockedReason === '' ? null : editedTask.blockedReason,
        gitFeatureBranch: editedTask.gitFeatureBranch === '' ? null : editedTask.gitFeatureBranch,
        gitPullRequestUrl: editedTask.gitPullRequestUrl === '' ? null : editedTask.gitPullRequestUrl,
        prompt: editedTask.prompt === '' ? null : editedTask.prompt
      };
      
      onSave({
        ...normalizedTask,
        tags: tagsWithColors,
        tagNames: editedTask.tags // Send tag names for API update
      });
      
      // Close the modal after successful save
      onClose();
    }
  };

  const handleCancel = () => {
    setEditedTask({
      ...task,
      tags: task.tags && Array.isArray(task.tags) ? task.tags.map(tag => tag?.tag || tag).filter(Boolean) : []
    });
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!task || !opened) return null;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={null}
      withCloseButton={false}
      size="50%"
      styles={{
        content: {
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: '12px',
          overflow: 'visible',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          marginTop: '35px',
          padding: '0 0 8px 0'
        }
      }}
    >
      {/* Task ID tab positioned relative to modal */}
      <Box
        style={{
          position: 'absolute',
          top: '-30px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--mantine-color-blue-6)',
          color: 'white',
          padding: '6px 16px',
          borderRadius: '8px 8px 0 0',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          border: '1px solid var(--mantine-color-gray-3)',
          borderBottom: 'none',
          minWidth: '80px',
          textAlign: 'center'
        }}
      >
        {task.taskId}
      </Box>

      <div style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header with Task Title, Edit Button, and Close Button */}
        <Box
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--mantine-color-gray-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '8px 8px 0 0',
            position: 'relative',
            flexShrink: 0
          }}
        >
          {/* Task Title */}
          <Text size="lg" fw={600} style={{ flex: 1 }}>
            {task.title}
          </Text>
          
          {/* Close Button */}
          <ActionIcon
            variant="subtle"
            onClick={handleClose}
            title={t('common.close')}
            size="sm"
          >
            <IconX size={16} />
          </ActionIcon>
        </Box>

        {/* Modal Content - Scrollable */}
        <Box 
          p="md" 
          style={{ 
            flex: 1, 
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
            maxHeight: 'calc(85vh - 140px)'
          }}
        >
          <Stack gap="md">
              {/* Title - Full width */}
              <TextInput
                label={t('tasks.title')}
                placeholder={t('tasks.title')}
                value={editedTask?.title || ''}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                required
              />
              
              {/* Status, Story Points, and Priority on same line */}
              <Group grow={false} justify="space-between">
                <Group grow={false}>
                  <Select
                    label="Points"
                    placeholder={t('tasks.storyPoints')}
                    data={[
                      { value: '', label: '-' },
                      { value: '1', label: '1' },
                      { value: '2', label: '2' },
                      { value: '3', label: '3' },
                      { value: '5', label: '5' },
                      { value: '8', label: '8' },
                      { value: '13', label: '13' },
                      { value: '21', label: '21' }
                    ]}
                    value={editedTask?.storyPoints?.toString() || ''}
                    onChange={(value) => setEditedTask({ ...editedTask, storyPoints: value ? parseInt(value) : null })}
                    style={{ width: '100px' }}
                    withCheckIcon={false}
                  />
                  
                  <Select
                    label={t('tasks.priority')}
                    data={[
                      { value: 'LOW', label: t('tasks.priorities.LOW') },
                      { value: 'MEDIUM', label: t('tasks.priorities.MEDIUM') },
                      { value: 'HIGH', label: t('tasks.priorities.HIGH') },
                      { value: 'CRITICAL', label: t('tasks.priorities.CRITICAL') }
                    ]}
                    value={editedTask?.priority || 'MEDIUM'}
                    onChange={(value) => setEditedTask({ ...editedTask, priority: value })}
                    style={{ width: '105px' }}
                    withCheckIcon={false}
                  />
                </Group>
                
                <Select
                  label={t('tasks.status')}
                  data={taskStatuses.map(status => ({
                    value: status,
                    label: translateStatus(status)
                  }))}
                  value={editedTask?.status || 'TO_DO'}
                  onChange={(value) => setEditedTask({ ...editedTask, status: value })}
                  maxDropdownHeight={200}
                  style={{ minWidth: '100px' }}
                  withCheckIcon={false}
                />
              </Group>
              
              {/* Tags */}
              <TextInput
                label={t('tags.title')}
                placeholder={t('tags.commaSeparated')}
                value={editedTask?.tags?.join(', ') || ''}
                onChange={(e) => {
                  const tagString = e.target.value;
                  const tagArray = tagString
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0);
                  setEditedTask({ ...editedTask, tags: tagArray });
                }}
                description={t('tags.commaSeparatedDescription')}
              />
              
              {/* Git Feature Branch */}
              <TextInput
                label={t('tasks.gitFeatureBranch')}
                placeholder={t('tasks.gitFeatureBranchPlaceholder')}
                value={editedTask?.gitFeatureBranch || ''}
                onChange={(e) => setEditedTask({ ...editedTask, gitFeatureBranch: e.target.value })}
                leftSection={<IconGitBranch size={16} />}
              />
              
              {/* Git Pull Request URL */}
              <TextInput
                label={t('tasks.gitPullRequestUrl')}
                placeholder={t('tasks.gitPullRequestUrlPlaceholder')}
                value={editedTask?.gitPullRequestUrl || ''}
                onChange={(e) => setEditedTask({ ...editedTask, gitPullRequestUrl: e.target.value })}
                leftSection={<IconGitPullRequest size={16} />}
              />
              
              {/* Assignee */}
              <Select
                label={t('tasks.assignee')}
                placeholder={t('tasks.selectAssignee')}
                data={[
                  { value: '', label: t('tasks.unassigned') },
                  ...(Array.isArray(users) ? users.map(user => ({ 
                    value: user.id.toString(), 
                    label: user.fullName 
                  })) : [])
                ]}
                value={editedTask?.assigneeId?.toString() || ''}
                onChange={(value) => {
                  const selectedUser = users.find(u => u.id.toString() === value);
                  setEditedTask({ 
                    ...editedTask, 
                    assigneeId: value ? parseInt(value) : null,
                    assigneeName: selectedUser ? selectedUser.fullName : ''
                  });
                }}
                leftSection={<IconUser size={16} />}
                clearable
              />
              
              {/* Blocked toggle and reason on same line */}
              <Group align="flex-end">
                <Group gap="xs">
                  <IconLock size={16} />
                  <Switch
                    label={t('tasks.isBlocked')}
                    checked={editedTask?.isBlocked || false}
                    onChange={(e) => setEditedTask({ ...editedTask, isBlocked: e.currentTarget.checked })}
                  />
                </Group>
                
                {editedTask?.isBlocked && (
                  <TextInput
                    placeholder={t('tasks.blockedReasonPlaceholder')}
                    value={editedTask?.blockedReason || ''}
                    onChange={(e) => setEditedTask({ ...editedTask, blockedReason: e.target.value })}
                    required
                    style={{ flex: 1 }}
                  />
                )}
              </Group>
              
              {/* Prompt - doubled height */}
              <Textarea
                label={t('tasks.prompt')}
                placeholder={t('tasks.prompt')}
                value={editedTask?.prompt || ''}
                onChange={(e) => setEditedTask({ ...editedTask, prompt: e.target.value })}
                rows={8}
              />
            </Stack>
        </Box>
        
        {/* Buttons - outside scrollable area */}
        <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)', flexShrink: 0 }}>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={handleCancel}>
                {t('common.cancel')}
              </Button>
              <Button 
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={handleSave}
              >
                {t('common.save')}
              </Button>
            </Group>
          </Box>
      </div>
    </Modal>
  );
}
