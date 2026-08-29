import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import API from '../services/api';
import './SurprisePage.css';

const TEASER_STEPS = [
  "Let's Start... ✨",
  "Are you ready? 🎁",
  "Something exciting is waiting for you... 🎉",
  "Pop the balloons to reveal your real memories! 🎈"
];

const BALLOON_COLORS = [
  'linear-gradient(135deg, #ec4899, #f43f5e)',
  'linear-gradient(135deg, #a855f7, #6366f1)',
  'linear-gradient(135deg, #3b82f6, #06b6d4)',
  'linear-gradient(135deg, #10b981, #84cc16)',
  'linear-gradient(135deg, #f59e0b, #ef4444)'
];

const MEDIA_BASE_URL = API.defaults?.baseURL
  ? API.defaults.baseURL.replace(/\/api\/?$/, '')
  : 'http://localhost:8000';

export default function SurprisePage() {
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [roomData, setRoomData] = useState(null);
  
  // States: 'lock' -> 'teaser' -> 'sky'
  const [stage, setStage] = useState('lock');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Teaser Text Animation Index
  const [teaserIndex, setTeaserIndex] = useState(0);

  // Dynamic Balloons & Currently Opened Real Memory Modal
  const [balloons, setBalloons] = useState([]);
  const [selectedContribution, setSelectedContribution] = useState(null);

  useEffect(() => {
    const fetchSurprise = async () => {
      try {
        const res = await API.get(`/rooms/public/surprise/${slug}`);
        if (res.data?.status === 'success') {
          setRoomData(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching room:", err);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchSurprise();
  }, [slug]);

  // Teaser Sequence Logic
  useEffect(() => {
    if (stage === 'teaser') {
      const interval = setInterval(() => {
        setTeaserIndex((prev) => {
          if (prev + 1 < TEASER_STEPS.length) {
            return prev + 1;
          } else {
            clearInterval(interval);
            setTimeout(() => initializeBalloons(), 1000);
            return prev;
          }
        });
      }, 1600);
      return () => clearInterval(interval);
    }
  }, [stage]);

  // Password Unlock Check
  const handleUnlock = (e) => {
    e.preventDefault();
    if (!roomData?.gift_password || passwordInput.trim() === String(roomData.gift_password).trim()) {
      setStage('teaser');
    } else {
      setAuthError('❌ Incorrect Secret Password!');
    }
  };

  // 🎈 DYNAMIC BALLOONS INITIALIZATION FROM DATABASE ONLY
  const initializeBalloons = () => {
    setStage('sky');
    const realContributions = roomData?.contributions || [];

    if (realContributions.length === 0) return;

    // Maximum 5 floating balloons at a time from REAL DB records
    const initialCount = Math.min(5, realContributions.length);
    const initialBalloons = Array.from({ length: initialCount }).map((_, i) => 
      createBalloonObj(i, realContributions[i % realContributions.length])
    );

    setBalloons(initialBalloons);
  };

  const createBalloonObj = (id, contribution) => {
    return {
      id: `${id}-${Date.now()}-${Math.random()}`,
      left: Math.floor(Math.random() * 70) + 12, // 12% to 82% screen width
      speed: Math.random() * 2 + 3.5,            // Fast float speed: 3.5s to 5.5s
      bg: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
      contribution: contribution
    };
  };

  // 💥 BURST & RESPAWN (DYNAMIC DATA LOOP)
  const handleBalloonClick = (balloonId, contribution, event) => {
    // Confetti Explosion
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { x: event.clientX / window.innerWidth, y: event.clientY / window.innerHeight }
    });

    // Show Real DB Contribution in Modal
    setSelectedContribution(contribution);

    // Remove clicked balloon & respawn a replacement balloon with DB item
    setBalloons((prev) => {
      const filtered = prev.filter((b) => b.id !== balloonId);
      const realContributions = roomData?.contributions || [];

      if (realContributions.length === 0) return filtered;

      // Pick a random real DB contribution for the new balloon
      const randomDbItem = realContributions[Math.floor(Math.random() * realContributions.length)];
      const newBalloon = createBalloonObj(Date.now(), randomDbItem);
      
      return [...filtered, newBalloon];
    });
  };

  const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${MEDIA_BASE_URL}${cleanPath}`;
  };

  if (loading) {
    return <div className="intro-container"><h2 style={{ color: '#c084fc' }}>🎁 Fetching Special Surprise...</h2></div>;
  }

  // 1️⃣ Lock Screen
  if (stage === 'lock') {
    return (
      <div className="surprise-app-wrapper intro-container">
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '40px 30px', borderRadius: '24px', border: '1px solid rgba(192, 132, 252, 0.3)', maxWidth: '400px', width: '100%' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔒🎁</div>
          <h2>Unlock Secret Passcode</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
            Enter the secret passcode for <strong>{roomData?.target_name || 'Recipient'}</strong>.
          </p>
          <form onSubmit={handleUnlock}>
            <input 
              type="password" 
              placeholder="Enter Password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #334155', background: '#090d16', color: '#fff', textAlign: 'center', marginBottom: '15px', outline: 'none' }}
              required
            />
            {authError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '10px' }}>{authError}</p>}
            <button type="submit" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
              Reveal Surprise ✨
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2️⃣ Fading Text Teaser Screen
  if (stage === 'teaser') {
    return (
      <div className="surprise-app-wrapper intro-container">
        <h1 key={teaserIndex} className="glow-teaser-text">
          {TEASER_STEPS[teaserIndex]}
        </h1>
      </div>
    );
  }

  // 3️⃣ Floating Balloon Realm Screen
  const realContributions = roomData?.contributions || [];

  return (
    <div className="surprise-app-wrapper sky-realm">
      <div className="sky-header">
        <h1 className="sky-title">🎈 Pop the Memory Balloons!</h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Click floating balloons to reveal real wishes ({realContributions.length} Total)
        </p>
      </div>

      {/* Floating Balloons Rendered ONLY from Database */}
      {balloons.length > 0 ? (
        balloons.map((b) => (
          <div
            key={b.id}
            className="interactive-balloon"
            style={{
              left: `${b.left}%`,
              background: b.bg,
              animationDuration: `${b.speed}s`
            }}
            onClick={(e) => handleBalloonClick(b.id, b.contribution, e)}
          >
            <span style={{ fontSize: '2.2rem', pointerEvents: 'none' }}>🎈</span>
            <span className="balloon-badge">{b.contribution.type || 'wish'}</span>
          </div>
        ))
      ) : (
        <div className="intro-container">
          <h3 style={{ color: '#aaa' }}>No contributions/memories stored in this room yet!</h3>
        </div>
      )}

      {/* 💌 Revealed Real Contribution Modal */}
      {selectedContribution && (
        <div className="message-modal-overlay">
          <div className="message-card">
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
              {selectedContribution.type === 'photo' ? '📸' : selectedContribution.type === 'video' ? '🎬' : '💌'}
            </div>

            {/* Text Message Content */}
            {selectedContribution.content && (
              <p style={{ fontSize: '1.15rem', lineHeight: '1.6', color: '#f8fafc', whiteSpace: 'pre-line' }}>
                "{selectedContribution.content}"
              </p>
            )}

            {/* Media Rendering (Image/Video/Audio) */}
            {selectedContribution.media_url && (
              <div>
                {selectedContribution.type === 'photo' || selectedContribution.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={getMediaUrl(selectedContribution.media_url)} alt="Memory" className="modal-media" />
                ) : selectedContribution.type === 'video' || selectedContribution.media_url.match(/\.(mp4|webm)$/i) ? (
                  <video src={getMediaUrl(selectedContribution.media_url)} controls className="modal-media" />
                ) : selectedContribution.type === 'audio' || selectedContribution.media_url.match(/\.(mp3|wav|ogg)$/i) ? (
                  <audio src={getMediaUrl(selectedContribution.media_url)} controls style={{ width: '100%', marginTop: '15px' }} />
                ) : null}
              </div>
            )}

            {selectedContribution.caption && (
              <p style={{ color: '#aaa', fontStyle: 'italic', fontSize: '0.9rem', marginTop: '8px' }}>
                — {selectedContribution.caption}
              </p>
            )}

            <div className="sender-tag">
              — With Love, {selectedContribution.sender_name || selectedContribution.user?.name || 'Anonymous'}
            </div>

            <button 
              onClick={() => setSelectedContribution(null)}
              style={{ marginTop: '25px', padding: '12px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)' }}
            >
              Pop Next Balloon 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}