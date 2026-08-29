import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { getMediaUrl } from '../services/config';

export default function ParticipantsPage({ currentUser }) {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [creatorId, setCreatorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // 🟢 Public Link & Password Modal States
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [giftPassword, setGiftPassword] = useState('');
  const [publicSlug, setPublicSlug] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [copied, setCopied] = useState(false);

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
          if (roomRes?.data) {
            const rData = roomRes.data.data || roomRes.data;
            if (!participantsRes.data.creator_id) setCreatorId(rData.creator_id);
            
            // 🟢 Pre-fill existing public_slug & password if available from DB
            if (rData.public_slug && rData.public_slug.trim()) setPublicSlug(rData.public_slug.trim());
            if (rData.gift_password && rData.gift_password.trim()) setGiftPassword(rData.gift_password.trim());
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

  // Safe condition for Organizer check
  const isOrganizer = Boolean(
    loggedInUserId && 
    creatorId && 
    String(loggedInUserId).trim() === String(creatorId).trim()
  );

  // 🟢 FIRST TIME LINK GENERATION (Saves Domain/URL & Password to DB)
  const handleGenerateLink = async (e) => {
    e.preventDefault();
    if (!giftPassword.trim()) {
      alert('Please enter a password for the target person!');
      return;
    }

    // Full domain URL dynamic generation
    const randomSlug = `surprise-${roomCode.toLowerCase()}-${Math.random().toString(36).substring(2, 7)}`;
    const fullPublicUrl = `${window.location.origin}/surprise/${randomSlug}`;

    try {
      setSavingLink(true);
      const res = await API.post(`/rooms/code/${roomCode}/generate-link`, {
        password: giftPassword,
        public_url: fullPublicUrl
      });

      if (res.data.status === 'success') {
        setPublicSlug(res.data.public_url || fullPublicUrl);
        if (res.data.gift_password) setGiftPassword(res.data.gift_password);
        alert('Public Link & Password created successfully!');
      }
    } catch (err) {
      console.error('Failed to generate link:', err);
      alert('Error setting surprise link details');
    } finally {
      setSavingLink(false);
    }
  };

  // 🟢 COPY LINK TO CLIPBOARD
  const handleCopyLink = () => {
    const fullUrl = publicSlug.startsWith('http') 
      ? publicSlug 
      : `${window.location.origin}/surprise/${publicSlug}`;

    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle Contribution Status Function
  const handleToggleStatus = async (contribId) => {
    try {
      setUpdatingId(contribId);
      const res = await API.patch(`/contributions/${contribId}/status`);
      if (res.data.status === 'success') {
        const updatedStatus = res.data.new_status;

        setSelectedUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            contributions: prev.contributions.map((c) =>
              c.id === contribId ? { ...c, status: updatedStatus } : c
            ),
          };
        });

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


  return (
    <div style={{ minHeight: '100vh', background: '#0b0f12', color: '#fff', padding: '30px 5%' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <button 
          onClick={() => navigate(`/room/${roomCode}`, { state: { roomId } })}
          style={{ padding: '8px 16px', background: '#121619', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer' }}
        >
          ← Back to Room
        </button>

        <h2 style={{ margin: 0, color: '#a855f7' }}>👥 Room Participants</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* 🟢 DYNAMIC BUTTON: DB-la Link irundha View Button, illana Generate Button */}
          {isOrganizer && (
            <button
              onClick={() => setShowLinkModal(true)}
              style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {publicSlug ? '🎁 View Surprise Link' : '🎁 Generate Surprise Link'}
            </button>
          )}
          <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Code: {roomCode}</span>
        </div>
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

                  <div style={{ background: '#0b0f12', padding: '10px 14px', borderRadius: '8px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#aaa' }}>Surprise Added:</span>
                    <strong style={{ color: '#f5b041', fontSize: '0.95rem' }}>
                      🎁 {user.contributions_count} {user.contributions_count === 1 ? 'Memory' : 'Memories'}
                    </strong>
                  </div>

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

      {/* MODAL 1: VIEW & APPROVE CONTRIBUTIONS */}
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

      {/* 🟢 MODAL 2: SURPRISE LINK & PASSWORD SHOW / GENERATE */}
      {showLinkModal && isOrganizer && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#121619', maxWidth: '480px', width: '100%', borderRadius: '12px', padding: '25px', border: '1px solid #a855f7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#f5b041' }}>
                {publicSlug ? '🎁 Surprise Link Details' : '🎁 Create Surprise Link'}
              </h3>
              <button onClick={() => setShowLinkModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* 🟢 IF PUBLIC SLUG / LINK EXISTS IN DB -> SHOW READONLY DETAILS */}
            {publicSlug ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '6px' }}>
                    Public Surprise Link:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      readOnly 
                      value={publicSlug.startsWith('http') ? publicSlug : `${window.location.origin}/surprise/${publicSlug}`}
                      style={{ flex: 1, padding: '10px', background: '#0b0f12', border: '1px solid #333', color: '#a855f7', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}
                    />
                    <button 
                      onClick={handleCopyLink}
                      style={{ padding: '10px 14px', background: '#22c55e', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '6px' }}>
                    Gift Password:
                  </label>
                  <input 
                    type="text" 
                    readOnly
                    value={giftPassword}
                    style={{ width: '100%', padding: '10px', background: '#0b0f12', border: '1px solid #333', color: '#f5b041', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.95rem' }}
                  />
                </div>
              </div>
            ) : (
              /* 🟢 FIRST TIME CREATION FORM */
              <form onSubmit={handleGenerateLink} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '6px' }}>Set Password for Target Person:</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Secret123 or Birthday2026"
                    value={giftPassword}
                    onChange={(e) => setGiftPassword(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#0b0f12', border: '1px solid #333', color: '#fff', borderRadius: '6px', outline: 'none' }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={savingLink}
                  style={{ padding: '10px', background: '#a855f7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {savingLink ? 'Generating...' : 'Save Password & Generate Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}