import React, { useState } from 'react';
import MeSectionTabBar from '../me/MeSectionTabBar.jsx';
import TeamSummaryDashboard from './TeamSummaryDashboard.jsx';

const TABS = [{ id: 'summary', label: 'SUMMARY' }];

export default function MyTeam() {
  const [activeTab, setActiveTab] = useState('summary');

  return (
    <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
      <MeSectionTabBar tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      <div className="rounded-b-xl bg-[#151b2b] px-4 pb-5 pt-4 sm:pb-6 md:px-6 lg:px-8">
        {activeTab === 'summary' && <TeamSummaryDashboard />}
      </div>
    </div>
  );
}
