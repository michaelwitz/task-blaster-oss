import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { 
  MantineProvider, 
  AppShell, 
  ActionIcon, 
  Text, 
  Group, 
  Flex, 
  Menu,
  Modal, 
  TextInput, 
  Textarea, 
  Select, 
  NumberInput, 
  MultiSelect, 
  Button, 
  Stack
} from '@mantine/core';
import { createTheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconSun, 
  IconMoon, 
  IconDashboard, 
  IconMenu2, 
  IconKey,
  IconPlus,
  IconArrowLeft
} from '@tabler/icons-react';
import { TokenModal } from './components/TokenModal.jsx';
import { ProjectModal } from './components/ProjectModal.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { KanbanPage } from './pages/KanbanPage.jsx';
import { useTranslation } from './hooks/useTranslation.js';
import i18n from './i18n/index.js';
import '@mantine/core/styles.css';

function AppContent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract projectCode from URL manually since useParams only works inside route components
  const projectCode = location.pathname.startsWith('/projects/') && location.pathname.includes('/kanban')
    ? location.pathname.split('/')[2] 
    : null;
  
  const [colorScheme, setColorScheme] = useState('dark');
  const [accessToken, setAccessToken] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [projectModalOpened, setProjectModalOpened] = useState(false);
  const [editingProject, setEditingProject] = useState(null);  // null for create, project object for edit
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [createTaskModalOpened, setCreateTaskModalOpened] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [newTask, setNewTask] = useState({
    title: '',
    prompt: '',
    priority: 'MEDIUM',
    assigneeId: null,
    storyPoints: null,
    tags: []
  });

  // Map language codes to proper locale codes for date formatting
  const getLocaleCode = (language) => {
    switch (language) {
      case 'es': return 'es-ES';
      case 'fr': return 'fr-FR';
      case 'de': return 'de-DE';
      default: return 'en-US';
    }
  };

  // Load API translations and merge with static translations
  const loadApiTranslations = async (language) => {
    // Prevent loading if we already have the resource bundle and it's not empty
    if (i18n.hasResourceBundle(language, 'translation')) {
        // If it was already loaded, we might skip. However, standard react-i18next doesn't expose
        // easy way to check if it's "fully" loaded or just static. 
        // We'll rely on a simple module-level or component-level flag if needed,
        // but for now, checking if we have a flag in memory is better.
        // Let's use a simple state or ref check to avoid duplicate calls for same session.
    }

    const token = localStorage.getItem('TB_TOKEN');
    if (!token) {
      console.log('No token available, skipping API translation loading');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3030/translations/${language}`, {
        method: 'GET',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Merge API translations into i18n
        i18n.addResourceBundle(language, 'translation', data.translations, true, true);
        console.log(`Loaded ${language} translations from API`);
      } else {
        console.warn(`Failed to load ${language} translations from API:`, response.status);
      }
    } catch (error) {
      console.error(`Error loading ${language} translations from API:`, error);
    }
  };

  // Effect to load translations when language or token changes
  useEffect(() => {
    if (accessToken) {
        const currentLang = i18n.language.split('-')[0];
        loadApiTranslations(currentLang);
    }
    
    const handleLanguageChanged = (lng) => {
        if (accessToken) {
            const langCode = lng.split('-')[0];
            loadApiTranslations(langCode);
        }
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
        i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [accessToken, i18n]);

  // Fetch projects with a specific token
  const fetchProjectsWithToken = async (token) => {
    if (!token) {
      console.error('No access token provided');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3030/projects', {
        method: 'GET',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        // Debug info
        console.log('Token: Set');
        console.log('localStorage: Has token');
        console.log('Projects:', data.length);
        console.log('TEST navigator:', navigator);
        console.log('TEST navigator.language:', navigator.language);
        console.log('BROWSER LOCALE:', navigator.language);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch projects:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
    
    // Fetch current user
    try {
      const response = await fetch('http://localhost:3030/users/me', {
        method: 'GET',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  useEffect(() => {
    // Check for saved theme preference, default to dark
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setColorScheme(savedTheme);
    }

    // Check for saved access token
    const savedToken = localStorage.getItem('TB_TOKEN');
    if (savedToken) {
      setAccessToken(savedToken);
      // Auto-load projects and translations if token exists
      fetchProjectsWithToken(savedToken);
      // Load users for project leader selection
      fetchUsers(savedToken);
    }
    
    // Debug info on app load
    console.log('=== APP DEBUG ===');
    console.log('TEST: useEffect is running');
    console.log('Token:', savedToken ? 'Set' : 'Not set');
    console.log('localStorage:', savedToken ? 'Has token' : 'No token');
    console.log('URL:', window.location.pathname);
    console.log('isKanbanPage:', window.location.pathname.includes('/kanban'));
    console.log('selectedProject:', selectedProject?.title || 'null');
    console.log('projectCode:', projectCode || 'null');
    console.log('BROWSER LOCALE:', navigator.language);
    console.log('==================');
  }, []);

  const toggleTheme = () => {
    const newTheme = colorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleSetToken = (token) => {
    setAccessToken(token);
    localStorage.setItem('TB_TOKEN', token);
    close();
    // Auto-load projects and users after setting token
    fetchProjectsWithToken(token);
    fetchUsers(token);
  };

  // Fetch users for project leader selection
  const fetchUsers = async (token) => {
    try {
      const response = await fetch('http://localhost:3030/users', {
        method: 'GET',
        headers: {
          'TB_TOKEN': token || accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    navigate(`/projects/${project.code}/kanban`);
  };

  const handleProjectCreate = () => {
    setEditingProject(null);
    setProjectModalOpened(true);
  };

  const handleProjectEdit = (project) => {
    setEditingProject(project);
    setProjectModalOpened(true);
  };

  const handleProjectSave = async (formData) => {
    const token = localStorage.getItem('TB_TOKEN');
    if (!token) {
      throw new Error('No access token found');
    }

    try {
      if (editingProject) {
        // Edit mode - update project details and workflow separately
        // First update project details
        const projectResponse = await fetch(`http://localhost:3030/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description
          })
        });

        if (!projectResponse.ok) {
          const errorText = await projectResponse.text();
          throw new Error(`Failed to update project: ${errorText}`);
        }

        // Then update status workflow
        const workflowResponse = await fetch(`http://localhost:3030/projects/${editingProject.code}/statuses`, {
          method: 'PUT',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            statusWorkflow: formData.statusWorkflow
          })
        });

        if (!workflowResponse.ok) {
          const errorText = await workflowResponse.text();
          throw new Error(`Failed to update workflow: ${errorText}`);
        }
      } else {
        // Create mode - create project with workflow
        const createResponse = await fetch('http://localhost:3030/projects', {
          method: 'POST',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: formData.code,
            title: formData.title,
            description: formData.description,
            leaderId: formData.leaderId,
            statusWorkflow: formData.statusWorkflow
          })
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(`Failed to create project: ${errorText}`);
        }
      }

      // Refresh projects list
      await fetchProjectsWithToken(token);
      setProjectModalOpened(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  };

  const handleCreateTask = () => {
    setCreateTaskModalOpened(true);
  };

  const handleCreateTaskSubmit = async () => {
    // Robust project finding
    let targetProject = selectedProject;
    if (!targetProject && projectCode && projects.length > 0) {
      targetProject = projects.find(p => p.code === projectCode);
    }

    if (!newTask.title || !targetProject) {
      console.error('Missing title or project', { title: newTask.title, project: targetProject });
      return;
    }

    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) return;

      // Determine initial status from project workflow (first column)
      const initialStatus = targetProject.statusWorkflow && targetProject.statusWorkflow.length > 0
        ? targetProject.statusWorkflow[0]
        : 'TO_DO';

      const tagColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'];
      const tagsWithColors = newTask.tags.map((tagName, index) => ({
        tag: tagName,
        color: tagColors[index % tagColors.length]
      }));

      // Map tags to tagNames array for API
      const tagNames = newTask.tags;

      const response = await fetch('http://localhost:3030/tasks', {
        method: 'POST',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTask.title,
          prompt: newTask.prompt,
          priority: newTask.priority,
          storyPoints: newTask.storyPoints ? parseInt(newTask.storyPoints) : null,
          projectId: targetProject.id,
          status: initialStatus,
          assigneeId: newTask.assigneeId ? parseInt(newTask.assigneeId) : null,
          tagNames: tagNames
        })
      });

      if (response.ok) {
        setCreateTaskModalOpened(false);
        setNewTask({
          title: '',
          prompt: '',
          priority: 'MEDIUM',
          assigneeId: null,
          storyPoints: null,
          tags: []
        });
        
        // Trigger refresh
        setRefreshTrigger(prev => prev + 1);
        
      } else {
        console.error('Failed to create task:', response.status);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  // Load project from URL if projectCode is present
  useEffect(() => {
    if (projectCode) {
      if (projects.length > 0) {
        const project = projects.find(p => p.code === projectCode);
        if (project) {
          setSelectedProject(project);
        } else {
          // Project not found, redirect to home
          navigate('/');
        }
      }
      // If projects aren't loaded yet, we'll wait for them to load
      // The useEffect will run again when projects are loaded
    }
  }, [projectCode, projects, navigate]);

  // Keyboard shortcut for creating new task (Ctrl/Cmd + N)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'n' && location.pathname.includes('/kanban')) {
        event.preventDefault();
        setCreateTaskModalOpened(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname]);

  const handleBackToProjects = () => {
    setSelectedProject(null);
    navigate('/projects');
  };

  const theme = createTheme({
    // You can customize theme here if needed
  });

  // Determine current page from location
  const isKanbanPage = location.pathname.includes('/kanban');

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark" forceColorScheme={colorScheme}>
      <AppShell padding={0}>
        {/* Header with hamburger menu and theme toggle */}
        <AppShell.Header p="md">
          <Flex justify="space-between" align="center" style={{ position: 'relative' }}>
            <Group style={{ flexShrink: 0 }}>
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <ActionIcon variant="subtle" size="lg">
                    <IconMenu2 size={20} />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>{t('common.settings')}</Menu.Label>
                  <Menu.Item 
                    leftSection={<IconKey size={14} />}
                    onClick={open}
                  >
                    {t('common.setAccessToken')}
                  </Menu.Item>
                  
                  {isKanbanPage && (
                    <>
                      <Menu.Divider />
                      <Menu.Label>{t('kanban.title')}</Menu.Label>
                      <Menu.Item 
                        leftSection={<IconPlus size={14} />}
                        onClick={handleCreateTask}
                        title={`${t('common.keyboardShortcut')}: Ctrl+N / Cmd+N`}
                      >
                        {t('tasks.createTask')}
                      </Menu.Item>
                    </>
                  )}
                </Menu.Dropdown>
              </Menu>
              
              {isKanbanPage && (
                <Button 
                  variant="subtle" 
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={handleBackToProjects}
                  size="sm"
                >
                  {t('common.back')}
                </Button>
              )}
            </Group>
            
            {/* Project title in center - responsive layout */}
            {isKanbanPage && selectedProject && (
              <div style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: 'calc(100% - 400px)', // Leave space for left and right groups
                overflow: 'hidden',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <Text 
                  size="xl" 
                  fw={600} 
                  c="blue.4"
                  style={{
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}
                  title={selectedProject.title} // Show full title on hover
                >
                  {selectedProject.title}
                </Text>
              </div>
            )}
            
            <Group style={{ flexShrink: 0 }}>
              <IconDashboard size={24} stroke={1.5} />
              <Text size="lg" fw={700}>Task Blaster</Text>
              <ActionIcon 
                onClick={toggleTheme}
                variant="subtle"
                size="lg"
                aria-label="Toggle theme"
              >
                {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
              </ActionIcon>
            </Group>
          </Flex>
        </AppShell.Header>

        {/* Main content */}
        <AppShell.Main pt="md">
          <Routes>
            <Route path="/" element={
              <Navigate to="/projects" replace />
            } />
            <Route path="/projects" element={
              <HomePage 
                projects={projects}
                loading={loading}
                accessToken={accessToken}
                currentUser={currentUser}
                onProjectSelect={handleProjectSelect}
                onProjectEdit={handleProjectEdit}
                onProjectCreate={handleProjectCreate}
              />
            } />
            <Route path="/projects/:projectCode/kanban" element={
              <KanbanPage 
                selectedProject={selectedProject}
                onBackToProjects={handleBackToProjects}
                refreshTrigger={refreshTrigger}
              />
            } />
          </Routes>
        </AppShell.Main>
      </AppShell>

      {/* Token Modal */}
      <TokenModal 
        opened={opened} 
        onClose={close} 
        onSetToken={handleSetToken} 
      />

      {/* Project Modal */}
      {projectModalOpened && (
        <ProjectModal
          opened={projectModalOpened}
          onClose={() => {
            setProjectModalOpened(false);
            setEditingProject(null);
          }}
          onSave={handleProjectSave}
          project={editingProject}
          users={users}
          currentUser={currentUser}
        />
      )}

      {/* Create Task Modal */}
      <Modal 
        opened={createTaskModalOpened} 
        onClose={() => setCreateTaskModalOpened(false)}
        title={t('tasks.createTask')}
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreateTaskSubmit(); }}>
          <Stack gap="md">
            <TextInput
              label={t('tasks.title')}
              placeholder={t('tasks.title')}
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              required
              data-autofocus
            />
            
            <Textarea
              label={t('tasks.prompt')}
              placeholder={t('tasks.prompt')}
              value={newTask.prompt}
              onChange={(e) => setNewTask({ ...newTask, prompt: e.target.value })}
              rows={3}
            />
            
            <Select
              label={t('tasks.priority')}
              data={[
                { value: 'LOW', label: t('tasks.priorities.LOW') },
                { value: 'MEDIUM', label: t('tasks.priorities.MEDIUM') },
                { value: 'HIGH', label: t('tasks.priorities.HIGH') },
                { value: 'CRITICAL', label: t('tasks.priorities.CRITICAL') }
              ]}
              value={newTask.priority}
              onChange={(value) => setNewTask({ ...newTask, priority: value })}
            />
            
            <NumberInput
              label={t('tasks.storyPoints')}
              placeholder={t('tasks.storyPoints')}
              value={newTask.storyPoints}
              onChange={(value) => setNewTask({ ...newTask, storyPoints: value })}
              min={1}
              max={21}
            />
            
            <MultiSelect
              label="Tags"
              placeholder="Tags"
              data={[
                { value: 'setup', label: 'setup' },
                { value: 'configuration', label: 'configuration' },
                { value: 'database', label: 'database' },
                { value: 'design', label: 'design' },
                { value: 'auth', label: 'auth' },
                { value: 'security', label: 'security' },
                { value: 'documentation', label: 'documentation' },
                { value: 'api', label: 'api' }
              ]}
              value={newTask.tags}
              onChange={(value) => setNewTask({ ...newTask, tags: value })}
              searchable
              creatable
              getCreateLabel={(query) => `+ Create ${query}`}
              onCreate={(query) => {
                // When a new tag is created, we need to add it to the state
                // The MultiSelect will handle the display, but we should probably 
                // handle the creation logic if needed, or just let the API handle it on submit
                return { value: query, label: query };
              }}
            />
            
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setCreateTaskModalOpened(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('tasks.createTask')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Debug info - remove in production */}
      <div style={{ 
        position: 'fixed', 
        bottom: '10px', 
        right: '10px', 
        background: 'rgba(0,0,0,0.8)', 
        color: 'white', 
        padding: '10px', 
        borderRadius: '5px', 
        fontSize: '12px',
        maxWidth: '300px'
      }}>
        <div>Token: {accessToken ? 'Set' : 'Not set'}</div>
        <div>localStorage: {localStorage.getItem('TB_TOKEN') ? 'Has token' : 'No token'}</div>
        <div>Projects: {projects.length}</div>
        <div>URL: {location.pathname}</div>
        <div>isKanbanPage: {isKanbanPage ? 'true' : 'false'}</div>
        <div>selectedProject: {selectedProject ? selectedProject.title : 'null'}</div>
        <div>projectCode: {projectCode || 'null'}</div>
        <div>LOCALE: {navigator.language}</div>
      </div>
    </MantineProvider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
