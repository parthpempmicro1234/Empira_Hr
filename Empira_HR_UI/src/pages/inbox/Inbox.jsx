import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MeSectionTabBar from '../me/MeSectionTabBar.jsx';
import InboxNotificationsTab from './InboxNotificationsTab.jsx';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const TABS = [
  { id: 'take-action', label: 'TAKE ACTION' },
  { id: 'notifications', label: 'NOTIFICATIONS' },
  { id: 'archive', label: 'ARCHIVE' },
];

function InboxPlaceholder({ title, description }) {
  return (
    <div
      className={cx(
        'rounded-xl border border-[#2a3447] bg-[#151b2b] p-8 text-center',
        'font-sans text-gray-100 shadow-sm'
      )}
    >
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">{description}</p>
    </div>
  );
}

function parseInboxPath(rest) {
  const segments = (rest || '').split('/').filter(Boolean);
  return segments[0] || 'take-action';
}

export default function Inbox() {
  const navigate = useNavigate();
  const { '*': rest } = useParams();
  const section = parseInboxPath(rest);
  const tab = TABS.some((t) => t.id === section) ? section : 'take-action';

  useEffect(() => {
    if (section !== tab) {
      navigate(`/inbox/${tab}`, { replace: true });
    }
  }, [section, tab, navigate]);

  const handleTabChange = (id) => {
    navigate(`/inbox/${id}`, { replace: true });
  };

  return (
    <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
      <MeSectionTabBar
        tabs={TABS}
        activeId={tab}
        onChange={handleTabChange}
        ariaLabel="Inbox"
      />

      <div className="px-4 md:px-6 lg:px-8">
        {tab === 'take-action' && (
          <InboxPlaceholder
            title="Take action"
            description="Pending approvals and items that need your response will appear here."
          />
        )}
        {tab === 'notifications' && <InboxNotificationsTab />}
        {tab === 'archive' && (
          <InboxPlaceholder
            title="Archive"
            description="Archived notifications will appear here once you archive items from your inbox."
          />
        )}
      </div>
    </div>
  );
}
