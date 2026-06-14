import { useEffect, useMemo, useRef, useState } from "react";
import { getAiTradeRoutes } from "../features/aiProposals/aiProposalApi";
import type { AiTradeRoute } from "../features/aiProposals/aiProposalTypes";
import { getItems } from "../features/items/itemApi";
import type { Item } from "../features/items/itemTypes";
import { createTradeRequest, updateTradeRequestStatus } from "../features/tradeRequests/tradeRequestApi";
import { isCurrentUserResource } from "../features/users/currentUser";
import type { RegisteredUser } from "../features/users/userTypes";
import "./AiProposalScreen.css";

type AiProposalScreenProps = {
    currentUser: RegisteredUser;
    aiWarehouseFavoriteItemIds: string[];
};

type AiMode = "guided" | "auto";
type AutoStatus = "idle" | "running" | "paused" | "completed" | "blocked";
type SavedRouteStepStatus = "ready" | "requested" | "approved" | "completed";
type AutoRunStepStatus = "queued" | "requested" | "approved" | "completed";
type AutoRunLogLevel = "info" | "success" | "warning";

type SavedRouteStep = {
    id: string;
    fromItem: Item;
    toItem: Item;
    status: SavedRouteStepStatus;
    tradeRequestId?: string;
    requestedAt?: string;
    updatedAt?: string;
};

type SavedAiRoute = {
    id: string;
    title: string;
    summary: string;
    matchScore: number;
    source: AiTradeRoute["source"] | "manual";
    steps: SavedRouteStep[];
    createdAt: string;
    updatedAt: string;
};

type AutoRunStep = {
    id: string;
    fromItem: Item;
    toItem: Item;
    status: AutoRunStepStatus;
    reason: string;
    tradeRequestId?: string;
    requestedAt?: string;
    approvedAt?: string;
    completedAt?: string;
    updatedAt?: string;
};

type AutoRunLog = {
    id: string;
    at: string;
    level: AutoRunLogLevel;
    message: string;
};

type AutoRun = {
    id: string;
    title: string;
    summary: string;
    matchScore: number;
    source: AiTradeRoute["source"] | "manual";
    sourceItem: Item;
    goalItem: Item;
    currentItem: Item;
    activeStepIndex: number;
    steps: AutoRunStep[];
    logs: AutoRunLog[];
    createdAt: string;
    updatedAt: string;
};

const fallbackImageUrl = "/images/demo/generated/reading-card-500.png";
const savedRouteStorageKeyPrefix = "warashibe.savedAiRoutes";
const autoRunStorageKeyPrefix = "warashibe.autoAiRun";
const maxSavedRoutes = 8;
const maxAutoRunLogs = 24;
const autoStepDelayMs = 680;

