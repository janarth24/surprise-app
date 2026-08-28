import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';

// Dynamic Media Base URL (Fallback to localhost if API config base doesn't exist)
const MEDIA_BASE_URL = API.defaults?.baseURL
  ? API.defaults.baseURL.replace(/\/api\/?$/, '')
  : 'http://localhost:8000';

export default function ParticipantsPage({ currentUser }) {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [creatorId, setCreatorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Get current logged-in user ID safely
  const loggedInUserId = currentUser?.id || currentUser?.user_id;

  useEffect(() => {
    const fetchParticipantsAndRoom = async () => {
      if (!roomCode) return;
      try {
        setLoading(true);

        // Fetch participants and room details parallelly
        const [participantsRes, roomRes] = await Promise.all([
          API.get(`/rooms/code/${roomCode}/participants`),
          API.get(`/rooms/code/${roomCode}`).catch(() => null)
        ]);

        if (participantsRes.data.status === 'success') {
          setParticipants(participantsRes.data.data);
          setRoomId(participantsRes.data.room_id);

          // Priority 1: Backend response creator_id
          if (participantsRes.data.creator_id) {
            setCreatorId(participantsRes.data.creator_id);
          } 
          // Priority 2: Room detail fallback
          else if (roomRes?.data) {
            const rData = roomRes.data.data || roomRes.data;
            setCreatorId(rData.creator_id);
          }
        }
      } catch (err) {
        console.error('Failed to load participants data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipantsAndRoom();
  }, [roomCode]);

  // Safe and strict type-agnostic condition for Room Organizer check
  const isOrganizer = Boolean(
    loggedInUserId && 
    creatorId && 
    String(loggedInUserId).trim() === String(creatorId).trim()
  );

  // Toggle Contribution Status Function
  const handleToggleStatus = async (contribId) => {
    try {
      setUpdatingId(contribId);
      const res = await API.patch(`/contributions/${contribId}/status`);
      if (res.data.status === 'success') {
        const updatedStatus = res.data.new_status;

        // 1. Modal State local update
        setSelectedUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            contributions: prev.contributions.map((c) =>
              c.id === contribId ? { ...c, status: updatedStatus } : c
            ),
          };
        });

        // 2. Participants list local update
        setParticipants((prev) =>
          prev.map((user) => ({
            ...user,
            contributions: user.contributions
              ? user.contributions.map((c) =>
                  c.id === contribId ? { ...c, status: updatedStatus } : c
                )
              : [],
          }))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Helper function to build dynamic media URLs cleanly
  const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${MEDIA_BASE_URL}${cleanPath}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f12', color: '#fff', padding: '30px 5%' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '15px' }}>
        <button 
          onClick={() => navigate(`/room/${roomCode}`, { state: { roomId } })}
          style={{ padding: '8px 16px', background: '#121619', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer' }}
        >
          ← Back to Room
        </button>
        <h2 style={{ margin: 0, color: '#a855f7' }}>👥 Room Participants</h2>
        <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Code: {roomCode}</span>
      </div>

      {/* PARTICIPANTS GRID */}
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#f5b041' }}>
            Total Joined Members: {participants.length}
          </h3>
          {isOrganizer && (
            <span style={{ background: '#a855f7', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              👑 You are Organizer
            </span>
          )}
        </div>

        {loading ? (
          <p style={{ color: '#aaa' }}>Loading participants list...</p>
        ) : participants.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {participants.map((user) => {
              const isUserOrganizer = creatorId && String(user.id).trim() === String(creatorId).trim();
              const isCurrentUser = loggedInUserId && String(user.id).trim() === String(loggedInUserId).trim();

              return (
                <div 
                  key={user.id} 
                  style={{ 
                    background: '#121619', 
                    padding: '20px', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    gap: '15px'
                  }}
                >
                  {/* USER INFO */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {user.profile_photo ? (
                      <img 
                        src={getMediaUrl(user.profile_photo)} 
                        alt="Avatar" 
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        fontWeight: 'bold', 
                        fontSize: '1.2rem'
                      }}>
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}

                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>
                        {user.name} {isCurrentUser ? '(You)' : ''}
                        {isUserOrganizer && <span style={{ fontSize: '0.75rem', color: '#f5b041', marginLeft: '6px' }}>👑 Host</span>}
                      </h4>
                      <small style={{ color: '#888', fontSize: '0.8rem' }}>{user.email}</small>
                    </div>
                  </div>

                  {/* DIGITAL CONTRIBUTIONS SUMMARY */}
                  <div style={{ background: '#0b0f12', padding: '10px 14px', borderRadius: '8px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#aaa' }}>Surprise Added:</span>
                    <strong style={{ color: '#f5b041', fontSize: '0.95rem' }}>
                      🎁 {user.contributions_count} {user.contributions_count === 1 ? 'Memory' : 'Memories'}
                    </strong>
                  </div>

                  {/* VIEW USER MEMORIES BUTTON - STRICTLY ORGANIZER ONLY */}
                  {isOrganizer && user.contributions_count > 0 && (
                    <button 
                      onClick={() => setSelectedUser(user)}
                      style={{ width: '100%', padding: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid #a855f7', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      View & Moderate ({user.contributions_count})
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#666' }}>No participants found for this room.</p>
        )}
      </div>

      {/* MODAL: VIEW & APPROVE CONTRIBUTIONS (ORGANIZER ONLY) */}
      {selectedUser && isOrganizer && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#121619', maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto', borderRadius: '12px', padding: '25px', border: '1px solid #a855f7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#f5b041' }}>{selectedUser.name}'s Contributions</h3>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {selectedUser.contributions.map((item) => (
                <div key={item.id} style={{ background: '#0b0f12', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#a855f7', textTransform: 'uppercase', fontWeight: 'bold' }}>
                      Type: {item.type || 'Contribution'}
                    </span>

                    {/* STATUS TOGGLE BUTTON */}
                    <button
                      onClick={() => handleToggleStatus(item.id)}
                      disabled={updatingId === item.id}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: 'pointer',
                        background: item.status === 'approved' ? '#166534' : '#991b1b',
                        color: item.status === 'approved' ? '#4ade80' : '#fca5a5',
                        transition: '0.2s all'
                      }}
                    >
                      {updatingId === item.id ? 'Updating...' : item.status === 'approved' ? '✓ Approved' : '⏳ Pending'}
                    </button>
                  </div>

                  {item.content && <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#eee' }}>{item.content}</p>}

                  {item.media_url && (
                    item.type === 'photo' ? (
                      <img src={getMediaUrl(item.media_url)} alt="Media" style={{ width: '100%', borderRadius: '6px', marginTop: '8px' }} />
                    ) : item.type === 'video' ? (
                      <video src={getMediaUrl(item.media_url)} controls style={{ width: '100%', borderRadius: '6px', marginTop: '8px' }} />
                    ) : (
                      <a href={getMediaUrl(item.media_url)} target="_blank" rel="noreferrer" style={{ color: '#22c55e', fontSize: '0.85rem' }}>View Media Attachment</a>
                    )
                  )}

                  {item.caption && <small style={{ display: 'block', color: '#888', marginTop: '6px' }}>Caption: {item.caption}</small>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}