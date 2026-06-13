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
    offeredItem: Item;
    receivedItem: Item;
    poolSize: number;
    reason: string;
    completedAt: string;
};

type GachaStatus = "idle" | "exchanging" | "complete" | "empty";

const allCategoriesValue = "all";
const minimumExchangeMs = 1100;

function GachaScreen({ currentUser }: GachaScreenProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [sourceItemId, setSourceItemId] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(allCategoriesValue);
    const [completedExchange, setCompletedExchange] =
        useState<CompletedGachaExchange>();
    const [status, setStatus] = useState<GachaStatus>("idle");
    const [isExchangeConfirmOpen, setIsExchangeConfirmOpen] = useState(false);

    useEffect(() => {
        const loadItems = async () => {
            const itemsFromApi = await getItems();
            setItems(itemsFromApi);

            const firstSourceItem = itemsFromApi.find(
                (item) =>
                    item.status === "available" &&
                    isCurrentUserResource(item.ownerId, currentUser.id)
            );

            setSourceItemId((currentId) => currentId || firstSourceItem?.id || "");
        };

        loadItems();
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
                        .filter((item) => item.warehouseUseCases?.includes("gacha"))
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
                item.warehouseUseCases?.includes("gacha") === true &&
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

        setCompletedExchange(toCompletedExchange(sourceItem, gachaResult));
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
                    <div className="gacha-screen__price-band">
                        <span>同価格帯OK</span>
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
    result: ItemGachaResult
): CompletedGachaExchange {
    return {
        offeredItem,
        receivedItem: result.item,
        poolSize: result.poolSize,
        reason: result.reason,
        completedAt: new Date().toISOString(),
    };
}

function wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
}

export default GachaScreen;
