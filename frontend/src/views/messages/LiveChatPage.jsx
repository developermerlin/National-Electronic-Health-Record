import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

function LiveChatPage() {
  const { apiCall, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null); // { partner, messages }
  const [messageInput, setMessageInput] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [sending, setSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState(null); // { file, type, preview, duration }
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingStartRef = useRef(0);

  const roleColors = {
    admin: '#4361ee', ministry_admin: '#7c3aed', district_admin: '#059669',
    hospital_admin: '#f77f00', receptionist: '#0891b2', doctor: '#e63946', nurse: '#ec4899',
  };

  const initials = (name) => {
    if (!name) return '?';
    const p = name.trim().split(/\s+/);
    return (p[0][0] + (p[1]?.[0] || '')).toUpperCase();
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diffMin = (new Date().getTime() - d.getTime()) / 60000;
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${Math.floor(diffMin)}m`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
    return d.toLocaleDateString();
  };

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const response = await apiCall('/messages/conversations/');
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch { /* silent */ }
    finally {
      setLoadingConvs(false);
    }
  }, [apiCall]);

  // Fetch specific conversation messages
  const fetchConversation = useCallback(async (partnerId) => {
    try {
      const response = await apiCall(`/messages/conversation/${partnerId}/`);
      if (response.ok) {
        const data = await response.json();
        setActiveConv(data);
      }
    } catch { /* silent */ }
  }, [apiCall]);

  // Initial load + polling conversations every 5s
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Poll active conversation every 3s
  useEffect(() => {
    if (!activeConv?.partner?.id) return;
    const interval = setInterval(() => {
      fetchConversation(activeConv.partner.id);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeConv?.partner?.id, fetchConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages?.length]);

  // Search users
  useEffect(() => {
    if (!showNewChat) return;
    const t = setTimeout(async () => {
      try {
        const response = await apiCall(`/messages/recipients/?search=${encodeURIComponent(userSearch)}`);
        if (response.ok) {
          const data = await response.json();
          setUserResults(data);
        }
      } catch { /* silent */ }
    }, 250);
    return () => clearTimeout(t);
  }, [userSearch, showNewChat, apiCall]);

  const selectConversation = (partnerId) => {
    fetchConversation(partnerId);
    setShowNewChat(false);
  };

  const startNewChat = (partner) => {
    setActiveConv({ partner, messages: [] });
    setShowNewChat(false);
    setUserSearch('');
    setUserResults([]);
    fetchConversation(partner.id);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = messageInput.trim();
    if ((!text && !pendingAttachment) || !activeConv?.partner?.id || sending) return;
    setSending(true);
    try {
      let response;
      if (pendingAttachment) {
        // Multipart upload
        const fd = new FormData();
        fd.append('recipient', activeConv.partner.id);
        fd.append('body', text);
        fd.append('attachment', pendingAttachment.file);
        fd.append('attachment_type', pendingAttachment.type);
        if (pendingAttachment.duration) {
          fd.append('attachment_duration', pendingAttachment.duration);
        }
        response = await apiCall('/messages/chat/', {
          method: 'POST',
          body: fd,
          // Don't set Content-Type; browser sets it with boundary
          isFormData: true,
        });
      } else {
        response = await apiCall('/messages/chat/', {
          method: 'POST',
          body: JSON.stringify({ recipient: activeConv.partner.id, body: text }),
        });
      }
      if (response.ok) {
        setMessageInput('');
        if (pendingAttachment?.preview) URL.revokeObjectURL(pendingAttachment.preview);
        setPendingAttachment(null);
        await fetchConversation(activeConv.partner.id);
        fetchConversations();
      } else {
        const data = await response.json();
        showToast.error(data.detail || 'Failed to send message.');
      }
    } catch {
      showToast.error('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast.error('File too large (max 20 MB).');
      return;
    }
    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';
    const preview = URL.createObjectURL(file);
    setPendingAttachment({ file, type, preview, name: file.name });
    e.target.value = ''; // allow same file re-select
  };

  const cancelAttachment = () => {
    if (pendingAttachment?.preview) URL.revokeObjectURL(pendingAttachment.preview);
    setPendingAttachment(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick best supported mime
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const mimeType = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const duration = (Date.now() - recordingStartRef.current) / 1000;
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        const ext = (mimeType.includes('mp4') ? 'm4a' : (mimeType.includes('ogg') ? 'ogg' : 'webm'));
        const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: blob.type });
        const preview = URL.createObjectURL(blob);
        setPendingAttachment({ file, type: 'audio', preview, name: file.name, duration });
        stream.getTracks().forEach(t => t.stop());
      };
      recordingStartRef.current = Date.now();
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }, 500);
    } catch (err) {
      showToast.error('Microphone access denied or unavailable.');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Remove onstop to avoid saving
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const formatDuration = (seconds) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div className="container-fluid py-4">
        <div className="row mb-3">
          <div className="col-12">
            <h1 className="h3 mb-0">
              <i className="fas fa-comments me-2 text-primary"></i>Live Chat
            </h1>
            <p className="text-muted mb-0 small">Chat in real-time with users across the system</p>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="row g-0" style={{ height: '70vh', minHeight: '500px' }}>
            {/* Conversations Sidebar */}
            <div className="col-md-4 col-lg-3" style={{ borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '14px' }}>Conversations</strong>
                <button className="btn btn-sm btn-primary" onClick={() => setShowNewChat(true)} title="New chat">
                  <i className="fas fa-plus"></i>
                </button>
              </div>

              {showNewChat && (
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    autoFocus
                  />
                  <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '8px' }}>
                    {userResults.map(u => (
                      <div
                        key={u.id}
                        onClick={() => startNewChat(u)}
                        style={{ padding: '8px', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#eef2ff'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: roleColors[u.role_name] || '#94a3b8',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 600,
                        }}>{initials(u.full_name)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.full_name || u.email}</div>
                          <small className="text-muted" style={{ fontSize: '10px' }}>{u.role_name || 'User'}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-sm btn-outline-secondary w-100 mt-2" onClick={() => setShowNewChat(false)}>Cancel</button>
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loadingConvs ? (
                  <div className="text-center p-4"><div className="spinner-border spinner-border-sm text-primary"></div></div>
                ) : conversations.length === 0 ? (
                  <div className="text-center p-4 text-muted">
                    <i className="fas fa-comment-slash" style={{ fontSize: '32px', opacity: 0.3, display: 'block', marginBottom: '8px' }}></i>
                    <small>No conversations yet.<br />Click + to start a chat.</small>
                  </div>
                ) : conversations.map(c => {
                  const isActive = activeConv?.partner?.id === c.partner.id;
                  return (
                    <div
                      key={c.partner.id}
                      onClick={() => selectConversation(c.partner.id)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: isActive ? '#eef2ff' : (c.unread_count > 0 ? '#f8faff' : 'transparent'),
                        borderLeft: isActive ? '3px solid #4361ee' : '3px solid transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: roleColors[c.partner.role_name] || '#94a3b8',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: 600, flexShrink: 0,
                        }}>{initials(c.partner.full_name)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.partner.full_name || c.partner.email}
                            </strong>
                            <small style={{ fontSize: '10px', color: '#94a3b8', flexShrink: 0, marginLeft: '6px' }}>{formatTime(c.last_message.created_at)}</small>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.last_message.from_me && 'You: '}{c.last_message.body?.substring(0, 40)}
                          </div>
                        </div>
                        {c.unread_count > 0 && (
                          <span style={{
                            background: '#e63946', color: '#fff', fontSize: '10px', fontWeight: 700,
                            padding: '2px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center',
                          }}>{c.unread_count}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat Window */}
            <div className="col-md-8 col-lg-9" style={{ display: 'flex', flexDirection: 'column' }}>
              {!activeConv ? (
                <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                  <i className="fas fa-comments" style={{ fontSize: '64px', opacity: 0.2, marginBottom: '16px' }}></i>
                  <p>Select a conversation to start chatting</p>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: roleColors[activeConv.partner.role_name] || '#94a3b8',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 600,
                    }}>{initials(activeConv.partner.full_name)}</div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '14px' }}>{activeConv.partner.full_name || activeConv.partner.email}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {activeConv.partner.role_name && <span>{activeConv.partner.role_name.replace(/_/g, ' ')}</span>}
                        {activeConv.partner.hospital_name && <span> · {activeConv.partner.hospital_name}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#22c55e' }}>
                      <i className="fas fa-circle me-1" style={{ fontSize: '8px' }}></i>Live
                    </span>
                  </div>

                  {/* Messages */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f8fafc' }}>
                    {activeConv.messages.length === 0 ? (
                      <div className="text-center text-muted pt-5">
                        <i className="fas fa-comment-dots" style={{ fontSize: '48px', opacity: 0.2, display: 'block', marginBottom: '12px' }}></i>
                        <small>No messages yet. Say hello!</small>
                      </div>
                    ) : activeConv.messages.map(m => {
                      const fromMe = m.sender?.id === user?.id || m.sender?.email === user?.email;
                      return (
                        <div key={m.id} style={{ display: 'flex', justifyContent: fromMe ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
                          <div style={{
                            maxWidth: '75%',
                            padding: m.attachment_type === 'image' || m.attachment_type === 'video' ? '6px' : '10px 14px',
                            borderRadius: fromMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: fromMe ? 'linear-gradient(135deg, #4361ee, #7c3aed)' : '#fff',
                            color: fromMe ? '#fff' : '#1e293b',
                            boxShadow: fromMe ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
                            border: fromMe ? 'none' : '1px solid #e2e8f0',
                            overflow: 'hidden',
                          }}>
                            {/* Attachment */}
                            {m.attachment_url && m.attachment_type === 'image' && (
                              <a href={m.attachment_url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={m.attachment_url}
                                  alt={m.attachment_name || 'image'}
                                  style={{ maxWidth: '300px', maxHeight: '300px', borderRadius: '12px', display: 'block', cursor: 'pointer' }}
                                />
                              </a>
                            )}
                            {m.attachment_url && m.attachment_type === 'video' && (
                              <video
                                src={m.attachment_url}
                                controls
                                style={{ maxWidth: '300px', maxHeight: '300px', borderRadius: '12px', display: 'block' }}
                              />
                            )}
                            {m.attachment_url && m.attachment_type === 'audio' && (
                              <div style={{ minWidth: '220px', padding: '4px 0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  <i className="fas fa-microphone" style={{ fontSize: '14px' }}></i>
                                  <small style={{ opacity: 0.85 }}>Voice note {m.attachment_duration ? `· ${formatDuration(m.attachment_duration)}` : ''}</small>
                                </div>
                                <audio src={m.attachment_url} controls style={{ width: '100%', height: '32px' }} />
                              </div>
                            )}
                            {m.attachment_url && m.attachment_type === 'file' && (
                              <a href={m.attachment_url} download={m.attachment_name} target="_blank" rel="noopener noreferrer"
                                 style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                                <i className="fas fa-paperclip"></i>
                                <span style={{ fontSize: '13px' }}>{m.attachment_name || 'Download file'}</span>
                              </a>
                            )}

                            {/* Text body */}
                            {m.body && (
                              <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.4, padding: m.attachment_url ? '8px 8px 4px' : 0 }}>
                                {m.body}
                              </div>
                            )}
                            <div style={{
                              fontSize: '10px',
                              opacity: 0.75,
                              textAlign: 'right',
                              marginTop: '4px',
                              padding: m.attachment_url ? '0 8px 4px' : 0,
                            }}>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {fromMe && m.is_read && <i className="fas fa-check-double ms-1"></i>}
                              {fromMe && !m.is_read && <i className="fas fa-check ms-1"></i>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef}></div>
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSend} style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                    {/* Attachment Preview */}
                    {pendingAttachment && (
                      <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: '10px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {pendingAttachment.type === 'image' && (
                          <img src={pendingAttachment.preview} alt="preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                        )}
                        {pendingAttachment.type === 'video' && (
                          <video src={pendingAttachment.preview} style={{ width: '60px', height: '48px', objectFit: 'cover', borderRadius: '6px', background: '#000' }} />
                        )}
                        {pendingAttachment.type === 'audio' && (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-microphone"></i>
                          </div>
                        )}
                        {pendingAttachment.type === 'file' && (
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-file"></i>
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {pendingAttachment.name || pendingAttachment.type}
                          </div>
                          <small className="text-muted">
                            {pendingAttachment.type.charAt(0).toUpperCase() + pendingAttachment.type.slice(1)}
                            {pendingAttachment.duration && ` · ${formatDuration(pendingAttachment.duration)}`}
                            {` · ${(pendingAttachment.file.size / 1024).toFixed(0)} KB`}
                          </small>
                        </div>
                        {pendingAttachment.type === 'audio' && (
                          <audio src={pendingAttachment.preview} controls style={{ height: '30px', maxWidth: '180px' }} />
                        )}
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={cancelAttachment} title="Remove">
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}

                    {/* Recording Indicator */}
                    {isRecording && (
                      <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: '10px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #fecaca' }}>
                        <span style={{ width: '10px', height: '10px', background: '#e63946', borderRadius: '50%', animation: 'pulse 1s infinite' }}></span>
                        <span style={{ fontSize: '13px', color: '#991b1b', fontWeight: 500 }}>
                          <i className="fas fa-microphone me-1"></i>Recording... {formatDuration(recordingSeconds)}
                        </span>
                        <div style={{ flex: 1 }}></div>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={cancelRecording}>Cancel</button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={stopRecording}>
                          <i className="fas fa-stop me-1"></i>Stop
                        </button>
                      </div>
                    )}

                    <div className="d-flex gap-2 align-items-center">
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />

                      {/* Attach button */}
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending || isRecording}
                        title="Attach image or video"
                        style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}
                      >
                        <i className="fas fa-paperclip"></i>
                      </button>

                      {/* Mic button (toggle record) */}
                      {!isRecording ? (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={startRecording}
                          disabled={sending || !!pendingAttachment}
                          title="Record voice note"
                          style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}
                        >
                          <i className="fas fa-microphone"></i>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={stopRecording}
                          title="Stop recording"
                          style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}
                        >
                          <i className="fas fa-stop"></i>
                        </button>
                      )}

                      <input
                        type="text"
                        className="form-control"
                        placeholder={pendingAttachment ? 'Add a caption (optional)...' : 'Type your message...'}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        disabled={sending || isRecording}
                        autoFocus
                      />
                      <button type="submit" className="btn btn-primary" disabled={sending || isRecording || (!messageInput.trim() && !pendingAttachment)}
                        style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}
                      >
                        <i className="fas fa-paper-plane"></i>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default LiveChatPage;
