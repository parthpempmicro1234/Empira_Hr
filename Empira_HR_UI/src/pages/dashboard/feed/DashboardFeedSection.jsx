import React, { useState } from 'react';
import DashboardEvents from '../DashboardEvents';
import VisibilitySwitcher from './VisibilitySwitcher';
import PostComposer from './PostComposer';
import DashboardFeed from './DashboardFeed';
import { useDepartmentProfile } from './feedPayload';

export default function DashboardFeedSection({ onOpenProfile, highlightPostId }) {
  const [visibility, setVisibility] = useState('organization');
  const profileQuery = useDepartmentProfile();
  const department = profileQuery.data?.department;
  const subDepartment = profileQuery.data?.sub_department;

  return (
    <>
      <VisibilitySwitcher
        visibility={visibility}
        onChange={setVisibility}
        department={department}
        subDepartment={subDepartment}
      />

      <PostComposer visibility={visibility} />

      <DashboardEvents onOpenProfile={onOpenProfile} />

      <DashboardFeed
        visibility={visibility}
        onOpenProfile={onOpenProfile}
        highlightPostId={highlightPostId}
      />
    </>
  );
}
