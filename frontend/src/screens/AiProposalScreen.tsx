import { useEffect, useMemo, useState } from "react";
import { getAiTradeRoutes } from "../features/aiProposals/aiProposalApi";
import type { AiTradeRoute } from "../features/aiProposals/aiProposalTypes";
import { getItems } from "../features/items/itemApi";
import type { Item } from "../features/items/itemTypes";
import type { RegisteredUser } from "../features/users/userTypes";
import "./AiProposalScreen.css";

type AiProposalScreenProps = {
    currentUser: RegisteredUser;
};

type AiMode = "guided" | "auto";
type AiRuntimeStatus = "idle" | "loading" | "gemini" | "fallback" | "mock";
type AutoStatus = "running" | "paused";

const fallbackImageUrl = "/images/demo/generated/reading-card-500.png";

function AiProposalScreen({ currentUser }: AiProposalScreenProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [mode, setMode] = useState<AiMode>("guided");
    const [sourceItemId, setSourceItemId] = useState("");
    const [goalItemId, setGoalItemId] = useState("");
    const [candidateIndex, setCandidateIndex] = useState(0);
    const [acceptedRouteItemIds, setAcceptedRouteItemIds] = useState<string[]>([]);
    const [aiRoutes, setAiRoutes] = useState<AiTradeRoute[]>([]);
    const [aiRuntimeStatus, setAiRuntimeStatus] = useState<AiRuntimeStatus>("idle");
    const [autoStatus, setAutoStatus] = useState<AutoStatus>("running");

    useEffect(() => {
        const loadItems = async () => {
            const itemsFromApi = await getItems();
            setItems(itemsFromApi);

            const firstWarehouseItem =
                itemsFromApi.find(isAiWarehouseItem) ??
                itemsFromApi.find((item) => item.listingType === "warehouse") ??
                itemsFromApi[0];
            const firstGoalItem =
                itemsFromApi.find((item) => item.id !== firstWarehouseItem?.id) ??
                itemsFromApi[1] ??
                firstWarehouseItem;

            setSourceItemId(firstWarehouseItem?.id ?? "");
            setGoalItemId(firstGoalItem?.id ?? "");
            setAcceptedRouteItemIds(firstWarehouseItem ? [firstWarehouseItem.id] : []);
        };

        loadItems();
    }, []);

    const warehouseItems = useMemo(() => {
        const filteredItems = items.filter(
            (item) => isAiWarehouseItem(item)
        );

        return filteredItems.length > 0 ? filteredItems : items;
    }, [items]);

    const goalItems = items.filter((item) => item.id !== sourceItemId);
    const sourceItem = findItem(items, sourceItemId) ?? warehouseItems[0];
    const goalItem = findItem(items, goalItemId) ?? goalItems[0];

    useEffect(() => {
        if (!sourceItemId || !goalItemId || items.length === 0) return;

        let isActive = true;

        const loadAiRoutes = async () => {
            setAiRuntimeStatus("loading");

            const result = await getAiTradeRoutes({
                sourceItemId,
                goalItemId,
                items,
                limit: 4,
            });

            if (!isActive) return;

            setAiRoutes(result.routes);
            setAiRuntimeStatus(result.source);
        };

        loadAiRoutes();

        return () => {
            isActive = false;
        };
    }, [goalItemId, items, sourceItemId]);

    const guidedCandidates = useMemo(
        () =>
            items
                .filter((item) => item.id !== sourceItem?.id && item.id !== goalItem?.id)
                .filter(isAiWarehouseItem)
                .filter((item) => item.status === "available")
                .sort(
                    (left, right) =>
                        scoreCandidate(right, goalItem, sourceItem) -
                        scoreCandidate(left, goalItem, sourceItem)
                ),
        [goalItem, items, sourceItem?.id]
    );
    const activeAiRoute = aiRoutes[candidateIndex % Math.max(aiRoutes.length, 1)];
    const aiCandidate = activeAiRoute
        ? findItem(items, activeAiRoute.steps[1]?.itemId ?? "")
        : undefined;
    const guidedCandidate =
        aiCandidate ??
        guidedCandidates[candidateIndex % Math.max(guidedCandidates.length, 1)] ??
        goalItem ??
        sourceItem;
    const autoAiRoute = aiRoutes[0];
    const autoAiCandidate = autoAiRoute
        ? findItem(items, autoAiRoute.steps[1]?.itemId ?? "")
        : undefined;
    const routeItems = buildRouteItems(
        items,
        acceptedRouteItemIds,
        guidedCandidate,
        goalItem
    );
    const autoCandidate =
        autoAiCandidate ??
        guidedCandidate ??
        items.find((item) => item.title.includes("ヘッドホン")) ??
        goalItem ??
        sourceItem;
    const highValueNotice =
        autoCandidate !== undefined && autoCandidate.price >= 10000
            ? `${autoCandidate.title}は高額商品として検知済みです。通知だけ行い、自動交換は継続します。`
            : "高額商品を検知した場合も、通知だけ行って自動交換は継続します。";

    const handleSourceChange = (itemId: string) => {
        setSourceItemId(itemId);
        setAcceptedRouteItemIds(itemId ? [itemId] : []);
        setCandidateIndex(0);
    };

    const handleGoalChange = (itemId: string) => {
        setGoalItemId(itemId);
        setCandidateIndex(0);
    };

    const handleAcceptProposal = () => {
        if (!guidedCandidate) return;

        setSourceItemId(guidedCandidate.id);
        setAcceptedRouteItemIds((currentIds) => {
            if (currentIds.includes(guidedCandidate.id)) return currentIds;
            return [...currentIds, guidedCandidate.id];
        });
        setCandidateIndex((currentIndex) => currentIndex + 1);
    };

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
                    candidateIndex={candidateIndex}
                    aiRoute={activeAiRoute}
                    aiRuntimeStatus={aiRuntimeStatus}
                    goalItem={goalItem}
                    goalItems={goalItems}
                    onAcceptProposal={handleAcceptProposal}
                    onChangeGoal={handleGoalChange}
                    onChangeSource={handleSourceChange}
                    onNextCandidate={() => setCandidateIndex((currentIndex) => currentIndex + 1)}
                    routeItems={routeItems}
                    sourceItem={sourceItem}
                    sourceItems={warehouseItems}
                />
            ) : (
                <AutoMode
                    aiRoute={autoAiRoute}
                    aiRuntimeStatus={aiRuntimeStatus}
                    autoCandidate={autoCandidate}
                    autoStatus={autoStatus}
                    currentUser={currentUser}
                    goalItem={goalItem}
                    highValueNotice={highValueNotice}
                    onChangeGoal={handleGoalChange}
                    onChangeSource={handleSourceChange}
                    onToggleAutoStatus={() =>
                        setAutoStatus((currentStatus) =>
                            currentStatus === "running" ? "paused" : "running"
                        )
                    }
                    sourceItem={sourceItem}
                    sourceItems={warehouseItems}
                />
            )}
        </section>
    );
}