function AiProposalScreen({
    currentUser,
    aiWarehouseFavoriteItemIds,
}: AiProposalScreenProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [mode, setMode] = useState<AiMode>("guided");
    const [guidedSourceItemId, setGuidedSourceItemId] = useState("");
    const [guidedGoalItemId, setGuidedGoalItemId] = useState("");
    const [guidedCandidateIndex, setGuidedCandidateIndex] = useState(0);
    const [autoSourceItemId, setAutoSourceItemId] = useState("");
    const [autoGoalItemId, setAutoGoalItemId] = useState("");
    const [acceptedRouteItemIds, setAcceptedRouteItemIds] = useState<string[]>([]);
    const [guidedAiRoutes, setGuidedAiRoutes] = useState<AiTradeRoute[]>([]);
    const [autoAiRoutes, setAutoAiRoutes] = useState<AiTradeRoute[]>([]);
    const [savedRoutes, setSavedRoutes] = useState<SavedAiRoute[]>([]);
    const [requestingStepId, setRequestingStepId] = useState("");
    const [autoRun, setAutoRun] = useState<AutoRun | undefined>();
    const [autoStatus, setAutoStatus] = useState<AutoStatus>("idle");
    const [isAutoProcessing, setIsAutoProcessing] = useState(false);
    const autoRunRef = useRef<AutoRun | undefined>(undefined);
    const autoStatusRef = useRef<AutoStatus>("idle");
    const isMountedRef = useRef(true);

    useEffect(() => {
        const loadItems = async () => {
            const itemsFromApi = await getItems();
            setItems(itemsFromApi);
        };

        loadItems();
    }, []);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        setSavedRoutes(getStoredSavedRoutes(currentUser.id));
    }, [currentUser.id]);

    useEffect(() => {
        const storedAutoRun = getStoredAutoRun(currentUser.id);
        const storedAutoStatus = storedAutoRun ? getStoredAutoRunStatus(storedAutoRun) : "idle";
        autoRunRef.current = storedAutoRun;
        autoStatusRef.current = storedAutoStatus;
        setAutoRun(storedAutoRun);
        setAutoStatus(storedAutoStatus);
    }, [currentUser.id]);

    const warehouseItems = useMemo(() => {
        return items.filter(
            (item) =>
                isAiWarehouseItem(item) &&
                isCurrentUserResource(item.ownerId, currentUser.id)
        );
    }, [currentUser.id, items]);

    const favoriteGoalItems = useMemo(() => {
        const favoriteItemIdSet = new Set(aiWarehouseFavoriteItemIds);

        return items.filter(
            (item) => isAiWarehouseItem(item) && favoriteItemIdSet.has(item.id)
        );
    }, [aiWarehouseFavoriteItemIds, items]);

    const guidedGoalItems = favoriteGoalItems.filter((item) => item.id !== guidedSourceItemId);
    const guidedSourceItem = findItem(items, guidedSourceItemId);
    const guidedGoalItem = findItem(items, guidedGoalItemId);
    const hasGuidedSelection = Boolean(guidedSourceItem && guidedGoalItem);
    const autoGoalItems = favoriteGoalItems.filter((item) => item.id !== autoSourceItemId);
    const autoSourceItem = findItem(items, autoSourceItemId);
    const autoGoalItem = findItem(items, autoGoalItemId);
    const hasAutoSelection = Boolean(autoSourceItem && autoGoalItem);

    useEffect(() => {
        if (
            guidedGoalItemId &&
            !favoriteGoalItems.some((item) => item.id === guidedGoalItemId)
        ) {
            setGuidedGoalItemId("");
        }

        if (
            autoGoalItemId &&
            !favoriteGoalItems.some((item) => item.id === autoGoalItemId)
        ) {
            setAutoGoalItemId("");
        }
    }, [autoGoalItemId, favoriteGoalItems, guidedGoalItemId]);

    useEffect(() => {
        if (
            guidedSourceItemId &&
            !warehouseItems.some((item) => item.id === guidedSourceItemId)
        ) {
            handleGuidedSourceChange("");
        }

        if (
            autoSourceItemId &&
            !warehouseItems.some((item) => item.id === autoSourceItemId)
        ) {
            handleAutoSourceChange("");
        }
    }, [autoSourceItemId, guidedSourceItemId, warehouseItems]);

    useEffect(() => {
        if (!guidedSourceItemId || !guidedGoalItemId || items.length === 0) {
            setGuidedAiRoutes([]);
            return;
        }

        let isActive = true;

        const loadAiRoutes = async () => {
            const result = await getAiTradeRoutes({
                sourceItemId: guidedSourceItemId,
                goalItemId: guidedGoalItemId,
                items,
                limit: 4,
            });

            if (!isActive) return;

            setGuidedAiRoutes(result.routes);
        };

        loadAiRoutes();

        return () => {
            isActive = false;
        };
    }, [guidedGoalItemId, guidedSourceItemId, items]);

    useEffect(() => {
        if (!autoSourceItemId || !autoGoalItemId || items.length === 0) {
            setAutoAiRoutes([]);
            return;
        }

        let isActive = true;

        const loadAiRoutes = async () => {
            const result = await getAiTradeRoutes({
                sourceItemId: autoSourceItemId,
                goalItemId: autoGoalItemId,
                items,
                limit: 4,
            });

            if (!isActive) return;

            setAutoAiRoutes(result.routes);
        };

        loadAiRoutes();

        return () => {
            isActive = false;
        };
    }, [autoGoalItemId, autoSourceItemId, items]);

    const guidedCandidates = useMemo(
        () =>
            items
                .filter((item) => item.id !== guidedSourceItem?.id && item.id !== guidedGoalItem?.id)
                .filter(isAiWarehouseItem)
                .filter((item) => item.status === "available")
                .sort(
                    (left, right) =>
                        scoreCandidate(right, guidedGoalItem, guidedSourceItem) -
                        scoreCandidate(left, guidedGoalItem, guidedSourceItem)
                ),
        [guidedGoalItem, guidedSourceItem, items]
    );
    const activeAiRoute = hasGuidedSelection
        ? guidedAiRoutes[guidedCandidateIndex % Math.max(guidedAiRoutes.length, 1)]
        : undefined;
    const aiCandidate = activeAiRoute
        ? findItem(items, activeAiRoute.steps[1]?.itemId ?? "")
        : undefined;
    const guidedCandidate =
        hasGuidedSelection
            ? aiCandidate ??
            guidedCandidates[guidedCandidateIndex % Math.max(guidedCandidates.length, 1)] ??
            guidedGoalItem ??
            guidedSourceItem
            : undefined;
    const autoCandidates = useMemo(
        () =>
            items
                .filter((item) => item.id !== autoSourceItem?.id && item.id !== autoGoalItem?.id)
                .filter(isAiWarehouseItem)
                .filter((item) => item.status === "available")
                .sort(
                    (left, right) =>
                        scoreCandidate(right, autoGoalItem, autoSourceItem) -
                        scoreCandidate(left, autoGoalItem, autoSourceItem)
                ),
        [autoGoalItem, autoSourceItem, items]
    );
    const autoAiRoute = hasAutoSelection ? autoAiRoutes[0] : undefined;
    const autoAiCandidate = autoAiRoute
        ? findItem(items, autoAiRoute.steps[1]?.itemId ?? "")
        : undefined;
    const routeItems = buildRouteItems(
        items,
        acceptedRouteItemIds,
        guidedCandidate,
        guidedGoalItem
    );
    const autoCandidate =
        hasAutoSelection
            ? autoAiCandidate ??
            autoCandidates[0] ??
            items.find((item) => item.title.includes("ヘッドホン")) ??
            autoGoalItem ??
            autoSourceItem
            : undefined;
    const autoRouteItems = buildAutoRouteItems(
        items,
        autoSourceItem,
        autoGoalItem,
        autoAiRoute,
        autoCandidate
    );
    const highValueNotice =
        autoCandidate !== undefined && autoCandidate.price >= 10000
            ? `${autoCandidate.title}は高額商品として検知済みです。通知だけ行い、自動交換は継続します。`
            : "高額商品を検知した場合も、通知だけ行って自動交換は継続します。";
    const canStartAutoMode =
        Boolean(autoSourceItem && autoGoalItem) &&
        autoRouteItems.length >= 2 &&
        autoStatus !== "running" &&
        !isAutoProcessing;

    const resetAutoRun = () => {
        clearStoredAutoRun(currentUser.id);
        autoRunRef.current = undefined;
        autoStatusRef.current = "idle";
        setAutoRun(undefined);
        setAutoStatus("idle");
        setIsAutoProcessing(false);
    };

    const updateAutoRun = (updater: (currentRun: AutoRun) => AutoRun) => {
        if (!isMountedRef.current) return;

        setAutoRun((currentRun) => {
            if (!currentRun) return currentRun;

            const nextRun = updater(currentRun);
            saveStoredAutoRun(currentUser.id, nextRun);
            autoRunRef.current = nextRun;
            return nextRun;
        });
    };

    const handleGuidedSourceChange = (itemId: string) => {
        setGuidedSourceItemId(itemId);
        setAcceptedRouteItemIds(itemId ? [itemId] : []);
        setGuidedCandidateIndex(0);
        if (itemId === guidedGoalItemId) {
            setGuidedGoalItemId("");
        }
    };

    const handleGuidedGoalChange = (itemId: string) => {
        setGuidedGoalItemId(itemId);
        setGuidedCandidateIndex(0);
    };

    const handleAutoSourceChange = (itemId: string) => {
        setAutoSourceItemId(itemId);
        if (itemId === autoGoalItemId) {
            setAutoGoalItemId("");
        }
        resetAutoRun();
    };

    const handleAutoGoalChange = (itemId: string) => {
        setAutoGoalItemId(itemId);
        resetAutoRun();
    };

    const handleStartAutoMode = () => {
        if (!autoSourceItem || !autoGoalItem || autoRouteItems.length < 2) {
            autoStatusRef.current = "blocked";
            setAutoStatus("blocked");
            return;
        }

        const nextAutoRun = createAutoRun(autoRouteItems, autoAiRoute);
        saveStoredAutoRun(currentUser.id, nextAutoRun);
        autoRunRef.current = nextAutoRun;
        autoStatusRef.current = "running";
        setAutoRun(nextAutoRun);
        setAutoStatus("running");
        setIsAutoProcessing(false);
    };

    const handleToggleAutoStatus = () => {
        setAutoStatus((currentStatus) => {
            const nextStatus =
                currentStatus === "running"
                    ? "paused"
                    : currentStatus === "paused"
                        ? "running"
                        : currentStatus;
            autoStatusRef.current = nextStatus;
            return nextStatus;
        });
    };

    const handleAcceptProposal = () => {
        if (!guidedCandidate) return;

        setGuidedSourceItemId(guidedCandidate.id);
        setAcceptedRouteItemIds((currentIds) => {
            if (currentIds.includes(guidedCandidate.id)) return currentIds;
            return [...currentIds, guidedCandidate.id];
        });
        setGuidedCandidateIndex((currentIndex) => currentIndex + 1);
    };

    const handleSaveRoute = () => {
        if (routeItems.length < 2) return;

        const savedRoute = createSavedRoute(routeItems, activeAiRoute);
        setSavedRoutes((currentRoutes) =>
            saveStoredSavedRoutes(currentUser.id, [savedRoute, ...currentRoutes])
        );
    };

    const handleDeleteSavedRoute = (routeId: string) => {
        setSavedRoutes((currentRoutes) =>
            saveStoredSavedRoutes(
                currentUser.id,
                currentRoutes.filter((route) => route.id !== routeId)
            )
        );
    };

    const handleSendRouteRequest = async (routeId: string, stepId: string) => {
        const route = savedRoutes.find((savedRoute) => savedRoute.id === routeId);
        const step = route?.steps.find((routeStep) => routeStep.id === stepId);
        if (!step || step.status !== "ready") return;

        setRequestingStepId(stepId);

        try {
            const tradeRequest = await createTradeRequest({
                targetItemId: step.toItem.id,
                targetItemTitle: step.toItem.title,
                offeredItemId: step.fromItem.id,
                offeredItemTitle: step.fromItem.title,
                requesterId: currentUser.id,
                requesterName: currentUser.username,
                receiverId: step.toItem.ownerId,
                receiverName: step.toItem.ownerName,
                message: `${step.fromItem.title}との交換を希望しています。AI提案ルートの次ステップとして申請しました。`,
            });

            setSavedRoutes((currentRoutes) =>
                saveStoredSavedRoutes(
                    currentUser.id,
                    updateSavedRouteStep(currentRoutes, routeId, stepId, {
                        status: "requested",
                        tradeRequestId: tradeRequest.id,
                        requestedAt: tradeRequest.createdAt,
                        updatedAt: tradeRequest.createdAt,
                    })
                )
            );
        } finally {
            setRequestingStepId("");
        }
    };

    const handleAdvanceRouteStep = async (routeId: string, stepId: string) => {
        const route = savedRoutes.find((savedRoute) => savedRoute.id === routeId);
        const step = route?.steps.find((routeStep) => routeStep.id === stepId);
        const nextStatus = step ? getNextSavedRouteStepStatus(step.status) : undefined;
        if (!step || !nextStatus) return;

        if (
            step.tradeRequestId &&
            (nextStatus === "approved" || nextStatus === "completed")
        ) {
            await updateTradeRequestStatus(step.tradeRequestId, nextStatus);
        }

        setSavedRoutes((currentRoutes) =>
            saveStoredSavedRoutes(
                currentUser.id,
                updateSavedRouteStep(currentRoutes, routeId, stepId, {
                    status: nextStatus,
                    updatedAt: new Date().toISOString(),
                })
            )
        );
    };

    useEffect(() => {
        if (autoStatus !== "running" || !autoRun || isAutoProcessing) return;

        const activeStep = autoRun.steps.find((step) => step.status !== "completed");
        if (!activeStep) {
            updateAutoRun((currentRun) =>
                appendAutoRunLog(
                    {
                        ...currentRun,
                        activeStepIndex: currentRun.steps.length,
                        currentItem: currentRun.goalItem,
                        updatedAt: new Date().toISOString(),
                    },
                    `${autoRun.goalItem.title}までの自動交換が完了しました。`,
                    "success"
                )
            );
            autoStatusRef.current = "completed";
            setAutoStatus("completed");
            return;
        }

        const isSameAutoRun = () =>
            isMountedRef.current && autoRunRef.current?.id === autoRun.id;
        const canContinueAutoRun = () =>
            isSameAutoRun() && autoStatusRef.current === "running";

        const processAutoStep = async () => {
            setIsAutoProcessing(true);

            try {
                let tradeRequestId = activeStep.tradeRequestId;

                if (activeStep.status === "queued") {
                    const tradeRequest = await createTradeRequest({
                        targetItemId: activeStep.toItem.id,
                        targetItemTitle: activeStep.toItem.title,
                        offeredItemId: activeStep.fromItem.id,
                        offeredItemTitle: activeStep.fromItem.title,
                        requesterId: currentUser.id,
                        requesterName: currentUser.username,
                        receiverId: activeStep.toItem.ownerId,
                        receiverName: activeStep.toItem.ownerName,
                        message: `${activeStep.fromItem.title}との交換を希望しています。AIオートモードが目的商品へのルートとして自動申請しました。`,
                    });

                    tradeRequestId = tradeRequest.id;
                    if (!isSameAutoRun()) return;

                    updateAutoRun((currentRun) =>
                        appendAutoRunLog(
                            updateAutoRunStep(currentRun, activeStep.id, {
                                status: "requested",
                                tradeRequestId: tradeRequest.id,
                                requestedAt: tradeRequest.createdAt,
                                updatedAt: tradeRequest.createdAt,
                            }),
                            `${activeStep.fromItem.title}から${activeStep.toItem.title}への交換申請を自動作成しました。`
                        )
                    );

                    await wait(autoStepDelayMs);
                    if (!canContinueAutoRun()) return;
                }

                if (!tradeRequestId) {
                    throw new Error("Auto trade request id is missing");
                }

                if (activeStep.status === "queued" || activeStep.status === "requested") {
                    if (!canContinueAutoRun()) return;
                    await updateTradeRequestStatus(tradeRequestId, "approved");
                    if (!isSameAutoRun()) return;

                    const approvedAt = new Date().toISOString();
                    updateAutoRun((currentRun) =>
                        appendAutoRunLog(
                            updateAutoRunStep(currentRun, activeStep.id, {
                                status: "approved",
                                approvedAt,
                                updatedAt: approvedAt,
                            }),
                            `${activeStep.toItem.title}への交換が承認済みになりました。`,
                            "success"
                        )
                    );

                    await wait(autoStepDelayMs);
                    if (!canContinueAutoRun()) return;
                }

                if (!canContinueAutoRun()) return;
                await updateTradeRequestStatus(tradeRequestId, "completed");
                if (!isSameAutoRun()) return;

                const completedAt = new Date().toISOString();
                const isFinalStep =
                    autoRun.steps[autoRun.steps.length - 1]?.id === activeStep.id;

                updateAutoRun((currentRun) =>
                    appendAutoRunLog(
                        updateAutoRunStep(currentRun, activeStep.id, {
                            status: "completed",
                            completedAt,
                            updatedAt: completedAt,
                        }, {
                            activeStepIndex: Math.min(
                                currentRun.activeStepIndex + 1,
                                currentRun.steps.length
                            ),
                            currentItem: activeStep.toItem,
                        }),
                        isFinalStep
                            ? `${activeStep.toItem.title}へ到達しました。自動交換ルートは完了です。`
                            : `${activeStep.toItem.title}を取得しました。次の候補探索へ進みます。`,
                        isFinalStep ? "success" : "info"
                    )
                );

                if (isFinalStep) {
                    autoStatusRef.current = "completed";
                    setAutoStatus("completed");
                }
            } catch (error) {
                console.warn("AIオートモードの自動実行に失敗しました", error);

                if (isSameAutoRun()) {
                    updateAutoRun((currentRun) =>
                        appendAutoRunLog(
                            currentRun,
                            "自動交換の実行中にエラーが発生しました。条件を見直して再開してください。",
                            "warning"
                        )
                    );
                    autoStatusRef.current = "blocked";
                    setAutoStatus("blocked");
                }
            } finally {
                if (isMountedRef.current) {
                    setIsAutoProcessing(false);
                }
            }
        };

        void processAutoStep();
    }, [
        autoRun,
        autoStatus,
        currentUser.id,
        currentUser.username,
        isAutoProcessing,
    ]);

    return (
        <section className="ai-proposal-screen">
            <header className="ai-proposal-screen__header">
                <p className="ai-proposal-screen__eyebrow">交換提案AI</p>
                <h1>
                    AI提案
                    {mode === "auto" && <span className="ai-plan-badge">Plus</span>}
                </h1>
                <p>
                    倉庫の商品を使いながら、目的の商品へ近づく交換ルートを確認できます。
                </p>
            </header>

            <div className="ai-mode-tabs" aria-label="AI交換モード">
                <button
                    className={mode === "guided" ? "ai-mode-tabs__item ai-mode-tabs__item--active" : "ai-mode-tabs__item"}
                    onClick={() => setMode("guided")}
                    type="button"
                >
                    ナビモード
                </button>
                <button
                    className={mode === "auto" ? "ai-mode-tabs__item ai-mode-tabs__item--active" : "ai-mode-tabs__item"}
                    onClick={() => setMode("auto")}
                    type="button"
                >
                    オートモード
                </button>
            </div>

            {mode === "guided" ? (
                <GuidedMode
                    candidate={guidedCandidate}
                    candidateIndex={guidedCandidateIndex}
                    aiRoute={activeAiRoute}
                    goalItem={guidedGoalItem}
                    goalItems={guidedGoalItems}
                    onAcceptProposal={handleAcceptProposal}
                    onAdvanceRouteStep={handleAdvanceRouteStep}
                    onChangeGoal={handleGuidedGoalChange}
                    onChangeSource={handleGuidedSourceChange}
                    onDeleteSavedRoute={handleDeleteSavedRoute}
                    onNextCandidate={() => setGuidedCandidateIndex((currentIndex) => currentIndex + 1)}
                    onSaveRoute={handleSaveRoute}
                    onSendRouteRequest={handleSendRouteRequest}
                    requestingStepId={requestingStepId}
                    routeItems={routeItems}
                    savedRoutes={savedRoutes}
                    sourceItem={guidedSourceItem}
                    sourceItems={warehouseItems}
                />
            ) : (
                <AutoMode
                    aiRoute={autoAiRoute}
                    autoCandidate={autoCandidate}
                    autoRouteItems={autoRouteItems}
                    autoRun={autoRun}
                    autoStatus={autoStatus}
                    canStartAutoMode={canStartAutoMode}
                    currentUser={currentUser}
                    goalItem={autoGoalItem}
                    goalItems={autoGoalItems}
                    highValueNotice={highValueNotice}
                    isAutoProcessing={isAutoProcessing}
                    onChangeGoal={handleAutoGoalChange}
                    onChangeSource={handleAutoSourceChange}
                    onResetAutoRun={resetAutoRun}
                    onStartAutoMode={handleStartAutoMode}
                    onToggleAutoStatus={handleToggleAutoStatus}
                    sourceItem={autoSourceItem}
                    sourceItems={warehouseItems}
                />
            )}
        </section>
    );
}

