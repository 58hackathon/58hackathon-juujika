import { useEffect, useState } from "react";
import ItemCard from "../components/ItemCard";
import { getItems } from "../features/items/itemApi";
import type { Item } from "../features/items/itemTypes";
import "./HomeScreen.css";

type HomeScreenProps = {
    onSelectItem: (itemId: string) => void;
    favoriteItemIds: string[];
    onToggleFavorite: (itemId: string) => void;
};

type ListingFilter = "direct" | "aiWarehouse" | "gachaWarehouse";
type ListingFilterOption = {
    description: string;
    emptyLabel: string;
    label: string;
    value: ListingFilter;
};
type VisibleSection = {
    description: string;
    items: Item[];
    title: string;
};

const categories = ["すべて", "ファッション", "バッグ", "家電", "クーポン"];
const listingFilters: ListingFilterOption[] = [
    {
        label: "通常出品",
        value: "direct",
        description: "ユーザー同士で直接交換する商品です。",
        emptyLabel: "通常出品",
    },
    {
        label: "AI候補",
        value: "aiWarehouse",
        description: "AIが交換ルートを作る時に利用する倉庫商品です。",
        emptyLabel: "AI候補",
    },
    {
        label: "ガチャ候補",
        value: "gachaWarehouse",
        description: "ガチャ交換の抽選対象として利用する倉庫商品です。",
        emptyLabel: "ガチャ候補",
    },
];

function HomeScreen({
    onSelectItem,
    favoriteItemIds,
    onToggleFavorite,
}: HomeScreenProps) {
    const [activeCategory, setActiveCategory] = useState("すべて");
    const [activeListingFilter, setActiveListingFilter] =
        useState<ListingFilter>("direct");
    const [searchText, setSearchText] = useState("");
    const [items, setItems] = useState<Item[]>([]);

    useEffect(() => {
        const loadItems = async () => {
            const itemsFromApi = await getItems();
            setItems(itemsFromApi);
        };

        loadItems();
    }, []);
    const filteredItems = items.filter((item) => {
        const matchesCategory =
            activeCategory === "すべて" || item.category === activeCategory;
        const matchesSearch =
            item.title.includes(searchText) ||
            item.wantedItem.includes(searchText) ||
            item.description.includes(searchText);

        return matchesCategory && matchesSearch;
    });
    const directItems = filteredItems.filter(
        (item) => item.listingType === "direct"
    );
    const warehouseItems = filteredItems.filter(
        (item) => item.listingType === "warehouse"
    );
    const aiWarehouseItems = warehouseItems.filter((item) =>
        item.warehouseUseCase === "ai_route"
    );
    const gachaWarehouseItems = warehouseItems.filter((item) =>
        item.warehouseUseCase === "gacha"
    );
    const activeListingOption =
        listingFilters.find((filter) => filter.value === activeListingFilter) ??
        listingFilters[0];
    const visibleSection: VisibleSection =
        activeListingFilter === "aiWarehouse"
            ? {
                title: activeListingOption.label,
                description: activeListingOption.description,
                items: aiWarehouseItems,
            }
            : activeListingFilter === "gachaWarehouse"
                ? {
                    title: activeListingOption.label,
                    description: activeListingOption.description,
                    items: gachaWarehouseItems,
                }
                : {
                    title: activeListingOption.label,
                    description: activeListingOption.description,
                    items: directItems,
                };
    const shouldShowFavoriteButton = activeListingFilter === "direct";

    return (
        <section className="home-screen">
            <header className="home-screen__header">
                <p className="home-screen__eyebrow">物々交換マーケット</p>
                <div className="home-screen__title-row">
                    <div>
                        <h1 className="home-screen__title">商品一覧</h1>
                        <p className="home-screen__lead">
                            通常出品、AI提案候補、ガチャ提案候補を切り替えて確認できます。
                        </p>
                    </div>
                </div>
            </header>

            <div className="home-screen__search" role="search">
                <span className="home-screen__search-icon" aria-hidden="true">⌕</span>
                <input
                    aria-label="アイテムを検索"
                    className="home-screen__search-input"
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="スニーカー、バッグなど"
                    type="search"
                    value={searchText}
                />
            </div>

            <nav className="home-screen__categories" aria-label="カテゴリ">
                {categories.map((category) => (
                    <button
                        className={
                            category === activeCategory
                                ? "home-screen__category home-screen__category--active"
                                : "home-screen__category"
                        }
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        type="button"
                    >
                        {category}
                    </button>
                ))}
            </nav>

            <div className="home-screen__listing-filter" aria-label="表示する商品">
                {listingFilters.map((filter) => (
                    <button
                        className={
                            filter.value === activeListingFilter
                                ? "home-screen__listing-filter-button home-screen__listing-filter-button--active"
                                : "home-screen__listing-filter-button"
                        }
                        key={filter.value}
                        onClick={() => setActiveListingFilter(filter.value)}
                        type="button"
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            <div className="home-screen__section-title">
                <div>
                    <h2>{visibleSection.title}</h2>
                    <p>{visibleSection.description}</p>
                </div>
                <span>{visibleSection.items.length}件</span>
            </div>

            {visibleSection.items.length > 0 ? (
                <div className="home-screen__grid">
                    {visibleSection.items.map((item) => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            isFavorite={favoriteItemIds.includes(item.id)}
                            onSelectItem={onSelectItem}
                            onToggleFavorite={
                                shouldShowFavoriteButton ? onToggleFavorite : undefined
                            }
                            showFavoriteButton={shouldShowFavoriteButton}
                        />
                    ))}
                </div>
            ) : (
                <div className="home-screen__empty">
                    <p>該当する{activeListingOption.emptyLabel}がありません</p>
                    <span>検索ワードやカテゴリを変えてみてください。</span>
                </div>
            )}
        </section>
    );
}

export default HomeScreen;
