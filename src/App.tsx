import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Clipboard,
  Crown,
  DoorOpen,
  Heart,
  Home,
  Layers3,
  ListPlus,
  ListChecks,
  LoaderCircle,
  Plus,
  RefreshCw,
  Send,
  Shuffle,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  Utensils,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import DishCard from "./components/DishCard";
import DishForm, {
  type FoodOptionFormResult,
} from "./components/DishForm";
import {
  builtInCategories,
  builtInOptions,
} from "./data/foodTaxonomy";
import { randomPlayerName } from "./data/playerNames";
import {
  addRoomOption,
  createRoom,
  getRoom,
  getRoomWebSocketUrl,
  joinRoom,
  leaveRoom as leaveRoomApi,
  recordRoomVotes,
  resetRoom,
  startRoom,
} from "./lib/api";
import { createId, normalizeRoomCode } from "./lib/id";
import {
  summarizeResults,
  type CategoryResult,
  type FoodOptionResult,
} from "./lib/results";
import {
  mergeMemberLocalVotes,
  upsertLocalVote,
} from "./lib/roomVotes";
import {
  buildSingleSetupPreference,
  optionsForCategories,
  reconcileSelectedOptionIds,
  resolveDishPoolOptions,
  resolveSingleSetupPreference,
  type DishPoolView,
  type SingleSetupPath,
} from "./lib/singleSetup";
import {
  FOOD_SELECTION_PREFERENCE_KEY,
  guestFoodSelectionPreferenceStore,
} from "./lib/setupPreferenceStore";
import {
  clearCurrentMember,
  loadCurrentMember,
  loadPlayerName,
  loadUserFoodData,
  saveCurrentMember,
  savePlayerName,
  saveUserFoodData,
  USER_CATEGORIES_KEY,
  USER_OPTIONS_KEY,
} from "./lib/storage";
import type {
  FlowMode,
  FoodOption,
  Member,
  Room,
  SessionContext,
  Vote,
  VoteChoice,
} from "./types";

type RoomNotice = {
  id: number;
  message: string;
  action?: "leave-room";
};

type ViewDirection = "forward" | "back";
type IdentityPurpose = "setup" | "edit";
type SetupPurpose = "initial" | "reselect";
type RoomPendingAction =
  | "create"
  | "join"
  | "leave"
  | "start"
  | "reset"
  | "submit-votes";

function loadInitialView(): FlowMode {
  return loadPlayerName().trim() &&
    guestFoodSelectionPreferenceStore.load()
    ? "home"
    : "setup-choice";
}

function votesForMember(room: Room, memberId: string) {
  return room.votes.filter((vote) => vote.memberId === memberId);
}

function roomDishCount(room: Room) {
  return room.options.length || room.dishIds.length;
}

function memberIsDone(room: Room, memberId: string) {
  return votesForMember(room, memberId).length >= roomDishCount(room);
}

function roomIsDone(room: Room) {
  return room.members.length > 0 && room.members.every((member) => memberIsDone(room, member.id));
}

function getRoomStatusLabel(room: Room) {
  if (room.status === "waiting") return "等待加入";
  if (room.status === "finished") return "已汇总";
  return "选菜中";
}

function LoadingLabel({
  loading,
  icon,
  label,
  loadingLabel,
}: {
  loading: boolean;
  icon: ReactNode;
  label: string;
  loadingLabel?: string;
}) {
  return (
    <>
      {loading ? <LoaderCircle className="spinner-icon" size={18} /> : icon}
      {loading ? loadingLabel ?? label : label}
    </>
  );
}

type EmptyResultState = {
  title: string;
  message: string;
  imageSrc?: string;
  imageAlt?: string;
};

