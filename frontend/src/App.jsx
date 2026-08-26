import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import AnimatedBackground from './components/AnimatedBackground';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  return (
    <AnimatedBackground>
      <Routes>
        <Route path="/" element={<Login onSwitch={() => navigate('/register')} onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/login" element={<Login onSwitch={() => navigate('/register')} onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/register" element={<Register onSwitch={() => navigate('/login')} />} />
        
        <Route path="/dashboard" element={
          currentUser ? (
            <div style={{ textAlign: 'center', paddingTop: '100px' }}>
              <h1>Welcome, {currentUser.name}! 🎉</h1>
              <p>Email: {currentUser.email}</p>
              <button 
                className="btn-primary" 
                style={{ width: '200px', marginTop: '20px' }}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', paddingTop: '100px' }}>
              <h2>Please Login First!</h2>
              <button className="btn-primary" style={{ width: '200px', marginTop: '20px' }} onClick={() => navigate('/login')}>
                Go to Login
              </button>
            </div>
          )
        } />
      </Routes>
    </AnimatedBackground>
  );
}

export default App;