function GuidedMode({
    aiRoute,
    candidate,
    candidateIndex,
    goalItem,
    goalItems,
    onAcceptProposal,
    onAdvanceRouteStep,
    onChangeGoal,
    onChangeSource,
    onDeleteSavedRoute,
    onNextCandidate,
    onSaveRoute,
    onSendRouteRequest,
    requestingStepId,
    routeItems,
    savedRoutes,
    sourceItem,
    sourceItems,
}: {
    aiRoute: AiTradeRoute | undefined;
    candidate: Item | undefined;
    candidateIndex: number;
    goalItem: Item | undefined;
    goalItems: Item[];
    onAcceptProposal: () => void;
    onAdvanceRouteStep: (routeId: string, stepId: string) => void;
    onChangeGoal: (itemId: string) => void;
    onChangeSource: (itemId: string) => void;
    onDeleteSavedRoute: (routeId: string) => void;
    onNextCandidate: () => void;
    onSaveRoute: () => void;
    onSendRouteRequest: (routeId: string, stepId: string) => void;
    requestingStepId: string;
    routeItems: Item[];
    savedRoutes: SavedAiRoute[];
    sourceItem: Item | undefined;
    sourceItems: Item[];
}) {
    const matchScore = aiRoute?.matchScore ?? (candidate ? Math.min(92, 72 + (candidateIndex % 4) * 3) : 0);
    const aiReason =
        aiRoute?.summary ??
        "現在の商品より少し価値を上げながら、次の交換につながるカテゴリへ移れます。";

    return (
        <>
            <div className="ai-proposal-controls">
                <label>
                    <span>開始する商品</span>
                    <select
                        onChange={(event) => onChangeSource(event.target.value)}
                        value={sourceItem?.id ?? ""}
                    >
                        <option value=""></option>
                        {sourceItems.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.title}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span>到達したい商品</span>
                    <select
                        onChange={(event) => onChangeGoal(event.target.value)}
                        value={goalItem?.id ?? ""}
                    >
                        <option value=""></option>
                        {goalItems.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.title}
                            </option>
                        ))}
                    </select>
                </label>

                <button onClick={onNextCandidate} type="button">
                    次の提案を見る
                </button>
            </div>

            <section className="ai-guided-layout">
                <article className="ai-item-summary-card">
                    <p>現在の商品</p>
                    {sourceItem && (
                        <>
                            <img src={sourceItem.imageUrl || fallbackImageUrl} alt="" />
                            <h2>{sourceItem.title}</h2>
                            <span>倉庫保管 / {getWarehouseUseCaseText(sourceItem)}</span>
                        </>
                    )}
                </article>

                <article className="ai-proposal-panel">
                    {candidate ? (
                        <>
                            <div className="ai-proposal-panel__top">
                                <img src={candidate.imageUrl || fallbackImageUrl} alt="" />
                                <div>
                                    <p>AIの次の提案</p>
                                    <h2>{candidate.title}</h2>
                                    <span>
                                        価格帯が近く、{goalItem?.category ?? "目的"}カテゴリへのルートを作りやすい候補です。
                                    </span>
                                    <div className="ai-pill-row">
                                        <span>価格差 {formatPriceGap(sourceItem, candidate)}</span>
                                        <span className="ai-pill-row__green">相手希望と一致</span>
                                    </div>
                                </div>
                                <div className="ai-score-ring" style={{ "--score": `${matchScore}%` } as React.CSSProperties}>
                                    {matchScore}%
                                </div>
                            </div>

                            <div className="ai-info-box">
                                <h3>AIの判断理由</h3>
                                <p>
                                    {aiReason}
                                </p>
                            </div>

                            <div className="ai-info-box">
                                <h3>申請文案</h3>
                                <p>
                                    {sourceItem?.title ?? "こちらの商品"}との交換を希望しています。状態も良く、すぐに倉庫側で交換処理できます。
                                </p>
                            </div>

                            <div className="ai-action-row">
                                <button className="ai-primary-button" onClick={onAcceptProposal} type="button">
                                    ルートに追加
                                </button>
                                <button
                                    className="ai-secondary-button"
                                    disabled={routeItems.length < 2}
                                    onClick={onSaveRoute}
                                    type="button"
                                >
                                    ルートを保存
                                </button>
                                <button className="ai-secondary-button" onClick={onNextCandidate} type="button">
                                    別候補を見る
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="ai-proposal-empty">
                            <h2>候補が見つかりません</h2>
                            <p>条件を変えてもう一度探してください。</p>
                        </div>
                    )}
                </article>
            </section>

            <RouteTimeline items={routeItems} />
            <SavedRouteMonitor
                onAdvanceRouteStep={onAdvanceRouteStep}
                onDeleteSavedRoute={onDeleteSavedRoute}
                onSendRouteRequest={onSendRouteRequest}
                requestingStepId={requestingStepId}
                routes={savedRoutes}
            />
        </>
    );
}

