import { useState, useEffect, useCallback } from 'react';

export function useTasks(selectedProject) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Task statuses from project workflow, fallback to default 3 statuses
  const taskStatuses = selectedProject?.statusWorkflow || ['TO_DO', 'IN_PROGRESS', 'DONE'];

  // Fetch tasks from API
  useEffect(() => {
    if (!selectedProject) {
      setTasks([]);
      return;
    }

    setLoading(true);
    
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem('TB_TOKEN');
        if (!token) {
          console.error('No access token found');
          if (window.showToast) {
            window.showToast('error', 'No access token found. Please set your access token.');
          } else {
            alert('No access token found. Please set your access token.');
          }
          setLoading(false);
          return;
        }

        const response = await fetch(`http://localhost:3030/tasks?projectId=${selectedProject.id}`, {
          method: 'GET',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Fetched tasks:', data);
          setTasks(data);
        } else if (response.status === 401) {
          console.error('Unauthorized - access token invalid');
          // Show toast notification
          if (window.showToast) {
            window.showToast('error', 'Access token invalid. Please reload your access token.');
          } else {
            alert('Access token invalid. Please reload your access token.');
          }
          setTasks([]);
        } else {
          console.error('Failed to fetch tasks:', response.status);
          setTasks([]);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [selectedProject]);

  const getTasksByStatus = useCallback((status) => {
    return tasks
      .filter(task => task.status === status)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [tasks]);

  const addTask = useCallback(async (newTask) => {
    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return;
      }

      const response = await fetch('http://localhost:3030/tasks', {
        method: 'POST',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newTask,
          projectId: selectedProject.id
        })
      });

      if (response.ok) {
        const task = await response.json();
        setTasks(prev => [...prev, task]);
      } else if (response.status === 401) {
        console.error('Unauthorized - access token invalid');
        if (window.showToast) {
          window.showToast('error', 'Access token invalid. Please reload your access token.');
        } else {
          alert('Access token invalid. Please reload your access token.');
        }
      } else {
        console.error('Failed to create task:', response.status);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }, [selectedProject]);

  const updateTask = useCallback(async (taskId, updates) => {
    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return;
      }

      // Find the task to get its taskId
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error('Task not found for update');
        return;
      }

      const response = await fetch(`http://localhost:3030/projects/${selectedProject.code}/tasks/${task.taskId}`, {
        method: 'PUT',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(prev => prev.map(task => 
          task.id === taskId ? updatedTask : task
        ));
      } else if (response.status === 401) {
        console.error('Unauthorized - access token invalid');
        if (window.showToast) {
          window.showToast('error', 'Access token invalid. Please reload your access token.');
        } else {
          alert('Access token invalid. Please reload your access token.');
        }
      } else {
        console.error('Failed to update task:', response.status);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }, [tasks, selectedProject]);

  const deleteTask = useCallback(async (taskId) => {
    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return;
      }

      // Find the task to get its taskId
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error('Task not found for deletion');
        return;
      }

      const response = await fetch(`http://localhost:3030/projects/${selectedProject.code}/tasks/${task.taskId}`, {
        method: 'DELETE',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setTasks(prev => prev.filter(task => task.id !== taskId));
      } else if (response.status === 401) {
        console.error('Unauthorized - access token invalid');
        if (window.showToast) {
          window.showToast('error', 'Access token invalid. Please reload your access token.');
        } else {
          alert('Access token invalid. Please reload your access token.');
        }
      } else {
        console.error('Failed to delete task:', response.status);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }, [tasks, selectedProject]);

  const moveTask = useCallback((taskId, newStatus) => {
    updateTask(taskId, { status: newStatus });
  }, [updateTask]);

  const refreshTasks = useCallback(async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        console.error('No access token found');
        return;
      }

      const response = await fetch(`http://localhost:3030/tasks?projectId=${selectedProject.id}`, {
        method: 'GET',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Refreshed tasks:', data);
        setTasks(data);
      } else if (response.status === 401) {
        console.error('Unauthorized - access token invalid');
        if (window.showToast) {
          window.showToast('error', 'Access token invalid. Please reload your access token.');
        } else {
          alert('Access token invalid. Please reload your access token.');
        }
      } else {
        console.error('Failed to refresh tasks:', response.status);
      }
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  return {
    tasks,
    loading,
    taskStatuses,
    getTasksByStatus,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    refreshTasks
  };
} 