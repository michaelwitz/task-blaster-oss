import { useState, useEffect } from 'react';

export function useStatusDefinitions() {
  const [statusDefinitions, setStatusDefinitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatusDefinitions = async () => {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) {
        setError('No access token found');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('http://localhost:3030/status-definitions', {
          method: 'GET',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setStatusDefinitions(data);
        } else if (response.status === 401) {
          setError('Unauthorized - access token invalid');
        } else {
          setError(`Failed to fetch status definitions: ${response.status}`);
        }
      } catch (err) {
        console.error('Error fetching status definitions:', err);
        setError('Error fetching status definitions');
      } finally {
        setLoading(false);
      }
    };

    fetchStatusDefinitions();
  }, []);

  return {
    statusDefinitions,
    loading,
    error
  };
}
