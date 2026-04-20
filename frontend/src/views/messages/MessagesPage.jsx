import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

function MessagesPage() {
  const { apiCall, user } = useAuth();
  const [tab, setTab] = useState('inbox'); // inbox | sent
  const [messages, setMessages] = useState([]);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);

  // Compose form
  const [composeTo, setComposeTo] = useState(null); // user object
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [replyTo, setReplyTo] = useState(null); // parent message ID

  // User search
  const [userSearch, setUserSearch] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const navItems = getNavForUser(user);
  const brandTitle = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiCall(tab === 'inbox' ? '/messages/inbox/' : '/messages/sent/');
      const data = await response.json();
      if (response.ok) setMessages(data);
    } catch {
      showToast.error('Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [apiCall, tab]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const openMessage = async (msg) => {
    try {
      const response = await apiCall(`/messages/${msg.id}/`);
      const data = await response.json();
      if (response.ok) {
        setSelectedMsg(data);
        // Update unread state locally
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
      }
    } catch {
      showToast.error('Failed to load message.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      const response = await apiCall(`/messages/${id}/delete/`, { method: 'DELETE' });
      if (response.ok || response.status === 204) {
        setSelectedMsg(null);
        fetchMessages();
        showToast.success('Message deleted.');
      }
    } catch {
      showToast.error('Failed to delete message.');
    }
  };

  const searchUsers = async (query) => {
    try {
      setSearchingUsers(true);
      const response = await apiCall(`/messages/recipients/?search=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (response.ok) setRecipients(data);
    } catch {
      // silent
    } finally {
      setSearchingUsers(false);
    }
  };

  useEffect(() => {
    if (!showCompose) return;
    const t = setTimeout(() => searchUsers(userSearch), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch, showCompose]);

  const openCompose = (to = null, parent = null, subject = '') => {
    setComposeTo(to);
    setComposeSubject(subject);
    setComposeBody('');
    setReplyTo(parent);
    setUserSearch('');
    setRecipients([]);
    setShowCompose(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!composeTo) {
      showToast.error('Please select a recipient.');
      return;
    }
    if (!composeBody.trim()) {
      showToast.error('Message body is required.');
      return;
    }
    try {
      const response = await apiCall('/messages/send/', {
        method: 'POST',
        body: JSON.stringify({
          recipient: composeTo.id,
          subject: composeSubject || '(No subject)',
          body: composeBody,
          parent: replyTo,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        showToast.success('Message sent!');
        setShowCompose(false);
        if (tab === 'sent') fetchMessages();
      } else {
        const msg = data.detail || Object.values(data).flat().join(', ') || 'Failed to send message.';
        showToast.error(msg);
      }
    } catch {
      showToast.error('Failed to send message.');
    }
  };

  const handleReply = () => {
    if (!selectedMsg) return;
    const other = tab === 'inbox' ? selectedMsg.sender : selectedMsg.recipient;
    openCompose(other, selectedMsg.id, selectedMsg.subject?.startsWith('Re:') ? selectedMsg.subject : `Re: ${selectedMsg.subject}`);
  };

  const initials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffHours < 24 * 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString();
  };

  const roleColors = { admin: '#4361ee', ministry_admin: '#7c3aed', district_admin: '#059669', hospital_admin: '#f77f00', receptionist: '#0891b2', doctor: '#e63946', nurse: '#ec4899' };

  return (
    <DashboardLayout navItems={navItems} brandTitle={brandTitle} roleBadge={roleBadge}>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h1 className="h3 mb-0">
                  <i className="fas fa-envelope me-2 text-primary"></i>Messages
                </h1>
                <p className="text-muted mb-0 small">Send and receive messages within the system</p>
              </div>
              <button className="btn btn-primary" onClick={() => openCompose()}>
                <i className="fas fa-pen me-2"></i>New Message
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <ul className="nav nav-tabs px-3 pt-2" style={{borderBottom: '1px solid #e2e8f0'}}>
              <li className="nav-item">
                <button className={`nav-link ${tab === 'inbox' ? 'active' : ''}`} onClick={() => { setTab('inbox'); setSelectedMsg(null); }}>
                  <i className="fas fa-inbox me-2"></i>Inbox
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link ${tab === 'sent' ? 'active' : ''}`} onClick={() => { setTab('sent'); setSelectedMsg(null); }}>
                  <i className="fas fa-paper-plane me-2"></i>Sent
                </button>
              </li>
            </ul>

            <div className="row g-0" style={{minHeight: '500px'}}>
              {/* Message List */}
              <div className="col-md-5 col-lg-4" style={{borderRight: '1px solid #e2e8f0', maxHeight: '70vh', overflowY: 'auto'}}>
                {loading ? (
                  <div className="text-center py-5"><div className="spinner-border text-primary spinner-border-sm"></div></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="fas fa-inbox" style={{fontSize: '48px', opacity: 0.3, display: 'block', marginBottom: '12px'}}></i>
                    <p className="mb-0 small">{tab === 'inbox' ? 'No messages in inbox.' : 'No sent messages.'}</p>
                  </div>
                ) : messages.map(m => {
                  const other = tab === 'inbox' ? m.sender : m.recipient;
                  const isUnread = tab === 'inbox' && !m.is_read;
                  const isSelected = selectedMsg?.id === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => openMessage(m)}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: isSelected ? '#eef2ff' : (isUnread ? '#f8faff' : 'transparent'),
                        borderLeft: isSelected ? '3px solid #4361ee' : '3px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div className="d-flex align-items-start gap-2">
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: roleColors[other?.role_name] || '#94a3b8',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 600, fontSize: '13px', flexShrink: 0,
                        }}>{initials(other?.full_name || other?.email)}</div>
                        <div style={{flex: 1, minWidth: 0}}>
                          <div className="d-flex justify-content-between align-items-baseline">
                            <strong style={{fontSize: '13px', fontWeight: isUnread ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                              {other?.full_name || other?.email || 'Unknown'}
                            </strong>
                            <small style={{fontSize: '11px', color: '#64748b', flexShrink: 0, marginLeft: '8px'}}>{formatDate(m.created_at)}</small>
                          </div>
                          <div style={{fontSize: '12px', color: '#475569', fontWeight: isUnread ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                            {m.subject}
                          </div>
                          <div style={{fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                            {m.body?.substring(0, 60)}
                          </div>
                        </div>
                        {isUnread && <span style={{width: '8px', height: '8px', borderRadius: '50%', background: '#4361ee', flexShrink: 0, marginTop: '4px'}}></span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Detail */}
              <div className="col-md-7 col-lg-8" style={{padding: '20px', maxHeight: '70vh', overflowY: 'auto'}}>
                {!selectedMsg ? (
                  <div className="text-center py-5 text-muted h-100 d-flex flex-column justify-content-center align-items-center">
                    <i className="fas fa-envelope-open" style={{fontSize: '64px', opacity: 0.2, marginBottom: '16px'}}></i>
                    <p>Select a message to read</p>
                  </div>
                ) : (
                  <>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <h5 className="mb-0">{selectedMsg.subject}</h5>
                      <div className="d-flex gap-2">
                        {tab === 'inbox' && (
                          <button className="btn btn-sm btn-outline-primary" onClick={handleReply}>
                            <i className="fas fa-reply me-1"></i>Reply
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(selectedMsg.id)}>
                          <i className="fas fa-trash me-1"></i>Delete
                        </button>
                      </div>
                    </div>

                    <div className="d-flex align-items-center mb-3 pb-3" style={{borderBottom: '1px solid #f1f5f9'}}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '50%',
                        background: roleColors[(tab === 'inbox' ? selectedMsg.sender : selectedMsg.recipient)?.role_name] || '#94a3b8',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 600, fontSize: '14px', marginRight: '12px',
                      }}>{initials((tab === 'inbox' ? selectedMsg.sender : selectedMsg.recipient)?.full_name)}</div>
                      <div style={{flex: 1}}>
                        <div><strong>{(tab === 'inbox' ? selectedMsg.sender : selectedMsg.recipient)?.full_name || 'Unknown'}</strong></div>
                        <small className="text-muted">
                          {tab === 'inbox' ? 'From' : 'To'}: {(tab === 'inbox' ? selectedMsg.sender : selectedMsg.recipient)?.email}
                          {(tab === 'inbox' ? selectedMsg.sender : selectedMsg.recipient)?.hospital_name && (
                            <> · {(tab === 'inbox' ? selectedMsg.sender : selectedMsg.recipient)?.hospital_name}</>
                          )}
                        </small>
                      </div>
                      <small className="text-muted">{new Date(selectedMsg.created_at).toLocaleString()}</small>
                    </div>

                    <div style={{whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '14px', color: '#1e293b'}}>
                      {selectedMsg.body}
                    </div>

                    {/* Replies */}
                    {selectedMsg.replies && selectedMsg.replies.length > 0 && (
                      <div className="mt-4">
                        <h6 className="text-muted small mb-2">Replies</h6>
                        {selectedMsg.replies.map(r => (
                          <div key={r.id} className="p-3 mb-2" style={{background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #4361ee'}}>
                            <div className="d-flex justify-content-between mb-1">
                              <strong style={{fontSize: '13px'}}>{r.sender?.full_name || r.sender?.email}</strong>
                              <small className="text-muted">{new Date(r.created_at).toLocaleString()}</small>
                            </div>
                            <div style={{whiteSpace: 'pre-wrap', fontSize: '13px'}}>{r.body}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1050}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-pen me-2 text-primary"></i>
                  {replyTo ? 'Reply to Message' : 'New Message'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowCompose(false)}></button>
              </div>
              <form onSubmit={handleSend}>
                <div className="modal-body">
                  {/* Recipient */}
                  <div className="mb-3">
                    <label className="form-label">To *</label>
                    {composeTo ? (
                      <div className="d-flex align-items-center p-2" style={{border: '1px solid #ced4da', borderRadius: '8px', background: '#f8fafc'}}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: roleColors[composeTo.role_name] || '#94a3b8',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 600, fontSize: '12px', marginRight: '10px',
                        }}>{initials(composeTo.full_name)}</div>
                        <div style={{flex: 1}}>
                          <div style={{fontWeight: 600, fontSize: '14px'}}>{composeTo.full_name || composeTo.email}</div>
                          <small className="text-muted">{composeTo.email} {composeTo.hospital_name && `· ${composeTo.hospital_name}`}</small>
                        </div>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setComposeTo(null)}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search user by name, email, or role..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          autoFocus
                        />
                        {(userSearch || recipients.length > 0) && (
                          <div className="mt-2" style={{maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px'}}>
                            {searchingUsers ? (
                              <div className="text-center p-3 text-muted small">Searching...</div>
                            ) : recipients.length === 0 ? (
                              <div className="text-center p-3 text-muted small">No users found</div>
                            ) : recipients.map(u => (
                              <div
                                key={u.id}
                                onClick={() => { setComposeTo(u); setUserSearch(''); setRecipients([]); }}
                                style={{padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s'}}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <div style={{fontWeight: 500, fontSize: '13px'}}>{u.full_name || u.email}</div>
                                <small className="text-muted" style={{fontSize: '11px'}}>
                                  {u.email} · {u.role_name || 'No role'} {u.hospital_name && `· ${u.hospital_name}`}
                                </small>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Subject */}
                  <div className="mb-3">
                    <label className="form-label">Subject</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter subject..."
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                    />
                  </div>

                  {/* Body */}
                  <div className="mb-0">
                    <label className="form-label">Message *</label>
                    <textarea
                      className="form-control"
                      rows="8"
                      placeholder="Type your message..."
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCompose(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-paper-plane me-2"></i>Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default MessagesPage;