function GuidedMode({
    aiRoute,
    aiRuntimeStatus,
    candidate,
    candidateIndex,
    goalItem,
    goalItems,
    onAcceptProposal,
    onChangeGoal,
    onChangeSource,
    onNextCandidate,
    routeItems,
    sourceItem,
    sourceItems,
}: {
    aiRoute: AiTradeRoute | undefined;
    aiRuntimeStatus: AiRuntimeStatus;
    candidate: Item | undefined;
    candidateIndex: number;
    goalItem: Item | undefined;
    goalItems: Item[];
    onAcceptProposal: () => void;
    onChangeGoal: (itemId: string) => void;
    onChangeSource: (itemId: string) => void;
    onNextCandidate: () => void;
    routeItems: Item[];
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

            <div className={`ai-runtime-status ai-runtime-status--${aiRuntimeStatus}`}>
                <div>
                    <p>AI接続状態</p>
                    <strong>{getAiRuntimeLabel(aiRuntimeStatus)}</strong>
                </div>
                <span>{getAiRuntimeDescription(aiRuntimeStatus)}</span>
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
                                    この提案で進める
                                </button>
                                <button className="ai-secondary-button" onClick={onNextCandidate} type="button">
                                    別候補を見る
                                </button>
                                <button className="ai-soft-button" type="button">
                                    保留
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
        </>
    );
}

