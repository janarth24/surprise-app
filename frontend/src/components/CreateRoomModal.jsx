import { useState } from 'react';
import API from '../services/api';

export default function CreateRoomModal({ currentUser, onClose, onRoomCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    target_name: '',
    event_date: '',
    theme: 'default'
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Backend expecting data payload with creator_id
      const payload = {
        title: formData.title,
        target_name: formData.target_name,
        event_date: formData.event_date,
        theme: formData.theme,
        creator_id: currentUser?.id
      };

      // API call to FastAPI backend
      const res = await API.post('/rooms/create', payload);

      if (res.data.status === 'success') {
        alert(`🎉 Room Created Successfully!\nSecret Room Code: ${res.data.room.room_code}`);
        onRoomCreated(res.data.room); // Pass new room to parent Dashboard
        onClose(); // Close Modal
      }
    } catch (err) {
      console.error("Create Room Error:", err);
      setErrorMsg(err.response?.data?.detail || 'Failed to create room. Try again!');
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
      <div className="auth-card" style={{ width: '420px', padding: '35px' }}>
        <h2>🎉 Create Surprise Room</h2>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Surprise Title / Event Name</label>
            <input 
              type="text" 
              placeholder="e.g., Rahul's 25th Birthday Blast" 
              required 
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
            />
          </div>

          <div className="form-group">
            <label>Target Person Name (Birthday Baby)</label>
            <input 
              type="text" 
              placeholder="e.g., Rahul" 
              required 
              value={formData.target_name}
              onChange={(e) => setFormData({ ...formData, target_name: e.target.value })} 
            />
          </div>

          <div className="form-group">
            <label>Event Date</label>
            <input 
              type="date" 
              required 
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} 
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}