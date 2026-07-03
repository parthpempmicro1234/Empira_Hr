import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyTeamSummary } from '../../services/myteam.api';
import ApiErrorPanel from './components/ApiErrorPanel.jsx';
import DashboardCard from './components/DashboardCard.jsx';
import LeaveTodayCard from './components/LeaveTodayCard.jsx';
import NotInYetCard from './components/NotInYetCard.jsx';
import SummaryTabs from './components/SummaryTabs.jsx';
import TeamSection from './components/TeamSection.jsx';
import TeamStatCard from './components/TeamStatCard.jsx';
import TeamSummaryLoadingSkeleton from './components/TeamSummaryLoadingSkeleton.jsx';
import TeamCalendar from './TeamCalendar.jsx';
import { TeamSummaryViewProvider, useTeamSummaryView } from './context/TeamSummaryViewContext.jsx';
import { parseMyTeamSummary } from './utils/parseMyTeamSummary.js';
import ProfilePreviewModal from '../organization/components/ProfilePreviewModal';

function TeamSummaryPageContent() {
  const { innerView, setInnerView, showPeersTab } = useTeamSummaryView();
  const [previewEmployeeId, setPreviewEmployeeId] = useState(null);

  const openEmployeePreview = (id) => {
    const n = Number(id);
    if (Number.isFinite(n) && n > 0) setPreviewEmployeeId(n);
  };

  const summaryQuery = useQuery({
    queryKey: ['myteam', 'summary', 'default'],
    queryFn: () => getMyTeamSummary(),
    staleTime: 60_000,
  });

  const parsedDefault = useMemo(
    () => parseMyTeamSummary(summaryQuery.data),
    [summaryQuery.data]
  );

  const peersQuery = useQuery({
    queryKey: ['myteam', 'summary', 'peers'],
    queryFn: () => getMyTeamSummary('peers'),
    enabled: showPeersTab,
    staleTime: 60_000,
  });

  const parsedPeers = useMemo(() => parseMyTeamSummary(peersQuery.data), [peersQuery.data]);

  const isPeersView = showPeersTab && innerView === 'peers';
  const activeParsed = isPeersView ? parsedPeers : parsedDefault;

  const pageLoading = isPeersView
    ? peersQuery.isLoading || peersQuery.isFetching
    : summaryQuery.isLoading || summaryQuery.isFetching;

  const onLeaveToday = activeParsed.onLeaveToday;
  const notInYetToday = activeParsed.notInYetToday;
  const teamSectionTitle = isPeersView ? 'Peers' : parsedDefault.teamSectionTitle;
  const teamMembers = activeParsed.teamMembers;
  const statCards = activeParsed.statCards;

  const teamEmptyMessage =
    teamSectionTitle === 'Peers' ? 'No peers available.' : 'No direct reports available.';

  const activeError = isPeersView ? peersQuery.error : summaryQuery.error;
  const refetchActive = isPeersView ? peersQuery.refetch : summaryQuery.refetch;

  return (
    <div className="space-y-4 sm:space-y-5">
      {showPeersTab ? (
        <SummaryTabs activeId={innerView} onChange={setInnerView} disabled={pageLoading} />
      ) : null}

      {activeError && !pageLoading ? (
        <ApiErrorPanel
          message={isPeersView ? 'Unable to load peers.' : 'Unable to refresh team summary.'}
          onRetry={() => refetchActive()}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
        <LeaveTodayCard
          employees={onLeaveToday}
          loading={pageLoading}
          onPreview={openEmployeePreview}
        />
        <NotInYetCard
          employees={notInYetToday}
          loading={pageLoading}
          onPreview={openEmployeePreview}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <TeamStatCard
            key={card.id}
            title={card.title}
            value={card.value}
            accentClass={card.accentClass}
            linkLabel={card.linkLabel}
            loading={pageLoading}
          />
        ))}
      </div>

      <DashboardCard className="p-3 sm:p-4">
        <TeamCalendar />
      </DashboardCard>

      <DashboardCard className="p-4">
        <TeamSection
          title={teamSectionTitle}
          employees={teamMembers}
          loading={pageLoading}
          emptyMessage={teamEmptyMessage}
          onPreview={openEmployeePreview}
        />
      </DashboardCard>

      <ProfilePreviewModal
        open={previewEmployeeId != null}
        employeeId={previewEmployeeId}
        onClose={() => setPreviewEmployeeId(null)}
      />
    </div>
  );
}

export default function TeamSummaryPage() {
  const summaryQuery = useQuery({
    queryKey: ['myteam', 'summary', 'default'],
    queryFn: () => getMyTeamSummary(),
    staleTime: 60_000,
  });

  const showPeersTab = useMemo(
    () => parseMyTeamSummary(summaryQuery.data).showPeersTab,
    [summaryQuery.data]
  );

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return <TeamSummaryLoadingSkeleton />;
  }

  if (summaryQuery.isError && !summaryQuery.data) {
    return (
      <ApiErrorPanel
        message="Unable to load team summary."
        onRetry={() => summaryQuery.refetch()}
      />
    );
  }

  return (
    <TeamSummaryViewProvider showPeersTab={showPeersTab}>
      <TeamSummaryPageContent />
    </TeamSummaryViewProvider>
  );
}
