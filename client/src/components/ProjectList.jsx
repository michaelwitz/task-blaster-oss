import { Table, Text, Badge, Group, ActionIcon, Tooltip, Box } from '@mantine/core';
import { IconCalendar, IconEdit } from '@tabler/icons-react';
import { useTranslation } from '../hooks/useTranslation.js';
import { useEffect } from 'react';

export function ProjectList({ projects, loading, currentUser, onProjectSelect, onProjectEdit }) {
  const { t } = useTranslation();
  
  // Debug info when project list renders
  useEffect(() => {
    if (!loading && projects) {
      console.log('=== PROJECTS DEBUG ===');
      console.log('Projects:', projects.length);
      console.log('LOCALE:', navigator.language);
      console.log('=====================');
    }
  }, [projects, loading]);
  
  if (loading) {
    return <Text>{t('common.loading')}</Text>;
  }

  if (!projects || projects.length === 0) {
    return <Text>{t('projects.noProjects')}</Text>;
  }

  const formatDate = (dateString) => {
    const locale = navigator.language;
    console.log('LOCALE:', locale);
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: '40px' }}></Table.Th>
          <Table.Th>{t('tasks.title')}</Table.Th>
          <Table.Th>{t('projects.leader')}</Table.Th>
          <Table.Th>{t('projects.createdAt')}</Table.Th>
          <Table.Th></Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {projects.map((project) => (
          <Table.Tr 
            key={project.id} 
            style={{ 
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Table.Td>
              {currentUser && project.leaderId === currentUser.id && (
                <Tooltip label="You are the project leader" withArrow>
                  <Box 
                    style={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      backgroundColor: 'var(--mantine-color-blue-5)',
                      margin: '0 auto'
                    }} 
                  />
                </Tooltip>
              )}
            </Table.Td>
            <Table.Td>
              <div 
                style={{ 
                  cursor: 'pointer'
                }}
                onClick={() => {
                  onProjectSelect(project);
                }}
              >
                <Text fw={500}>{project.title}</Text>
                <Text size="sm" c="dimmed">{project.code}</Text>
              </div>
            </Table.Td>
            <Table.Td>
              <Text>{project.leaderName}</Text>
              <Text size="sm" c="dimmed">{project.leaderEmail}</Text>
            </Table.Td>
            <Table.Td>
              <Group gap="xs">
                <IconCalendar size={14} />
                <Text size="sm">{formatDate(project.createdAt)}</Text>
              </Group>
            </Table.Td>
            <Table.Td>
              <ActionIcon 
                variant="subtle" 
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  onProjectEdit(project);
                }}
              >
                <IconEdit size={21} />
              </ActionIcon>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
} 