function ResultDishGrid({
  dishes,
  emptyState,
  celebrate = false,
}: {
  dishes: FoodOptionResult[];
  emptyState?: EmptyResultState;
  celebrate?: boolean;
}) {
  if (!dishes.length) {
    if (!emptyState) {
      return <p className="empty-state">暂无匹配菜品。</p>;
    }

    return (
      <div className="empty-result-card">
        {emptyState.imageSrc ? (
          <img src={emptyState.imageSrc} alt={emptyState.imageAlt ?? ""} />
        ) : null}
        <div>
          <h3>{emptyState.title}</h3>
          <p>{emptyState.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={celebrate ? "result-grid result-grid-celebrate" : "result-grid"}>
      {dishes.map(({ option, likes, likedBy }) => (
        <article className="result-dish" key={option.id}>
          <div>
            <p className="eyebrow">{option.path.join(" · ")}</p>
            <h3>{option.name}</h3>
          </div>
          <p>{option.description}</p>
          <div className="result-footer">
            <span>
              <Heart size={16} />
              {likes}
            </span>
            <span>{likedBy.map((member) => member.name).join("、")}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function CategoryBars({ categories }: { categories: CategoryResult[] }) {
  if (!categories.length) {
    return <p className="empty-state">还没有喜欢记录。</p>;
  }

  const maxLikes = Math.max(...categories.map((item) => item.likes));

  return (
    <div className="cuisine-bars">
      {categories.slice(0, 8).map((item) => (
        <div className="cuisine-row" key={item.category}>
          <span>{item.category}</span>
          <div className="bar-track">
            <div style={{ width: `${(item.likes / maxLikes) * 100}%` }} />
          </div>
          <strong>{item.likes}</strong>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<FlowMode>(loadInitialView);
  const [viewDirection, setViewDirection] =
    useState<ViewDirection>("forward");
  const [userFood, setUserFood] = useState(() => loadUserFoodData());
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [session, setSession] = useState<SessionContext | null>(null);
  const [singleVotes, setSingleVotes] = useState<Vote[]>([]);
  const [singleSessionOptions, setSingleSessionOptions] = useState<
    FoodOption[]
  >([]);
  const [singleSetupPath, setSingleSetupPath] =
    useState<SingleSetupPath | null>(null);
  const [setupPreference, setSetupPreference] = useState(() =>
    guestFoodSelectionPreferenceStore.load(),
  );
  const [setupPurpose, setSetupPurpose] =
    useState<SetupPurpose>("initial");
  const [dishPoolView, setDishPoolView] =
    useState<DishPoolView>("selected");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [setupError, setSetupError] = useState("");
  const [identityPurpose, setIdentityPurpose] =
    useState<IdentityPurpose>("setup");
  const [dishFormOpen, setDishFormOpen] = useState(false);
  const [playerName, setPlayerName] = useState(() => loadPlayerName());
  const [nameDraft, setNameDraft] = useState(() => loadPlayerName() || randomPlayerName());
  const [identityError, setIdentityError] = useState("");
  const [nickname, setNickname] = useState(() => loadPlayerName());
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomError, setRoomError] = useState("");
  const [roomPendingAction, setRoomPendingAction] =
    useState<RoomPendingAction | null>(null);
  const [roomLocalVotes, setRoomLocalVotes] = useState<Vote[]>([]);
  const [roomNotice, setRoomNotice] = useState<RoomNotice | null>(null);
  const [copied, setCopied] = useState(false);
  const previousRoomStatusRef = useRef<string | null>(null);
  const roomSocketRef = useRef<WebSocket | null>(null);

  const allCategories = useMemo(
    () => [...builtInCategories, ...userFood.categories],
    [userFood.categories],
  );
  const allOptions = useMemo(
    () =>
      [...builtInOptions, ...userFood.options].filter(
        (option) => option.status === "active" && option.selectable,
      ),
    [userFood.options],
  );
  const configuredOptions = useMemo(
    () => resolveSingleSetupPreference(allOptions, setupPreference),
    [allOptions, setupPreference],
  );
  const dishPoolOptions = useMemo(
    () => resolveDishPoolOptions(allOptions, setupPreference, dishPoolView),
    [allOptions, dishPoolView, setupPreference],
  );

  const sessionOptions = useMemo(() => {
    if (session?.kind === "single") return singleSessionOptions;
    if (session?.kind !== "room" || !currentRoom) return allOptions;
    if (currentRoom.options.length) return currentRoom.options;

    const optionById = new Map(
      allOptions.map((option) => [option.id, option]),
    );
    return currentRoom.dishIds
      .map((optionId) => optionById.get(optionId))
      .filter(Boolean) as FoodOption[];
  }, [allOptions, currentRoom, session?.kind, singleSessionOptions]);

  const visibleRoomVotes = useMemo(() => {
    if (session?.kind !== "room" || !currentRoom) return [];
    return mergeMemberLocalVotes(
      currentRoom.votes,
      roomLocalVotes,
      session.member.id,
    );
  }, [currentRoom, roomLocalVotes, session]);

  const memberVotes = useMemo(() => {
    if (!session) return [];
    if (session.kind === "single") return singleVotes;
    return visibleRoomVotes.filter(
      (vote) => vote.memberId === session.member.id,
    );
  }, [session, singleVotes, visibleRoomVotes]);

  const remainingOptions = useMemo(() => {
    const votedDishIds = new Set(memberVotes.map((vote) => vote.dishId));
    return sessionOptions.filter((option) => !votedDishIds.has(option.id));
  }, [memberVotes, sessionOptions]);

  const currentOption = remainingOptions[0] ?? null;
  const sessionMembers =
    session?.kind === "room" && currentRoom ? currentRoom.members : session ? [session.member] : [];
  const sessionVotes = session?.kind === "room" && currentRoom ? visibleRoomVotes : singleVotes;
  const results = summarizeResults(sessionOptions, sessionMembers, sessionVotes);
  const isRoomHost =
    session?.kind === "room" && currentRoom ? currentRoom.hostMemberId === session.member.id : false;
  const hasCompletedSetup =
    configuredOptions.length > 0 && Boolean(playerName.trim());
  const roomRequestPending = roomPendingAction !== null;
  const roomVoteSubmitting = roomPendingAction === "submit-votes";

  const navigate = (
    nextView: FlowMode,
    direction: ViewDirection = "forward",
  ) => {
    setViewDirection(direction);
    setView(nextView);
  };

  const filteredOptions = useMemo(
    () => optionsForCategories(allOptions, selectedCategoryIds),
    [allOptions, selectedCategoryIds],
  );

  const persistSetupPreference = (
    path: SingleSetupPath,
    optionIds: Iterable<string>,
  ) => {
    const preference = buildSingleSetupPreference(path, optionIds);
    if (!resolveSingleSetupPreference(allOptions, preference).length) {
      return false;
    }

    guestFoodSelectionPreferenceStore.save(preference);
    setSetupPreference(preference);
    clearCurrentMember();
    setSingleSessionOptions([]);
    setSingleVotes([]);
    setSession(null);
    return true;
  };

  const startDirectSetup = () => {
    setSingleSetupPath("all");
    setIdentityPurpose("setup");
    setSelectedCategoryIds([]);
    setSelectedOptionIds([]);
    setNameDraft(playerName || randomPlayerName());
    setIdentityError("");
    setSetupError("");

    if (setupPurpose === "reselect") {
      if (!persistSetupPreference("all", [])) {
        setSetupError("暂时没有可用菜品，先新增几道再试。");
        return;
      }
      navigate("home");
      return;
    }

    navigate("identity");
  };

  const startFilteredSetup = () => {
    setSingleSetupPath("filtered");
    setIdentityPurpose("setup");
    setSelectedCategoryIds([]);
    setSelectedOptionIds([]);
    setSetupError("");
    navigate("category-select");
  };

  const openIdentityEditor = () => {
    setIdentityPurpose("edit");
    setNameDraft(playerName || randomPlayerName());
    setIdentityError("");
    navigate("identity");
  };

  const submitIdentity = () => {
    const nextName = nameDraft.trim();
    if (!nextName) {
      setIdentityError("先给自己取个好玩的名字。");
      return;
    }

    savePlayerName(nextName);
    setPlayerName(nextName);
    setNickname(nextName);
    setIdentityError("");

    if (identityPurpose === "edit") {
      navigate("home", "back");
      return;
    }

    if (
      !persistSetupPreference(
        singleSetupPath ?? "all",
        selectedOptionIds,
      )
    ) {
      setIdentityError("这轮还没有选中任何菜品，先回去挑几道吧。");
      return;
    }

    navigate("home");
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);

  useEffect(() => {
    const selectedPreferenceIsEmpty =
      setupPreference?.mode === "selected" &&
      configuredOptions.length === 0;

    if (selectedPreferenceIsEmpty) {
      guestFoodSelectionPreferenceStore.clear();
      setSetupPreference(null);
      setSingleSessionOptions([]);
    }

    if (
      session?.kind !== "room" &&
      view === "home" &&
      (!setupPreference ||
        selectedPreferenceIsEmpty ||
        !playerName.trim())
    ) {
      setSetupPurpose(playerName.trim() ? "reselect" : "initial");
      navigate("setup-choice", "back");
    }
  }, [
    configuredOptions.length,
    playerName,
    session?.kind,
    setupPreference,
    view,
  ]);

  useEffect(() => {
    const restored = loadCurrentMember();
    if (!restored) return;

    getRoom(restored.roomCode)
      .then(({ room }) => {
        if (!room.members.some((member) => member.id === restored.member.id)) {
          clearCurrentMember();
          return;
        }

        setCurrentRoom(room);
        setSession({
          kind: "room",
          roomCode: restored.roomCode,
          member: restored.member,
        });
        setNickname(restored.member.name);
        if (!loadPlayerName()) {
          savePlayerName(restored.member.name);
          setPlayerName(restored.member.name);
          setNameDraft(restored.member.name);
        }
        setRoomCodeInput(restored.roomCode);
        setView("room");
      })
      .catch(() => {
        clearCurrentMember();
      });
  }, []);

  useEffect(() => {
    if (session?.kind !== "room" || !currentRoom) return;

    const statusKey = `${currentRoom.roomCode}:${currentRoom.status}`;
    const previousStatusKey = previousRoomStatusRef.current;
    previousRoomStatusRef.current = statusKey;

    if (currentRoom.status === "selecting" && view === "room" && !memberIsDone(currentRoom, session.member.id)) {
      setView("swipe");
      return;
    }

    if (currentRoom.status === "finished" && previousStatusKey !== statusKey && view !== "results") {
      setView("results");
    }
  }, [currentRoom, session, view]);

  useEffect(() => {
    if (session?.kind === "room" && currentRoom?.status === "selecting") {
      return;
    }

    setRoomLocalVotes([]);
  }, [currentRoom?.roomCode, currentRoom?.status, session?.kind]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === USER_CATEGORIES_KEY ||
        event.key === USER_OPTIONS_KEY
      ) {
        setUserFood(loadUserFoodData());
      }
      if (event.key === FOOD_SELECTION_PREFERENCE_KEY) {
        setSetupPreference(guestFoodSelectionPreferenceStore.load());
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    roomSocketRef.current?.close();
    roomSocketRef.current = null;

    if (session?.kind !== "room") return;

    const socket = new WebSocket(getRoomWebSocketUrl(session.roomCode));
    roomSocketRef.current = socket;

    socket.onopen = () => {
      setRoomError("");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          room?: Room;
          roomCode?: string;
          message?: string;
          notice?: string;
        };
        if (payload.type === "room_updated" && payload.room) {
          setCurrentRoom(payload.room);
          setRoomError("");
        }
        if (payload.type === "room_notice" && payload.roomCode === session.roomCode && payload.message) {
          setRoomNotice({
            id: Date.now(),
            message: payload.message,
            action: payload.notice === "all_others_left" ? "leave-room" : undefined,
          });
        }
        if (payload.type === "room_closed" && payload.roomCode === session.roomCode) {
          clearCurrentMember();
          setCurrentRoom(null);
          setSession(null);
          setRoomNotice(null);
          setView(hasCompletedSetup ? "home" : "setup-choice");
        }
      } catch {
        // Ignore malformed messages from a stale socket.
      }
    };

    socket.onerror = () => {
      setRoomError("房间实时同步连接失败，请确认 Node 后端正在运行。");
    };

    return () => {
      socket.close();
      if (roomSocketRef.current === socket) {
        roomSocketRef.current = null;
      }
    };
  }, [hasCompletedSetup, session]);

  useEffect(() => {
    if (!roomNotice || roomNotice.action) return;

    const timer = window.setTimeout(() => {
      setRoomNotice((current) => (current?.id === roomNotice.id ? null : current));
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [roomNotice]);

  const addOption = ({ category, option }: FoodOptionFormResult) => {
    const nextCategories =
      category.source === "custom" &&
      !userFood.categories.some((item) => item.id === category.id)
        ? [...userFood.categories, category]
        : userFood.categories;
    const nextOptions = [...userFood.options, option];
    setUserFood({ categories: nextCategories, options: nextOptions });
    saveUserFoodData(nextCategories, nextOptions);

    if (session?.kind === "room" && currentRoom?.status === "waiting") {
      addRoomOption(currentRoom.roomCode, option, session.member.id)
        .then(({ room }) => setCurrentRoom(room))
        .catch((error: Error) => setRoomError(error.message));
    }

    setDishFormOpen(false);
  };

  const continueFromCategories = () => {
    if (!selectedCategoryIds.length) {
      setSetupError("至少选一个分类，不然菜单会有点空虚。");
      return;
    }

    setSelectedOptionIds((current) =>
      reconcileSelectedOptionIds(
        allOptions,
        selectedCategoryIds,
        current,
      ),
    );
    setSetupError("");
    navigate("option-select");
  };

  const continueFromOptions = () => {
    if (!selectedOptionIds.length) {
      setSetupError("至少挑一道想滑的菜品。");
      return;
    }

    setSingleSetupPath("filtered");
    if (setupPurpose === "reselect") {
      if (!persistSetupPreference("filtered", selectedOptionIds)) {
        setSetupError("选中的菜品已经不可用，请重新挑选。");
        return;
      }
      setSetupError("");
      navigate("home");
      return;
    }

    setIdentityPurpose("setup");
    setNameDraft(playerName || randomPlayerName());
    setIdentityError("");
    setSetupError("");
    navigate("identity");
  };

  const beginSingleRound = (name: string, options: FoodOption[]) => {
    if (!options.length) {
      navigate("setup-choice", "back");
      return;
    }

    const member: Member = {
      id: createId("member"),
      name: name || randomPlayerName(),
      joinedAt: Date.now(),
    };

    setSingleSessionOptions(options);
    setSingleVotes([]);
    setSession({ kind: "single", member });
    navigate("swipe");
  };

  const startSingleGame = () => {
    if (!hasCompletedSetup) {
      navigate("setup-choice", "back");
      return;
    }

    beginSingleRound(playerName, configuredOptions);
  };

  const restartSingle = () => {
    const name = session?.kind === "single" ? session.member.name : playerName;
    beginSingleRound(name, singleSessionOptions);
  };

  const restartSetup = () => {
    guestFoodSelectionPreferenceStore.clear();
    setSetupPreference(null);
    setSetupPurpose("reselect");
    setSingleSetupPath(null);
    setSelectedCategoryIds([]);
    setSelectedOptionIds([]);
    setSingleSessionOptions([]);
    setSingleVotes([]);
    setSetupError("");
    setIdentityError("");
    navigate("setup-choice");
  };

  const openDishPool = () => {
    setDishPoolView("selected");
    navigate("dish-pool");
  };

  const leaveRoom = async () => {
    if (roomRequestPending) return;

    setRoomPendingAction("leave");

    try {
      if (session?.kind === "room" && currentRoom) {
        try {
          await leaveRoomApi(currentRoom.roomCode, session.member.id);
        } catch (error) {
          const message = error instanceof Error ? error.message : "退出房间失败，请稍后再试。";
          if (!message.includes("已经不在")) {
            setRoomError(message);
            return;
          }
        }
      }

      clearCurrentMember();
      roomSocketRef.current?.close();
      setCurrentRoom(null);
      setSession(null);
      setSingleVotes([]);
      setRoomLocalVotes([]);
      setRoomError("");
      setRoomNotice(null);
      setCopied(false);
      navigate(hasCompletedSetup ? "home" : "setup-choice", "back");
    } finally {
      setRoomPendingAction(null);
    }
  };

  const enterRoom = async (action: "create" | "join") => {
    if (roomRequestPending) return;

    const name = nickname.trim() || playerName.trim();
    let roomCode = normalizeRoomCode(roomCodeInput);

    if (!name) {
      setRoomError("请输入昵称。");
      return;
    }

    if (action === "create" && !configuredOptions.length) {
      setRoomError("当前还没有已选菜品，先去菜品池重选一批。");
      return;
    }

    if (action === "join" && !roomCode) {
      setRoomError("请输入房间码。");
      return;
    }

    setRoomPendingAction(action);

    try {
      savePlayerName(name);
      setPlayerName(name);
      const restored = loadCurrentMember();
      const payload =
        action === "create"
          ? await createRoom(name, configuredOptions, roomCode || undefined)
          : await joinRoom(
              roomCode,
              name,
              restored?.roomCode === roomCode ? restored.member.id : undefined,
            );

      saveCurrentMember({ roomCode: payload.room.roomCode, member: payload.member });
      setCurrentRoom(payload.room);
      setSession({ kind: "room", roomCode: payload.room.roomCode, member: payload.member });
      setRoomLocalVotes([]);
      setNickname(name);
      setRoomCodeInput(payload.room.roomCode);
      setRoomError("");
      setView("room");
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : "房间接口请求失败。");
    } finally {
      setRoomPendingAction(null);
    }
  };

  const startRoomSelection = async () => {
    if (
      roomRequestPending ||
      session?.kind !== "room" ||
      !currentRoom ||
      !isRoomHost ||
      currentRoom.status !== "waiting" ||
      currentRoom.members.length < 2
    ) {
      return;
    }

    setRoomPendingAction("start");

    try {
      const { room } = await startRoom(currentRoom.roomCode, session.member.id);
      setCurrentRoom(room);
      setRoomLocalVotes([]);
      setRoomError("");
      setView("swipe");
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : "开始选菜失败。");
    } finally {
      setRoomPendingAction(null);
    }
  };

  const submitRoomVotes = async (votes: Vote[]) => {
    if (
      roomVoteSubmitting ||
      session?.kind !== "room" ||
      !currentRoom ||
      currentRoom.status !== "selecting"
    ) {
      return;
    }

    setRoomPendingAction("submit-votes");
    setRoomError("");

    try {
      const { room } = await recordRoomVotes(
        currentRoom.roomCode,
        session.member.id,
        votes,
      );
      setCurrentRoom(room);
      setRoomLocalVotes([]);
      setRoomError("");
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : "提交选择失败，请稍后再试。");
    } finally {
      setRoomPendingAction(null);
    }
  };

  const resetRoomVotes = async () => {
    if (
      roomRequestPending ||
      session?.kind !== "room" ||
      !currentRoom ||
      !isRoomHost
    ) {
      return;
    }

    setRoomPendingAction("reset");

    try {
      const { room } = await resetRoom(currentRoom.roomCode, session.member.id);
      setCurrentRoom(room);
      setRoomLocalVotes([]);
      setRoomError("");
      setView("room");
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : "开启新一轮失败。");
    } finally {
      setRoomPendingAction(null);
    }
  };

  const copyRoomCode = async () => {
    if (!currentRoom) return;
    await navigator.clipboard?.writeText(currentRoom.roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const confirmExitGame = async () => {
    if (!session) return;

    const confirmed = window.confirm(
      session.kind === "room"
        ? "确定退出这轮房间吗？你的选菜进度会从房间里移除。"
        : "确定退出这轮选菜吗？",
    );
    if (!confirmed) return;

    if (session.kind === "room") {
      await leaveRoom();
      return;
    }

    setSession(null);
    setSingleVotes([]);
    navigate("home", "back");
  };

  const recordVote = async (choice: VoteChoice) => {
    if (!session || !currentOption || roomVoteSubmitting) return;

    const vote: Vote = {
      memberId: session.member.id,
      dishId: currentOption.id,
      choice,
    };

    if (session.kind === "single") {
      setSingleVotes((currentVotes) => [
        ...currentVotes.filter(
          (item) => !(item.memberId === vote.memberId && item.dishId === vote.dishId),
        ),
        vote,
      ]);
      return;
    }

    if (!currentRoom || currentRoom.status !== "selecting") return;

    const nextVotes = upsertLocalVote(roomLocalVotes, vote);
    const nextMemberVotes = mergeMemberLocalVotes(
      currentRoom.votes,
      nextVotes,
      session.member.id,
    ).filter((item) => item.memberId === session.member.id);
    setRoomLocalVotes(nextVotes);
    setRoomError("");

    if (nextMemberVotes.length >= sessionOptions.length) {
      void submitRoomVotes(nextVotes);
    }
  };

  const renderSetupChoice = () => (
    <main className="startup-choice-layout">
      <section className="startup-choice-heading">
        <p className="eyebrow">
          {setupPurpose === "reselect" ? "重新选择" : "开始之前"}
        </p>
        <h1>
          {setupPurpose === "reselect"
            ? "换一份更合胃口的菜品池"
            : "先定一下这轮从哪些菜里选"}
        </h1>
        <p>
          {setupPurpose === "reselect"
            ? "名字已经替你留着，这次只需要重新挑菜。"
            : "直接使用全部菜品，或者先筛出一份更对胃口的菜单。"}
        </p>
      </section>

      <section className="mode-grid startup-choice-grid">
        <button
          className="mode-tile"
          type="button"
          onClick={startDirectSetup}
        >
          <UserRound size={30} />
          <span>直接开始</span>
          <small>使用全部 {allOptions.length} 道菜</small>
        </button>
        <button
          className="mode-tile"
          type="button"
          onClick={startFilteredSetup}
        >
          <ListChecks size={30} />
          <span>自选菜品</span>
          <small>先选择分类和具体菜品</small>
        </button>
      </section>
    </main>
  );

  const renderSetupStepper = (
    currentStep: "category-select" | "option-select" | "identity",
  ) => {
    const steps: Array<{
      id: "category-select" | "option-select" | "identity";
      label: string;
    }> = [
      { id: "category-select", label: "选择分类" },
      { id: "option-select", label: "选择菜品" },
      ...(setupPurpose === "initial"
        ? [{ id: "identity" as const, label: "输入名字" }]
        : []),
    ];
    const currentIndex = steps.findIndex((step) => step.id === currentStep);

    return (
      <ol
        className="setup-stepper"
        data-step-count={steps.length}
        aria-label="初筛进度"
      >
        {steps.map((step, index) => {
          const state =
            index < currentIndex
              ? "complete"
              : index === currentIndex
                ? "current"
                : "upcoming";

          return (
            <li
              className="setup-step"
              data-state={state}
              key={step.id}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="setup-step-marker">
                {state === "complete" ? <Check size={15} /> : index + 1}
              </span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
    );
  };

  const renderCategorySelect = () => {
    const availableCategories = allCategories.filter(
      (category) => category.status === "active",
    );

    return (
      <main className="setup-layout">
        {renderSetupStepper("category-select")}
        <section className="setup-heading">
          <button
            className="text-button"
            type="button"
            onClick={() => navigate("setup-choice", "back")}
          >
            <ArrowLeft size={18} />
            返回
          </button>
          <div>
            <p className="eyebrow">先圈个范围</p>
            <h1>今天想从哪些分类里选？</h1>
          </div>
          <span className="setup-count">
            已选 {selectedCategoryIds.length} 个
          </span>
        </section>

        <section className="category-selection-grid">
          {availableCategories.map((category) => {
            const selected = selectedCategoryIds.includes(category.id);
            const optionCount = allOptions.filter(
              (option) => option.categoryId === category.id,
            ).length;

            return (
              <button
                className="category-selection"
                data-selected={selected}
                type="button"
                key={category.id}
                aria-pressed={selected}
                onClick={() => {
                  setSelectedCategoryIds((current) =>
                    selected
                      ? current.filter((id) => id !== category.id)
                      : [...current, category.id],
                  );
                  setSetupError("");
                }}
              >
                <span className="selection-check">
                  {selected ? <CircleCheck size={22} /> : <Layers3 size={22} />}
                </span>
                <strong>{category.name}</strong>
                <span>{optionCount} 个选择</span>
              </button>
            );
          })}
        </section>

        <section className="setup-actions">
          <div>
            {setupError ? <p className="form-error">{setupError}</p> : null}
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={continueFromCategories}
          >
            下一步
            <ArrowRight size={18} />
          </button>
        </section>
      </main>
    );
  };

  const renderOptionSelect = () => (
    <main className="setup-layout">
      {renderSetupStepper("option-select")}
      <section className="setup-heading">
        <button
          className="text-button"
          type="button"
          onClick={() => navigate("category-select", "back")}
        >
          <ArrowLeft size={18} />
          返回
        </button>
        <div>
          <p className="eyebrow">再挑得具体一点</p>
          <h1>这些菜，哪些值得进入牌组？</h1>
        </div>
        <span className="setup-count">已选 {selectedOptionIds.length} 道</span>
      </section>

      <div className="option-selection-toolbar">
        <span>共 {filteredOptions.length} 道候选</span>
        <div>
          <button
            className="secondary-button compact"
            type="button"
            onClick={() => {
              setSelectedOptionIds(filteredOptions.map((option) => option.id));
              setSetupError("");
            }}
          >
            <ListChecks size={17} />
            全选
          </button>
          <button
            className="ghost-button compact"
            type="button"
            onClick={() => {
              setSelectedOptionIds([]);
              setSetupError("");
            }}
          >
            清空
          </button>
        </div>
      </div>

      <section className="option-selection-groups">
        {selectedCategoryIds.map((categoryId) => {
          const category = allCategories.find((item) => item.id === categoryId);
          const categoryOptions = filteredOptions.filter(
            (option) => option.categoryId === categoryId,
          );
          if (!category || !categoryOptions.length) return null;

          return (
            <div className="option-selection-group" key={categoryId}>
              <div className="option-group-heading">
                <h2>{category.name}</h2>
                <span>{categoryOptions.length} 道</span>
              </div>
              <div className="option-selection-grid">
                {categoryOptions.map((option) => {
                  const selected = selectedOptionIds.includes(option.id);

                  return (
                    <button
                      className="option-selection"
                      data-selected={selected}
                      type="button"
                      key={option.id}
                      aria-pressed={selected}
                      onClick={() => {
                        setSelectedOptionIds((current) =>
                          selected
                            ? current.filter((id) => id !== option.id)
                            : [...current, option.id],
                        );
                        setSetupError("");
                      }}
                    >
                      <img src={option.imageUrl} alt="" />
                      <span>{option.name}</span>
                      {selected ? (
                        <span className="option-selection-check">
                          <CircleCheck size={21} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="setup-actions">
        <div>
          {setupError ? <p className="form-error">{setupError}</p> : null}
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={continueFromOptions}
        >
          {setupPurpose === "reselect" ? (
            <>
              <Check size={18} />
              保存并返回首页
            </>
          ) : (
            <>
              下一步
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </section>
    </main>
  );

  const renderIdentity = () => {
    const isFilteredSetup =
      identityPurpose === "setup" && singleSetupPath === "filtered";
    const backView: FlowMode =
      identityPurpose === "edit"
        ? "home"
        : isFilteredSetup
          ? "option-select"
          : "setup-choice";

    return (
      <main className="setup-layout identity-page">
        {isFilteredSetup ? renderSetupStepper("identity") : null}
        <section className="setup-heading">
          <button
            className="text-button"
            type="button"
            onClick={() => navigate(backView, "back")}
          >
            <ArrowLeft size={18} />
            返回
          </button>
          <div>
            <p className="eyebrow">
              {identityPurpose === "edit" ? "修改身份" : "最后一步"}
            </p>
            <h1>
              {identityPurpose === "edit"
                ? "换个干饭代号"
                : "今天你是谁来选菜？"}
            </h1>
          </div>
        </section>

        <form
          className="identity-page-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitIdentity();
          }}
        >
          <div className="identity-input-row">
            <label>
              昵称
              <input
                value={nameDraft}
                onChange={(event) => {
                  setNameDraft(event.target.value);
                  setIdentityError("");
                }}
                placeholder="输入你的干饭代号"
                autoFocus
              />
            </label>
            <button
              className="icon-button dice-button"
              type="button"
              onClick={() => {
                setNameDraft(randomPlayerName());
                setIdentityError("");
              }}
              title="随机昵称"
              aria-label="随机昵称"
            >
              <Shuffle size={20} />
            </button>
          </div>
          {identityPurpose === "setup" ? (
            <div className="identity-round-summary">
              <span>本次菜品池</span>
              <strong>
                {singleSetupPath === "filtered"
                  ? `${selectedOptionIds.length} 道菜`
                  : `${allOptions.length} 道菜`}
              </strong>
            </div>
          ) : null}
          {identityError ? <p className="form-error">{identityError}</p> : null}
          <button className="primary-button" type="submit">
            <Check size={18} />
            {identityPurpose === "edit" ? "保存名字" : "进入首页"}
          </button>
        </form>
      </main>
    );
  };

  const renderHome = () => (
    <main className="home-layout">
      <section className="mode-panel">
        <div>
          <p className="eyebrow">今天吃什么</p>
          <h1>滑到大家都想吃的那道菜</h1>
        </div>

        <div className="mode-grid">
          <button
            className="mode-tile"
            type="button"
            onClick={startSingleGame}
          >
            <UserRound size={30} />
            <span>单人开选</span>
            <small>本次 {configuredOptions.length} 道菜</small>
          </button>
          <button
            className="mode-tile"
            type="button"
            onClick={() => navigate("room")}
          >
            <Users size={30} />
            <span>多人房间</span>
          </button>
          <button
            className="mode-tile"
            type="button"
            onClick={openDishPool}
          >
            <Layers3 size={30} />
            <span>菜品池</span>
            <small>已选 {configuredOptions.length} / 共 {allOptions.length} 道</small>
          </button>
        </div>
      </section>
    </main>
  );

  const renderDishPool = () => (
    <main className="dish-pool-layout">
      <section className="dish-pool-heading">
        <button
          className="text-button"
          type="button"
          onClick={() => navigate("home", "back")}
        >
          <ArrowLeft size={18} />
          返回首页
        </button>
        <div className="dish-pool-title-row">
          <div>
            <p className="eyebrow">菜品池</p>
            <h1>看看这轮有哪些候选</h1>
          </div>
          <div className="dish-pool-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={restartSetup}
            >
              <RefreshCw size={18} />
              重选菜品
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => setDishFormOpen(true)}
            >
              <ListPlus size={18} />
              新增菜品
            </button>
          </div>
        </div>
      </section>

      <section className="dish-pool-toolbar">
        <div
          className="segmented-control"
          role="group"
          aria-label="菜品池范围"
        >
          <button
            type="button"
            aria-pressed={dishPoolView === "selected"}
            onClick={() => setDishPoolView("selected")}
          >
            已选菜品
            <span>{configuredOptions.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={dishPoolView === "all"}
            onClick={() => setDishPoolView("all")}
          >
            总菜品池
            <span>{allOptions.length}</span>
          </button>
        </div>
        <p>
          {dishPoolView === "selected"
            ? `当前游戏使用 ${dishPoolOptions.length} 道菜`
            : `全部 ${dishPoolOptions.length} 道有效菜品`}
        </p>
      </section>

      {dishPoolOptions.length ? (
        <section className="dish-pool-grid">
          {dishPoolOptions.map((option) => (
            <article className="dish-pool-item" key={option.id}>
              <img src={option.imageUrl} alt="" />
              <div>
                <h2>{option.name}</h2>
                <p>{option.path.join(" · ")}</p>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="dish-pool-empty">
          <h2>这里还没有菜</h2>
          <p>重新选择一批菜品，就能继续开选。</p>
          <button
            className="primary-button"
            type="button"
            onClick={restartSetup}
          >
            <RefreshCw size={18} />
            重选菜品
          </button>
        </section>
      )}
    </main>
  );

  const renderRoom = () => {
    if (session?.kind === "room" && currentRoom) {
      const done = roomIsDone(currentRoom);
      const currentMemberDone =
        visibleRoomVotes.filter((vote) => vote.memberId === session.member.id)
          .length >= roomDishCount(currentRoom);
      const canHostStart =
        isRoomHost &&
        currentRoom.status === "waiting" &&
        currentRoom.members.length >= 2 &&
        !roomRequestPending;

      return (
        <main className="room-layout">
          <section className="room-hero">
            <button
              className="text-button"
              type="button"
              onClick={() => {
                if (hasCompletedSetup) {
                  navigate("home", "back");
                  return;
                }
                void leaveRoom();
              }}
              disabled={roomPendingAction === "leave"}
            >
              <ArrowLeft size={18} />
              {roomPendingAction === "leave"
                ? "退出中"
                : hasCompletedSetup
                  ? "返回"
                  : "退出"}
            </button>
            <div>
              <p className="eyebrow">房间码</p>
              <div className="room-code-row">
                <h1>{currentRoom.roomCode}</h1>
                <button
                  className="icon-button"
                  type="button"
                  onClick={copyRoomCode}
                  title="复制房间码"
                  aria-label="复制房间码"
                >
                  {copied ? <Check size={20} /> : <Clipboard size={20} />}
                </button>
              </div>
            </div>
            <div className="room-actions">
              {currentRoom.status === "waiting" ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={startRoomSelection}
                  disabled={!canHostStart}
                >
                  <LoadingLabel
                    loading={roomPendingAction === "start"}
                    icon={<Send size={18} />}
                    label={isRoomHost ? "开始选菜" : "等待房主"}
                    loadingLabel="开始中"
                  />
                </button>
              ) : null}
              {currentRoom.status === "selecting" ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setView("swipe")}
                  disabled={roomVoteSubmitting}
                >
                  <Send size={18} />
                  {currentMemberDone ? "查看进度" : "继续选菜"}
                </button>
              ) : null}
              <button
                className={currentRoom.status === "finished" ? "primary-button" : "secondary-button"}
                type="button"
                onClick={() => setView("results")}
                disabled={currentRoom.status !== "finished" && !done}
              >
                <Trophy size={18} />
                查看汇总
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={resetRoomVotes}
                disabled={!isRoomHost || roomRequestPending}
              >
                <LoadingLabel
                  loading={roomPendingAction === "reset"}
                  icon={<RefreshCw size={18} />}
                  label="新一轮"
                  loadingLabel="重置中"
                />
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={leaveRoom}
                disabled={roomRequestPending}
              >
                <LoadingLabel
                  loading={roomPendingAction === "leave"}
                  icon={<DoorOpen size={18} />}
                  label="退出"
                  loadingLabel="退出中"
                />
              </button>
            </div>
            {roomError ? <p className="form-error">{roomError}</p> : null}
          </section>

          <section className="member-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">成员进度</p>
                <h2>{currentRoom.members.length} 人</h2>
              </div>
              <span className={done ? "status-pill ready" : "status-pill"}>
                {getRoomStatusLabel(currentRoom)}
              </span>
            </div>

            {currentRoom.status === "waiting" ? (
              <p className="room-note">
                {isRoomHost
                  ? currentRoom.members.length < 2
                    ? "把房间码发给朋友，至少 2 人加入后就能开始。"
                    : "人到齐后由你开始，所有人会一起进入选菜。"
                  : "你已加入房间，等房主开始后会自动进入选菜。"}
              </p>
            ) : null}

            <div className="member-list">
              {currentRoom.members.map((member) => {
                const votes = visibleRoomVotes.filter(
                  (vote) => vote.memberId === member.id,
                );
                const likes = votes.filter((vote) => vote.choice === "like").length;
                const dishCount = roomDishCount(currentRoom);
                const progress = Math.min(votes.length, dishCount);

                return (
                  <article className="member-row" key={member.id}>
                    <div>
                      <div className="member-name-row">
                        <p>{member.name}</p>
                        {member.id === currentRoom.hostMemberId ? (
                          <span className="host-pill">
                            <Crown size={14} />
                            房主
                          </span>
                        ) : null}
                      </div>
                      <span>
                        {likes} 喜欢 · {progress}/{dishCount}
                      </span>
                    </div>
                    <div className="progress-track" aria-label={`${member.name} 进度`}>
                      <div style={{ width: `${dishCount ? (progress / dishCount) * 100 : 0}%` }} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className="room-layout room-entry-layout">
        <section className="room-hero">
          <button
            className="text-button"
            type="button"
            onClick={() =>
              navigate(hasCompletedSetup ? "home" : "setup-choice", "back")
            }
          >
            <ArrowLeft size={18} />
            返回
          </button>
          <div>
            <p className="eyebrow">多人房间</p>
            <h1>同一个房间码，多个人一起滑</h1>
            <p className="room-note">
              创建房间会使用你当前已选的 {configuredOptions.length} 道菜；加入房间后，以房主创建时的菜品为准。
            </p>
          </div>
        </section>

        <section className="room-form-panel">
          <label>
            昵称
            <input
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                setRoomError("");
              }}
              placeholder="你的名字"
              disabled={roomRequestPending}
            />
          </label>
          <label>
            房间码
            <input
              value={roomCodeInput}
              onChange={(event) => {
                setRoomCodeInput(normalizeRoomCode(event.target.value));
                setRoomError("");
              }}
              placeholder="创建时可留空"
              disabled={roomRequestPending}
            />
          </label>
          {roomError ? <p className="form-error">{roomError}</p> : null}
          <div className="room-entry-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => enterRoom("create")}
              disabled={roomRequestPending}
            >
              <LoadingLabel
                loading={roomPendingAction === "create"}
                icon={<Plus size={18} />}
                label="创建房间"
                loadingLabel="创建中"
              />
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => enterRoom("join")}
              disabled={roomRequestPending}
            >
              <LoadingLabel
                loading={roomPendingAction === "join"}
                icon={<Users size={18} />}
                label="加入房间"
                loadingLabel="加入中"
              />
            </button>
          </div>
        </section>
      </main>
    );
  };

  const renderSwipe = () => {
    if (!session) return renderHome();

    if (session.kind === "room" && currentRoom?.status === "waiting") {
      return (
        <main className="done-layout">
          <section className="done-panel">
            <p className="eyebrow">等待房间开始</p>
            <h1>{isRoomHost ? "等大家加入后再开局" : "等房主开始选菜"}</h1>
            <p>
              {isRoomHost ? "至少两个人加入后，回到房间页点开始选菜。" : "房主开始后，这里会自动进入滑卡流程。"}
            </p>
            <div className="room-actions">
              <button className="primary-button" type="button" onClick={() => setView("room")}>
                <Users size={18} />
                房间状态
              </button>
            </div>
          </section>
        </main>
      );
    }

    if (session.kind === "room" && roomVoteSubmitting) {
      return (
        <main className="done-layout">
          <section className="done-panel submitting-panel" role="status">
            <LoaderCircle className="submission-spinner" size={44} />
            <p className="eyebrow">正在提交</p>
            <h1>把这一轮选择交给房间</h1>
            <p>正在统一保存 {roomLocalVotes.length} 道菜的选择，稍等一下。</p>
          </section>
        </main>
      );
    }

    if (session.kind === "room" && currentRoom?.status === "finished") {
      return renderResults();
    }

    const progress = sessionOptions.length - remainingOptions.length;
    const done =
      session.kind === "room" && currentRoom
        ? currentRoom.status === "finished" || roomIsDone(currentRoom)
        : remainingOptions.length === 0;

    if (!currentOption) {
      const roomSubmissionFailed =
        session.kind === "room" &&
        currentRoom?.status === "selecting" &&
        memberVotes.length >= sessionOptions.length &&
        Boolean(roomError);

      return (
        <main className="done-layout">
          <section className="done-panel">
            <p className="eyebrow">
              {roomSubmissionFailed
                ? "提交未完成"
                : session.kind === "room"
                  ? "房间"
                  : "单人"}
            </p>
            <h1>
              {roomSubmissionFailed
                ? "选择还在，网络没跟上"
                : done
                  ? "结果已经出炉"
                  : "你已经选完了"}
            </h1>
            <p>
              {roomSubmissionFailed
                ? roomError
                : session.kind === "room" && currentRoom && !done
                ? "等其他成员完成后，汇总页会按共同喜欢优先排序。"
                : "可以查看结果，也可以重新开一轮。"}
            </p>
            <div className="room-actions">
              {roomSubmissionFailed ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void submitRoomVotes(roomLocalVotes)}
                  disabled={roomRequestPending}
                >
                  <RefreshCw size={18} />
                  重新提交
                </button>
              ) : session.kind === "room" && currentRoom && !done ? (
                <button className="secondary-button" type="button" onClick={() => setView("room")}>
                  <Users size={18} />
                  成员进度
                </button>
              ) : (
                <button className="primary-button" type="button" onClick={() => setView("results")}>
                  <Trophy size={18} />
                  查看汇总
                </button>
              )}
              <button
                className="ghost-button"
                type="button"
                onClick={
                  session.kind === "single" ? restartSingle : resetRoomVotes
                }
                disabled={session.kind === "room" && roomRequestPending}
              >
                {session.kind === "room" ? (
                  <LoadingLabel
                    loading={roomPendingAction === "reset"}
                    icon={<RefreshCw size={18} />}
                    label="新一轮"
                    loadingLabel="重置中"
                  />
                ) : (
                  <>
                    <RefreshCw size={18} />
                    新一轮
                  </>
                )}
              </button>
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className="swipe-layout">
        <section className="swipe-topbar">
          <button
            className="text-button"
            type="button"
            onClick={confirmExitGame}
            disabled={roomRequestPending}
          >
            <LoadingLabel
              loading={roomPendingAction === "leave"}
              icon={<DoorOpen size={18} />}
              label="退出"
              loadingLabel="退出中"
            />
          </button>
          <div className="progress-summary">
            <span>
              {progress}/{sessionOptions.length}
            </span>
            <div className="progress-track">
              <div style={{ width: `${(progress / sessionOptions.length) * 100}%` }} />
            </div>
          </div>
        </section>

        <DishCard
          dish={currentOption}
          nextDishes={remainingOptions.slice(1, 3)}
          onVote={recordVote}
        />
      </main>
    );
  };

  const renderResults = () => {
    if (!session) return renderHome();

    const hasSharedFavorites = results.allLoved.length > 0;
    const sharedEmptyState =
      session.kind === "room"
        ? {
            title: "毫无默契",
            message: "这局菜单已经笑出声：大家的筷子完全没约好。",
            imageSrc: "/no-match-face.svg",
            imageAlt: "毫无默契表情",
          }
        : undefined;

    return (
      <main className="results-layout">
        <section className="results-hero">
          <button
            className="text-button"
            type="button"
            onClick={() => setView(session.kind === "room" ? "room" : "home")}
          >
            <ArrowLeft size={18} />
            返回
          </button>
          <div>
            <p className="eyebrow">汇总结果</p>
            <h1>{session.kind === "room" ? "大家共同喜欢的菜" : "你想吃的菜"}</h1>
          </div>
          <div className="room-actions">
            <button
              className="ghost-button"
              type="button"
              onClick={
                session.kind === "single" ? restartSingle : resetRoomVotes
              }
              disabled={
                session.kind === "room" && (!isRoomHost || roomRequestPending)
              }
            >
              {session.kind === "room" ? (
                <LoadingLabel
                  loading={roomPendingAction === "reset"}
                  icon={<RefreshCw size={18} />}
                  label="新一轮"
                  loadingLabel="重置中"
                />
              ) : (
                <>
                  <RefreshCw size={18} />
                  新一轮
                </>
              )}
            </button>
            <button className="secondary-button" type="button" onClick={() => setDishFormOpen(true)}>
              <ListPlus size={18} />
              新增菜品
            </button>
          </div>
        </section>

        <section
          className={hasSharedFavorites ? "result-section result-section-celebrate" : "result-section"}
        >
          {hasSharedFavorites ? (
            <div className="celebration-layer" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : null}
          <div className="section-heading">
            <div>
              <p className="eyebrow">第一梯队</p>
              <h2>共同喜欢</h2>
            </div>
            <div className="result-heading-actions">
              {hasSharedFavorites ? (
                <span className="celebration-pill">
                  <Sparkles size={15} />
                  全员命中
                </span>
              ) : null}
              <span className="count-pill">{results.allLoved.length}</span>
            </div>
          </div>
          <ResultDishGrid
            dishes={results.allLoved}
            emptyState={sharedEmptyState}
            celebrate={hasSharedFavorites}
          />
        </section>

        <section className="result-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">备选</p>
              <h2>多数喜欢</h2>
            </div>
            <span className="count-pill">{results.majorityLoved.length}</span>
          </div>
          <ResultDishGrid dishes={results.majorityLoved} />
        </section>

        <section className="result-section result-split">
          <div>
            <div className="section-heading">
              <div>
                <p className="eyebrow">菜系热度</p>
                <h2>喜欢票汇总</h2>
              </div>
            </div>
            <CategoryBars categories={results.categories} />
          </div>
          <div>
            <div className="section-heading">
              <div>
                <p className="eyebrow">个人</p>
                <h2>喜欢列表</h2>
              </div>
            </div>
            <div className="personal-list">
              {results.personalResults.map((item) => (
                <article className="personal-row" key={item.member.id}>
                  <p>{item.member.name}</p>
                  <div>
                    {item.options.length ? (
                      item.options
                        .slice(0, 10)
                        .map((option) => (
                          <span key={option.id}>{option.name}</span>
                        ))
                    ) : (
                      <span>暂无</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          className="brand-button"
          type="button"
          onClick={() => {
            if (session?.kind === "room") {
              navigate("room", "back");
              return;
            }
            navigate(hasCompletedSetup ? "home" : "setup-choice", "back");
          }}
        >
          <Utensils size={22} />
          <span>今天吃什么</span>
        </button>
        {hasCompletedSetup || session?.kind === "room" ? (
          <div className="header-actions">
            {hasCompletedSetup ? (
              <>
                {view !== "dish-pool" ? (
                  <button
                    className="secondary-button compact"
                    type="button"
                    onClick={() => setDishFormOpen(true)}
                  >
                    <ListPlus size={18} />
                    新增菜品
                  </button>
                ) : null}
                <button
                  className="name-chip"
                  type="button"
                  onClick={openIdentityEditor}
                  title="修改昵称"
                >
                  <UserRound size={16} />
                  <span>{playerName || "取名"}</span>
                </button>
              </>
            ) : null}
            {session ? (
              <button
                className="icon-button"
                type="button"
                onClick={leaveRoom}
                title={roomPendingAction === "leave" ? "退出中" : "回到首页"}
                disabled={roomRequestPending}
              >
                {roomPendingAction === "leave" ? (
                  <LoaderCircle className="spinner-icon" size={20} />
                ) : (
                  <Home size={20} />
                )}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      <div
        className="view-stage"
        data-direction={viewDirection}
        key={view}
      >
        {view === "setup-choice" ? renderSetupChoice() : null}
        {view === "home" ? renderHome() : null}
        {view === "dish-pool" ? renderDishPool() : null}
        {view === "category-select" ? renderCategorySelect() : null}
        {view === "option-select" ? renderOptionSelect() : null}
        {view === "identity" ? renderIdentity() : null}
        {view === "room" ? renderRoom() : null}
        {view === "swipe" ? renderSwipe() : null}
        {view === "results" ? renderResults() : null}
      </div>

      {dishFormOpen ? (
        <DishForm
          categories={allCategories}
          options={allOptions}
          onClose={() => setDishFormOpen(false)}
          onSubmit={addOption}
        />
      ) : null}
      {roomNotice ? (
        <div className="room-notice-toast" role="status">
          <p>{roomNotice.message}</p>
          {roomNotice.action === "leave-room" ? (
            <button
              className="secondary-button"
              type="button"
              onClick={leaveRoom}
              disabled={roomRequestPending}
            >
              <LoadingLabel
                loading={roomPendingAction === "leave"}
                icon={<DoorOpen size={18} />}
                label="退出房间"
                loadingLabel="退出中"
              />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
