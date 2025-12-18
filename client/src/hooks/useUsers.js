import { useState, useEffect } from 'react';

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch users from API
  useEffect(() => {
    setLoading(true);
    
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('TB_TOKEN');
        if (!token) {
          console.error('No access token found');
          setLoading(false);
          return;
        }

        const response = await fetch('http://localhost:3030/users', {
          method: 'GET',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else if (response.status === 401) {
          console.error('Unauthorized - access token invalid');
          if (window.showToast) {
            window.showToast('error', 'Access token invalid. Please reload your access token.');
          } else {
            alert('Access token invalid. Please reload your access token.');
          }
          setUsers([]);
        } else {
          console.error('Failed to fetch users:', response.status);
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, loading };
}
