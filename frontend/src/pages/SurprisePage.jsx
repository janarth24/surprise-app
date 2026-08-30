import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import API from '../services/api';
import { getMediaUrl } from '../services/config';
import './SurprisePage.css';

const TEASER_STEPS = [
  "Let's Start... ✨",
  "Are you ready? 🎁",
  "Something exciting is waiting for you... 🎉",
  "Pop the balloons to reveal your secret messages! 🎈"
];

const BALLOON_COLORS = [
  'linear-gradient(135deg, #ec4899, #f43f5e)',
  'linear-gradient(135deg, #a855f7, #6366f1)',
  'linear-gradient(135deg, #3b82f6, #06b6d4)',
  'linear-gradient(135deg, #10b981, #84cc16)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #d946ef, #8b5cf6)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)'
];

// 6 Horizontal Screen Lanes across the ENTIRE page width (Left -> Center -> Right)
const SCREEN_LANES = [
  { min: 4, max: 16, sway: 'sway-left' },     // Zone 1: Far Left
  { min: 19, max: 32, sway: 'sway-right' },   // Zone 2: Mid Left
  { min: 35, max: 48, sway: 'sway-center' },  // Zone 3: Center Left
  { min: 51, max: 64, sway: 'sway-left' },    // Zone 4: Center Right
  { min: 67, max: 80, sway: 'sway-right' },   // Zone 5: Mid Right
  { min: 83, max: 92, sway: 'sway-center' }   // Zone 6: Far Right
];

// Initial staggered float time offsets so balloons fill all heights across the whole sky
const INITIAL_DELAYS = [-2, -7, -12, -4, -9, -14];

// Distinct Photo Frame Styles to cycle through
const FRAME_STYLES = [
  'frame-polaroid',
  'frame-neon',
  'frame-royal-gold',
  'frame-filmstrip',
  'frame-rose-gold',
  'frame-hologram'
];

// Demo Celebration Photos if room has no uploaded photos yet
const DEMO_PHOTOS = [
  { id: 'demo-p1', type: 'photo', media_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop', caption: 'Magical Celebration Moments ✨', sender_name: 'Best Friends' },
  { id: 'demo-p2', type: 'photo', media_url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&auto=format&fit=crop', caption: 'Unforgettable Smiles & Laughs 🎈', sender_name: 'Loved Ones' },
  { id: 'demo-p3', type: 'photo', media_url: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&auto=format&fit=crop', caption: 'Sweet Memories Together 🎂', sender_name: 'Family' },
  { id: 'demo-p4', type: 'photo', media_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop', caption: 'Shining Bright Today & Always 🌟', sender_name: 'Secret Admirer' }
];

// 🎵 Realistic Balloon Pop Sound Synthesis with Web Audio API
const playPopSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;

    // Low impulse pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.1);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);

    // Sharp snap noise for balloon rubber burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.04);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1400;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(t);
  } catch (e) {
    console.warn("Audio pop notice:", e);
  }
};

// ⏱️ Countdown Beep / Pulse Sound
const playCountdownBeep = (num) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq = num === 1 ? 880 : num === 2 ? 660 : 440;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
  } catch (e) {
    console.warn("Countdown beep notice:", e);
  }
};

