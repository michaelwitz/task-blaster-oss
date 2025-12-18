import { Container, Title, Text, Alert, Button, Group } from '@mantine/core';
import { IconAlertCircle, IconPlus } from '@tabler/icons-react';
import { ProjectList } from '../components/ProjectList.jsx';
import { useTranslation } from '../hooks/useTranslation.js';

export function HomePage({ projects, loading, accessToken, currentUser, onProjectSelect, onProjectEdit, onProjectCreate }) {
  const { t } = useTranslation();

  if (!accessToken) {
    return (
      <Container size="lg" py="xl">
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title={t('common.accessTokenRequired')} 
          color="blue"
        >
          {t('common.pleaseSetAccessToken')}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl" mt="md">
      <Group justify="space-between" mb="lg">
        <Title order={1}>{t('projects.title')}</Title>
        <Button 
          leftSection={<IconPlus size={16} />}
          onClick={onProjectCreate}
        >
          {t('projects.createProject')}
        </Button>
      </Group>
      <ProjectList 
        projects={projects} 
        loading={loading} 
        currentUser={currentUser}
        onProjectSelect={onProjectSelect}
        onProjectEdit={onProjectEdit}
      />
    </Container>
  );
} 