import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * A reusable segmented control navbar for Staff and other dashboards, 
 * integrating the Zero-Scrolling mobile view from the Super Admin theme,
 * with optional desktop dropdown grouping for sub-items.
 * 
 * @param {Array} tabs - Array of tab objects: { id, label, description, IconComponent, isLive, isVisible, subItems }
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
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const desktopNavRef = useRef(null);

  // Close desktop dropdown when clicking anywhere outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (desktopNavRef.current && !desktopNavRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter only visible tabs for desktop
  const visibleTabs = tabs.filter(t => t.isVisible !== false);

  // For Mobile: Flatten any tab with subItems so mobile stays 100% flat, zero nesting, direct selection
  const flatMobileTabs = useMemo(() => {
    const flattened = [];
    visibleTabs.forEach(tab => {
      if (tab.subItems && tab.subItems.length > 0) {
        const activeSubs = tab.subItems.filter(s => s.isVisible !== false);
        activeSubs.forEach(sub => {
          flattened.push({
            ...sub,
            isLive: sub.isLive || false
          });
        });
      } else {
        flattened.push(tab);
      }
    });
    return flattened;
  }, [visibleTabs]);

  // For mobile view selector display
  const currentMobileTab = flatMobileTabs.find(t => t.id === activeTab) || flatMobileTabs[0];

  return (
    <nav className="navbar admin-navbar">
      <div className="admin-nav-container">
        
        {/* Desktop Navigation: Segmented Control Tabs */}
        <ul className="admin-nav-tabs admin-desktop-only" ref={desktopNavRef}>
          {visibleTabs.map((tab) => {
            const activeSubs = tab.subItems ? tab.subItems.filter(s => s.isVisible !== false) : [];
            const hasDropdown = activeSubs.length > 1;
            const isSingleSub = activeSubs.length === 1;

            // If it's a grouped tab with only 1 subItem, render that single subItem directly
            if (isSingleSub) {
              const singleItem = activeSubs[0];
              const isActive = activeTab === singleItem.id;
              return (
                <li
                  key={singleItem.id}
                  className={isActive ? "active" : ""}
                  onClick={() => singleItem.onClick ? singleItem.onClick() : setActiveTab(singleItem.id)}
                >
                  <span className="tab-link-button">
                    {singleItem.label}
                    {singleItem.isLive && <span className="admin-tab-live-badge">Live</span>}
                  </span>
                </li>
              );
            }

            // If it has multiple subItems, render as dropdown tab on desktop
            if (hasDropdown) {
              const isGroupActive = activeTab === tab.id || activeSubs.some(s => s.id === activeTab);
              const isOpen = openDropdownId === tab.id;

              return (
                <li
                  key={tab.id}
                  className={`has-dropdown ${isGroupActive ? "active" : ""} ${isOpen ? "dropdown-open" : ""}`}
                >
                  <span
                    className="tab-link-button tab-dropdown-trigger"
                    onClick={() => {
                      if (!isGroupActive) {
                        // Activate first subItem if coming from outside
                        setActiveTab(activeSubs[0].id);
                      }
                      setOpenDropdownId(isOpen ? null : tab.id);
                    }}
                  >
                    {tab.label}
                    <span className={`admin-tab-chevron ${isOpen ? "open" : ""}`}>▾</span>
                  </span>

                  <div className="admin-nav-dropdown-menu" role="menu">
                    {activeSubs.map((sub) => {
                      const isSubActive = activeTab === sub.id;
                      const SubIcon = sub.IconComponent;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          className={`admin-nav-dropdown-item ${isSubActive ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (sub.onClick) {
                              sub.onClick();
                            } else {
                              setActiveTab(sub.id);
                            }
                            setOpenDropdownId(null);
                          }}
                          role="menuitem"
                        >
                          {SubIcon && (
                            <span className="dropdown-item-icon">
                              <SubIcon width="15" height="15" />
                            </span>
                          )}
                          <span className="dropdown-item-label">{sub.label}</span>
                          {isSubActive && <span className="dropdown-item-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            }

            // Standard tab
            return (
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
            );
          })}
        </ul>

        {/* Mobile Navigation: View Selector Dropdown (Zero Scrolling, Flat List) */}
        <div className="admin-mobile-nav-wrapper admin-mobile-only">
          <button
            type="button"
            className={`admin-mobile-view-trigger ${isMobileNavOpen ? "open" : ""}`}
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            aria-expanded={isMobileNavOpen}
            aria-haspopup="true"
          >
            <div className="admin-mobile-trigger-left">
              {currentMobileTab?.IconComponent && (
                <span className="admin-mobile-trigger-icon">
                  <currentMobileTab.IconComponent width="18" height="18" />
                </span>
              )}
              <span className="admin-mobile-trigger-label">
                {currentMobileTab?.label || mobileTitle}
              </span>
              {currentMobileTab?.isLive && <span className="admin-tab-live-badge">Live</span>}
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
                  {flatMobileTabs.map((tab) => {
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
