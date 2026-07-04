import React, { createContext, useState, useContext } from 'react';

const NavigationContext = createContext();

export function NavigationProvider({ children }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <NavigationContext.Provider value={{ isExpanded, setIsExpanded }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}
