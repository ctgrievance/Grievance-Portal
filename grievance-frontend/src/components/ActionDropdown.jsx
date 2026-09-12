import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";

export default function ActionDropdown({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(event.target);
      
      if (clickedOutsideDropdown && clickedOutsideMenu) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
        minWidth: '140px'
      });
    }
  }, [isOpen]);

  // Close dropdown on scroll to prevent detached menus
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener("scroll", handleScroll, true); // true for capture phase to catch all scrolls
    }
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  const menu = (
    <div className="action-dropdown-menu" style={menuStyle} ref={menuRef}>
      {/* We wrap children in a handler to close the dropdown on item click */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            onClick: (e) => {
              if (child.props.onClick) child.props.onClick(e);
              setIsOpen(false);
            },
            className: `${child.props.className || ""} action-dropdown-item`.trim()
          });
        }
        return child;
      })}
    </div>
  );

  return (
    <div className="action-dropdown-container" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
      <button 
        className="action-dropdown-toggle" 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        Actions ▼
      </button>
      {isOpen && ReactDOM.createPortal(menu, document.body)}
    </div>
  );
}
