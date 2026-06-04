import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ACCENT = '#8b5cf6';

export default function VideoConsultation() {
  const { appointmentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { apiCall } = useAuth();
  
  const [sessionData] = useState(location.state || {});
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [showEndModal, setShowEndModal] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // In production, initialize WebRTC peer connection here
      // For now, this is a UI mockup
      
    } catch (err) {
      console.error('Error accessing media devices:', err);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  useEffect(() => {
    if (!sessionData.token) {
      alert('Invalid session. Redirecting...');
      navigate('/telemedicine/dashboard');
      return;
    }

    initializeMedia();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionData, navigate]);

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      sender: sessionData.participant_role === 'doctor' ? sessionData.doctor_name : sessionData.patient_name,
      text: chatInput,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };
    
    setChatMessages([...chatMessages, newMessage]);
    setChatInput('');
    
    // In production, send via WebSocket/WebRTC data channel
  };

  const handleEndConsultation = async () => {
    if (sessionData.participant_role !== 'doctor') {
      alert('Only the doctor can end the consultation');
      return;
    }

    try {
      const res = await apiCall(`/telemedicine/end/${appointmentId}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultation_notes: consultationNotes,
          diagnosis: '',
          treatment_plan: ''
        })
      });

      if (res.ok) {
        alert('Consultation ended successfully');
        navigate('/telemedicine/dashboard');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to end consultation');
      }
    } catch {
      alert('Error ending consultation');
    }
  };

  const leaveConsultation = () => {
    if (window.confirm('Are you sure you want to leave this consultation?')) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      navigate('/telemedicine/dashboard');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      
      {/* Header */}
      <div style={{ background: '#1e293b', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
            <i className="fas fa-video me-2" style={{ color: ACCENT }}></i>
            Virtual Consultation
          </h3>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            {sessionData.participant_role === 'doctor' ? `Patient: ${sessionData.patient_name}` : `Doctor: ${sessionData.doctor_name}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ background: '#10b981', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#fff' }}>
            <i className="fas fa-circle" style={{ fontSize: 6, marginRight: 6 }}></i>LIVE
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Room: {sessionData.room_id}</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Video Area */}
        <div style={{ flex: 1, position: 'relative', background: '#000' }}>
          
          {/* Remote Video (Main) */}
          <video 
            ref={remoteVideoRef}
            autoPlay 
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          
          {/* Remote Video Placeholder */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: ACCENT + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fas fa-user" style={{ fontSize: 48, color: ACCENT }}></i>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                {sessionData.participant_role === 'doctor' ? sessionData.patient_name : sessionData.doctor_name}
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Waiting to connect...</div>
            </div>
          </div>

          {/* Local Video (Picture-in-Picture) */}
          <div style={{ position: 'absolute', bottom: 20, right: 20, width: 240, height: 180, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '2px solid #334155' }}>
            <video 
              ref={localVideoRef}
              autoPlay 
              muted 
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            {!isVideoOn && (
              <div style={{ position: 'absolute', inset: 0, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-video-slash" style={{ fontSize: 32, color: '#64748b' }}></i>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#fff' }}>
              You
            </div>
          </div>

          {/* Controls */}
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 12, background: 'rgba(30,41,59,0.9)', padding: '12px 20px', borderRadius: 50, backdropFilter: 'blur(10px)' }}>
            <button onClick={toggleAudio}
              style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: isAudioOn ? '#334155' : '#ef4444', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <i className={`fas fa-${isAudioOn ? 'microphone' : 'microphone-slash'}`} style={{ fontSize: 18 }}></i>
            </button>
            
            <button onClick={toggleVideo}
              style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: isVideoOn ? '#334155' : '#ef4444', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <i className={`fas fa-${isVideoOn ? 'video' : 'video-slash'}`} style={{ fontSize: 18 }}></i>
            </button>

            <button onClick={() => setShowChat(!showChat)}
              style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: showChat ? ACCENT : '#334155', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <i className="fas fa-comment" style={{ fontSize: 18 }}></i>
            </button>

            {sessionData.participant_role === 'doctor' && (
              <button onClick={() => setShowEndModal(true)}
                style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                <i className="fas fa-phone-slash" style={{ fontSize: 18 }}></i>
              </button>
            )}

            <button onClick={leaveConsultation}
              style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: '#64748b', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <i className="fas fa-sign-out-alt" style={{ fontSize: 18 }}></i>
            </button>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div style={{ width: 320, background: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>
                <i className="fas fa-comment me-2" style={{ color: ACCENT }}></i>Chat
              </h4>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginTop: 40 }}>
                  <i className="fas fa-comment-dots" style={{ fontSize: 32, display: 'block', marginBottom: 8 }}></i>
                  No messages yet
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} style={{ marginBottom: 12, textAlign: msg.isMe ? 'right' : 'left' }}>
                    <div style={{ display: 'inline-block', maxWidth: '80%' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{msg.sender}</div>
                      <div style={{ background: msg.isMe ? ACCENT : '#334155', color: '#fff', padding: '8px 12px', borderRadius: 10, fontSize: 13, wordWrap: 'break-word' }}>
                        {msg.text}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{msg.timestamp}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid #334155' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type a message..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 13, outline: 'none' }}
                />
                <button onClick={sendChatMessage}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* End Consultation Modal */}
      {showEndModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: '24px', width: '90%', maxWidth: 500, border: '1px solid #334155' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px', color: '#fff' }}>End Consultation</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Consultation Notes</label>
              <textarea 
                value={consultationNotes}
                onChange={e => setConsultationNotes(e.target.value)}
                placeholder="Enter consultation summary, diagnosis, and treatment plan..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 13, outline: 'none', minHeight: 120, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowEndModal(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #334155', background: 'transparent', color: '#e2e8f0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleEndConsultation}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                End Consultation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
