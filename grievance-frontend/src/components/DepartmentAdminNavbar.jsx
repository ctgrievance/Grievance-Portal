import React, { useState } from 'react';
import SmartAssignmentNavLink from './SmartAssignmentNavLink';
import { 
  ClipboardIcon, 
  StudentIcon, 
  StaffIcon, 
  UsersIcon, 
  ShieldIcon, 
  SparklesIcon 
} from './Icons';

/**
 * A reusable segmented control navbar for Department Admins, 
 * integrating the Zero-Scrolling mobile view from the Super Admin theme.
 */
function DepartmentAdminNavbar({ 
  activeTab, 
  setActiveTab, 
  allowStudentRecords, 
  allowStaffRecords, 
  allowRegisteredStudents, 
  allowRegisteredStaff,
  departmentName
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Define available tabs based on permissions
  const allTabs = [
    { 
      id: "grievances", 
      label: `${departmentName} Grievances`, 
      description: "Manage incoming grievances", 
      IconComponent: ClipboardIcon, 
      isVisible: true 
    },
    { 
      id: "student_records", 
      label: "Student Records", 
      description: "View and manage student records", 
      IconComponent: StudentIcon, 
      isVisible: allowStudentRecords 
    },
    { 
      id: "staff_records", 
      label: "Staff Records", 
      description: "View and manage staff records", 
      IconComponent: StaffIcon, 
      isVisible: allowStaffRecords 
    },
    { 
      id: "registered_users", 
      label: "Registered Users", 
      description: "View system users", 
      IconComponent: UsersIcon, 
      isVisible: (allowRegisteredStudents || allowRegisteredStaff) 
    },
    { 
      id: "manage_staff", 
      label: "Manage Staff", 
      description: "Manage department staff", 
      IconComponent: ShieldIcon, 
      isVisible: true 
    },
    { 
      id: "smart_assignment", 
      label: "Smart Assignment", 
      description: "Configure routing rules", 
      IconComponent: SparklesIcon, 
      isVisible: true,
      isLinkComponent: true // Renders as SmartAssignmentNavLink
    }
  ];

  // Filter only visible tabs
  const visibleTabs = allTabs.filter(t => t.isVisible);
  
  // For mobile dropdown display
  const currentTab = visibleTabs.find(t => t.id === activeTab) || visibleTabs[0];

  return (
    <nav className="navbar admin-navbar">
      <div className="admin-nav-container">
        
        {/* Desktop Navigation: Segmented Control Tabs */}
        <ul className="admin-nav-tabs admin-desktop-only">
          {visibleTabs.map((tab) => {
            // Special handling for Smart Assignment which uses a Link internally
            if (tab.isLinkComponent) {
              return (
                <li key={tab.id} className={activeTab === tab.id ? "active" : ""}>
                  <SmartAssignmentNavLink department={departmentName} />
                </li>
              );
            }

            return (
              <li 
                key={tab.id} 
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-link-button">
                  {tab.label}
                </span>
              </li>
            );
          })}
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
                {currentTab?.label || `${departmentName} Dashboard`}
              </span>
            </div>
            <div className="admin-mobile-trigger-right">
              <span className="admin-mobile-trigger-hint">Switch View</span>
              <span className={`admin-mobile-trigger-chevron ${isMobileNavOpen ? "rotated" : ""}`}>
                ▾
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

                    // If it's a link component, we just wrap SmartAssignmentNavLink in a way that looks like the dropdown item
                    if (tab.isLinkComponent) {
                      return (
                        <div 
                          key={tab.id} 
                          className="admin-mobile-dropdown-item-link-wrapper"
                          onClick={() => setIsMobileNavOpen(false)}
                          style={{ margin: 0, padding: 0 }}
                        >
                          <SmartAssignmentNavLink 
                            department={departmentName} 
                            isMobileDropdownItem={true} 
                          />
                        </div>
                      );
                    }

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        className={`admin-mobile-dropdown-item ${isActive ? "active" : ""}`}
                        onClick={() => {
                          setActiveTab(tab.id);
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
                          </div>
                          <span className="admin-mitem-desc">{tab.description}</span>
                        </div>
                        {isActive ? (
                          <span className="admin-mitem-check" aria-hidden="true">✓</span>
                        ) : (
                          <span className="admin-mitem-arrow" aria-hidden="true">›</span>
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

export default DepartmentAdminNavbar;