function SavedRouteMonitor({
    onAdvanceRouteStep,
    onDeleteSavedRoute,
    onSendRouteRequest,
    requestingStepId,
    routes,
}: {
    onAdvanceRouteStep: (routeId: string, stepId: string) => void;
    onDeleteSavedRoute: (routeId: string) => void;
    onSendRouteRequest: (routeId: string, stepId: string) => void;
    requestingStepId: string;
    routes: SavedAiRoute[];
}) {
    return (
        <section className="ai-saved-routes">
            <div className="ai-route-detail__top">
                <div>
                    <p>保存済みルート</p>
                    <h2>申請と進捗モニター</h2>
                    <span>{routes.length}件保存中</span>
                </div>
            </div>

            {routes.length > 0 ? (
                <div className="ai-saved-route-list">
                    {routes.map((route) => (
                        <article className="ai-saved-route" key={route.id}>
                            <div className="ai-saved-route__header">
                                <div>
                                    <p>{formatSavedRouteDate(route.createdAt)}</p>
                                    <h3>{route.title}</h3>
                                    <span>{route.summary}</span>
                                </div>
                                <div className="ai-saved-route__score">
                                    <strong>{getSavedRouteCompletedCount(route)}</strong>
                                    <span>/ {route.steps.length}</span>
                                </div>
                            </div>

                            <div className="ai-saved-route__progress">
                                {route.steps.map((step) => (
                                    <span
                                        className={`ai-saved-route__progress-step ai-saved-route__progress-step--${step.status}`}
                                        key={`${step.id}_progress`}
                                    />
                                ))}
                            </div>

                            <div className="ai-saved-route__steps">
                                {route.steps.map((step, index) => (
                                    <SavedRouteStepItem
                                        index={index}
                                        isRequesting={requestingStepId === step.id}
                                        key={step.id}
                                        onAdvanceRouteStep={onAdvanceRouteStep}
                                        onSendRouteRequest={onSendRouteRequest}
                                        routeId={route.id}
                                        step={step}
                                    />
                                ))}
                            </div>

                            <button
                                className="ai-saved-route__delete"
                                onClick={() => onDeleteSavedRoute(route.id)}
                                type="button"
                            >
                                ルートを削除
                            </button>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="ai-proposal-empty">
                    <h2>保存済みルートはまだありません</h2>
                    <p>提案ルートが決まったら保存して、交換申請の進捗をここで追えます。</p>
                </div>
            )}
        </section>
    );
}

function SavedRouteStepItem({
    index,
    isRequesting,
    onAdvanceRouteStep,
    onSendRouteRequest,
    routeId,
    step,
}: {
    index: number;
    isRequesting: boolean;
    onAdvanceRouteStep: (routeId: string, stepId: string) => void;
    onSendRouteRequest: (routeId: string, stepId: string) => void;
    routeId: string;
    step: SavedRouteStep;
}) {
    const nextActionLabel = getSavedRouteStepActionLabel(step.status);

    return (
        <article className="ai-saved-route-step">
            <div className="ai-saved-route-step__number">{index + 1}</div>
            <div className="ai-saved-route-step__items">
                <SavedRouteStepProduct item={step.fromItem} label="出す商品" />
                <span aria-hidden="true">→</span>
                <SavedRouteStepProduct item={step.toItem} label="狙う商品" />
            </div>
            <div className="ai-saved-route-step__status">
                <span className={`ai-saved-route-step__badge ai-saved-route-step__badge--${step.status}`}>
                    {getSavedRouteStepStatusLabel(step.status)}
                </span>
                {step.updatedAt && <time>{formatSavedRouteDate(step.updatedAt)}</time>}
            </div>
            {nextActionLabel && (
                <button
                    className="ai-secondary-button"
                    disabled={isRequesting}
                    onClick={() => {
                        if (step.status === "ready") {
                            void onSendRouteRequest(routeId, step.id);
                            return;
                        }

                        void onAdvanceRouteStep(routeId, step.id);
                    }}
                    type="button"
                >
                    {isRequesting ? "送信中..." : nextActionLabel}
                </button>
            )}
        </article>
    );
}

function SavedRouteStepProduct({ item, label }: { item: Item; label: string }) {
    return (
        <div className="ai-saved-route-step__product">
            <img src={item.imageUrl || fallbackImageUrl} alt="" />
            <div>
                <span>{label}</span>
                <strong>{item.title}</strong>
                <p>
                    {item.ownerName} / ¥{item.price.toLocaleString()}
                </p>
            </div>
        </div>
    );
}

function AutoMode({
    aiRoute,
    autoCandidate,
    autoRouteItems,
    autoRun,
    autoStatus,
    canStartAutoMode,
    currentUser,
    goalItem,
    goalItems,
    highValueNotice,
    isAutoProcessing,
    onChangeGoal,
    onChangeSource,
    onResetAutoRun,
    onStartAutoMode,
    onToggleAutoStatus,
    sourceItem,
    sourceItems,
}: {
    aiRoute: AiTradeRoute | undefined;
    autoCandidate: Item | undefined;
    autoRouteItems: Item[];
    autoRun: AutoRun | undefined;
    autoStatus: AutoStatus;
    canStartAutoMode: boolean;
    currentUser: RegisteredUser;
    goalItem: Item | undefined;
    goalItems: Item[];
    highValueNotice: string;
    isAutoProcessing: boolean;
    onChangeGoal: (itemId: string) => void;
    onChangeSource: (itemId: string) => void;
    onResetAutoRun: () => void;
    onStartAutoMode: () => void;
    onToggleAutoStatus: () => void;
    sourceItem: Item | undefined;
    sourceItems: Item[];
}) {
    const isPaused = autoStatus === "paused";
    const activeStep = autoRun?.steps.find((step) => step.status !== "completed");
    const displayedCandidate = activeStep?.toItem ?? autoCandidate;
    const displayedRouteItems = autoRun ? buildAutoRunRouteItems(autoRun) : autoRouteItems;
    const monitorScore =
        autoRun?.matchScore ??
        aiRoute?.matchScore ??
        (displayedCandidate && displayedCandidate.price >= 10000 ? 64 : 71);
    const autoCandidateSummary =
        activeStep?.reason ??
        autoRun?.summary ??
        aiRoute?.summary ??
        `${goalItem?.title ?? "目的の商品"}への到達前に価値を上げる候補として申請済みです。`;
    const toggleLabel = autoStatus === "paused" ? "再開" : "一時停止";
    const canToggleAutoStatus = autoStatus === "running" || autoStatus === "paused";
    const startButtonLabel =
        autoStatus === "completed"
            ? "新しい自動交換を開始"
            : autoRun
                ? "ルートを再生成して開始"
                : "完全自動で開始";

    return (
        <>
            <section className="ai-auto-layout">
                <aside className="ai-auto-settings">
                    <p>自動交換の条件</p>
                    <h2>AIに任せる範囲</h2>

                    <label>
                        <span>開始商品</span>
                        <select
                            disabled={autoStatus === "running" || isAutoProcessing}
                            onChange={(event) => onChangeSource(event.target.value)}
                            value={sourceItem?.id ?? ""}
                        >
                            <option value=""></option>
                            {sourceItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.title}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>目標</span>
                        <select
                            disabled={autoStatus === "running" || isAutoProcessing}
                            onChange={(event) => onChangeGoal(event.target.value)}
                            value={goalItem?.id ?? ""}
                        >
                            <option value=""></option>
                            {goalItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.title}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="ai-setting-list">
                        <div>
                            <span>実行方式</span>
                            <strong>全自動</strong>
                        </div>
                        <div>
                            <span>申請予定</span>
                            <strong>{Math.max(displayedRouteItems.length - 1, 0)}件</strong>
                        </div>
                        <div>
                            <span>高額検知</span>
                            <strong>通知のみ</strong>
                        </div>
                        <div>
                            <span>停止条件</span>
                            <strong>手動停止のみ</strong>
                        </div>
                        <div>
                            <span>プラン</span>
                            <strong>{currentUser.plan === "free" ? "Plus想定" : currentUser.plan}</strong>
                        </div>
                    </div>

                    <div className="ai-auto-notice">
                        {highValueNotice}
                    </div>

                    <div className="ai-action-row">
                        <button
                            className="ai-primary-button"
                            disabled={!canStartAutoMode}
                            onClick={onStartAutoMode}
                            type="button"
                        >
                            {isAutoProcessing ? "実行中..." : startButtonLabel}
                        </button>
                        {autoRun && (
                            <button className="ai-secondary-button" onClick={onResetAutoRun} type="button">
                                リセット
                            </button>
                        )}
                    </div>
                </aside>

                <div className="ai-auto-monitor-stack">
                    <section className="ai-monitor-card">
                        <div className={isPaused ? "ai-status-band ai-status-band--paused" : "ai-status-band"}>
                            <div>
                                <p>自動交換</p>
                                <strong>{getAutoStatusLabel(autoStatus)}</strong>
                            </div>
                            <button
                                className="ai-status-band__button"
                                disabled={!canToggleAutoStatus}
                                onClick={onToggleAutoStatus}
                                type="button"
                            >
                                {toggleLabel}
                            </button>
                        </div>

                        <div className="ai-progress-lane" aria-label="自動交換の進行状況">
                            {autoRun ? (
                                autoRun.steps.map((step, index) => (
                                    <span
                                        className={[
                                            "ai-progress-lane__step",
                                            `ai-progress-lane__step--${step.status}`,
                                            activeStep?.id === step.id ? "ai-progress-lane__step--watching" : "",
                                        ].filter(Boolean).join(" ")}
                                        key={step.id}
                                    >
                                        {index + 1}. {getAutoRunStepStatusLabel(step.status)}
                                    </span>
                                ))
                            ) : (
                                <>
                                    <span className="ai-progress-lane__step ai-progress-lane__step--active">探索</span>
                                    <span className="ai-progress-lane__step">申請</span>
                                    <span className="ai-progress-lane__step">承認</span>
                                    <span className="ai-progress-lane__step">完了</span>
                                </>
                            )}
                        </div>

                        <div className="ai-monitor-main">
                            {displayedCandidate ? (
                                <>
                                    <img src={displayedCandidate.imageUrl || fallbackImageUrl} alt="" />
                                    <div>
                                        <p>{activeStep ? "処理中の候補" : "現在の候補"}</p>
                                        <h2>{displayedCandidate.title}</h2>
                                        <span>{autoCandidateSummary}</span>
                                    </div>
                                    <div className="ai-score-ring ai-score-ring--green" style={{ "--score": `${monitorScore}%` } as React.CSSProperties}>
                                        {monitorScore}%
                                    </div>
                                </>
                            ) : (
                                <div className="ai-auto-placeholder">
                                    <p>開始商品と目標を選ぶと、自動交換ルートを生成できます。</p>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="ai-log-card">
                        <h2>進行ログ</h2>
                        <ul>
                            {autoRun && autoRun.logs.length > 0 ? (
                                autoRun.logs.map((log) => (
                                    <li className={`ai-log-card__item--${log.level}`} key={log.id}>
                                        <time>{formatAutoLogTime(log.at)}</time>
                                        <span>{log.message}</span>
                                    </li>
                                ))
                            ) : (
                                <li>
                                    <time>--:--</time>
                                    <span>条件を選んで開始すると、AIがルート生成から交換申請、承認、完了まで自動で進めます。</span>
                                </li>
                            )}
                        </ul>
                    </section>
                </div>
            </section>

            {displayedRouteItems.length > 0 && <RouteTimeline items={displayedRouteItems} />}
        </>
    );
}

function RouteTimeline({ items }: { items: Item[] }) {
    return (
        <section className="ai-route-detail">
            <div className="ai-route-detail__top">
                <div>
                    <p>交換ルート</p>
                    <h2>目的商品までのルート</h2>
                    <span>{items.length}ステップ予定</span>
                </div>
            </div>

            <div className="ai-route-flow ai-route-flow--compact">
                {items.map((item, index) => (
                    <article className="ai-route-step" key={`${item.id}_${index}`}>
                        <span>{index + 1}</span>
                        <img src={item.imageUrl || fallbackImageUrl} alt="" />
                        <div>
                            <h3>{item.title}</h3>
                            <strong className="ai-route-step__price">
                                ¥{item.price.toLocaleString("ja-JP")}
                            </strong>
                            <p>{getRouteStepLabel(index, items.length)}</p>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

function findItem(items: Item[], itemId: string): Item | undefined {
    return items.find((item) => item.id === itemId);
}

function isAiWarehouseItem(item: Item): boolean {
    return (
        item.listingType === "warehouse" &&
        item.warehouseUseCase === "ai_route"
    );
}

function buildRouteItems(
    items: Item[],
    acceptedRouteItemIds: string[],
    candidate: Item | undefined,
    goalItem: Item | undefined
): Item[] {
    const routeItems = acceptedRouteItemIds
        .map((itemId) => findItem(items, itemId))
        .filter((item): item is Item => item !== undefined);

    for (const item of [candidate, goalItem]) {
        if (item && !routeItems.some((routeItem) => routeItem.id === item.id)) {
            routeItems.push(item);
        }
    }

    return routeItems;
}

function buildAutoRouteItems(
    items: Item[],
    sourceItem: Item | undefined,
    goalItem: Item | undefined,
    aiRoute: AiTradeRoute | undefined,
    fallbackCandidate: Item | undefined
): Item[] {
    const routeItems: Item[] = [];

    addUniqueRouteItem(routeItems, sourceItem);

    aiRoute?.steps.slice(1).forEach((step) => {
        addUniqueRouteItem(routeItems, findItem(items, step.itemId));
    });

    addUniqueRouteItem(routeItems, fallbackCandidate);
    addUniqueRouteItem(routeItems, goalItem);

    return routeItems;
}

function addUniqueRouteItem(routeItems: Item[], item: Item | undefined): void {
    if (!item || routeItems.some((routeItem) => routeItem.id === item.id)) return;
    routeItems.push(item);
}

function createAutoRun(
    routeItems: Item[],
    aiRoute: AiTradeRoute | undefined
): AutoRun {
    const createdAt = new Date().toISOString();
    const sourceItem = routeItems[0];
    const goalItem = routeItems[routeItems.length - 1];
    const runId = `auto_run_${Date.now()}_${sourceItem.id}_${goalItem.id}`;

    const steps: AutoRunStep[] = routeItems.slice(0, -1).map((item, index) => {
        const nextItem = routeItems[index + 1];

        return {
            id: `${runId}_step_${index}_${item.id}_${nextItem.id}`,
            fromItem: item,
            toItem: nextItem,
            status: "queued",
            reason: getAutoRunStepReason(index, nextItem, goalItem, aiRoute),
        };
    });

    const baseRun: AutoRun = {
        id: runId,
        title:
            aiRoute?.title ??
            `${sourceItem.title}から${goalItem.title}への完全自動ルート`,
        summary:
            aiRoute?.summary ??
            "AIが候補探索、交換申請、承認、完了まで自動で進めるルートです。",
        matchScore: aiRoute?.matchScore ?? 74,
        source: aiRoute?.source ?? "manual",
        sourceItem,
        goalItem,
        currentItem: sourceItem,
        activeStepIndex: 0,
        steps,
        logs: [],
        createdAt,
        updatedAt: createdAt,
    };

    const highValueItems = routeItems.filter((item) => item.price >= 10000);
    const initializedRun = appendAutoRunLog(
        baseRun,
        `${sourceItem.title}から${goalItem.title}まで、${steps.length}件の自動交換ステップを生成しました。`
    );

    return highValueItems.length > 0
        ? appendAutoRunLog(
            initializedRun,
            `${highValueItems[0].title}は高額候補です。通知のみ行い、自動交換は継続します。`,
            "warning"
        )
        : initializedRun;
}

function getAutoRunStepReason(
    index: number,
    item: Item,
    goalItem: Item,
    aiRoute: AiTradeRoute | undefined
): string {
    const aiStepReason = aiRoute?.steps[index + 1]?.matchReason;
    if (aiStepReason) return aiStepReason;
    if (item.id === goalItem.id) return "目的の商品へ到達する最終ステップです。";
    if (item.category === goalItem.category) return "目的商品のカテゴリに近い中継候補です。";
    return "価格差とカテゴリ相性から、次の交換につなげやすい候補です。";
}

function updateAutoRunStep(
    run: AutoRun,
    stepId: string,
    patch: Partial<AutoRunStep>,
    runPatch: Partial<AutoRun> = {}
): AutoRun {
    const updatedAt = new Date().toISOString();

    return {
        ...run,
        ...runPatch,
        updatedAt,
        steps: run.steps.map((step) =>
            step.id === stepId ? { ...step, ...patch } : step
        ),
    };
}

function appendAutoRunLog(
    run: AutoRun,
    message: string,
    level: AutoRunLogLevel = "info"
): AutoRun {
    const at = new Date().toISOString();

    return {
        ...run,
        updatedAt: at,
        logs: [
            ...run.logs,
            {
                id: `${run.id}_log_${Date.now()}_${run.logs.length}`,
                at,
                level,
                message,
            },
        ].slice(-maxAutoRunLogs),
    };
}

function buildAutoRunRouteItems(run: AutoRun): Item[] {
    return [run.sourceItem, ...run.steps.map((step) => step.toItem)];
}

function scoreCandidate(
    candidate: Item,
    goalItem: Item | undefined,
    sourceItem: Item | undefined
): number {
    if (!goalItem || !sourceItem) return candidate.likes;

    const sourceGapRate =
        sourceItem.price > 0
            ? Math.abs(candidate.price - sourceItem.price) / sourceItem.price
            : 1;
    const categoryBonus = candidate.category === goalItem.category ? 12 : 0;
    const routeUpBonus = candidate.price >= sourceItem.price ? 8 : 0;
    const priceScore = Math.max(0, 120 - Math.round(sourceGapRate * 100));

    return Math.floor(candidate.likes / 10) + categoryBonus + priceScore + routeUpBonus;
}

function formatPriceGap(sourceItem: Item | undefined, candidate: Item): string {
    if (!sourceItem || sourceItem.price <= 0) return "±--%";

    const gapRate = Math.round(
        (Math.abs(candidate.price - sourceItem.price) / sourceItem.price) * 100
    );

    return gapRate === 0 ? "±0%" : `±${gapRate}%`;
}

function getWarehouseUseCaseText(item: Item): string {
    if (item.warehouseUseCase === "ai_route") return "AI対象";
    if (item.warehouseUseCase === "gacha") return "ガチャ対象";

    return "AI対象";
}

function createSavedRoute(
    routeItems: Item[],
    aiRoute: AiTradeRoute | undefined
): SavedAiRoute {
    const createdAt = new Date().toISOString();
    const routeId = `saved_route_${Date.now()}_${routeItems[0]?.id ?? "start"}`;

    return {
        id: routeId,
        title:
            aiRoute?.title ??
            `${routeItems[0]?.title ?? "開始商品"}から${routeItems[routeItems.length - 1]?.title ?? "目標商品"}へ`,
        summary: aiRoute?.summary ?? "保存した交換ルートです。各ステップごとに交換申請を送れます。",
        matchScore: aiRoute?.matchScore ?? 0,
        source: aiRoute?.source ?? "manual",
        steps: routeItems.slice(0, -1).map((item, index) => {
            const nextItem = routeItems[index + 1];

            return {
                id: `${routeId}_step_${index}_${item.id}_${nextItem.id}`,
                fromItem: item,
                toItem: nextItem,
                status: "ready",
            };
        }),
        createdAt,
        updatedAt: createdAt,
    };
}

function updateSavedRouteStep(
    routes: SavedAiRoute[],
    routeId: string,
    stepId: string,
    patch: Partial<SavedRouteStep>
): SavedAiRoute[] {
    const updatedAt = new Date().toISOString();

    return routes.map((route) =>
        route.id === routeId
            ? {
                ...route,
                updatedAt,
                steps: route.steps.map((step) =>
                    step.id === stepId ? { ...step, ...patch } : step
                ),
            }
            : route
    );
}

function getStoredSavedRoutes(userId: string): SavedAiRoute[] {
    try {
        const storedValue = window.localStorage.getItem(getSavedRouteStorageKey(userId));
        if (!storedValue) return [];

        const parsedValue: unknown = JSON.parse(storedValue);
        if (!Array.isArray(parsedValue)) return [];

        return parsedValue.filter(isSavedAiRoute).slice(0, maxSavedRoutes);
    } catch (error) {
        console.warn("保存済みAIルートを読み込めませんでした", error);
        return [];
    }
}

function saveStoredSavedRoutes(userId: string, routes: SavedAiRoute[]): SavedAiRoute[] {
    const nextRoutes = routes.slice(0, maxSavedRoutes);

    try {
        window.localStorage.setItem(
            getSavedRouteStorageKey(userId),
            JSON.stringify(nextRoutes)
        );
    } catch (error) {
        console.warn("保存済みAIルートを保存できませんでした", error);
    }

    return nextRoutes;
}

function getSavedRouteStorageKey(userId: string): string {
    return `${savedRouteStorageKeyPrefix}.${userId}`;
}

function getStoredAutoRun(userId: string): AutoRun | undefined {
    try {
        const storedValue = window.localStorage.getItem(getAutoRunStorageKey(userId));
        if (!storedValue) return undefined;

        const parsedValue: unknown = JSON.parse(storedValue);
        return isAutoRun(parsedValue) ? parsedValue : undefined;
    } catch (error) {
        console.warn("AIオートモードの実行状態を読み込めませんでした", error);
        return undefined;
    }
}

function saveStoredAutoRun(userId: string, run: AutoRun): AutoRun {
    try {
        window.localStorage.setItem(getAutoRunStorageKey(userId), JSON.stringify(run));
    } catch (error) {
        console.warn("AIオートモードの実行状態を保存できませんでした", error);
    }

    return run;
}

function clearStoredAutoRun(userId: string): void {
    try {
        window.localStorage.removeItem(getAutoRunStorageKey(userId));
    } catch (error) {
        console.warn("AIオートモードの実行状態を削除できませんでした", error);
    }
}

function getAutoRunStorageKey(userId: string): string {
    return `${autoRunStorageKeyPrefix}.${userId}`;
}

function getStoredAutoRunStatus(run: AutoRun): AutoStatus {
    return run.steps.every((step) => step.status === "completed")
        ? "completed"
        : "paused";
}

function isSavedAiRoute(value: unknown): value is SavedAiRoute {
    if (!isRecord(value)) return false;

    return (
        typeof value.id === "string" &&
        typeof value.title === "string" &&
        typeof value.summary === "string" &&
        typeof value.matchScore === "number" &&
        Array.isArray(value.steps) &&
        value.steps.every(isSavedRouteStep) &&
        typeof value.createdAt === "string" &&
        typeof value.updatedAt === "string"
    );
}

function isSavedRouteStep(value: unknown): value is SavedRouteStep {
    if (!isRecord(value)) return false;

    return (
        typeof value.id === "string" &&
        isSavedRouteItem(value.fromItem) &&
        isSavedRouteItem(value.toItem) &&
        isSavedRouteStepStatus(value.status) &&
        (value.tradeRequestId === undefined || typeof value.tradeRequestId === "string") &&
        (value.requestedAt === undefined || typeof value.requestedAt === "string") &&
        (value.updatedAt === undefined || typeof value.updatedAt === "string")
    );
}

function isSavedRouteItem(value: unknown): value is Item {
    if (!isRecord(value)) return false;

    return (
        typeof value.id === "string" &&
        typeof value.title === "string" &&
        typeof value.ownerId === "string" &&
        typeof value.ownerName === "string" &&
        typeof value.imageUrl === "string" &&
        typeof value.price === "number"
    );
}

function isSavedRouteStepStatus(value: unknown): value is SavedRouteStepStatus {
    return (
        value === "ready" ||
        value === "requested" ||
        value === "approved" ||
        value === "completed"
    );
}

function isAutoRun(value: unknown): value is AutoRun {
    if (!isRecord(value)) return false;

    return (
        typeof value.id === "string" &&
        typeof value.title === "string" &&
        typeof value.summary === "string" &&
        typeof value.matchScore === "number" &&
        isSavedRouteItem(value.sourceItem) &&
        isSavedRouteItem(value.goalItem) &&
        isSavedRouteItem(value.currentItem) &&
        typeof value.activeStepIndex === "number" &&
        Array.isArray(value.steps) &&
        value.steps.every(isAutoRunStep) &&
        Array.isArray(value.logs) &&
        value.logs.every(isAutoRunLog) &&
        typeof value.createdAt === "string" &&
        typeof value.updatedAt === "string"
    );
}

function isAutoRunStep(value: unknown): value is AutoRunStep {
    if (!isRecord(value)) return false;

    return (
        typeof value.id === "string" &&
        isSavedRouteItem(value.fromItem) &&
        isSavedRouteItem(value.toItem) &&
        isAutoRunStepStatus(value.status) &&
        typeof value.reason === "string" &&
        (value.tradeRequestId === undefined || typeof value.tradeRequestId === "string") &&
        (value.requestedAt === undefined || typeof value.requestedAt === "string") &&
        (value.approvedAt === undefined || typeof value.approvedAt === "string") &&
        (value.completedAt === undefined || typeof value.completedAt === "string") &&
        (value.updatedAt === undefined || typeof value.updatedAt === "string")
    );
}

function isAutoRunStepStatus(value: unknown): value is AutoRunStepStatus {
    return (
        value === "queued" ||
        value === "requested" ||
        value === "approved" ||
        value === "completed"
    );
}

function isAutoRunLog(value: unknown): value is AutoRunLog {
    if (!isRecord(value)) return false;

    return (
        typeof value.id === "string" &&
        typeof value.at === "string" &&
        isAutoRunLogLevel(value.level) &&
        typeof value.message === "string"
    );
}

function isAutoRunLogLevel(value: unknown): value is AutoRunLogLevel {
    return value === "info" || value === "success" || value === "warning";
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNextSavedRouteStepStatus(
    status: SavedRouteStepStatus
): SavedRouteStepStatus | undefined {
    if (status === "requested") return "approved";
    if (status === "approved") return "completed";

    return undefined;
}

function getSavedRouteStepStatusLabel(status: SavedRouteStepStatus): string {
    if (status === "requested") return "申請済み";
    if (status === "approved") return "承認済み";
    if (status === "completed") return "完了";

    return "未申請";
}

function getSavedRouteStepActionLabel(status: SavedRouteStepStatus): string | undefined {
    if (status === "ready") return "交換申請を送る";
    if (status === "requested") return "承認済みにする";
    if (status === "approved") return "完了にする";

    return undefined;
}

function getSavedRouteCompletedCount(route: SavedAiRoute): number {
    return route.steps.filter((step) => step.status === "completed").length;
}

function getAutoStatusLabel(status: AutoStatus): string {
    if (status === "running") return "完全自動で実行中";
    if (status === "paused") return "手動停止中";
    if (status === "completed") return "目的商品に到達";
    if (status === "blocked") return "確認が必要";

    return "待機中";
}

function getAutoRunStepStatusLabel(status: AutoRunStepStatus): string {
    if (status === "requested") return "申請済み";
    if (status === "approved") return "承認済み";
    if (status === "completed") return "完了";

    return "待機";
}

function formatSavedRouteDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "日時不明";

    return new Intl.DateTimeFormat("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function formatAutoLogTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--:--";

    return new Intl.DateTimeFormat("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function getRouteStepLabel(index: number, length: number): string {
    if (index === 0) return "開始商品";
    if (index === length - 1) return "目標";
    if (index === 1) return "提案中";
    return "候補";
}

function wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
}

export default AiProposalScreen;
