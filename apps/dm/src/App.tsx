import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import CampaignList from '@/pages/CampaignList';
import CampaignForm from '@/pages/CampaignForm';
import CampaignDetail from '@/pages/CampaignDetail';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<CampaignList />} />
        <Route path="/campaigns/new" element={<CampaignForm />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/campaigns/:id/edit" element={<CampaignForm />} />
      </Route>
    </Routes>
  );
}

export default App
