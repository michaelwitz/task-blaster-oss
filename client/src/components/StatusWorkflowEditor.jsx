import { useState, useEffect } from 'react';
import { Stack, Group, Button, Text, Badge, Tooltip, Paper } from '@mantine/core';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconGripVertical, IconPlus, IconX } from '@tabler/icons-react';
import { useTranslation } from '../hooks/useTranslation.js';

// Sortable item component for selected statuses
function SortableStatusItem({ status, onRemove, canRemove, readOnly }) {
  const { translateStatus, translateStatusDescription } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: status, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      p="sm"
      withBorder
      shadow="sm"
    >
      <Group justify="space-between">
        <Group gap="sm">
          {!readOnly && (
            <div {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
              <IconGripVertical size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
            </div>
          )}
          <Tooltip label={translateStatusDescription(status)} withArrow>
            <div>
              <Text fw={500}>{translateStatus(status)}</Text>
              <Text size="xs" c="dimmed">{status}</Text>
            </div>
          </Tooltip>
        </Group>
        {!readOnly && (
          canRemove ? (
            <Button
              variant="subtle"
              color="red"
              size="xs"
              onClick={() => onRemove(status)}
              leftSection={<IconX size={14} />}
            >
              Remove
            </Button>
          ) : (
            <Tooltip label="Cannot remove: tasks exist with this status" withArrow>
              <Badge color="orange" variant="light">
                Has tasks
              </Badge>
            </Tooltip>
          )
        )}
      </Group>
    </Paper>
  );
}

// Available status item component
function AvailableStatusItem({ status, onAdd }) {
  const { translateStatus, translateStatusDescription } = useTranslation();

  return (
    <Paper p="sm" withBorder shadow="sm">
      <Group justify="space-between">
        <Tooltip label={translateStatusDescription(status)} withArrow>
          <div>
            <Text fw={500}>{translateStatus(status)}</Text>
            <Text size="xs" c="dimmed">{status}</Text>
          </div>
        </Tooltip>
        <Button
          variant="light"
          size="xs"
          onClick={() => onAdd(status)}
          leftSection={<IconPlus size={14} />}
        >
          Add
        </Button>
      </Group>
    </Paper>
  );
}

export function StatusWorkflowEditor({ 
  availableStatuses = [], 
  selectedStatuses = [], 
  onChange,
  statusesWithTasks = [],  // Array of status codes that have tasks
  readOnly = false
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(selectedStatuses);

  // Sync with parent when selectedStatuses prop changes
  useEffect(() => {
    setSelected(selectedStatuses);
  }, [selectedStatuses]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSelected((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        onChange(newOrder);
        return newOrder;
      });
    }
  };

  const handleAdd = (status) => {
    const newSelected = [...selected, status];
    setSelected(newSelected);
    onChange(newSelected);
  };

  const handleRemove = (status) => {
    const newSelected = selected.filter(s => s !== status);
    setSelected(newSelected);
    onChange(newSelected);
  };

  const canRemoveStatus = (status) => {
    return !statusesWithTasks.includes(status);
  };

  // Filter available statuses to show only those not already selected
  const availableToAdd = availableStatuses.filter(status => !selected.includes(status));

  return (
    <Stack gap="lg">
      {/* Selected statuses (sortable) */}
      <div>
        <Group justify="space-between" mb="xs">
          <Text fw={600} size="sm">
            {t('projects.statusWorkflow.selected')} ({selected.length})
          </Text>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          {readOnly 
            ? t('projects.statusWorkflow.viewHelp') 
            : t('projects.statusWorkflow.dragHelp')}
        </Text>
        {selected.length === 0 ? (
          <Paper p="md" withBorder>
            <Text c="dimmed" ta="center">No statuses selected. Add at least one status.</Text>
          </Paper>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={selected} strategy={verticalListSortingStrategy}>
              <Stack gap="sm">
                {selected.map((status) => (
                  <SortableStatusItem
                    key={status}
                    status={status}
                    onRemove={handleRemove}
                    canRemove={canRemoveStatus(status)}
                    readOnly={readOnly}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Available statuses to add */}
      {!readOnly && availableToAdd.length > 0 && (
        <div>
          <Text fw={600} size="sm" mb="sm">
            {t('projects.statusWorkflow.available')} ({availableToAdd.length})
          </Text>
          <Text size="xs" c="dimmed" mb="md">
            {t('projects.statusWorkflow.addHelp')}
          </Text>
          <Stack gap="sm">
            {availableToAdd.map((status) => (
              <AvailableStatusItem
                key={status}
                status={status}
                onAdd={handleAdd}
              />
            ))}
          </Stack>
        </div>
      )}

      {availableToAdd.length === 0 && selected.length > 0 && (
        <Paper p="md" withBorder>
          <Text c="dimmed" ta="center" size="sm">
            All available statuses have been added to the workflow.
          </Text>
        </Paper>
      )}
    </Stack>
  );
}
