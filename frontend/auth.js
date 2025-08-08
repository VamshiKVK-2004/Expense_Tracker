const AUTH_API = 'http://localhost:5000/api/auth';

document.addEventListener('DOMContentLoaded', () => {
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const loginFormWrap = document.getElementById('login-form');
  const signupFormWrap = document.getElementById('signup-form');

  const activateTab = (tab) => {
    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      loginFormWrap.classList.add('active');
      signupFormWrap.classList.remove('active');
    } else {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      signupFormWrap.classList.add('active');
      loginFormWrap.classList.remove('active');
    }
  };

  tabLogin.addEventListener('click', () => activateTab('login'));
  tabSignup.addEventListener('click', () => activateTab('signup'));

  // Already logged in? go to dashboard
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = 'expense.html';
    return;
  }

  // Login handler
  loginFormWrap.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('login-email').value || '').trim();
    const password = document.getElementById('login-password').value;
    try {
      const res = await fetch(`${AUTH_API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Login failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.user?.name || '');
      window.location.href = 'expense.html';
    } catch (err) {
      alert(err.message);
    }
  });

  // Signup handler
  signupFormWrap.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (document.getElementById('signup-name').value || '').trim();
    const email = (document.getElementById('signup-email').value || '').trim();
    const password = document.getElementById('signup-password').value;
    const phone = (document.getElementById('signup-phone').value || '').trim();
    const age = parseInt(document.getElementById('signup-age').value || '0', 10) || undefined;
    const currency = document.getElementById('signup-currency').value;

    try {
      const res = await fetch(`${AUTH_API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, details: { phone, age, currency } })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Registration failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.user?.name || '');
      window.location.href = 'expense.html';
    } catch (err) {
      alert(err.message);
    }
  });
});

