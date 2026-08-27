import { useState } from 'react';
import API from '../services/api';

export default function JoinRoomModal({ currentUser, onClose, onRoomJoined }) {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await API.post('/rooms/join', {
        room_code: roomCode.trim(),
        user_id: currentUser?.id
      });

      if (res.data.status === 'success') {
        alert(`🎉 ${res.data.message}`);
        onRoomJoined(); // Refresh Dashboard List
        onClose(); // Close Modal
      }
    } catch (err) {
      console.error("Join Room Error:", err);
      setErrorMsg(err.response?.data?.detail || 'Failed to join room. Check code!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="auth-card" style={{ width: '400px', padding: '35px' }}>
        <h2>🔑 Join Surprise Room</h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '-15px', marginBottom: '20px' }}>
          Enter 6-digit Secret Code given by organizer
        </p>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleJoin}>
          <div className="form-group">
            <label>Secret Room Code</label>
            <input 
              type="text" 
              placeholder="e.g., X8K9P2" 
              maxLength={6}
              required 
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase', letterSpacing: '3px', fontSize: '1.2rem', textAlign: 'center', fontWeight: 'bold' }} 
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Joining...' : 'Join Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}