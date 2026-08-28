import { useState, useEffect, useRef } from 'react';
import CreateRoomModal from '../components/CreateRoomModal';
import { useNavigate } from 'react-router-dom';
import JoinRoomModal from '../components/JoinRoomModal';
import API from '../services/api';

export default function Dashboard({ currentUser, onLogout }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  
  // 🔴 PROFILE DROPDOWN & PHOTO STATES
  const [showDropdown, setShowDropdown] = useState(false);
const [userState, setUserState] = useState(currentUser);

useEffect(() => {
  const fetchFreshUserData = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await API.get(`/users/${currentUser.id}`);
      if (res.data.status === 'success') {
        setUserState(res.data.user); // DB Fresh Data State Update
        localStorage.setItem('user', JSON.stringify(res.data.user)); // Local Storage Sync
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  fetchFreshUserData();
}, []);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const fetchJoinedRooms = async () => {
    if (!userState?.id) return;
    try {
      setLoadingRooms(true);
      const res = await API.get(`/rooms/my-joined-rooms/${userState.id}`);
      if (res.data.status === 'success') {
        setJoinedRooms(res.data.rooms);
      }
    } catch (err) {
      console.error("Fetch Rooms Error:", err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchJoinedRooms();
  }, [userState]);

  // 🔴 HANDLE PROFILE PHOTO UPLOAD
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('user_id', userState.id);
    formData.append('file', file);

    try {
      const res = await API.post('/users/upload-profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.status === 'success') {
        const updatedUser = res.data.user;
        setUserState(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser)); // Session sync
        alert('Profile photo updated successfully!');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Photo upload failed!');
    }
  };

  return (
    <div className="dashboard-wrapper">
      
      {/* NAVBAR WITH PROFILE AVATAR & DROPDOWN */}
      <nav className="dashboard-navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="nav-logo">
          <h2>SURPRISE<span>HUB</span></h2>
        </div>

        {/* 🔴 AVATAR & DROPDOWN CONTAINER */}
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => setShowDropdown(!showDropdown)} 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* PROFILE IMAGE OR DEFAULT AVATAR */}
            {userState?.profile_photo ? (
              <img 
                src={`http://localhost:8000${userState.profile_photo}`} 
                alt="Profile" 
                style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'linear-gradient(135deg, #f5b041, #eb984e)', color: '#000', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {userState?.name ? userState.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>{userState?.name || 'User'} ▼</span>
          </div>

          {/* 🔴 DROPDOWN MENU */}
         {showDropdown && (
  <div style={{ position: 'absolute', right: 0, marginTop: '10px', width: '180px', background: '#181f25', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 100, overflow: 'hidden' }}>
    
    {/* 🔴 DIRECT PROFILE PAGE REDIRECT */}
    <div 
      onClick={() => { setShowDropdown(false); navigate('/profile'); }} 
      style={{ padding: '12px 16px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}
    >
      👤 Profile & Settings
    </div>

    {/* LOGOUT */}
    <div 
      onClick={() => { setShowDropdown(false); onLogout(); }} 
      style={{ padding: '12px 16px', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
    >
      🚪 Logout
    </div>

  </div>
)}
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="dashboard-hero">
        <p className="hero-subtext">WELCOME BACK, {userState?.name?.toUpperCase() || 'PLANNER'}</p>
        <div className="hero-divider"></div>
        <h1 className="hero-title">Plan Unforgettable Secrets</h1>
        <p className="hero-desc">
          Create secret rooms, invite your friends, and organize the ultimate surprise without letting the target know.
        </p>

        <div className="hero-actions">
          <button className="btn-gold" onClick={() => setShowCreateModal(true)}>
            + CREATE SURPRISE
          </button>
          <button className="btn-outline" onClick={() => setShowJoinModal(true)}>
            JOIN WITH CODE
          </button>
        </div>
      </section>

      {/* JOINED ROOMS DISPLAY SECTION */}
      <section className="dashboard-content">
        <div className="section-header">
          <h3>Your Joined Events</h3>
          <span className="count-badge">{joinedRooms.length} Active Rooms</span>
        </div>

        {loadingRooms ? (
          <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading your secret rooms...</p>
        ) : joinedRooms.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {joinedRooms.map((room) => {
              const isOrganizer = room.creator_id === userState?.id;
              
              return (
                <div key={room.id} className="empty-rooms-card" style={{ textAlign: 'left', padding: '25px', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: '20px', right: '20px', fontSize: '0.7rem', fontWeight: '800',
                    letterSpacing: '1px', padding: '4px 10px', borderRadius: '20px',
                    background: isOrganizer ? 'linear-gradient(45deg, #f5b041, #eb984e)' : 'rgba(255, 255, 255, 0.1)',
                    color: isOrganizer ? '#121619' : '#cbd5e1'
                  }}>
                    {isOrganizer ? '👑 ORGANIZER' : '👤 MEMBER'}
                  </span>

                  <span style={{ fontSize: '0.8rem', color: '#f5b041', fontWeight: 'bold', letterSpacing: '1px' }}>
                    CODE: {room.room_code}
                  </span>
                  
                  <h3 style={{ margin: '12px 0 6px 0', fontSize: '1.25rem' }}>{room.title}</h3>
                  <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: '#94a3b8' }}>
                    Target: <strong style={{ color: '#fff' }}>{room.target_name}</strong>
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#cbd5e1', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginTop: '10px' }}>
                    <button 
                      className="btn-secondary-dark" 
                      style={{ padding: '5px 12px', fontSize: '0.8rem' }} 
                      onClick={() => navigate(`/room/${room.room_code}`, { state: { roomId: room.id } })}
                    >
                      Enter Room →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-rooms-card">
            <div className="empty-icon">🎁</div>
            <h4>No Active Joined Rooms</h4>
            <p>You haven't created or joined any secret event yet.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn-gold-sm" onClick={() => setShowCreateModal(true)}>Create Event</button>
              <button className="btn-secondary-dark" onClick={() => setShowJoinModal(true)}>Join with Code</button>
            </div>
          </div>
        )}
      </section>

      {/* MODALS */}
      {showCreateModal && (
        <CreateRoomModal 
          currentUser={userState} 
          onClose={() => setShowCreateModal(false)}
          onRoomCreated={fetchJoinedRooms}
        />
      )}

      {showJoinModal && (
        <JoinRoomModal
          currentUser={userState}
          onClose={() => setShowJoinModal(false)}
          onRoomJoined={fetchJoinedRooms}
        />
      )}

    </div>
  );
}