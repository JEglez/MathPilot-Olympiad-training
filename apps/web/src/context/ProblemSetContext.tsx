import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ProblemCard } from "../services/api";

interface ProblemSetContextValue {
  readonly problems: ProblemCard[];
  readonly add: (problem: ProblemCard) => void;
  readonly remove: (id: string) => void;
  readonly clear: () => void;
  readonly has: (id: string) => boolean;
}

const ProblemSetContext = createContext<ProblemSetContextValue | null>(null);

export interface ProblemSetProviderProps {
  readonly children: ReactNode;
}

export function ProblemSetProvider({ children }: ProblemSetProviderProps) {
  const [problems, setProblems] = useState<ProblemCard[]>([]);

  const add = useCallback((problem: ProblemCard) => {
    setProblems((prev) =>
      prev.some((p) => p.id === problem.id) ? prev : [...prev, problem]
    );
  }, []);

  const remove = useCallback((id: string) => {
    setProblems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clear = useCallback(() => setProblems([]), []);

  const has = useCallback(
    (id: string) => problems.some((p) => p.id === id),
    [problems]
  );

  const value = useMemo(
    () => ({ problems, add, remove, clear, has }),
    [problems, add, remove, clear, has]
  );

  return (
    <ProblemSetContext.Provider value={value}>
      {children}
    </ProblemSetContext.Provider>
  );
}

export function useProblemSet(): ProblemSetContextValue {
  const ctx = useContext(ProblemSetContext);
  if (!ctx) {
    throw new Error("useProblemSet must be used within a ProblemSetProvider");
  }
  return ctx;
}
