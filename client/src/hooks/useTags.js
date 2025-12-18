import { useState, useEffect } from 'react';

export function useTags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch tags from API
  useEffect(() => {
    setLoading(true);
    
    const fetchTags = async () => {
      try {
        const token = localStorage.getItem('TB_TOKEN');
        if (!token) {
          console.error('No access token found');
          setLoading(false);
          return;
        }

        const response = await fetch('http://localhost:3030/tags', {
          method: 'GET',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setTags(data);
        } else if (response.status === 401) {
          console.error('Unauthorized - access token invalid');
          if (window.showToast) {
            window.showToast('error', 'Access token invalid. Please reload your access token.');
          } else {
            alert('Access token invalid. Please reload your access token.');
          }
          setTags([]);
        } else {
          console.error('Failed to fetch tags:', response.status);
          setTags([]);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
        setTags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  return { tags, loading };
}