export default function SurprisePage() {
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [roomData, setRoomData] = useState(null);
  
  // Stages: 'lock' -> 'teaser' -> 'sky' -> 'countdown' -> 'photo_gallery'
  const [stage, setStage] = useState('lock');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [teaserIndex, setTeaserIndex] = useState(0);
  const [countdownNum, setCountdownNum] = useState(3);

  const [balloons, setBalloons] = useState([]);
  const [selectedContribution, setSelectedContribution] = useState(null);
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [showAllRevealedModal, setShowAllRevealedModal] = useState(false);

  // Photo Gallery Lightbox state
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const balloonCountRef = useRef(0);

  // Fetch Room Data
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

  // 📝 EXTRACT ONLY CONTRIBUTIONS WHERE TYPE IS 'text'
  const getTextContributions = useCallback(() => {
    return (roomData?.contributions || []).filter(
      c => c.type === 'text' && c.content && String(c.content).trim() !== ''
    );
  }, [roomData]);

  // 🖼️ EXTRACT ONLY CONTRIBUTIONS WHERE TYPE IS 'photo' / image
  const getPhotoContributions = useCallback(() => {
    const photos = (roomData?.contributions || []).filter(
      c => (c.type === 'photo' || c.type === 'image' || (!c.type && c.media_url)) && c.media_url
    );
    return photos.length > 0 ? photos : DEMO_PHOTOS;
  }, [roomData]);

  // Helper to construct a single balloon object placed in a designated screen lane
  const createBalloonObj = useCallback((contribution, laneIndex = null, initialDelay = null) => {
    balloonCountRef.current += 1;
    
    // Pick lane (0 to 5 for full screen width distribution)
    const activeLaneIndex = laneIndex !== null ? laneIndex : Math.floor(Math.random() * SCREEN_LANES.length);
    const lane = SCREEN_LANES[activeLaneIndex];
    
    // Calculate random position strictly inside this lane
    const randomLeft = Math.floor(Math.random() * (lane.max - lane.min)) + lane.min;
    
    // Float speed between 12s and 18s
    const randomSpeed = (Math.random() * 5 + 12).toFixed(1);
    
    // Random vibrant gradient color
    const randomBg = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    
    return {
      id: `balloon-${balloonCountRef.current}-${Date.now()}-${Math.random()}`,
      laneIndex: activeLaneIndex,
      left: randomLeft,
      speed: parseFloat(randomSpeed),
      animDelay: initialDelay !== null ? `${initialDelay}s` : '0s',
      swayClass: lane.sway,
      bg: randomBg,
      contribution: contribution,
      isPopping: false
    };
  }, []);

  // Initialize floating balloons ONLY for UNREVEALED text items (NO duplicate balloons)
  const initializeBalloons = useCallback(() => {
    setStage('sky');
    const contributions = getTextContributions();
    
    if (contributions.length === 0) {
      setBalloons([]);
      return;
    }

    // Only take unrevealed items
    const unrevealedItems = contributions.filter(c => !revealedIds.has(c.id));
    
    if (unrevealedItems.length === 0) {
      setBalloons([]);
      return;
    }

    // Populate distinct balloons for each unrevealed item (up to available screen lanes)
    const initialBalloons = unrevealedItems.slice(0, SCREEN_LANES.length).map((item, index) => {
      const delay = INITIAL_DELAYS[index % INITIAL_DELAYS.length];
      return createBalloonObj(item, index, delay);
    });

    setBalloons(initialBalloons);
  }, [getTextContributions, revealedIds, createBalloonObj]);

  // Handle intro teaser sequence
  useEffect(() => {
    if (stage === 'teaser') {
      const interval = setInterval(() => {
        setTeaserIndex((prev) => {
          if (prev + 1 < TEASER_STEPS.length) {
            return prev + 1;
          } else {
            clearInterval(interval);
            setTimeout(() => initializeBalloons(), 900);
            return prev;
          }
        });
      }, 1600);
      return () => clearInterval(interval);
    }
  }, [stage, initializeBalloons]);

  // ⏳ Handle 3, 2, 1 Countdown Transition
  useEffect(() => {
    if (stage === 'countdown') {
      playCountdownBeep(3);

      const t1 = setTimeout(() => {
        setCountdownNum(2);
        playCountdownBeep(2);
      }, 1000);

      const t2 = setTimeout(() => {
        setCountdownNum(1);
        playCountdownBeep(1);
      }, 2000);

      const t3 = setTimeout(() => {
        // Dramatic finale tick & fireworks confetti burst
        playPopSound();
        confetti({
          particleCount: 110,
          spread: 95,
          startVelocity: 42,
          origin: { x: 0.5, y: 0.45 },
          colors: ['#ec4899', '#a855f7', '#f59e0b', '#06b6d4', '#10b981', '#ffffff']
        });
        setStage('photo_gallery');
      }, 3000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [stage]);

  // 🎬 Autoplay slideshow effect in photo gallery
  useEffect(() => {
    let autoInterval;
    if (isAutoPlaying && stage === 'photo_gallery') {
      const photos = getPhotoContributions();
      autoInterval = setInterval(() => {
        setActivePhotoIndex((prev) => {
          if (prev === null) return 0;
          return (prev + 1) % photos.length;
        });
      }, 3200);
    }
    return () => clearInterval(autoInterval);
  }, [isAutoPlaying, stage, getPhotoContributions]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedContribution(null);
        setShowAllRevealedModal(false);
        setActivePhotoIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (!roomData?.gift_password || passwordInput.trim() === String(roomData.gift_password).trim()) {
      setStage('teaser');
    } else {
      setAuthError('❌ Incorrect Secret Password! Please try again.');
    }
  };

  // Helper to extract sender name
  const getUserName = (c) => {
    return c?.sender_name || c?.user?.name || c?.user?.username || 'Special Guest';
  };

  // 💥 POP / BURST BALLOON (WITHOUT REPEATING SEEN MESSAGES)
  const handleBalloonBurst = (balloon, event) => {
    if (balloon.isPopping) return;

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // 1. Play realistic pop sound
    playPopSound();

    // 2. Compute exact coordinate for confetti burst
    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;

    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      clientX = rect.left + rect.width / 2;
      clientY = rect.top + rect.height / 2;
    } else if (event?.clientX) {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const originX = Math.max(0.05, Math.min(0.95, clientX / window.innerWidth));
    const originY = Math.max(0.05, Math.min(0.95, clientY / window.innerHeight));

    // 3. Multi-colored celebratory confetti explosion
    confetti({
      particleCount: 65,
      spread: 75,
      startVelocity: 32,
      origin: { x: originX, y: originY },
      colors: ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#10b981', '#fbbf24', '#ffffff']
    });

    // 4. Mark this balloon as popping for the burst keyframe animation
    setBalloons((prev) =>
      prev.map((b) => (b.id === balloon.id ? { ...b, isPopping: true } : b))
    );

    // 5. Complete burst, open message, and only spawn unrevealed balloon
    setTimeout(() => {
      setSelectedContribution(balloon.contribution);
      
      const newRevealed = new Set([...revealedIds, balloon.contribution.id]);
      setRevealedIds(newRevealed);

      setBalloons((prev) => {
        const remaining = prev.filter((b) => b.id !== balloon.id);
        const allItems = getTextContributions();
        
        // Find which items do NOT have an active balloon on screen AND have NOT been seen yet
        const activeIds = new Set(remaining.map(b => b.contribution.id));
        const availableUnrevealed = allItems.filter(
          item => !newRevealed.has(item.id) && !activeIds.has(item.id)
        );

        // If an unrevealed message is still waiting, spawn a balloon for it
        if (availableUnrevealed.length > 0) {
          const nextItem = availableUnrevealed[0];
          const newBalloon = createBalloonObj(nextItem, balloon.laneIndex, 0);
          return [...remaining, newBalloon];
        }

        // NO MORE UNREVEALED MESSAGES -> DO NOT REPEAT / SPAWN DUPLICATE BALLOONS!
        return remaining;
      });
    }, 220);
  };

  // Close message modal: if all text messages are unlocked, immediately start Countdown!
  const handleCloseMessageModal = () => {
    setSelectedContribution(null);
    const allItems = getTextContributions();
    if (allItems.length > 0 && revealedIds.size >= allItems.length) {
      setStage('countdown');
    }
  };

  const targetPersonName = roomData?.target_name || 'the Birthday Star';

  if (loading) {
    return (
      <div className="intro-container">
        <h2 style={{ color: '#c084fc' }}>🎁 Preparing Your Special Surprise...</h2>
      </div>
    );
  }

  // 1️⃣ Lock Screen
  if (stage === 'lock') {
    return (
      <div className="surprise-app-wrapper intro-container">
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.9)', 
          padding: '40px 30px', 
          borderRadius: '24px', 
          border: '1px solid rgba(192, 132, 252, 0.35)', 
          maxWidth: '420px', 
          width: '100%',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(168, 85, 247, 0.2)'
        }}>
          <div style={{ fontSize: '3.2rem', marginBottom: '10px' }}>🔒🎁</div>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '1.6rem', color: '#f8fafc' }}>Unlock Secret Surprise</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginBottom: '22px', lineHeight: '1.5' }}>
            Enter the secret passcode curated for <strong style={{ color: '#e879f9' }}>{targetPersonName}</strong>.
          </p>
          <form onSubmit={handleUnlock}>
            <input 
              type="password" 
              placeholder="Enter Secret Passcode" 
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (authError) setAuthError('');
              }}
              style={{ 
                width: '100%', 
                padding: '14px', 
                borderRadius: '12px', 
                border: '1px solid rgba(192, 132, 252, 0.4)', 
                background: '#090d16', 
                color: '#fff', 
                textAlign: 'center', 
                fontSize: '1.05rem',
                marginBottom: '15px', 
                outline: 'none' 
              }}
              required
              autoFocus
            />
            {authError && (
              <p style={{ color: '#f87171', fontSize: '0.88rem', marginBottom: '12px', fontWeight: '600' }}>
                {authError}
              </p>
            )}
            <button 
              type="submit" 
              style={{ 
                width: '100%', 
                padding: '14px', 
                borderRadius: '12px', 
                border: 'none', 
                background: 'linear-gradient(135deg, #a855f7, #ec4899)', 
                color: '#fff', 
                fontWeight: 'bold', 
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)'
              }}
            >
              Reveal Surprise ✨
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2️⃣ Fading Text Intro Teaser Screen
  if (stage === 'teaser') {
    return (
      <div className="surprise-app-wrapper intro-container">
        <h1 key={teaserIndex} className="glow-teaser-text">
          {TEASER_STEPS[teaserIndex]}
        </h1>
      </div>
    );
  }

  // 3️⃣ ⏳ 1, 2, 3 COUNTDOWN SCREEN
  if (stage === 'countdown') {
    return (
      <div className="surprise-app-wrapper countdown-screen">
        <div className="countdown-box">
          <div className="countdown-badge">
            <span>✨ Get Ready For Next Surprise ✨</span>
          </div>

          <div key={countdownNum} className="countdown-number">
            {countdownNum}
          </div>

          <p className="countdown-subtext">
            Unveiling your photo memories in {countdownNum}...
          </p>
        </div>
      </div>
    );
  }

  // 4️⃣ 🖼️ ANIMATED CINEMATIC PHOTO GALLERY (DIFFERENT FRAMES)
  if (stage === 'photo_gallery') {
    const photoItems = getPhotoContributions();
    const activePhoto = activePhotoIndex !== null ? photoItems[activePhotoIndex] : null;

    return (
      <div className="surprise-app-wrapper gallery-realm">
        <div className="gallery-header-section">
          <div className="gallery-badge">
            <span>📸</span>
            <span>Cherished Photo Gallery</span>
          </div>

          <h1 className="gallery-main-title">
            Special Memories of {targetPersonName} ✨
          </h1>

          <p className="gallery-main-subtitle">
            Every precious snapshot framed with love and celebration. Tap any photo to view in cinematic mode!
          </p>

          <div className="gallery-nav-bar">
            <button 
              className="view-all-btn"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              style={{ background: isAutoPlaying ? 'linear-gradient(135deg, #ec4899, #f59e0b)' : 'rgba(168, 85, 247, 0.2)' }}
            >
              <span>{isAutoPlaying ? '⏸️ Pause Slideshow' : '▶️ Autoplay Slideshow'}</span>
            </button>

            <button 
              className="view-all-btn"
              onClick={() => setShowAllRevealedModal(true)}
            >
              <span>📜 View All Text Wishes ({revealedIds.size})</span>
            </button>

            <button 
              className="view-all-btn"
              onClick={() => {
                setRevealedIds(new Set());
                setStage('sky');
                setTimeout(() => initializeBalloons(), 100);
              }}
            >
              <span>🎈 Pop Balloons Again</span>
            </button>
          </div>
        </div>

        {/* 🎨 PHOTO FRAMES GRID */}
        <div className="photo-frames-grid">
          {photoItems.map((item, index) => {
            const frameClass = FRAME_STYLES[index % FRAME_STYLES.length];
            const rawUrl = item.media_url ? getMediaUrl(item.media_url) : '';

            return (
              <div 
                key={item.id}
                className={`photo-frame-item ${frameClass}`}
                onClick={() => {
                  setActivePhotoIndex(index);
                  setIsAutoPlaying(false);
                }}
              >
                <div className="photo-img-wrapper">
                  <img 
                    src={rawUrl} 
                    alt={item.caption || "Surprise Photo"} 
                    className="photo-actual-img"
                    loading="lazy"
                  />
                </div>

                <div className="photo-caption-text">
                  "{item.caption || 'Cherished Memory'}"
                </div>

                <div className="photo-author-tag">
                  — From {getUserName(item)} 💕
                </div>
              </div>
            );
          })}
        </div>

        {/* 🎬 CINEMATIC FULLSCREEN LIGHTBOX THEATER */}
        {activePhoto && (
          <div 
            className="lightbox-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActivePhotoIndex(null);
            }}
          >
            <button 
              className="modal-close-btn"
              style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 210 }}
              onClick={() => setActivePhotoIndex(null)}
            >
              ✕
            </button>

            <button 
              className="lightbox-nav-btn prev"
              onClick={(e) => {
                e.stopPropagation();
                setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photoItems.length - 1));
              }}
              aria-label="Previous"
            >
              ❮
            </button>

            <div className="lightbox-content">
              <div className="lightbox-img-box">
                <img 
                  src={getMediaUrl(activePhoto.media_url)} 
                  alt={activePhoto.caption || "Fullscreen memory"} 
                />
              </div>

              <div className="lightbox-info">
                <p className="lightbox-caption">
                  "{activePhoto.caption || 'Special Memory'}"
                </p>
                <span className="lightbox-author">
                  Sent with love by <strong style={{ color: '#f472b6' }}>{getUserName(activePhoto)}</strong> 💖
                </span>
              </div>
            </div>

            <button 
              className="lightbox-nav-btn next"
              onClick={(e) => {
                e.stopPropagation();
                setActivePhotoIndex((prev) => (prev + 1) % photoItems.length);
              }}
              aria-label="Next"
            >
              ❯
            </button>
          </div>
        )}

        {/* 📜 View All Unlocked Messages Modal */}
        {showAllRevealedModal && (
          <div 
            className="message-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAllRevealedModal(false);
            }}
          >
            <div className="message-card all-messages-card">
              <button 
                className="modal-close-btn"
                onClick={() => setShowAllRevealedModal(false)}
                aria-label="Close"
              >
                ✕
              </button>

              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', color: '#f8fafc' }}>
                📜 Unlocked Text Wishes ({revealedIds.size})
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 14px 0' }}>
                All the lovely messages popped for {targetPersonName}!
              </p>

              <div className="all-messages-list">
                {getTextContributions().map((item) => (
                  <div key={item.id} className="message-item-card">
                    <div className="message-item-header">
                      <span style={{ fontWeight: '700', color: '#c084fc', fontSize: '0.9rem' }}>
                        From: {getUserName(item)} 💕
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' }}>
                        Text Wish
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#f1f5f9', fontSize: '0.95rem', lineHeight: '1.5', fontStyle: 'italic' }}>
                      "{item.content}"
                    </p>
                  </div>
                ))}
              </div>

              <button 
                className="pop-next-btn"
                style={{ marginTop: '10px' }}
                onClick={() => setShowAllRevealedModal(false)}
              >
                <span>Close</span>
                <span>✨</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 5️⃣ Floating Balloon Sky Screen (Only 'text' type contributions)
  const allTextItems = getTextContributions();
  const revealedCount = revealedIds.size;
  const totalCount = allTextItems.length;
  const isAllRevealed = totalCount > 0 && revealedCount >= totalCount;

  return (
    <div className="surprise-app-wrapper sky-realm">
      
      {/* Top Header & Interactive Stats Bar */}
      <div className="sky-header">
        <h1 className="sky-title">
          🎈 Pop the Surprise Balloons for {targetPersonName}!
        </h1>
        <p className="sky-subtitle">
          Click or tap floating balloons to reveal secret text wishes! Each balloon has a unique message.
        </p>

        {totalCount > 0 && (
          <div className="sky-stats-bar">
            <div className="progress-pill">
              <span>✨</span>
              <span>Messages Unlocked: {revealedCount} / {totalCount}</span>
            </div>

            {isAllRevealed ? (
              <button 
                className="view-all-btn"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)', color: '#fff', border: 'none' }}
                onClick={() => setStage('countdown')}
              >
                🚀 Start Next Surprise ✨
              </button>
            ) : revealedCount > 0 ? (
              <button 
                className="view-all-btn"
                onClick={() => setShowAllRevealedModal(true)}
              >
                📜 View Revealed ({revealedCount})
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Floating Interactive Balloons (Only unrevealed text items) */}
      {balloons.length > 0 ? (
        balloons.map((b) => (
          <div
            key={b.id}
            className={`interactive-balloon ${b.swayClass} ${b.isPopping ? 'is-popping' : ''}`}
            style={{
              left: `${b.left}%`,
              background: b.bg,
              animationDuration: `${b.speed}s`,
              animationDelay: b.animDelay
            }}
            onClick={(e) => handleBalloonBurst(b, e)}
            onPointerDown={(e) => handleBalloonBurst(b, e)}
          >
            {b.isPopping && <div className="pop-shockwave" />}
            <span className="balloon-icon">🎈</span>
            <span className="balloon-username">{getUserName(b.contribution)}</span>
            <div className="balloon-knot" />
          </div>
        ))
      ) : (
        <div className="intro-container" style={{ minHeight: '80vh' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '30px 40px', borderRadius: '20px', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
            <h3 style={{ color: '#c084fc', marginBottom: '10px' }}>
              {isAllRevealed ? '🎉 All Text Wishes Popped!' : '💌 No Text Messages Found'}
            </h3>
            <p style={{ color: '#94a3b8', margin: '0 0 15px 0' }}>
              {isAllRevealed 
                ? 'You have popped every text balloon! Ready for the photo memories?'
                : 'There are currently no text wishes uploaded in this room yet.'}
            </p>
            {isAllRevealed && (
              <button 
                className="pop-next-btn"
                onClick={() => setStage('countdown')}
              >
                <span>Proceed to Photo Surprise 📸</span>
                <span>➔</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 💌 Revealed Text Message Modal */}
      {selectedContribution && (
        <div 
          className="message-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseMessageModal();
          }}
        >
          <div className="message-card">
            <button 
              className="modal-close-btn"
              onClick={handleCloseMessageModal}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="message-badge">
              <span>💌</span>
              <span>Heartfelt Text Message</span>
            </div>

            <div className="message-content-box">
              <p className="message-text">
                "{selectedContribution.content}"
              </p>
            </div>

            <div className="sender-tag">
              <span>— With Love,</span>
              <span style={{ color: '#f472b6' }}>{getUserName(selectedContribution)}</span>
              <span>💖</span>
            </div>

            <button 
              className={`pop-next-btn ${isAllRevealed ? 'all-unlocked-btn' : ''}`}
              onClick={handleCloseMessageModal}
            >
              {isAllRevealed ? (
                <>
                  <span>Unlock Next Photo Surprise!</span>
                  <span>🚀📸</span>
                </>
              ) : (
                <>
                  <span>Pop Next Balloon</span>
                  <span>🚀</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 📜 View All Unlocked Messages Modal */}
      {showAllRevealedModal && (
        <div 
          className="message-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAllRevealedModal(false);
          }}
        >
          <div className="message-card all-messages-card">
            <button 
              className="modal-close-btn"
              onClick={() => setShowAllRevealedModal(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', color: '#f8fafc' }}>
              📜 Unlocked Messages ({revealedCount})
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 14px 0' }}>
              All the lovely text wishes you've popped so far!
            </p>

            <div className="all-messages-list">
              {allTextItems
                .filter((item) => revealedIds.has(item.id))
                .map((item) => (
                  <div key={item.id} className="message-item-card">
                    <div className="message-item-header">
                      <span style={{ fontWeight: '700', color: '#c084fc', fontSize: '0.9rem' }}>
                        From: {getUserName(item)} 💕
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' }}>
                        Text Wish
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#f1f5f9', fontSize: '0.95rem', lineHeight: '1.5', fontStyle: 'italic' }}>
                      "{item.content}"
                    </p>
                  </div>
                ))}
            </div>

            <button 
              className="pop-next-btn"
              style={{ marginTop: '10px' }}
              onClick={() => setShowAllRevealedModal(false)}
            >
              <span>Back to Balloon Sky</span>
              <span>🎈</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}