function AutoMode({
    aiRoute,
    aiRuntimeStatus,
    autoCandidate,
    autoStatus,
    currentUser,
    goalItem,
    highValueNotice,
    onChangeGoal,
    onChangeSource,
    onToggleAutoStatus,
    sourceItem,
    sourceItems,
}: {
    aiRoute: AiTradeRoute | undefined;
    aiRuntimeStatus: AiRuntimeStatus;
    autoCandidate: Item | undefined;
    autoStatus: AutoStatus;
    currentUser: RegisteredUser;
    goalItem: Item | undefined;
    highValueNotice: string;
    onChangeGoal: (itemId: string) => void;
    onChangeSource: (itemId: string) => void;
    onToggleAutoStatus: () => void;
    sourceItem: Item | undefined;
    sourceItems: Item[];
}) {
    const isPaused = autoStatus === "paused";
    const monitorScore =
        aiRoute?.matchScore ?? (autoCandidate && autoCandidate.price >= 10000 ? 64 : 71);
    const autoCandidateSummary =
        aiRoute?.summary ??
        `${goalItem?.title ?? "目的の商品"}への到達前に価値を上げる候補として申請済みです。`;

    return (
        <section className="ai-auto-layout">
            <aside className="ai-auto-settings">
                <p>自動交換の条件</p>
                <h2>AIに任せる範囲</h2>

                <label>
                    <span>目標</span>
                    <select
                        onChange={(event) => onChangeGoal(event.target.value)}
                        value={goalItem?.id ?? ""}
                    >
                        {[goalItem, ...sourceItems]
                            .filter((item): item is Item => item !== undefined)
                            .filter((item, index, array) =>
                                array.findIndex((targetItem) => targetItem.id === item.id) === index
                            )
                            .map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.title}
                                </option>
                            ))}
                    </select>
                </label>

                <label>
                    <span>開始商品</span>
                    <select
                        onChange={(event) => onChangeSource(event.target.value)}
                        value={sourceItem?.id ?? ""}
                    >
                        {sourceItems.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.title}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="ai-setting-list">
                    <div>
                        <span>価格差</span>
                        <strong>±20%</strong>
                    </div>
                    <div>
                        <span>申請上限</span>
                        <strong>1日5件</strong>
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
                    <button className="ai-primary-button" type="button">
                        開始
                    </button>
                    <button className="ai-secondary-button" type="button">
                        条件を変更
                    </button>
                </div>
            </aside>

            <div className="ai-auto-monitor-stack">
                <section className="ai-monitor-card">
                    <div className={isPaused ? "ai-status-band ai-status-band--paused" : "ai-status-band"}>
                        <div>
                            <p>自動交換</p>
                            <strong>{isPaused ? "手動停止中" : "承認待ち"}</strong>
                        </div>
                        <button className="ai-status-band__button" onClick={onToggleAutoStatus} type="button">
                            {isPaused ? "再開" : "一時停止"}
                        </button>
                    </div>

                    <div className={`ai-runtime-status ai-runtime-status--auto ai-runtime-status--${aiRuntimeStatus}`}>
                        <div>
                            <p>AI接続状態</p>
                            <strong>{getAiRuntimeLabel(aiRuntimeStatus)}</strong>
                        </div>
                        <span>{getAiRuntimeDescription(aiRuntimeStatus)}</span>
                    </div>

                    <div className="ai-progress-lane" aria-label="自動交換の進行状況">
                        <span className="ai-progress-lane__step ai-progress-lane__step--active">探索中</span>
                        <span className="ai-progress-lane__step ai-progress-lane__step--active">申請済み</span>
                        <span className="ai-progress-lane__step ai-progress-lane__step--active">承認待ち</span>
                        <span className={isPaused ? "ai-progress-lane__step" : "ai-progress-lane__step ai-progress-lane__step--watching"}>
                            次候補探索
                        </span>
                    </div>

                    <div className="ai-monitor-main">
                        {autoCandidate && (
                            <>
                                <img src={autoCandidate.imageUrl || fallbackImageUrl} alt="" />
                                <div>
                                    <p>現在の候補</p>
                                    <h2>{autoCandidate.title}</h2>
                                    <span>
                                        {autoCandidateSummary}
                                    </span>
                                </div>
                                <div className="ai-score-ring ai-score-ring--green" style={{ "--score": `${monitorScore}%` } as React.CSSProperties}>
                                    {monitorScore}%
                                </div>
                            </>
                        )}
                    </div>
                </section>

                <section className="ai-log-card">
                    <h2>進行ログ</h2>
                    <ul>
                        <li>
                            <time>10:20</time>
                            <span>条件に合う倉庫商品を3件検出</span>
                        </li>
                        <li>
                            <time>10:21</time>
                            <span>{sourceItem?.title ?? "開始商品"}からの交換申請を作成</span>
                        </li>
                        <li>
                            <time>10:22</time>
                            <span>相手の返答待ちに移行</span>
                        </li>
                        <li>
                            <time>10:24</time>
                            <span>高額候補を検知。通知のみ行い、自動交換は継続</span>
                        </li>
                        <li>
                            <time>10:25</time>
                            <span>次候補として{autoCandidate?.title ?? "候補商品"}を監視中</span>
                        </li>
                    </ul>
                </section>
            </div>
        </section>
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

function getAiRuntimeLabel(status: AiRuntimeStatus): string {
    if (status === "gemini") return "Geminiで生成";
    if (status === "fallback") return "fallbackで提案";
    if (status === "mock") return "モック提案";
    if (status === "loading") return "AI確認中";

    return "待機中";
}

function getAiRuntimeDescription(status: AiRuntimeStatus): string {
    if (status === "gemini") {
        return "バックエンド経由でGemini APIの応答を使っています。";
    }

    if (status === "fallback") {
        return "Gemini APIに失敗したため、バックエンドの代替ロジックで提案しています。";
    }

    if (status === "mock") {
        return "API接続に失敗したため、フロントのモック提案を表示しています。";
    }

    if (status === "loading") {
        return "バックエンドAI APIへ問い合わせています。";
    }

    return "開始商品と目標商品を選ぶとAI接続状態を確認します。";
}

function getRouteStepLabel(index: number, length: number): string {
    if (index === 0) return "開始商品";
    if (index === length - 1) return "目標";
    if (index === 1) return "提案中";
    return "候補";
}

export default AiProposalScreen;
