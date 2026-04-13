export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const userStr = localStorage.getItem('iuran_auth_user');
  let token = '';
  
  if (userStr) {
    try {
      const parsed = JSON.parse(userStr);
      token = parsed.token || '';
    } catch (e) {
      console.error('Failed to parse auth token', e);
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && url !== '/api/login') {
    // JWT Token expired or invalid
    localStorage.removeItem('iuran_auth_user');
    window.location.href = '/login';
  }

  return response;
};
