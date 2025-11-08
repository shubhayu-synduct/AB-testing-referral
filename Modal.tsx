import { useState } from 'react';
import { X, Check, Mail } from 'lucide-react';

export default function EmailInviteModal({ onClose, inviteLink, senderName }: { onClose: () => void; inviteLink: string; senderName: string }) {
    const [emails, setEmails] = useState(['', '', '']);
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
  
    const handleSend = async () => {
      const validEmails = emails.filter(e => e.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
      if (validEmails.length > 0) {
        setSending(true);
        try {
          const response = await fetch('/api/referrals/send-invites', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              emails: validEmails,
              inviteLink,
              senderName
            }),
          });
  
          if (response.ok) {
            setSent(true);
            setTimeout(() => {
              onClose();
            }, 1500);
          }
        } catch (error) {
          console.error('Error sending invites:', error);
        } finally {
          setSending(false);
        }
      }
    };
  
    const hasValidEmail = emails.some(e => e.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
          
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Send Invites</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>
  
          {/* Content */}
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Email addresses
              </label>
              <div className="space-y-2">
                {emails.map((email, i) => (
                  <input
                    key={i}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const newEmails = [...emails];
                      newEmails[i] = e.target.value;
                      setEmails(newEmails);
                    }}
                    placeholder={`colleague${i + 1}@email.com`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ))}
              </div>
            </div>
  
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              We'll send them an email with your personal invite link
            </div>
          </div>
  
          {/* Footer */}
          <div className="p-5 border-t border-slate-200 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!hasValidEmail || sent || sending}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                sent
                  ? 'bg-green-500 text-white'
                  : hasValidEmail && !sending
                  ? 'bg-slate-900 hover:bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {sent ? (
                <>
                  <Check size={18} />
                  Sent
                </>
              ) : sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Mail size={18} />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
  