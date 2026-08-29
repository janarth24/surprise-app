import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { getMediaUrl } from '../services/config';

export default function ProfilePage({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // States
  const [userProfile, setUserProfile] = useState(currentUser);
  const [fetching, setFetching] = useState(true);

  // Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔴 DIRECT DB FETCH ON PAGE LOAD
  const fetchProfileFromDB = async () => {
    if (!currentUser?.id) return;
    try {
      setFetching(true);
      const res = await API.get(`/users/${currentUser.id}`);
      if (res.data.status === 'success') {
        const dbUser = res.data.user;
        setUserProfile(dbUser);
        if (setCurrentUser) {
          setCurrentUser(dbUser);
        }
        localStorage.setItem('user', JSON.stringify(dbUser));
      }
    } catch (err) {
      console.error("Fetch DB User Profile Error:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchProfileFromDB();
  }, [currentUser?.id]);

  // 🔴 PHOTO UPLOAD & DIRECT RE-FETCH FROM DB
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('user_id', currentUser.id);
    formData.append('file', file);

    try {
      const res = await API.post('/users/upload-profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.status === 'success') {
        alert('Profile photo updated successfully!');
        // DB-la irundhu fresh photo fetch panrom
        fetchProfileFromDB();
      }
    } catch (err) {
      console.error(err);
      alert('Photo upload failed!');
    }
  };

  // 🔴 PASSWORD CHANGE
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert("New passwords don't match!");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post('/users/change-password', {
        user_id: currentUser.id,
        current_password: currentPassword,
        new_password: newPassword
      });

      if (res.data.status === 'success') {
        alert('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f12', color: '#fff', padding: '30px 5%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{ padding: '8px 16px', background: '#121619', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer' }}
        >
          ← Back to Dashboard
        </button>
        <h2 style={{ margin: 0, color: '#f5b041' }}>Profile Settings</h2>
        <div style={{ width: '100px' }}></div>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* PROFILE PHOTO DISPLAY & CHANGE */}
        <div style={{ background: '#121619', padding: '25px', borderRadius: '12px', border: '1px solid #222', textAlign: 'center' }}>
          
          {fetching ? (
            <p style={{ color: '#aaa' }}>Loading Profile from DB...</p>
          ) : (
            <>
              <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 15px' }}>
                {userProfile?.profile_photo ? (
                  <img 
                    src={`${getMediaUrl(userProfile.profile_photo)}?t=${new Date().getTime()}`} 
                    alt="Profile" 
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #f5b041' }} 
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#f5b041', color: '#000', fontSize: '2.5rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}

                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
                <button 
                  onClick={() => fileInputRef.current.click()} 
                  style={{ position: 'absolute', bottom: 0, right: 0, background: '#f5b041', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
                  title="Change Photo"
                >
                  📷
                </button>
              </div>

              <h3 style={{ margin: '5px 0' }}>{userProfile?.name}</h3>
              <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>{userProfile?.email}</p>
            </>
          )}

        </div>

        {/* CHANGE PASSWORD FORM */}
        <div style={{ background: '#121619', padding: '25px', borderRadius: '12px', border: '1px solid #222' }}>
          <h3 style={{ marginTop: 0, color: '#f5b041' }}>Change Password</h3>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>Current Password</label>
              <input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                required 
                style={{ width: '100%', padding: '10px', background: '#0b0f12', border: '1px solid #333', color: '#fff', borderRadius: '6px' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>New Password</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
                style={{ width: '100%', padding: '10px', background: '#0b0f12', border: '1px solid #333', color: '#fff', borderRadius: '6px' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                style={{ width: '100%', padding: '10px', background: '#0b0f12', border: '1px solid #333', color: '#fff', borderRadius: '6px' }} 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: '10px', background: '#f5b041', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
            >
              {loading ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}