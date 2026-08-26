import { useState } from 'react';
import API from '../services/api';

export default function Login({ onSwitch, onLoginSuccess }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await API.post('/auth/login', formData);
      console.log("Logged In User:", res.data.user);
      onLoginSuccess(res.data.user); // Store user state
    } catch (err) {
      setError(err.response?.data?.detail || 'Login Failed!');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back 👋</h2>
        {error && <p style={{ color: '#ef4444', textAlign: 'center' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              required 
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
            />
          </div>
          <button type="submit" className="btn-primary">Login</button>
        </form>
        <div className="auth-switch">
          Don't have an account? <span onClick={onSwitch}>Register</span>
        </div>
      </div>
    </div>
  );
}