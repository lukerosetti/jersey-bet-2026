import React, { useState, useEffect, useRef } from 'react';
import { db, ref, onValue } from '../firebase';
import { getDatabase, push, set } from 'firebase/database';

function DraftChat({ draftId, currentUser, owners }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!draftId) return;
    const chatRef = ref(db, `drafts/${draftId}/chat`);
    const unsub = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setMessages([]); return; }
      const msgs = Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
      setMessages(msgs);
      if (!wasOpen.current) setUnread(prev => prev + 1);
    });
    return () => unsub();
  }, [draftId]);

  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      setUnread(0);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      wasOpen.current = false;
    }
  }, [isOpen, messages]);

  const sendMessage = () => {
    if (!input.trim() || !currentUser) return;
    const chatRef = ref(db, `drafts/${draftId}/chat`);
    const newRef = push(chatRef);
    set(newRef, {
      ownerId: currentUser.ownerId,
      text: input.trim(),
      timestamp: Date.now()
    });
    setInput('');
  };

  const ownerColor = (id) => owners?.[id]?.color || '#555';
  const ownerName = (id) => owners?.[id]?.name || id;

  return (
    <>
      <button className={`draft-chat-fab ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '\u2715' : '\u{1F4AC}'}
        {!isOpen && unread > 0 && <span className="draft-chat-unread">{unread}</span>}
      </button>
      {isOpen && (
        <div className="draft-chat-panel">
          <div className="draft-chat-header">
            <span>Draft Chat</span>
            <span className="draft-chat-count">{messages.length} messages</span>
          </div>
          <div className="draft-chat-messages">
            {messages.length === 0 && <div className="draft-chat-empty">No messages yet. Start the trash talk!</div>}
            {messages.map((msg, idx) => (
              <div key={idx} className={`draft-chat-msg ${msg.ownerId === currentUser?.ownerId ? 'mine' : ''}`}>
                <span className="draft-chat-dot" style={{ background: ownerColor(msg.ownerId) }}></span>
                <div className="draft-chat-bubble">
                  <span className="draft-chat-sender">{ownerName(msg.ownerId)}</span>
                  <span className="draft-chat-text">{msg.text}</span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="draft-chat-input">
            <input
              type="text"
              placeholder="Talk trash..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              maxLength={200}
            />
            <button onClick={sendMessage} disabled={!input.trim()}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}

export default DraftChat;
