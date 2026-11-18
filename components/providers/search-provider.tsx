"use client";

import React, { createContext, useContext, useState } from "react";

interface SearchContextValue {
  globalSearch: string;
  setGlobalSearch: (v: string) => void;
}

const SearchContext = createContext<SearchContextValue>({
  globalSearch: "",
  setGlobalSearch: () => {},
});

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [globalSearch, setGlobalSearch] = useState("");
  return (
    <SearchContext.Provider value={{ globalSearch, setGlobalSearch }}>
      {children}
    </SearchContext.Provider>
  );
}

export const useGlobalSearch = () => useContext(SearchContext);
