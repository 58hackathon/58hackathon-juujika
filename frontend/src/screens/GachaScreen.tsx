import { useEffect, useMemo, useState } from "react";
import ConfirmationNotice from "../components/ConfirmationNotice";
import { getGachaItem, getItems } from "../features/items/itemApi";
import type { Item, ItemGachaResult } from "../features/items/itemTypes";
import { getGachaPriceBand } from "../features/items/gachaPriceBands";
import { isCurrentUserResource } from "../features/users/currentUser";
import type { RegisteredUser } from "../features/users/userTypes";
import "./GachaScreen.css";

type GachaScreenProps = {
    currentUser: RegisteredUser;
};

type CompletedGachaExchange = {
    id: string;
    offeredItem: Item;
    receivedItem: Item;
    poolSize: number;
    reason: string;
    priceBandLabel: string;
    categoryLabel: string;
    completedAt: string;
};

type GachaStatus = "idle" | "exchanging" | "complete" | "empty";

const allCategoriesValue = "all";
const gachaHistoryStorageKeyPrefix = "warashibe.gachaHistory";
const maxGachaHistoryItems = 10;
const minimumExchangeMs = 1100;

function GachaScreen({ currentUser }: GachaScreenProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [sourceItemId, setSourceItemId] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(allCategoriesValue);
    const [completedExchange, setCompletedExchange] =
        useState<CompletedGachaExchange>();
    const [exchangeHistory, setExchangeHistory] = useState<CompletedGachaExchange[]>([]);
    const [status, setStatus] = useState<GachaStatus>("idle");
    const [isExchangeConfirmOpen, setIsExchangeConfirmOpen] = useState(false);

    useEffect(() => {
        const loadItems = async () => {
            const itemsFromApi = await getItems();
            setItems(itemsFromApi);
        };

        loadItems();
    }, []);

    useEffect(() => {
        setExchangeHistory(getStoredGachaHistory(currentUser.id));
    }, [currentUser.id]);

    const sourceItems = useMemo(
        () =>
            items.filter(
                (item) =>
                    item.status === "available" &&
                    isCurrentUserResource(item.ownerId, currentUser.id)
            ),
        [currentUser.id, items]
    );
    const sourceItem = sourceItems.find((item) => item.id === sourceItemId);
    const priceBand = sourceItem ? getGachaPriceBand(sourceItem.price) : undefined;
    const categories = useMemo(
        () =>
            Array.from(
                new Set(
                    items
                        .filter((item) => item.warehouseUseCase === "gacha")
                        .map((item) => item.category)
                )
            ),
        [items]
    );
    const candidatePool = useMemo(() => {
        if (!priceBand) return [];

        return items.filter((item) => {
            const matchesCategory =
                selectedCategory === allCategoriesValue || item.category === selectedCategory;

            return (
                item.status === "available" &&
                item.id !== sourceItem?.id &&
                !isCurrentUserResource(item.ownerId, currentUser.id) &&
                item.listingType === "warehouse" &&
                item.warehouseUseCase === "gacha" &&
                matchesCategory &&
                item.price >= priceBand.minPrice &&
                (priceBand.maxPrice === undefined || item.price <= priceBand.maxPrice)
            );
        });
    }, [currentUser.id, items, priceBand, selectedCategory, sourceItem?.id]);

    const canExchange = Boolean(
        sourceItem && priceBand && status !== "exchanging" && status !== "complete"
    );

    const handleSourceChange = (itemId: string) => {
        setSourceItemId(itemId);
        setCompletedExchange(undefined);
        setIsExchangeConfirmOpen(false);
        setStatus("idle");
    };

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        setCompletedExchange(undefined);
        setIsExchangeConfirmOpen(false);
        setStatus("idle");
    };

    const handleExchangeClick = () => {
        if (!canExchange) return;

        setIsExchangeConfirmOpen(true);
    };

    const handleExchange = async () => {
        if (!sourceItem || !priceBand) return;

        setIsExchangeConfirmOpen(false);
        const startedAt = Date.now();
        setStatus("exchanging");
        setCompletedExchange(undefined);

        const gachaResult = await getGachaItem({
            userId: currentUser.id,
            sourceItemId: sourceItem.id,
            excludeItemId: sourceItem.id,
            category:
                selectedCategory === allCategoriesValue ? undefined : selectedCategory,
            minPrice: priceBand.minPrice,
            maxPrice: priceBand.maxPrice,
        });
        const elapsed = Date.now() - startedAt;

        if (elapsed < minimumExchangeMs) {
            await wait(minimumExchangeMs - elapsed);
        }

        if (!gachaResult) {
            setStatus("empty");
            return;
        }

        const completedGachaExchange = toCompletedExchange(
            sourceItem,
            gachaResult,
            priceBand.label,
            selectedCategory === allCategoriesValue ? "すべて" : selectedCategory
        );

        setCompletedExchange(completedGachaExchange);
        setExchangeHistory((currentHistory) =>
            saveGachaHistory(currentUser.id, [
                completedGachaExchange,
                ...currentHistory,
            ])
        );
        setStatus("complete");
    };

    const resetExchange = () => {
        setCompletedExchange(undefined);
        setStatus("idle");
    };

    return (
        <section className="gacha-screen">
            <header className="gacha-screen__hero">
                <div>
                    <p className="gacha-screen__eyebrow">同価格帯ブラインド交換</p>
                    <h1>わらしべガチャ</h1>
                    <p>交換ボタンを押すまで、届く商品はお互いにわかりません。</p>
                </div>
                <div className="gacha-screen__swap-sticker" aria-hidden="true">
                    Blind SWAP!
                </div>
            </header>

            <div className="gacha-screen__layout">
                <section className="gacha-screen__setup" aria-label="ガチャ設定">
                    <div className="gacha-screen__section-title">
                        <span>1</span>
                        <h2>交換に出す商品を選ぶ</h2>
                    </div>

                    {sourceItems.length > 0 ? (
                        <>
                            <label className="gacha-screen__select">
                                <span>あなたの商品</span>
                                <select
                                    onChange={(event) => handleSourceChange(event.target.value)}
                                    value={sourceItemId}
                                >
                                    <option value=""></option>
                                    {sourceItems.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.title}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {sourceItem && (
                                <article className="gacha-screen__source">
                                    <img src={sourceItem.imageUrl} alt="" />
                                    <div>
                                        <h3>{sourceItem.title}</h3>
                                        <p>{sourceItem.category}</p>
                                        <strong>¥{sourceItem.price.toLocaleString()}</strong>
                                    </div>
                                </article>
                            )}
                        </>
                    ) : (
                        <div className="gacha-screen__empty-card">
                            <h3>出品中の商品がありません</h3>
                            <p>交換に出す商品を登録すると、同価格帯のガチャをまわせます。</p>
                        </div>
                    )}

                    <div className="gacha-screen__section-title">
                        <span>2</span>
                        <h2>交換条件を確認</h2>
                    </div>
                    <div
                        className={[
                            selectedCategory === allCategoriesValue
                                ? "gacha-screen__price-band-before"
                                : "gacha-screen__price-band",
                            !sourceItem ? "gacha-screen__price-band--pending" : "",
                        ].filter(Boolean).join(" ")}
                    >
                        <strong>{priceBand?.label ?? "未選択"}</strong>
                    </div>

                    <div className="gacha-screen__category-row" aria-label="カテゴリ">
                        <button
                            className={
                                selectedCategory === allCategoriesValue
                                    ? "gacha-screen__chip gacha-screen__chip--active"
                                    : "gacha-screen__chip"
                            }
                            onClick={() => handleCategoryChange(allCategoriesValue)}
                            type="button"
                        >
                            すべて
                        </button>
                        {categories.map((category) => (
                            <button
                                className={
                                    selectedCategory === category
                                        ? "gacha-screen__chip gacha-screen__chip--active"
                                        : "gacha-screen__chip"
                                }
                                key={category}
                                onClick={() => handleCategoryChange(category)}
                                type="button"
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    <div className="gacha-screen__pool">
                        <div>
                            <span>ブラインド候補</span>
                            <strong>{candidatePool.length}件</strong>
                        </div>
                        <div className="gacha-screen__mystery-capsules" aria-hidden="true">
                            <span>?</span>
                            <span>?</span>
                            <span>?</span>
                        </div>
                    </div>
                </section>

                <section className="gacha-screen__machine-area" aria-label="ガチャ交換">
                    <div className={`gacha-screen__machine gacha-screen__machine--${status}`}>
                        <div className="gacha-screen__machine-globe">
                            <span />
                            <span />
                            <span />
                            <span />
                        </div>
                        <div className="gacha-screen__machine-body">
                            <p>BLIND RANDOM SWAP</p>
                            <button disabled={!canExchange} onClick={handleExchangeClick} type="button">
                                {getExchangeButtonLabel(status)}
                            </button>
                        </div>
                    </div>

                    {status === "complete" && completedExchange ? (
                        <article className="gacha-screen__complete">
                            <div className="gacha-screen__complete-mark" aria-hidden="true">
                                ✓
                            </div>
                            <div className="gacha-screen__result-top">
                                <span>交換が完了しました！</span>
                                <small>{completedExchange.poolSize}件の中から成立</small>
                            </div>

                            <div className="gacha-screen__exchange-pair">
                                <GachaExchangeCard
                                    item={completedExchange.offeredItem}
                                    label="あなたが出した商品"
                                />
                                <div className="gacha-screen__exchange-arrow" aria-hidden="true">
                                    ↔
                                </div>
                                <GachaExchangeCard
                                    item={completedExchange.receivedItem}
                                    label="届いた商品"
                                />
                            </div>

                            <p className="gacha-screen__reason">
                                {completedExchange.reason}
                            </p>
                            <button
                                className="gacha-screen__secondary gacha-screen__secondary--wide"
                                onClick={resetExchange}
                                type="button"
                            >
                                別の商品で交換する
                            </button>
                        </article>
                    ) : (
                        <div className="gacha-screen__waiting">
                            {status === "empty" ? (
                                <>
                                    <h2>交換できる相手が見つかりませんでした</h2>
                                    <p>価格帯やカテゴリを変えると、候補が広がります。</p>
                                </>
                            ) : (
                                <>
                                    <h2>{status === "exchanging" ? "交換中..." : "中身はまだ秘密"}</h2>
                                    <p>
                                        交換するまで相手の商品は表示されません。成立後に届いた商品を確認できます。
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </section>
            </div>

            <section className="gacha-screen__flow" aria-label="ユーザーフロー">
                {["商品を指定", "価格帯を確認", "ブラインド交換", "交換完了"].map(
                    (label, index) => (
                        <div className="gacha-screen__flow-step" key={label}>
                            <span>{index + 1}</span>
                            <p>{label}</p>
                        </div>
                    )
                )}
            </section>

            <section className="gacha-screen__history" aria-label="ガチャ交換履歴">
                <div className="gacha-screen__section-title">
                    <span>履歴</span>
                    <h2>交換履歴</h2>
                </div>

                {exchangeHistory.length > 0 ? (
                    <div className="gacha-screen__history-list">
                        {exchangeHistory.map((exchange) => (
                            <article className="gacha-screen__history-item" key={exchange.id}>
                                <div className="gacha-screen__history-meta">
                                    <time dateTime={exchange.completedAt}>
                                        {formatGachaHistoryDate(exchange.completedAt)}
                                    </time>
                                    <span>{exchange.priceBandLabel}</span>
                                    <span>{exchange.categoryLabel}</span>
                                    <strong>{exchange.poolSize}件から成立</strong>
                                </div>

                                <div className="gacha-screen__history-pair">
                                    <GachaHistoryProduct item={exchange.offeredItem} label="出した商品" />
                                    <div className="gacha-screen__history-arrow" aria-hidden="true">
                                        ↔
                                    </div>
                                    <GachaHistoryProduct item={exchange.receivedItem} label="届いた商品" />
                                </div>

                                <p>{exchange.reason}</p>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="gacha-screen__empty-card">
                        <h3>まだ交換履歴がありません</h3>
                        <p>ガチャ交換が成立すると、ここに出した商品と届いた商品が残ります。</p>
                    </div>
                )}
            </section>

            <ConfirmationNotice
                cancelLabel="条件を見直す"
                confirmLabel="ガチャを回す"
                description="実行すると、あなたの商品を出してガチャ候補から相手の商品が確定します。成立後に届いた商品が表示されます。"
                details={
                    sourceItem && priceBand
                        ? [
                            { label: "出す商品", value: sourceItem.title },
                            { label: "価格帯", value: priceBand.label },
                            {
                                label: "カテゴリ",
                                value:
                                    selectedCategory === allCategoriesValue
                                        ? "すべて"
                                        : selectedCategory,
                            },
                            { label: "候補数", value: `${candidatePool.length}件` },
                        ]
                        : []
                }
                isOpen={isExchangeConfirmOpen}
                onCancel={() => setIsExchangeConfirmOpen(false)}
                onConfirm={() => {
                    void handleExchange();
                }}
                title="この条件でガチャ交換しますか？"
            />
        </section>
    );
}

function GachaHistoryProduct({ item, label }: { item: Item; label: string }) {
    return (
        <div className="gacha-screen__history-product">
            <img src={item.imageUrl} alt="" />
            <div>
                <span>{label}</span>
                <strong>{item.title}</strong>
                <p>
                    {item.category} / ¥{item.price.toLocaleString()}
                </p>
            </div>
        </div>
    );
}

function GachaExchangeCard({ item, label }: { item: Item; label: string }) {
    return (
        <article className="gacha-screen__exchange-card">
            <span>{label}</span>
            <img src={item.imageUrl} alt={item.title} />
            <h2>{item.title}</h2>
            <p>
                {item.category} / ¥{item.price.toLocaleString()}
            </p>
        </article>
    );
}

function getExchangeButtonLabel(status: GachaStatus): string {
    if (status === "exchanging") return "交換中...";
    if (status === "complete") return "交換完了";
    return "交換する";
}

function toCompletedExchange(
    offeredItem: Item,
    result: ItemGachaResult,
    priceBandLabel: string,
    categoryLabel: string
): CompletedGachaExchange {
    const completedAt = new Date().toISOString();

    return {
        id: `gacha_${completedAt}_${offeredItem.id}_${result.item.id}`,
        offeredItem,
        receivedItem: result.item,
        poolSize: result.poolSize,
        reason: result.reason,
        priceBandLabel,
        categoryLabel,
        completedAt,
    };
}

function getStoredGachaHistory(userId: string): CompletedGachaExchange[] {
    try {
        const storedValue = window.localStorage.getItem(getGachaHistoryStorageKey(userId));
        if (!storedValue) return [];

        const parsedValue: unknown = JSON.parse(storedValue);
        if (!Array.isArray(parsedValue)) return [];

        return parsedValue
            .filter(isCompletedGachaExchange)
            .slice(0, maxGachaHistoryItems);
    } catch (error) {
        console.warn("ガチャ交換履歴を読み込めませんでした", error);
        return [];
    }
}

function saveGachaHistory(
    userId: string,
    history: CompletedGachaExchange[]
): CompletedGachaExchange[] {
    const nextHistory = history.slice(0, maxGachaHistoryItems);

    try {
        window.localStorage.setItem(
            getGachaHistoryStorageKey(userId),
            JSON.stringify(nextHistory)
        );
    } catch (error) {
        console.warn("ガチャ交換履歴を保存できませんでした", error);
    }

    return nextHistory;
}

function getGachaHistoryStorageKey(userId: string): string {
    return `${gachaHistoryStorageKeyPrefix}.${userId}`;
}

function isCompletedGachaExchange(value: unknown): value is CompletedGachaExchange {
    if (!isRecord(value)) return false;

    return (
        typeof value.id === "string" &&
        isHistoryItem(value.offeredItem) &&
        isHistoryItem(value.receivedItem) &&
        typeof value.poolSize === "number" &&
        typeof value.reason === "string" &&
        typeof value.priceBandLabel === "string" &&
        typeof value.categoryLabel === "string" &&
        typeof value.completedAt === "string"
    );
}

function isHistoryItem(value: unknown): value is Item {
    if (!isRecord(value)) return false;

    return (
        typeof value.id === "string" &&
        typeof value.title === "string" &&
        typeof value.imageUrl === "string" &&
        typeof value.category === "string" &&
        typeof value.price === "number"
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatGachaHistoryDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "日時不明";

    return new Intl.DateTimeFormat("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
}

export default GachaScreen;
