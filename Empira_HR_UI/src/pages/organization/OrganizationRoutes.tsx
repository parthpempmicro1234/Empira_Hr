import { Navigate, Route, Routes } from 'react-router-dom';

import OrganizationShell from './OrganizationShell';
import EmployeesLayout from './EmployeesLayout';
import EmployeeDirectory from './EmployeeDirectory';
import OrgTreeView from './tree/OrgTreeView';
import PlaceholderPanel from './PlaceholderPanel';
import OrganizationDocumentsPage from './documents/OrganizationDocumentsPage';

export default function OrganizationRoutes() {
  return (
    <Routes>
      <Route element={<OrganizationShell />}>
        <Route index element={<Navigate to="employees/directory" replace />} />

        <Route path="employees" element={<EmployeesLayout />}>
          <Route index element={<Navigate to="directory" replace />} />
          <Route path="directory" element={<EmployeeDirectory />} />
          <Route path="tree" element={<OrgTreeView />} />
        </Route>

        <Route path="documents" element={<OrganizationDocumentsPage />} />
        <Route path="engage" element={<PlaceholderPanel title="Engage" />} />
      </Route>
    </Routes>
  );
}

