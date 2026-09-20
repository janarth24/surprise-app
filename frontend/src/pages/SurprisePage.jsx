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
  'linear-gradient(135deg, #f59e0b, #ef4444)'
];

const FRAME_CLASSES = [
  'frame-polaroid',
  'frame-neon',
  'frame-royal-gold',
  'frame-filmstrip',
  'frame-rose-gold',
  'frame-hologram'
];

const SCREEN_LANES = [
  { min: 4, max: 16, sway: 'sway-left' },
  { min: 19, max: 32, sway: 'sway-right' },
  { min: 35, max: 48, sway: 'sway-center' },
  { min: 51, max: 64, sway: 'sway-left' },
  { min: 67, max: 80, sway: 'sway-right' },
  { min: 83, max: 92, sway: 'sway-center' }
];

const INITIAL_DELAYS = [-2, -7, -12, -4, -9, -14];

const DEMO_PHOTOS = [
  { id: 'demo-p1', type: 'photo', media_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop', caption: 'Magical Celebration Moments ✨', sender_name: 'Best Friends' },
  { id: 'demo-p2', type: 'photo', media_url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&auto=format&fit=crop', caption: 'Unforgettable Smiles & Laughs 🎈', sender_name: 'Loved Ones' },
  { id: 'demo-p3', type: 'photo', media_url: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&auto=format&fit=crop', caption: 'Sweet Memories Together 🎂', sender_name: 'Family' },
  { id: 'demo-p4', type: 'photo', media_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop', caption: 'Shining Bright Today & Always 🌟', sender_name: 'Secret Admirer' }
];

const TEDDY_IDLE = "/gifs/teddy_idle.gif"; 
const TEDDY_TALKING = "/gifs/teddy_talking.gif";

const playCinematicThump = (freq = 120) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);

    gain.gain.setValueAtTime(1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  } catch (e) {
    console.warn("Audio error:", e);
  }
};

const playPopSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;
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
  } catch (e) {
    console.warn("Audio pop notice:", e);
  }
};

