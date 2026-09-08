"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import {
  AFTER_EXAMPLES,
  BEFORE_EXAMPLES,
  type AppState,
  type DraftRecord,
  type Journey,
  type ListItem,
  type Memory,
  type Pet,
} from "./types";
import { dateKey, uid, track } from "./format";
import { deleteAccount, pullAccount, pushAccount, type CloudStatus } from "./cloud";

const KEY = "petmemory:v1";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function empty(): AppState {
  return {
    accountId: uid("acc"),
    loggedIn: false,
    loginAt: null,
    pet: null,
    items: [],
    memories: [],
    seeded: { before: false, after: false },
  };
}

function load(): AppState {
  const fallback = empty();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.loggedIn && parsed.loginAt && Date.now() - parsed.loginAt > SESSION_MS) {
      return {
        ...fallback,
        ...parsed,
        accountId: parsed.accountId || fallback.accountId,
        loggedIn: false,
        loginAt: null,
      };
    }
    return {
      ...fallback,
      ...parsed,
      accountId: parsed.accountId || fallback.accountId,
    };
  } catch {
    return fallback;
  }
}

function examplesFor(journey: Journey, now: number): ListItem[] {
  const titles = journey === "before" ? BEFORE_EXAMPLES : AFTER_EXAMPLES;
  return titles.map((title) => ({
    id: uid("item"),
    journey,
    title,
    createdAt: now,
    isExample: true,
  }));
}

function cloudPayload(s: AppState) {
  return {
    id: s.accountId,
    pet: s.pet,
    items: s.items,
    memories: s.memories,
    seeded: s.seeded,
    loginAt: s.loginAt,
  };
}

