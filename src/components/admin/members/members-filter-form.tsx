"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import {
  buildMembersFilterHref,
  type MembersListFilters,
} from "@/lib/members";

const sortOptions = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "joined-desc", label: "Date joined (newest first)" },
  { value: "joined-asc", label: "Date joined (oldest first)" },
] satisfies Array<{ value: MembersListFilters["sort"]; label: string }>;

export function MembersFilterForm({
  filters,
}: {
  filters: MembersListFilters;
}) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentFilters, setCurrentFilters] = useState(filters);
  const [query, setQuery] = useState(filters.q);

  const applyFilters = useCallback(
    (updates: Partial<Pick<MembersListFilters, "q" | "sort">>) => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      const baseFilters = {
        ...currentFilters,
        q: query,
      };
      const nextFilters = {
        ...baseFilters,
        ...updates,
        page: 1,
      };

      setCurrentFilters(nextFilters);
      router.replace(buildMembersFilterHref(baseFilters, updates), {
        scroll: false,
      });
    },
    [currentFilters, query, router],
  );

  useEffect(() => {
    if (query === currentFilters.q) return;

    debounceRef.current = setTimeout(() => {
      applyFilters({ q: query });
    }, 350);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [applyFilters, currentFilters.q, query]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters({ q: query });
  }

  return (
    <form
      className="grid gap-3 rounded-md border p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
      onSubmit={submitSearch}
    >
      <Input
        className="h-8 rounded-md"
        name="q"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name, username, email, or Keycloak id"
        type="search"
        value={query}
      />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Sort by
        <select
          className="h-8 min-w-0 rounded-md border bg-background px-2 text-xs text-foreground"
          value={currentFilters.sort}
          onChange={(event) => {
            const option = sortOptions.find(
              ({ value }) => value === event.target.value,
            );
            if (option) applyFilters({ sort: option.value });
          }}
        >
          {sortOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