export default function SurprisePage() {
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [roomData, setRoomData] = useState(null);
  
  const [stage, setStage] = useState('lock');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [teaserIndex, setTeaserIndex] = useState(0);
  const [countdownNum, setCountdownNum] = useState(3);

  const [balloons, setBalloons] = useState([]);
  const [selectedContribution, setSelectedContribution] = useState(null);
  const [revealedIds, setRevealedIds] = useState(new Set());

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [activeLightbox, setActiveLightbox] = useState(false);
  const [showWishesModal, setShowWishesModal] = useState(false);

  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const [giftsList, setGiftsList] = useState([]);
  const [selectedGiftIndex, setSelectedGiftIndex] = useState(null);
  const [giftViewState, setGiftViewState] = useState('grid');
  const [openedGifts, setOpenedGifts] = useState(new Set());

  // ✉️ Letters State
  const [lettersList, setLettersList] = useState([]);
  const [currentLetterIdx, setCurrentLetterIdx] = useState(0);
  const [isLetterOpened, setIsLetterOpened] = useState(false);
  const [displayedLetterText, setDisplayedLetterText] = useState('');

  const balloonCountRef = useRef(0);

  // Helper to resolve Sender Name across schema variations
  const getUserName = useCallback((c) => {
    if (!c) return 'Special Friend';
    return c.sender_name || c.user?.name || c.user?.username || c.sender || 'Special Friend';
  }, []);

  useEffect(() => {
    const fetchSurprise = async () => {
      try {
        const res = await API.get(`/rooms/public/surprise/${slug}`);
        if (res.data?.status === 'success') {
          const data = res.data.data;
          setRoomData(data);

          const rawItems = data.contributions || [];

          // 1. Gift Boxes Filter
          const videoItems = rawItems.filter(c => c.type === 'video' || (c.media_url && c.media_url.match(/\.(mp4|webm|mov)$/i)));
          const giftBoxes = (videoItems.length > 0 ? videoItems : rawItems).map((item, idx) => ({
            id: item.id || `gift-${idx}`,
            title: `Gift Box #${idx + 1}`,
            sender: getUserName(item),
            textMessage: item.content || item.caption || "Sending lots of love and best wishes on your special day! ✨",
            videoUrl: item.type === 'video' || item.media_url?.match(/\.(mp4|webm|mov)$/i) ? item.media_url : null,
            icon: ['🎁', '🎉', '🎀', '🎈', '⭐', '🎂'][idx % 6]
          }));
          setGiftsList(giftBoxes);

          // 2. Strict Letters Filter (Only items explicitly created as letters)
          const strictLetters = rawItems.filter(c => c.type === 'letter' || c.is_letter === true);

          if (strictLetters.length > 0) {
            setLettersList(strictLetters);
          } else {
            // Fallback: If no explicit letters, fallback to room text or default letter
            const fallbackContent = data.letter_text || "Dearest Friend,\n\nMay your special day be filled with endless joy, laughter, and magical moments! Wishing you all the happiness in the world today and always. Happy Birthday! ❤️";
            setLettersList([{
              id: 'fallback-letter',
              type: 'letter',
              content: fallbackContent,
              sender_name: 'Well Wisher'
            }]);
          }
        }
      } catch (err) {
        console.error("Error fetching room:", err);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchSurprise();
  }, [slug, getUserName]);

  // Typewriter effect triggered when letter opens or switches
  useEffect(() => {
    if (stage === 'letter' && isLetterOpened && lettersList.length > 0) {
      const activeLetter = lettersList[currentLetterIdx];
      const fullText = activeLetter?.content || activeLetter?.text || activeLetter?.caption || '';
      
      let index = 0;
      setDisplayedLetterText('');
      
      const timer = setInterval(() => {
        if (index < fullText.length) {
          setDisplayedLetterText((prev) => prev + fullText.charAt(index));
          index++;
        } else {
          clearInterval(timer);
        }
      }, 35);

      return () => clearInterval(timer);
    }
  }, [stage, isLetterOpened, currentLetterIdx, lettersList]);

  const getTextContributions = useCallback(() => {
    return (roomData?.contributions || []).filter(
      c => c.type === 'text' && c.content && String(c.content).trim() !== ''
    );
  }, [roomData]);

  const getPhotoContributions = useCallback(() => {
    const photos = (roomData?.contributions || []).filter(
      c => (c.type === 'photo' || c.type === 'image' || (!c.type && c.media_url)) && c.media_url && !c.media_url.match(/\.(mp4|webm|mov|mp3|wav|m4a)$/i)
    );
    return photos.length > 0 ? photos : DEMO_PHOTOS;
  }, [roomData]);

  const getAudioContributions = useCallback(() => {
    return (roomData?.contributions || []).filter(
      c => c.type === 'audio' || (c.media_url && (c.media_url.endsWith('.mp3') || c.media_url.endsWith('.wav') || c.media_url.endsWith('.m4a')))
    );
  }, [roomData]);

  const createBalloonObj = useCallback((contribution, laneIndex = null, initialDelay = null) => {
    balloonCountRef.current += 1;
    const activeLaneIndex = laneIndex !== null ? laneIndex : Math.floor(Math.random() * SCREEN_LANES.length);
    const lane = SCREEN_LANES[activeLaneIndex];
    const randomLeft = Math.floor(Math.random() * (lane.max - lane.min)) + lane.min;
    const randomSpeed = (Math.random() * 5 + 12).toFixed(1);
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

  const initializeBalloons = useCallback(() => {
    setStage('sky');
    const contributions = getTextContributions();
    if (contributions.length === 0) {
      setBalloons([]);
      return;
    }

    const unrevealedItems = contributions.filter(c => !revealedIds.has(c.id));
    if (unrevealedItems.length === 0) {
      setBalloons([]);
      return;
    }

    const initialBalloons = unrevealedItems.slice(0, SCREEN_LANES.length).map((item, index) => {
      const delay = INITIAL_DELAYS[index % INITIAL_DELAYS.length];
      return createBalloonObj(item, index, delay);
    });

    setBalloons(initialBalloons);
  }, [getTextContributions, revealedIds, createBalloonObj]);

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

  useEffect(() => {
    if (stage === 'countdown') {
      playCinematicThump(110);

      const t1 = setTimeout(() => {
        setCountdownNum(2);
        playCinematicThump(150);
      }, 1000);

      const t2 = setTimeout(() => {
        setCountdownNum(1);
        playCinematicThump(200);
      }, 2000);

      const t3 = setTimeout(() => {
        confetti({
          particleCount: 160,
          spread: 120,
          origin: { x: 0.5, y: 0.5 },
          colors: ['#ec4899', '#a855f7', '#f59e0b', '#06b6d4', '#ffffff']
        });
        setStage('photo_gallery');
      }, 3000);

      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [stage]);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (!roomData?.gift_password || passwordInput.trim() === String(roomData.gift_password).trim()) {
      setStage('teaser');
    } else {
      setAuthError('❌ Incorrect Secret Password!');
    }
  };

  const handleBalloonBurst = (balloon, event) => {
    if (balloon.isPopping) return;
    if (event) { event.preventDefault(); event.stopPropagation(); }

    playPopSound();

    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;
    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      clientX = rect.left + rect.width / 2;
      clientY = rect.top + rect.height / 2;
    }

    confetti({
      particleCount: 65,
      spread: 75,
      origin: { x: clientX / window.innerWidth, y: clientY / window.innerHeight }
    });

    setBalloons((prev) => prev.map((b) => (b.id === balloon.id ? { ...b, isPopping: true } : b)));

    setTimeout(() => {
      setSelectedContribution(balloon.contribution);
      const newRevealed = new Set([...revealedIds, balloon.contribution.id]);
      setRevealedIds(newRevealed);

      setBalloons((prev) => {
        const remaining = prev.filter((b) => b.id !== balloon.id);
        const allItems = getTextContributions();
        const activeIds = new Set(remaining.map(b => b.contribution.id));
        const availableUnrevealed = allItems.filter(
          item => !newRevealed.has(item.id) && !activeIds.has(item.id)
        );

        if (availableUnrevealed.length > 0) {
          const nextItem = availableUnrevealed[0];
          return [...remaining, createBalloonObj(nextItem, balloon.laneIndex, 0)];
        }
        return remaining;
      });
    }, 220);
  };

  const handleCloseMessageModal = () => {
    setSelectedContribution(null);
    const allItems = getTextContributions();
    if (allItems.length > 0 && revealedIds.size >= allItems.length) {
      setStage('countdown');
    }
  };

  const nextPhoto = () => {
    const photos = getPhotoContributions();
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    const photos = getPhotoContributions();
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => {
    setIsPlaying(false);
    const audios = getAudioContributions();
    if (currentAudioIndex < audios.length - 1) {
      setCurrentAudioIndex(prev => prev + 1);
    }
  };

  const handleOpenGiftBox = (index) => {
    playPopSound();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    setOpenedGifts(prev => new Set([...prev, index]));
    setSelectedGiftIndex(index);
    setGiftViewState('video_player');
  };

  const handleNextGift = () => {
    if (selectedGiftIndex !== null && selectedGiftIndex < giftsList.length - 1) {
      const nextIdx = selectedGiftIndex + 1;
      setSelectedGiftIndex(nextIdx);
      setOpenedGifts(prev => new Set([...prev, nextIdx]));
      setGiftViewState('video_player');
    } else {
      setStage('letter');
    }
  };

  const handleOpenLetter = () => {
    playPopSound();
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.5 }
    });
    setIsLetterOpened(true);
  };

  const handleNextLetter = () => {
    playPopSound();
    if (currentLetterIdx < lettersList.length - 1) {
      setCurrentLetterIdx(prev => prev + 1);
    } else {
      setStage('celebration');
    }
  };

  if (loading) {
    return <div className="intro-container"><h2 style={{ color: '#c084fc' }}>🎁 Fetching Surprise...</h2></div>;
  }

  // 1️⃣ Lock Stage
  if (stage === 'lock') {
    return (
      <div className="surprise-app-wrapper intro-container">
        <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '40px 30px', borderRadius: '24px', border: '1px solid rgba(192, 132, 252, 0.35)', maxWidth: '420px', width: '100%' }}>
          <div style={{ fontSize: '3.2rem', marginBottom: '10px' }}>🔒🎁</div>
          <h2>Unlock Secret Passcode</h2>
          <form onSubmit={handleUnlock}>
            <input 
              type="password" 
              placeholder="Enter Password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #334155', background: '#090d16', color: '#fff', textAlign: 'center', marginBottom: '15px' }}
              required
            />
            {authError && <p style={{ color: '#ef4444' }}>{authError}</p>}
            <button type="submit" className="queue-btn" style={{ width: '100%' }}>Reveal Surprise ✨</button>
          </form>
        </div>
      </div>
    );
  }

  // 2️⃣ Teaser Stage
  if (stage === 'teaser') {
    return (
      <div className="surprise-app-wrapper intro-container">
        <h1 key={teaserIndex} className="glow-teaser-text">{TEASER_STEPS[teaserIndex]}</h1>
      </div>
    );
  }

  // 3️⃣ Floating Balloons Sky Realm
  if (stage === 'sky') {
    return (
      <div className="surprise-app-wrapper sky-realm">
        <div className="sky-header">
          <h1 className="sky-title">🎈 Pop balloons to reveal text wishes!</h1>
        </div>

        {balloons.length > 0 ? (
          balloons.map((b) => (
            <div
              key={b.id}
              className={`interactive-balloon ${b.swayClass} ${b.isPopping ? 'is-popping' : ''}`}
              style={{ left: `${b.left}%`, background: b.bg, animationDuration: `${b.speed}s` }}
              onClick={(e) => handleBalloonBurst(b, e)}
            >
              <span style={{ fontSize: '2.2rem', pointerEvents: 'none' }}>🎈</span>
              <span className="balloon-username">{getUserName(b.contribution)}</span>
            </div>
          ))
        ) : (
          <div className="intro-container">
            <h3>🎉 All Balloons Popped!</h3>
            <button className="queue-btn" onClick={() => setStage('countdown')}>Proceed to Photos 📸</button>
          </div>
        )}

        {selectedContribution && (
          <div className="message-modal-overlay">
            <div className="message-card">
              <p>"{selectedContribution.content}"</p>
              <p className="sender-tag">— {getUserName(selectedContribution)}</p>
              <button className="queue-btn" onClick={handleCloseMessageModal}>Pop Next 🚀</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4️⃣ Countdown
  if (stage === 'countdown') {
    return (
      <div className="surprise-app-wrapper cinematic-countdown-wrapper">
        <div className="cinematic-ring"></div>
        <div className="cinematic-ring outer"></div>
        <p className="cinematic-subtext">Get Ready For Memories</p>
        
        <div className="cinematic-number-box">
          <span key={countdownNum} className="cinematic-number">
            {countdownNum}
          </span>
        </div>
      </div>
    );
  }

  // 5️⃣ Photo Gallery Stage
  if (stage === 'photo_gallery') {
    const photos = getPhotoContributions();
    const currentPhoto = photos[currentPhotoIndex] || photos[0];
    const frameStyle = FRAME_CLASSES[currentPhotoIndex % FRAME_CLASSES.length];
    const rawUrl = currentPhoto?.media_url ? getMediaUrl(currentPhoto.media_url) : '';

    return (
      <div className="surprise-app-wrapper slideshow-realm">
        <div className="gallery-header-section" style={{ marginBottom: '10px' }}>
          <span className="gallery-badge">📸 Memory Gallery</span>
          <h1 className="gallery-main-title">Unforgettable Moments ✨</h1>
          <span className="photo-counter-badge">
            Memory {currentPhotoIndex + 1} of {photos.length}
          </span>
        </div>

        <div className="slideshow-stage">
          <button className="nav-arrow-btn" onClick={prevPhoto} aria-label="Previous Photo">❮</button>

          <div className="slideshow-card-container">
            <div 
              key={currentPhoto.id || currentPhotoIndex}
              className={`single-photo-card ${frameStyle}`}
              onClick={() => setActiveLightbox(true)}
            >
              <div className="photo-img-wrapper">
                <img 
                  className="slideshow-photo-img" 
                  src={rawUrl} 
                  alt={currentPhoto.caption || "Memory"} 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEMO_PHOTOS[0].media_url;
                  }}
                />
              </div>
              <div className="photo-caption-text">{currentPhoto.caption || "Sweet Memory Together"}</div>
              <div className="photo-author-tag">— {getUserName(currentPhoto)}</div>
            </div>
          </div>

          <button className="nav-arrow-btn" onClick={nextPhoto} aria-label="Next Photo">❯</button>
        </div>

        <div>
          <div className="slideshow-dots-bar">
            {photos.map((_, idx) => (
              <div 
                key={idx} 
                className={`slide-dot ${idx === currentPhotoIndex ? 'active' : ''}`}
                onClick={() => setCurrentPhotoIndex(idx)}
              />
            ))}
          </div>

          <div className="gallery-nav-bar" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="queue-btn" style={{ background: 'rgba(255,255,255,0.12)' }} onClick={() => setShowWishesModal(true)}>
              📜 Read All Wishes
            </button>
            <button className="queue-btn" onClick={() => setStage('audio_gallery')}>
              Next: Audio Messages 🎙️
            </button>
          </div>
        </div>

        {activeLightbox && (
          <div className="lightbox-overlay" onClick={() => setActiveLightbox(false)}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <div className="lightbox-img-box">
                <img 
                  src={rawUrl} 
                  alt="Enlarged Memory" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEMO_PHOTOS[0].media_url;
                  }}
                />
              </div>
              <div className="lightbox-info">
                <p className="lightbox-caption">"{currentPhoto.caption || 'Sweet Memory'}"</p>
                <span className="lightbox-author">— {getUserName(currentPhoto)}</span>
              </div>

              <button className="lightbox-nav-btn prev" onClick={prevPhoto}>❮</button>
              <button className="lightbox-nav-btn next" onClick={nextPhoto}>❯</button>
            </div>
          </div>
        )}

        {showWishesModal && (
          <div className="message-modal-overlay" onClick={() => setShowWishesModal(false)}>
            <div className="message-card" onClick={(e) => e.stopPropagation()}>
              <h3>📜 Birthday Wishes</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '15px 0' }}>
                {getTextContributions().map((item) => (
                  <p key={item.id} style={{ fontStyle: 'italic', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                    "{item.content}" — <strong>{getUserName(item)}</strong>
                  </p>
                ))}
              </div>
              <button className="queue-btn" onClick={() => setShowWishesModal(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 6️⃣ Audio Stage
  if (stage === 'audio_gallery') {
    const audioList = getAudioContributions();
    const currentAudio = audioList[currentAudioIndex];
    const audioUrl = currentAudio?.media_url ? getMediaUrl(currentAudio.media_url) : '';

    return (
      <div className="surprise-app-wrapper audio-realm">
        <div className="gallery-header-section">
          <span className="gallery-badge">🎙️ Voice Messages</span>
          <h1 className="gallery-main-title">Teddy Has Something To Say! ✨</h1>
        </div>

        <div className="teddy-container">
          <img 
            src={isPlaying ? TEDDY_TALKING : TEDDY_IDLE} 
            alt="Teddy Speaking" 
            className={`teddy-avatar ${isPlaying ? 'is-speaking' : ''}`}
            style={{
              width: '220px',
              height: '220px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 10px 20px rgba(168, 85, 247, 0.3))',
              transform: isPlaying ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.3s ease'
            }}
          />
        </div>

        <div className="audio-controls-card">
          <p className="audio-speaker-tag">
            🗣️ Message from: <strong>{getUserName(currentAudio)}</strong>
          </p>

          {audioUrl ? (
            <audio 
              key={currentAudioIndex}
              ref={audioRef}
              src={audioUrl} 
              controls 
              autoPlay
              className="custom-audio-player"
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
            />
          ) : (
            <p style={{ color: '#94a3b8', margin: '15px 0' }}>No audio files uploaded yet!</p>
          )}

          {audioList.length > 0 && (
            <div className="slideshow-dots-bar" style={{ marginTop: '15px' }}>
              {audioList.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`slide-dot ${idx === currentAudioIndex ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentAudioIndex(idx);
                    setIsPlaying(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <button className="queue-btn" onClick={() => setStage('gifts_grid')}>
          Open Secret Gift Boxes 🎁✨
        </button>
      </div>
    );
  }

  // 7️⃣ Gift Boxes Grid Stage
  if (stage === 'gifts_grid') {
    const activeGift = selectedGiftIndex !== null ? giftsList[selectedGiftIndex] : null;

    return (
      <div className="surprise-app-wrapper sky-realm" style={{ padding: '20px' }}>
        {giftViewState === 'grid' && (
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="gallery-main-title" style={{ marginBottom: '10px' }}>
              🎁 Tap a Gift Box to Watch Video Surprise! ✨
            </h1>
            <p style={{ color: '#cbd5e1', marginBottom: '30px' }}>
              Click any gift box to directly play its video message!
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '20px',
              justifyContent: 'center'
            }}>
              {giftsList.map((gift, index) => {
                const isOpened = openedGifts.has(index);

                return (
                  <div
                    key={gift.id}
                    onClick={() => handleOpenGiftBox(index)}
                    style={{
                      background: isOpened ? 'rgba(30, 41, 59, 0.8)' : 'rgba(15, 23, 42, 0.9)',
                      border: isOpened ? '2px solid #a855f7' : '2px solid rgba(236, 72, 153, 0.5)',
                      borderRadius: '20px',
                      padding: '25px 15px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: isOpened ? '0 0 15px rgba(168, 85, 247, 0.4)' : '0 8px 20px rgba(0,0,0,0.4)',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{
                      fontSize: '4rem',
                      animation: isOpened ? 'none' : 'bounce 1.5s infinite alternate'
                    }}>
                      {isOpened ? '🔓' : gift.icon}
                    </div>

                    <h3 style={{ color: '#fff', marginTop: '10px', fontSize: '1.1rem' }}>
                      {gift.title}
                    </h3>

                    <p style={{ color: '#a855f7', fontSize: '0.85rem', marginTop: '4px' }}>
                      From: {gift.sender}
                    </p>

                    <span style={{
                      display: 'inline-block',
                      marginTop: '12px',
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: isOpened ? '#334155' : '#ec4899',
                      color: '#fff'
                    }}>
                      {isOpened ? 'Watched 🎬' : 'Watch Video 🎬'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button 
              className="queue-btn" 
              style={{ marginTop: '35px' }} 
              onClick={() => setStage('letter')}
            >
              Open Special Gift Letters 💌
            </button>
          </div>
        )}

        {giftViewState === 'video_player' && activeGift && (
          <div className="surprise-app-wrapper intro-container">
            <div style={{ width: '100%', maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
              <span className="gallery-badge">🎬 {activeGift.title} Video Surprise</span>
              
              <h2 style={{ margin: '10px 0', color: '#fff' }}>
                Special Wish from {activeGift.sender}
              </h2>

              {activeGift.videoUrl ? (
                <video
                  key={activeGift.id}
                  src={getMediaUrl(activeGift.videoUrl)}
                  controls
                  autoPlay
                  onEnded={handleNextGift}
                  style={{
                    width: '100%',
                    maxHeight: '380px',
                    borderRadius: '20px',
                    boxShadow: '0 12px 35px rgba(168, 85, 247, 0.5)',
                    border: '2px solid #ec4899',
                    margin: '15px 0'
                  }}
                />
              ) : (
                <div style={{ padding: '40px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '20px', margin: '15px 0' }}>
                  <p style={{ color: '#cbd5e1' }}>🎥 No Video Attached for this Gift Box!</p>
                  <p style={{ fontStyle: 'italic', color: '#a855f7', marginTop: '10px' }}>
                    "{activeGift.textMessage}"
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '15px' }}>
                <button 
                  className="queue-btn" 
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                  onClick={() => setGiftViewState('grid')}
                >
                  🏠 All Gift Boxes
                </button>

                <button className="queue-btn" onClick={handleNextGift}>
                  {selectedGiftIndex < giftsList.length - 1 ? 'Next Gift Video 🎬 ❯' : 'Open Special Letters 💌 ❯'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 8️⃣ 💌 STRICT LETTER SHOWCASE (TYPEWRITER + ACCURATE USER NAME AT BOTTOM)
  if (stage === 'letter') {
    const activeLetter = lettersList[currentLetterIdx] || lettersList[0];
    const letterSender = getUserName(activeLetter);

    return (
      <div className="surprise-app-wrapper intro-container" style={{ padding: '20px' }}>
        {!isLetterOpened ? (
          /* CLOSED ENVELOPE STAGE */
          <div style={{ textAlign: 'center' }}>
            <h1 className="gallery-main-title" style={{ marginBottom: '15px' }}>
              💌 Special Birthday Letters
            </h1>
            <p style={{ color: '#cbd5e1', marginBottom: '35px' }}>
              Tap the envelope to open and read secret letters ✨
            </p>

            <div 
              onClick={handleOpenLetter}
              style={{
                width: '280px',
                height: '200px',
                margin: '0 auto',
                background: 'linear-gradient(135deg, #f43f5e, #ec4899)',
                borderRadius: '20px',
                border: '3px solid #fbcfe8',
                boxShadow: '0 15px 35px rgba(236, 72, 153, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ fontSize: '5rem', filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.2))' }}>
                💌
              </div>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '5px' }}>
                Tap to Open ({lettersList.length} Letters)
              </span>
            </div>
          </div>
        ) : (
          /* OPENED LETTER STAGE */
          <div style={{ maxWidth: '580px', width: '100%', margin: '0 auto', textAlign: 'center' }}>
            
            <div style={{ marginBottom: '15px' }}>
              <span className="photo-counter-badge">
                Letter {currentLetterIdx + 1} of {lettersList.length}
              </span>
            </div>

            <div style={{
              background: '#fef3c7',
              color: '#451a03',
              padding: '35px 25px 20px 25px',
              borderRadius: '20px',
              border: '2px solid #f59e0b',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              textAlign: 'left',
              minHeight: '280px',
              fontFamily: '"Georgia", serif',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '15px' }}>📜✨</div>
                
                {/* Typewriter Effect Content */}
                <div style={{ 
                  fontSize: '1.15rem', 
                  lineHeight: '1.8', 
                  whiteSpace: 'pre-line',
                  borderLeft: '3px solid #f59e0b',
                  paddingLeft: '15px'
                }}>
                  {displayedLetterText}
                  <span style={{ fontWeight: 'bold', color: '#d97706', animation: 'blink 0.8s infinite' }}>|</span>
                </div>
              </div>

              {/* Exact User / Sender Name rendering at Bottom */}
              <div style={{
                textAlign: 'right',
                marginTop: '25px',
                paddingTop: '15px',
                borderTop: '1px dashed #d97706',
                fontStyle: 'italic',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                color: '#78350f'
              }}>
                — From: {letterSender} ❤️
              </div>
            </div>

            {/* Letter Navigation Buttons */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '25px' }}>
              <button 
                className="queue-btn"
                onClick={handleNextLetter}
              >
                {currentLetterIdx < lettersList.length - 1 ? 'Next Letter 💌 ❯' : 'Finish Celebration 🎉'}
              </button>
            </div>

          </div>
        )}
      </div>
    );
  }

  // 9️⃣ Final Celebration Stage
  return (
    <div className="surprise-app-wrapper intro-container">
      <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>🎉 Happy Birthday! 🎉</h1>
      <p style={{ fontSize: '1.2rem', color: '#c084fc', marginBottom: '30px' }}>Hope you enjoyed all the surprises!</p>
      <button className="queue-btn" onClick={() => setStage('sky')}>
        Replay Balloon Messages 🎈
      </button>
    </div>
  );
}