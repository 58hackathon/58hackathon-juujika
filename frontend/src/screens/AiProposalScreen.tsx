import { useEffect, useMemo, useState } from "react";
import { getAiTradeRoutes } from "../features/aiProposals/aiProposalApi";
import type { AiTradeRoute } from "../features/aiProposals/aiProposalTypes";
import { getItems } from "../features/items/itemApi";
import type { Item } from "../features/items/itemTypes";
import { isCurrentUserResource } from "../features/users/currentUser";
import type { RegisteredUser } from "../features/users/userTypes";
import "./AiProposalScreen.css";

type AiProposalScreenProps = {
    currentUser: RegisteredUser;
};

function AiProposalScreen({ currentUser }: AiProposalScreenProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [sourceItemId, setSourceItemId] = useState("");
    const [goalItemId, setGoalItemId] = useState("");
    const [routes, setRoutes] = useState<AiTradeRoute[]>([]);
    const [selectedRouteId, setSelectedRouteId] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadItems = async () => {
            const itemsFromApi = await getItems();
            setItems(itemsFromApi);

            const firstMyItem =
                itemsFromApi.find((item) =>
                    isCurrentUserResource(item.ownerId, currentUser.id)
                ) ??
                itemsFromApi[0];
            const firstGoalItem = itemsFromApi.find(
                (item) => item.id !== firstMyItem?.id
            );

            setSourceItemId(firstMyItem?.id ?? "");
            setGoalItemId(firstGoalItem?.id ?? "");
        };

        loadItems();
    }, [currentUser.id]);

    const sourceItems = useMemo(() => {
        const myItems = items.filter((item) =>
            isCurrentUserResource(item.ownerId, currentUser.id)
        );
        return myItems.length > 0 ? myItems : items.slice(0, 4);
    }, [currentUser.id, items]);

    const goalItems = items.filter((item) => item.id !== sourceItemId);
    const sourceItem = items.find((item) => item.id === sourceItemId);
    const selectedRoute =
        routes.find((route) => route.id === selectedRouteId) ?? routes[0];
    const canRequestRoute = sourceItemId !== "" && goalItemId !== "";

    const handleRequestRoutes = async () => {
        if (!canRequestRoute) return;

        setIsLoading(true);
        const aiRoutes = await getAiTradeRoutes({
            sourceItemId,
            goalItemId,
            items,
        });
        setRoutes(aiRoutes);
        setSelectedRouteId(aiRoutes[0]?.id ?? "");
        setIsLoading(false);
    };

    const resetRoutes = () => {
        setRoutes([]);
        setSelectedRouteId("");
    };

    return (
        <section className="ai-proposal-screen">
            <header className="ai-proposal-screen__header">
                <div className="ai-proposal-screen__marks" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                </div>
                <p className="ai-proposal-screen__eyebrow">交換提案AI</p>
                <h1>AI提案候補</h1>
                <p>
                    1つに決め打ちせず、ユーザーが納得してルートを選べるようにします。
                </p>
            </header>

            <div className="ai-proposal-controls">
                <label>
                    <span>出品した商品</span>
                    <select
                        onChange={(event) => {
                            setSourceItemId(event.target.value);
                            resetRoutes();
                        }}
                        value={sourceItemId}
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
                        onChange={(event) => {
                            setGoalItemId(event.target.value);
                            resetRoutes();
                        }}
                        value={goalItemId}
                    >
                        {goalItems.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.title}
                            </option>
                        ))}
                    </select>
                </label>

                <button
                    disabled={!canRequestRoute || isLoading}
                    onClick={handleRequestRoutes}
                    type="button"
                >
                    {isLoading ? "提案中..." : "候補を出す"}
                </button>
            </div>

            {routes.length === 0 ? (
                <section className="ai-proposal-empty">
                    <h2>出品商品と目標商品を選んでください</h2>
                    <p>後からバックエンドの `/api/ai/trade-routes` に差し替えられる構造です。</p>
                </section>
            ) : (
                <>
                    <section className="ai-candidate-board">
                        <div className="ai-source-card">
                            <p>出品した商品</p>
                            {sourceItem && (
                                <>
                                    <img src={sourceItem.imageUrl} alt="" />
                                    <h2>{sourceItem.title}</h2>
                                    <span>希望: {sourceItem.wantedItem}</span>
                                </>
                            )}
                        </div>

                        <div className="ai-candidate-arrows" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </div>

                        <div className="ai-route-cards" aria-label="AI提案候補">
                            {routes.map((route, index) => (
                                <button
                                    className={getRouteCardClassName(route, selectedRoute?.id, index)}
                                    key={route.id}
                                    onClick={() => setSelectedRouteId(route.id)}
                                    type="button"
                                >
                                    <span className="ai-route-card__badge">
                                        {getRouteBadge(index)}
                                    </span>
                                    <span className="ai-route-card__dot" />
                                    <h2>{route.title}</h2>
                                    <p className="ai-route-card__score">
                                        成立見込み {route.matchScore}%
                                    </p>
                                    <p>{route.steps.length}ステップ</p>
                                    <span className="ai-route-card__reason">
                                        {route.summary}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {selectedRoute && (
                        <section className="ai-route-detail">
                            <div className="ai-route-detail__top">
                                <div>
                                    <p>選択したルート</p>
                                    <h2>{selectedRoute.title}</h2>
                                    <span>
                                        成立見込み {selectedRoute.matchScore}% / {selectedRoute.steps.length}ステップ
                                    </span>
                                </div>
                            </div>

                            <div className="ai-route-flow">
                                {selectedRoute.steps.map((step, index) => (
                                    <article className="ai-route-step" key={`${step.itemId}_${index}`}>
                                        <span>{index + 1}</span>
                                        <img src={step.imageUrl} alt="" />
                                        <div>
                                            <h3>{step.title}</h3>
                                            <p>{step.matchReason}</p>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            <details className="ai-route-trace">
                                <summary>AIが見た理由を表示</summary>
                                <ul>
                                    {selectedRoute.traceReasons.map((reason) => (
                                        <li key={reason}>{reason}</li>
                                    ))}
                                </ul>
                            </details>

                            <div className="ai-route-actions">
                                <button
                                    className="ai-route-actions__secondary"
                                    onClick={() => setSelectedRouteId(routes[0]?.id ?? "")}
                                    type="button"
                                >
                                    候補一覧に戻る
                                </button>
                                <button className="ai-route-actions__primary" type="button">
                                    このルートを選ぶ
                                </button>
                            </div>
                        </section>
                    )}
                </>
            )}
        </section>
    );
}

function getRouteCardClassName(
    route: AiTradeRoute,
    selectedRouteId: string | undefined,
    index: number
) {
    const classNames = ["ai-route-card"];

    if (route.id === selectedRouteId) {
        classNames.push("ai-route-card--selected");
    }

    if (index === 0) {
        classNames.push("ai-route-card--recommended");
    }

    if (index === 2) {
        classNames.push("ai-route-card--hard");
    }

    return classNames.join(" ");
}

function getRouteBadge(index: number) {
    if (index === 0) return "おすすめ";
    if (index === 1) return "近道";
    return "挑戦";
}

export default AiProposalScreen;
