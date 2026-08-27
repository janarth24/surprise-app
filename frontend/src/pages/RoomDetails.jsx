import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function RoomDetails({ currentUser }) {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  // Active Contribution Tab State
  const [activeTab, setActiveTab] = useState('text');
  
  // Modals / Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Tab Details Configuration
  const tabs = [
    { id: 'text', label: '💬 Text Wishes', icon: '📝' },
    { id: 'photo', label: '🖼️ Photos', icon: '📸' },
    { id: 'video', label: '🎥 Videos', icon: '🎬' },
    { id: 'audio', label: '🎙️ Audio Notes', icon: '🎵' },
    { id: 'memory', label: '🌟 Memories', icon: '💭' },
    { id: 'letter', label: '✉️ Secret Letter', icon: '💌' },
  ];

  const handleOpenAddForm = () => {
    setEditingItem(null);
    setShowFormModal(true);
  };

  const handleOpenEditForm = (item) => {
    setEditingItem(item);
    setShowFormModal(true);
  };

  return (
    <div className="dashboard-wrapper">
      
      {/* 1. ROOM HEADER NAVBAR */}
      <nav className="dashboard-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            className="btn-secondary-dark" 
            onClick={() => navigate('/dashboard')}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            ← Back to Dashboard
          </button>
          <div className="nav-logo">
            <h2>ROOM: <span>{roomCode}</span></h2>
          </div>
        </div>

        <div className="nav-links">
          <span className="user-badge">👤 {currentUser?.name || 'User'}</span>
        </div>
      </nav>

      {/* 2. ROOM BANNER */}
      <section style={{
        padding: '30px 8%',
        background: 'rgba(255, 255, 255, 0.02)',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 'bold', letterSpacing: '2px' }}>
            SURPRISE EVENT
          </span>
          <h1 style={{ margin: '5px 0 8px 0', fontSize: '2rem' }}>Rahul's 25th Birthday Blast</h1>
          <p style={{ margin: 0, color: 'var(--text-sub)', fontSize: '0.9rem' }}>
            Target Person: <strong style={{ color: '#fff' }}>Rahul</strong> | Date: <strong>2026-10-15</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-outline" style={{ fontSize: '0.85rem', padding: '10px 20px' }} onClick={() => navigator.clipboard.writeText(roomCode)}>
            📋 Copy Code: {roomCode}
          </button>
          <button className="btn-gold" style={{ fontSize: '0.85rem', padding: '10px 24px' }} onClick={handleOpenAddForm}>
            + Add {activeTab.toUpperCase()}
          </button>
        </div>
      </section>

      {/* 3. CATEGORY TABS */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '20px 8%',
        overflowX: 'auto',
        borderBottom: '1px solid var(--border-glass)',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              borderRadius: '25px',
              border: activeTab === tab.id ? '1px solid var(--accent-gold)' : '1px solid var(--border-glass)',
              background: activeTab === tab.id ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.04)',
              color: activeTab === tab.id ? '#121619' : 'var(--text-main)',
              fontWeight: activeTab === tab.id ? 'bold' : '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: '0.3s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. CONTENT GRID & PREVIEW AREA */}
      <main className="dashboard-content" style={{ marginTop: '30px' }}>
        
        <div className="section-header">
          <h3>{tabs.find(t => t.id === activeTab)?.label} Contributions</h3>
          <span className="count-badge">0 Items</span>
        </div>

        {/* SAMPLE DUMMY GRID FOR LAYOUT VISUALIZATION */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
          marginTop: '20px'
        }}>
          
          {/* Add New Quick Card Slot */}
          <div 
            onClick={handleOpenAddForm}
            style={{
              border: '2px dashed var(--border-glass)',
              borderRadius: '12px',
              padding: '40px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: '0.3s',
              background: 'rgba(255, 255, 255, 0.02)'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>➕</div>
            <h4 style={{ margin: '0 0 5px 0' }}>Add New {activeTab}</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-sub)' }}>Click to upload or write</p>
          </div>

          {/* Sample Card Placeholder */}
          <div className="empty-rooms-card" style={{ textAlign: 'left', padding: '20px', position: 'relative' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
              BY: SIVA (You)
            </span>
            <p style={{ margin: '12px 0', fontSize: '0.95rem', color: '#fff', lineHeight: '1.5' }}>
              "Happy Birthday Rahul! Hope this year brings you infinite success!"
            </p>

            {/* EDIT & DELETE ACTIONS */}
            <div style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-glass)',
              paddingTop: '12px',
              marginTop: '15px'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>2 mins ago</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn-secondary-dark" 
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={() => handleOpenEditForm({ id: 1, text: 'Sample text' })}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn-secondary-dark" 
                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
                  onClick={() => alert('Delete triggered')}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* 5. SEPARATE FORM MODAL LAYOUT */}
      {showFormModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="auth-card" style={{ width: '450px', padding: '35px' }}>
            <h2>{editingItem ? '✏️ Edit' : '➕ Add'} {activeTab.toUpperCase()}</h2>

            <form onSubmit={(e) => { e.preventDefault(); setShowFormModal(false); }}>
              
              {/* DYNAMIC FORM FIELDS BASED ON TYPE */}
              {activeTab === 'text' && (
                <div className="form-group">
                  <label>Wish Message</label>
                  <textarea 
                    rows="4" 
                    placeholder="Write your hearty wish..."
                    className="form-group input" 
                    style={{ width: '100%', resize: 'none' }}
                    required 
                  />
                </div>
              )}

              {activeTab === 'photo' && (
                <>
                  <div className="form-group">
                    <label>Photo URL / File Link</label>
                    <input type="url" placeholder="https://example.com/photo.jpg" required />
                  </div>
                  <div className="form-group">
                    <label>Caption</label>
                    <input type="text" placeholder="Memorable trip photo..." />
                  </div>
                </>
              )}

              {activeTab === 'video' && (
                <>
                  <div className="form-group">
                    <label>Video URL / Embed Link</label>
                    <input type="url" placeholder="https://youtube.com/..." required />
                  </div>
                  <div className="form-group">
                    <label>Caption</label>
                    <input type="text" placeholder="Video wish title..." />
                  </div>
                </>
              )}

              {activeTab === 'audio' && (
                <div className="form-group">
                  <label>Audio URL / Voice Note Link</label>
                  <input type="url" placeholder="https://example.com/voice.mp3" required />
                </div>
              )}

              {activeTab === 'memory' && (
                <>
                  <div className="form-group">
                    <label>Memory Title</label>
                    <input type="text" placeholder="College Days Trip 2023" required />
                  </div>
                  <div className="form-group">
                    <label>Story / Detail</label>
                    <textarea rows="3" placeholder="What happened on that day..." style={{ width: '100%', borderRadius: '8px', padding: '10px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid var(--border-glass)' }} />
                  </div>
                </>
              )}

              {activeTab === 'letter' && (
                <div className="form-group">
                  <label>Secret Letter Content</label>
                  <textarea rows="6" placeholder="Dear Friend, On this special day..." style={{ width: '100%', borderRadius: '8px', padding: '10px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid var(--border-glass)' }} required />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowFormModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  {editingItem ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}