type Store = AppState & {
  hydrated: boolean;
  cloudStatus: CloudStatus;
  querying: boolean;
  showSkeleton: boolean;
  actionError: boolean;
  actionBusy: boolean;
  runAction: (fn: () => void) => Promise<CloudStatus>;
  login: (kakaoId?: string) => void;
  logout: () => void;
  withdraw: () => void;
  retryPull: () => void;
  retryPush: () => void;
  clearActionError: () => void;
  isSessionValid: () => boolean;
  parkForRelogin: (itemId?: string, draft?: DraftRecord) => void;
  completeOnboarding: (pet: Pet) => void;
  updatePet: (pet: Partial<Pet>) => void;
  switchJourney: (journey: Journey) => void;
  addItem: (title: string) => ListItem | null;
  renameItem: (id: string, title: string) => void;
  deleteItem: (id: string) => void;
  saveDraft: (id: string, draft: DraftRecord) => void;
  saveMemoryDraft: (id: string, draft: DraftRecord) => void;
  completeNew: (itemId: string, rec: Omit<Memory, "id" | "itemId" | "journey" | "createdAt" | "updatedAt" | "draft">) => Memory | null;
  updateMemory: (id: string, rec: Omit<Memory, "id" | "itemId" | "journey" | "createdAt" | "updatedAt" | "draft">) => void;
  deleteMemory: (id: string) => void;
  visibleItems: ListItem[];
  visibleMemories: Memory[];
  homeSlots: (Memory | null)[];
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(empty);
  const [hydrated, setHydrated] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("off");
  const [querying, setQuerying] = useState(false);
  const [slowQuery, setSlowQuery] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const skipPush = useRef(true);
  const actionLock = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const mutGen = useRef(0);
  const touch = () => {
    mutGen.current += 1;
  };

  const applyPushStatus = useCallback((status: CloudStatus) => {
    if (status === "error") setActionError(true);
    if (status === "ok") setActionError(false);
    if (status !== "off") setCloudStatus(status);
  }, []);

  const runPull = useCallback(async (accountId: string, seed?: AppState) => {
    const local = seed ?? stateRef.current;
    const genAtPull = mutGen.current;
    setQuerying(true);
    setSlowQuery(false);
    const timer = window.setTimeout(() => setSlowQuery(true), 500);
    try {
      const res = await pullAccount(accountId);
      setCloudStatus(res.status);
      if (res.status !== "ok" || !res.data) return;
      if (mutGen.current !== genAtPull) return;
      const remote = res.data;
      const hasRemote = remote.pet || remote.items.length || remote.memories.length;
      if (hasRemote) {
        skipPush.current = true;
        setState((s) => ({
          ...s,
          pet: remote.pet ?? s.pet,
          items: remote.items.length ? remote.items : s.items,
          memories: remote.memories.length ? remote.memories : s.memories,
          seeded: remote.seeded,
          loginAt: s.loggedIn ? s.loginAt : remote.loginAt,
        }));
        return;
      }
      if (local.pet || local.items.length || local.memories.length) {
        applyPushStatus(await pushAccount(cloudPayload({ ...local, accountId })));
      }
    } finally {
      window.clearTimeout(timer);
      setQuerying(false);
      setSlowQuery(false);
    }
  }, [applyPushStatus]);

  useEffect(() => {
    const local = load();
    stateRef.current = local;
    setState(local);
    setHydrated(true);
    void runPull(local.accountId, local);
  }, [runPull]);

  useEffect(() => {
    if (!hydrated) return;
    const expireIdle = () => {
      const s = stateRef.current;
      if (!s.loggedIn || !s.loginAt) return;
      if (Date.now() - s.loginAt <= SESSION_MS) return;
      touch();
      setState((prev) => ({ ...prev, loggedIn: false, loginAt: null }));
    };
    expireIdle();
    const timer = window.setInterval(expireIdle, 30_000);
    const onVis = () => {
      if (document.visibilityState === "visible") expireIdle();
    };
    window.addEventListener("focus", expireIdle);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", expireIdle);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipPush.current) {
      skipPush.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      pushAccount(cloudPayload(stateRef.current)).then(applyPushStatus);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [
    hydrated,
    state.accountId,
    state.pet,
    state.items,
    state.memories,
    state.seeded,
    state.loginAt,
    state.loggedIn,
    applyPushStatus,
  ]);

  const login = useCallback(
    (kakaoId?: string) => {
      touch();
      const prev = stateRef.current;
      const nextId = kakaoId ? `kakao_${kakaoId}` : prev.accountId;
      const next = { ...prev, accountId: nextId, loggedIn: true, loginAt: Date.now() };
      stateRef.current = next;
      skipPush.current = Boolean(kakaoId);
      const isNew = !prev.pet;
      setState(next);
      if (isNew) track("sign_up", { method: "kakao" });
      if (kakaoId) void runPull(nextId, next);
    },
    [runPull]
  );

  const retryPull = useCallback(() => {
    void runPull(stateRef.current.accountId);
  }, [runPull]);

  const retryPush = useCallback(() => {
    void pushAccount(cloudPayload(stateRef.current)).then(applyPushStatus);
  }, [applyPushStatus]);

  const runAction = useCallback(
    async (fn: () => void) => {
      if (actionLock.current) return "ok";
      actionLock.current = true;
      setActionBusy(true);
      try {
        skipPush.current = true;
        flushSync(fn);
        const status = await pushAccount(cloudPayload(stateRef.current));
        applyPushStatus(status);
        return status;
      } finally {
        actionLock.current = false;
        setActionBusy(false);
      }
    },
    [applyPushStatus]
  );

  const clearActionError = useCallback(() => setActionError(false), []);

  const isSessionValid = useCallback(() => {
    const s = stateRef.current;
    if (!s.loggedIn || !s.loginAt) return false;
    return Date.now() - s.loginAt <= SESSION_MS;
  }, []);

  const parkForRelogin = useCallback((itemId?: string, draft?: DraftRecord) => {
    touch();
    setState((s) => ({
      ...s,
      loggedIn: false,
      loginAt: null,
      items:
        itemId && draft
          ? s.items.map((it) => (it.id === itemId ? { ...it, draft } : it))
          : s.items,
    }));
  }, []);

  const logout = useCallback(() => {
    touch();
    setState((s) => ({
      ...s,
      loggedIn: false,
      loginAt: null,
      items: s.items.map((it) => {
        const { draft: _d, ...rest } = it;
        return rest;
      }),
    }));
    track("logout_complete");
  }, []);

  const withdraw = useCallback(() => {
    touch();
    const id = stateRef.current.accountId;
    deleteAccount(id);
    localStorage.removeItem(KEY);
    skipPush.current = true;
    setState(empty());
    track("account_delete_complete");
  }, []);

  const completeOnboarding = useCallback((pet: Pet) => {
    touch();
    const now = Date.now();
    setState((s) => ({
      ...s,
      pet,
      items: [...s.items, ...examplesFor(pet.journey, now)],
      seeded: { ...s.seeded, [pet.journey]: true },
    }));
    track("onboarding_complete", {
      pet_type: pet.species,
      journey_type: pet.journey,
    });
  }, []);

  const updatePet = useCallback((patch: Partial<Pet>) => {
    touch();
    setState((s) => (s.pet ? { ...s, pet: { ...s.pet, ...patch } } : s));
  }, []);

  const switchJourney = useCallback((journey: Journey) => {
    touch();
    setState((s) => {
      if (!s.pet) return s;
      const needSeed = !s.seeded[journey];
      const now = Date.now();
      return {
        ...s,
        pet: { ...s.pet, journey },
        items: needSeed ? [...s.items, ...examplesFor(journey, now)] : s.items,
        seeded: { ...s.seeded, [journey]: true },
      };
    });
  }, []);

  const addItem = useCallback((title: string) => {
    const t = title.trim();
    if (!t || t.length > 50) return null;
    touch();
    const created: ListItem = {
      id: uid("item"),
      journey: "before",
      title: t,
      createdAt: Date.now(),
      isExample: false,
    };
    setState((s) => {
      if (!s.pet) return s;
      created.journey = s.pet.journey;
      return { ...s, items: [created, ...s.items] };
    });
    track("list_item_create", { item_id: created.id, journey_type: created.journey });
    return created;
  }, []);

  const renameItem = useCallback((id: string, title: string) => {
    const t = title.trim();
    if (!t || t.length > 50) return;
    touch();
    setState((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? { ...it, title: t } : it)),
    }));
    track("list_item_edit", { item_id: id });
  }, []);

  const deleteItem = useCallback((id: string) => {
    touch();
    setState((s) => ({ ...s, items: s.items.filter((it) => it.id !== id) }));
    track("list_item_delete", { item_id: id });
  }, []);

  const saveDraft = useCallback((id: string, draft: DraftRecord) => {
    touch();
    setState((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? { ...it, draft } : it)),
    }));
  }, []);

  const saveMemoryDraft = useCallback((id: string, draft: DraftRecord) => {
    touch();
    setState((s) => ({
      ...s,
      memories: s.memories.map((m) => (m.id === id ? { ...m, draft } : m)),
    }));
  }, []);

  const completeNew = useCallback(
    (itemId: string, rec: Omit<Memory, "id" | "itemId" | "journey" | "createdAt" | "updatedAt" | "draft">) => {
      const now = Date.now();
      touch();
      const mem: Memory = {
        id: uid("mem"),
        itemId,
        journey: "before",
        ...rec,
        createdAt: now,
        updatedAt: now,
      };
      setState((s) => {
        const item = s.items.find((it) => it.id === itemId);
        if (!item) return s;
        mem.journey = item.journey;
        return {
          ...s,
          items: s.items.filter((it) => it.id !== itemId),
          memories: [mem, ...s.memories],
        };
      });
      track("record_complete", {
        journey_type: mem.journey,
        has_photo: mem.photos.length > 0,
        char_count: mem.story.length,
      });
      return mem;
    },
    []
  );

  const updateMemory = useCallback(
    (id: string, rec: Omit<Memory, "id" | "itemId" | "journey" | "createdAt" | "updatedAt" | "draft">) => {
      touch();
      setState((s) => ({
        ...s,
        memories: s.memories.map((m) =>
          m.id === id ? { ...m, ...rec, draft: undefined, updatedAt: Date.now() } : m
        ),
      }));
    },
    []
  );

  const deleteMemory = useCallback((id: string) => {
    touch();
    setState((s) => ({ ...s, memories: s.memories.filter((m) => m.id !== id) }));
    track("memory_card_delete", { item_id: id });
  }, []);

  const journey = state.pet?.journey ?? "before";

  const visibleItems = useMemo(
    () => state.items.filter((it) => it.journey === journey),
    [state.items, journey]
  );

  const visibleMemories = useMemo(() => {
    if (journey === "before") return state.memories.filter((m) => m.journey === "before");
    return state.memories;
  }, [state.memories, journey]);

  const homeSlots = useMemo(() => {
    const ofMode = state.memories.filter((m) => m.journey === journey);
    const latest = [...ofMode].sort((a, b) => dateKey(b.date) - dateKey(a.date)).slice(0, 5);
    const slots: (Memory | null)[] = [null, null, null, null, null];
    if (journey === "before") {
      latest.forEach((m, i) => {
        slots[i] = m;
      });
    } else {
      latest.forEach((m, i) => {
        slots[4 - i] = m;
      });
    }
    return slots;
  }, [state.memories, journey]);

  const value: Store = {
    ...state,
    hydrated,
    cloudStatus,
    querying,
    showSkeleton: querying && slowQuery,
    actionError,
    actionBusy,
    runAction,
    login,
    logout,
    withdraw,
    retryPull,
    retryPush,
    clearActionError,
    isSessionValid,
    parkForRelogin,
    completeOnboarding,
    updatePet,
    switchJourney,
    addItem,
    renameItem,
    deleteItem,
    saveDraft,
    saveMemoryDraft,
    completeNew,
    updateMemory,
    deleteMemory,
    visibleItems,
    visibleMemories,
    homeSlots,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore");
  return ctx;
}
