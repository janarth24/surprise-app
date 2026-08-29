import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import API from '../services/api';
import { getMediaUrl } from '../services/config';

export default function RoomDetails({ currentUser }) {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const roomId = location.state?.roomId;

  const [activeTab, setActiveTab] = useState('text');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form & Modal States
  const [content, setContent] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Edit mode check

  const tabs = [
    { id: 'text', label: '💬 Text Wishes' },
    { id: 'photo', label: '🖼️ Photos' },
    { id: 'video', label: '🎥 Videos' },
    { id: 'audio', label: '🎙️ Audio Notes' },
    { id: 'memory', label: '🌟 Memories' },
    { id: 'letter', label: '✉️ Secret Letter' },
  ];

// Fetch items for specific logged-in user only
const fetchContributions = async () => {
  if (!roomId || !currentUser?.id) return;
  try {
    setLoading(true);
    // API URL-la currentUser.id add panniyachi
    const res = await API.get(`/contributions/${roomId}/${currentUser.id}/${activeTab}`);
    if (res.data.status === 'success') {
      setItems(res.data.data);
    }
  } catch (err) {
    console.error('Fetch Error:', err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchContributions();
  }, [roomId, activeTab]);

  // Open Edit Modal
  const handleEditClick = (item) => {
    setEditingItem(item);
    setContent(item.content || '');
    setCaption(item.caption || '');
    setFile(null);
    setShowModal(true);
  };

  // Close Modal Reset
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setContent('');
    setCaption('');
    setFile(null);
  };

const handleDelete = async (itemId) => {
  // Check if user object has ID
  const userId = currentUser?.id || currentUser?.user_id;

  if (!userId) {
    alert("User ID missing! Please re-login.");
    return;
  }

  if (window.confirm('Are you sure you want to delete this?')) {
    try {
      // Direct URL parameter concatenation (No ? query mark needed)
      await API.delete(`/contributions/delete/${itemId}/${userId}`);
      
      // Refresh list
      fetchContributions();
    } catch (err) {
      console.error("Delete Error:", err);
      alert(err.response?.data?.detail || 'Delete failed!');
    }
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData();
  
  // 🔴 INDHA LINE MUST: user_id explicit-a add pannanum
  formData.append('user_id', currentUser.id);

  if (content) formData.append('content', content);
  if (caption) formData.append('caption', caption);
  if (file) formData.append('file', file);

  try {
    if (editingItem) {
      // EDIT CALL
      await API.put(`/contributions/update/${editingItem.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } else {
      // ADD CALL
      formData.append('room_id', roomId);
      formData.append('type', activeTab);
      
      await API.post('/contributions/add', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }

    handleCloseModal();
    fetchContributions();
  } catch (err) {
    console.error('Submit Error:', err);
    alert('Operation failed!');
  }
};

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f12', color: '#fff' }}>
      
      {/* NAVBAR */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 5%', background: '#121619' }}>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '6px 14px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          ← Back
        </button>
        <h2 style={{ color: '#f5b041', margin: 0 }}>ROOM: {roomCode}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
    
    {/* 👥 ATTRACTIVE PARTICIPANTS REDIRECT BUTTON */}
    <button 
      onClick={() => navigate(`/room/${roomCode}/participants`, { state: { roomId, roomCode } })}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 18px',
        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '20px',
        fontWeight: 'bold',
        fontSize: '0.85rem',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
        transition: 'transform 0.2s ease, boxShadow 0.2s ease'
      }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <span>👥</span>
      <span>View Participants</span>
    </button>

    <span style={{ fontSize: '0.9rem', color: '#aaa' }}>👤 {currentUser?.name}</span>
  </div>
        <span>👤 {currentUser?.name}</span>
      </nav>

      {/* DYNAMIC TABS */}
      <div style={{ display: 'flex', gap: '10px', padding: '20px 5%', overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              borderRadius: '25px',
              border: 'none',
              background: activeTab === tab.id ? '#f5b041' : '#1e252b',
              color: activeTab === tab.id ? '#000' : '#fff',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <main style={{ padding: '20px 5%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ textTransform: 'capitalize', color: '#f5b041' }}>{activeTab} Section</h3>
          <button 
            onClick={() => { handleCloseModal(); setShowModal(true); }}
            style={{ padding: '10px 20px', background: '#f5b041', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            + Add {activeTab}
          </button>
        </div>

        {loading ? (
          <p>Loading items...</p>
        ) : items.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {items.map((item) => (
              <div key={item.id} style={{ background: '#181f25', padding: '15px', borderRadius: '10px', position: 'relative' }}>
                
                {/* Text Content */}
                {['text', 'memory', 'letter'].includes(item.type) && (
                  <p style={{ lineHeight: '1.5' }}>{item.content}</p>
                )}

                {/* Media Render */}
                {item.type === 'photo' && item.media_url && (
                  <img src={getMediaUrl(item.media_url)} alt="media" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '6px' }} />
                )}
                {item.type === 'video' && item.media_url && (
                  <video controls style={{ width: '100%', borderRadius: '6px' }} src={getMediaUrl(item.media_url)} />
                )}
                {item.type === 'audio' && item.media_url && (
                  <audio controls style={{ width: '100%', marginTop: '10px' }} src={getMediaUrl(item.media_url)} />
                )}

                {item.caption && <p style={{ fontSize: '0.85rem', color: '#aaa', fontStyle: 'italic', marginTop: '8px' }}>"{item.caption}"</p>}

               {/* EDIT & DELETE BUTTONS - User matching check */}
{currentUser && currentUser.id === item.user_id && (
  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
    <button 
      onClick={() => handleEditClick(item)} 
      style={{ background: 'transparent', border: '1px solid #f5b041', color: '#f5b041', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
    >
      ✏️ Edit
    </button>
    <button 
      onClick={() => handleDelete(item.id)} 
      style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
    >
      🗑️ Delete
    </button>
  </div>
)}

              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666' }}>No records found in this category.</p>
        )}
      </main>

      {/* MODAL (Add / Edit) */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <form onSubmit={handleSubmit} style={{ background: '#181f25', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ color: '#f5b041' }}>{editingItem ? `Edit ${activeTab}` : `Add New ${activeTab}`}</h3>

            {['photo', 'video', 'audio'].includes(activeTab) ? (
              <>
                <label style={{ display: 'block', margin: '10px 0 5px', fontSize: '0.85rem' }}>
                  {editingItem ? 'Replace File (Optional):' : 'Select File:'}
                </label>
                <input 
                  type="file" 
                  onChange={(e) => setFile(e.target.files[0])} 
                  required={!editingItem} 
                />

                <label style={{ display: 'block', margin: '10px 0 5px', fontSize: '0.85rem' }}>Caption:</label>
                <input 
                  type="text" 
                  value={caption} 
                  onChange={(e) => setCaption(e.target.value)} 
                  style={{ width: '100%', padding: '8px', background: '#0b0f12', border: '1px solid #333', color: '#fff', borderRadius: '4px' }} 
                />
              </>
            ) : (
              <>
                <label style={{ display: 'block', margin: '10px 0 5px', fontSize: '0.85rem' }}>Content:</label>
                <textarea 
                  rows="4" 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '8px', background: '#0b0f12', border: '1px solid #333', color: '#fff', borderRadius: '4px' }} 
                />
              </>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" onClick={handleCloseModal} style={{ padding: '6px 12px', background: 'transparent', color: '#fff', border: '1px solid #666', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" style={{ padding: '6px 16px', background: '#f5b041', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                {editingItem ? 'Save Changes' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}