import React from "react";
import { CheckCircleIcon, AlertCircleIcon } from "./Icons";

// Helper for date formatting
const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric"
    });
};

function Verifications({ history, onOpenModal }) {
    const verificationList = history.filter(g => g.status === 'Verification');

    if (verificationList.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <CheckCircleIcon width="48" height="48" color="#94a3b8" />
                <h3 style={{ color: '#64748b', marginTop: '15px' }}>No Pending Verifications</h3>
                <p style={{ color: '#94a3b8' }}>You're all caught up! Great job.</p>
            </div>
        );
    }

    return (
        <div style={{ animation: 'fadeIn 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <AlertCircleIcon width="24" height="24" color="#ef4444" />
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem' }}>
                    Action Required ({verificationList.length})
                </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {verificationList.map((g) => (
                    <div
                        key={g._id}
                        style={{
                            background: 'white', padding: '25px', borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0',
                            transition: 'transform 0.2s'
                        }}
                        className="verification-card"
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <span className="status-badge" style={{ background: '#fef3c7', color: '#d97706' }}>Action Required</span>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{formatDate(g.createdAt)}</span>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', color: '#1e293b' }}>
                            {g.category}
                        </h3>

                        <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '15px', lineHeight: '1.5' }}>
                            {g.message.substring(0, 80)}...
                        </p>

                        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', marginBottom: '20px', borderLeft: '3px solid #0f172a' }}>
                            <p style={{ fontSize: '0.85rem', color: '#334155', fontStyle: 'italic', margin: 0 }}>
                                "{g.resolutionRemarks || 'Resolution provided.'}"
                            </p>
                        </div>

                        <button
                            onClick={() => onOpenModal(g)}
                            style={{
                                width: '100%', padding: '10px 16px',
                                background: '#0f172a',
                                color: 'white', border: 'none', borderRadius: '8px',
                                fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#1e293b'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#0f172a'; }}
                        >
                            Review & Verify
                        </button>
                    </div>
                ))}
            </div>

            <style>{`
        .verification-card:hover { transform: translateY(-5px); }
      `}</style>
        </div>
    );
}

export default Verifications;
