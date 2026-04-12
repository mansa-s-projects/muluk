"use client";

import React, { createContext, useContext } from "react";

interface CreatorContextValue {
  userId: string;
  userEmail: string;
  handle: string;
}

const CreatorContext = createContext<CreatorContextValue | null>(null);

export function CreatorProvider({
  children,
  userId,
  userEmail,
  handle,
}: {
  children: React.ReactNode;
  userId: string;
  userEmail: string;
  handle: string;
}) {
  return (
    <CreatorContext.Provider value={{ userId, userEmail, handle }}>
      {children}
    </CreatorContext.Provider>
  );
}

export function useCreator(): CreatorContextValue {
  const ctx = useContext(CreatorContext);
  if (!ctx) throw new Error("useCreator must be used inside CreatorProvider");
  return ctx;
}
