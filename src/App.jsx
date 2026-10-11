import React, { useState } from 'react';
import Navbar from './components/Navbar';
import DeviceFrame from './components/DeviceFrame';
import HomeScreen from './screens/HomeScreen';
import JobCheckScreen from './screens/JobCheckScreen';
import RiskReportScreen from './screens/RiskReportScreen';
import FamilyGuardianScreen from './screens/FamilyGuardianScreen';
import ShieldIntroScreen from './screens/ShieldIntroScreen';
import JobShieldFlow from './screens/JobShieldFlow';
import ChatShieldFlow from './screens/ChatShieldFlow';
import MessageShieldFlow from './screens/MessageShieldFlow';
import AgencyShieldFlow from './screens/AgencyShieldFlow';
import MarketplaceShieldFlow from './screens/MarketplaceShieldFlow';
import ScamTaxonomyView from './screens/ScamTaxonomyView';
import CaseStudyArchitectureView from './screens/CaseStudyArchitectureView';
import DesignBoardsView from './screens/DesignBoardsView';
import { SCREENS_CATALOG } from './data/mockData';

export default function App() {
  const [currentTab, setCurrentTab] = useState('simulator');
  const [currentScreenId, setCurrentScreenId] = useState('home');
  const [accent, setAccent] = useState('#1D4ED8');
  const [deviceFrameMode, setDeviceFrameMode] = useState(true);

  const navigateTo = (screenId) => {
    setCurrentScreenId(screenId);
    if (screenId === 'scam_matrix') {
      setCurrentTab('taxonomy');
    } else if (screenId === 'case_study') {
      setCurrentTab('pipeline');
    } else {
      setCurrentTab('simulator');
    }
  };

  const currentScreenMeta = SCREENS_CATALOG.find(s => s.id === currentScreenId) || SCREENS_CATALOG[0];

  const renderCurrentMobileScreen = () => {
    switch (currentScreenId) {
      case 'home':
        return <HomeScreen onNavigate={navigateTo} accent={accent} />;
      case 'job_check':
        return <JobCheckScreen onNavigate={navigateTo} accent={accent} />;
      case 'risk_report':
        return <RiskReportScreen onNavigate={navigateTo} accent={accent} />;
      case 'family_guardian':
        return <FamilyGuardianScreen onNavigate={navigateTo} accent={accent} />;
      case 'shield_intro':
        return <ShieldIntroScreen onNavigate={navigateTo} accent={accent} />;
      
      // Job Scam Flow (B - F)
      case 'job_spot':
        return <JobShieldFlow key="job-1" initialStep={1} onNavigate={navigateTo} accent={accent} />;
      case 'job_cutoff':
        return <JobShieldFlow key="job-2" initialStep={2} onNavigate={navigateTo} accent={accent} />;
      case 'job_expand':
        return <JobShieldFlow key="job-3" initialStep={3} onNavigate={navigateTo} accent={accent} />;
      case 'job_scanning':
        return <JobShieldFlow key="job-4" initialStep={4} onNavigate={navigateTo} accent={accent} />;
      case 'job_verdict':
        return <JobShieldFlow key="job-5" initialStep={5} onNavigate={navigateTo} accent={accent} />;

      // Romance Scam Flow (G - J)
      case 'chat_strange':
        return <ChatShieldFlow key="chat-1" initialStep={1} onNavigate={navigateTo} accent={accent} />;
      case 'chat_older_req':
        return <ChatShieldFlow key="chat-2" initialStep={2} onNavigate={navigateTo} accent={accent} />;
      case 'chat_scrolled':
        return <ChatShieldFlow key="chat-3" initialStep={3} onNavigate={navigateTo} accent={accent} />;
      case 'chat_verdict':
        return <ChatShieldFlow key="chat-4" initialStep={4} onNavigate={navigateTo} accent={accent} />;

      // Message SMS Flow (K - L)
      case 'notif_warning':
        return <MessageShieldFlow key="msg-1" initialStep={1} onNavigate={navigateTo} accent={accent} />;
      case 'notif_verdict':
        return <MessageShieldFlow key="msg-2" initialStep={2} onNavigate={navigateTo} accent={accent} />;

      // Agency Flow (M - N)
      case 'agency_page':
        return <AgencyShieldFlow key="agency-1" initialStep={1} onNavigate={navigateTo} accent={accent} />;
      case 'agency_verdict':
        return <AgencyShieldFlow key="agency-2" initialStep={2} onNavigate={navigateTo} accent={accent} />;

      // Shopping Flow (O - R)
      case 'shop_listing':
        return <MarketplaceShieldFlow key="shop-1" initialStep={1} onNavigate={navigateTo} accent={accent} />;
      case 'shop_seller_req':
        return <MarketplaceShieldFlow key="shop-2" initialStep={2} onNavigate={navigateTo} accent={accent} />;
      case 'shop_profile':
        return <MarketplaceShieldFlow key="shop-3" initialStep={3} onNavigate={navigateTo} accent={accent} />;
      case 'shop_verdict':
        return <MarketplaceShieldFlow key="shop-4" initialStep={4} onNavigate={navigateTo} accent={accent} />;

      default:
        return <HomeScreen onNavigate={navigateTo} accent={accent} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentScreenId={currentScreenId}
        setCurrentScreenId={setCurrentScreenId}
        accent={accent}
        setAccent={setAccent}
        deviceFrameMode={deviceFrameMode}
        setDeviceFrameMode={setDeviceFrameMode}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentTab === 'simulator' && (
          <div className="flex-1 overflow-y-auto py-8 px-4 flex justify-center items-start">
            {deviceFrameMode ? (
              <DeviceFrame
                title={currentScreenMeta.title}
                subtitle={`Category: ${currentScreenMeta.category}`}
              >
                {renderCurrentMobileScreen()}
              </DeviceFrame>
            ) : (
              <div className="w-full max-w-md h-[844px] bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                {renderCurrentMobileScreen()}
              </div>
            )}
          </div>
        )}

        {currentTab === 'taxonomy' && (
          <ScamTaxonomyView onNavigate={navigateTo} accent={accent} />
        )}

        {currentTab === 'pipeline' && (
          <CaseStudyArchitectureView onNavigate={navigateTo} accent={accent} />
        )}

        {currentTab === 'boards' && (
          <DesignBoardsView
            onSelectScreen={(screenId) => {
              setCurrentScreenId(screenId);
              if (screenId === 'scam_matrix') setCurrentTab('taxonomy');
              else if (screenId === 'case_study') setCurrentTab('pipeline');
              else setCurrentTab('simulator');
            }}
            activeScreenId={currentScreenId}
          />
        )}
      </main>
    </div>
  );
}
