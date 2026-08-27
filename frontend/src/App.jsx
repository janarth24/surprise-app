import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import RoomDetails from './pages/RoomDetails';
import AnimatedBackground from './components/AnimatedBackground';

function App() {
  const navigate = useNavigate();

  // LocalStorage-la user irundha auto-read panrom
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('user', JSON.stringify(user)); // Save user session
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('user'); // Clear session on logout
    navigate('/login');
  };

  return (
    <AnimatedBackground>
      <Routes>
        <Route path="/" element={<Login onSwitch={() => navigate('/register')} onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/login" element={<Login onSwitch={() => navigate('/register')} onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/register" element={<Register onSwitch={() => navigate('/login')} />} />
        
        {/* Dashboard Route */}
        <Route path="/dashboard" element={
          currentUser ? (
            <Dashboard currentUser={currentUser} onLogout={handleLogout} />
          ) : (
            <div style={{ textAlign: 'center', paddingTop: '100px', color: '#fff' }}>
              <h2>Please Login First!</h2>
              <button className="btn-primary" style={{ width: '200px', marginTop: '20px' }} onClick={() => navigate('/login')}>
                Go to Login
              </button>
            </div>
          )
        } />

        {/* Dynamic Room Details Route */}
        <Route path="/room/:roomCode" element={
          currentUser ? (
            <RoomDetails currentUser={currentUser} />
          ) : (
            <div style={{ textAlign: 'center', paddingTop: '100px', color: '#fff' }}>
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