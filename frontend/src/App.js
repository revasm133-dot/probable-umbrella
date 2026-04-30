import React, { useState } from "react";
import "@/App.css";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import ChatAssistant from "@/components/ChatAssistant";
import StatisticsCalculator from "@/components/StatisticsCalculator";
import WritingEditor from "@/components/WritingEditor";
import ReferenceManager from "@/components/ReferenceManager";
import ResearchData from "@/components/ResearchData";
import ProgressTracker from "@/components/ProgressTracker";

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard onNavigate={setActivePage} />;
      case "chat":
        return <ChatAssistant />;
      case "statistics":
        return <StatisticsCalculator />;
      case "writing":
        return <WritingEditor />;
      case "references":
        return <ReferenceManager />;
      case "data":
        return <ResearchData />;
      case "progress":
        return <ProgressTracker />;
      default:
        return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" data-testid="app-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="flex-1 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
