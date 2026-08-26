import { useState } from 'react';
import axios from 'axios';
import API from '../services/api';

export default function Register({ onSwitch }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
     const res = await API.post('/auth/register', formData);
      setMessage(res.data.message || 'Registration Success!');
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Registration Failed!');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account 🎉</h2>
        {message && <p style={{ color: '#818cf8', textAlign: 'center' }}>{message}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              required 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>
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
          <button type="submit" className="btn-primary">Register</button>
        </form>
        <div className="auth-switch">
          Already have an account? <span onClick={onSwitch}>Login</span>
        </div>
      </div>
    </div>
  );
}