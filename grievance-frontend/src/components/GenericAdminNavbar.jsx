import React, { useState } from 'react';

/**
 * A reusable segmented control navbar for Staff and other dashboards, 
 * integrating the Zero-Scrolling mobile view from the Super Admin theme.
 * 
 * @param {Array} tabs - Array of tab objects: { id, label, description, IconComponent, isLive, isVisible }
 * @param {string} activeTab - Currently active tab id
 * @param {function} setActiveTab - Function to change active tab
 * @param {string} mobileTitle - Title to show in mobile view when no tab is selected
 */
function GenericAdminNavbar({ 
  tabs,
  activeTab, 
  setActiveTab,
  mobileTitle = "Dashboard"
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Filter only visible tabs (default to true if isVisible is not defined)
  const visibleTabs = tabs.filter(t => t.isVisible !== false);
  
  // For mobile dropdown display
  const currentTab = visibleTabs.find(t => t.id === activeTab) || visibleTabs[0];

  return (
    <nav className="navbar admin-navbar">
      <div className="admin-nav-container">
        
        {/* Desktop Navigation: Segmented Control Tabs */}
        <ul className="admin-nav-tabs admin-desktop-only">
          {visibleTabs.map((tab) => (
            <li 
              key={tab.id} 
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => tab.onClick ? tab.onClick() : setActiveTab(tab.id)}
            >
              <span className="tab-link-button">
                {tab.label}
                {tab.isLive && <span className="admin-tab-live-badge">Live</span>}
              </span>
            </li>
          ))}
        </ul>

        {/* Mobile Navigation: View Selector Dropdown (Zero Scrolling) */}
        <div className="admin-mobile-nav-wrapper admin-mobile-only">
          <button
            type="button"
            className={`admin-mobile-view-trigger ${isMobileNavOpen ? "open" : ""}`}
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            aria-expanded={isMobileNavOpen}
            aria-haspopup="true"
          >
            <div className="admin-mobile-trigger-left">
              {currentTab?.IconComponent && (
                <span className="admin-mobile-trigger-icon">
                  <currentTab.IconComponent width="18" height="18" />
                </span>
              )}
              <span className="admin-mobile-trigger-label">
                {currentTab?.label || mobileTitle}
              </span>
              {currentTab?.isLive && <span className="admin-tab-live-badge">Live</span>}
            </div>
            <div className="admin-mobile-trigger-right">
              <span className="admin-mobile-trigger-hint">Switch View</span>
              <span className={`admin-mobile-trigger-chevron ${isMobileNavOpen ? "rotated" : ""}`}>
                ▼
              </span>
            </div>
          </button>

          {isMobileNavOpen && (
            <>
              <div 
                className="admin-mobile-nav-backdrop" 
                onClick={() => setIsMobileNavOpen(false)} 
              />
              <div className="admin-mobile-nav-dropdown" role="menu">
                <div className="admin-mobile-dropdown-header">
                  <span className="admin-mobile-dropdown-title">Select Section</span>
                  <button
                    type="button"
                    className="admin-mobile-dropdown-close"
                    onClick={() => setIsMobileNavOpen(false)}
                    title="Close menu"
                  >
                    ✕
                  </button>
                </div>
                <div className="admin-mobile-dropdown-list">
                  {visibleTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const TabIcon = tab.IconComponent;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        className={`admin-mobile-dropdown-item ${isActive ? "active" : ""}`}
                        onClick={() => {
                          if (tab.onClick) {
                            tab.onClick();
                          } else {
                            setActiveTab(tab.id);
                          }
                          setIsMobileNavOpen(false);
                        }}
                        role="menuitem"
                      >
                        {TabIcon && (
                          <span className="admin-mitem-icon">
                            <TabIcon width="18" height="18" />
                          </span>
                        )}
                        <div className="admin-mitem-content">
                          <div className="admin-mitem-label-wrap">
                            <span className="admin-mitem-label">{tab.label}</span>
                            {tab.isLive && <span className="admin-tab-live-badge">Live</span>}
                          </div>
                          <span className="admin-mitem-desc">{tab.description || ""}</span>
                        </div>
                        {isActive ? (
                          <span className="admin-mitem-check" aria-hidden="true">✓</span>
                        ) : (
                          <span className="admin-mitem-arrow" aria-hidden="true">➔</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}

export default GenericAdminNavbar;
