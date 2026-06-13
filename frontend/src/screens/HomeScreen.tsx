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
const categories = ["すべて", "ファッション", "バッグ", "家電", "クーポン"];

function HomeScreen({
    onSelectItem,
    favoriteItemIds,
    onToggleFavorite,
}: HomeScreenProps) {
    const [activeCategory, setActiveCategory] = useState("すべて");
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
        (item) => item.listingType !== "warehouse"
    );
    const warehouseItems = filteredItems.filter(
        (item) => item.listingType === "warehouse"
    );

    return (
        <section className="home-screen">
            <header className="home-screen__header">
                <p className="home-screen__eyebrow">物々交換マーケット</p>
                <div className="home-screen__title-row">
                    <div>
                        <h1 className="home-screen__title">商品一覧</h1>
                        <p className="home-screen__lead">
                            通常出品とAI / ガチャ倉庫の商品を分けて確認できます。
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

            <div className="home-screen__section-title">
                <h2>通常出品</h2>
                <span>{directItems.length}件</span>
            </div>

            {directItems.length > 0 ? (
                <div className="home-screen__grid">
                    {directItems.map((item) => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            isFavorite={favoriteItemIds.includes(item.id)}
                            onSelectItem={onSelectItem}
                            onToggleFavorite={onToggleFavorite}
                        />
                    ))}
                </div>
            ) : (
                <div className="home-screen__empty">
                    <p>該当する通常出品がありません</p>
                    <span>検索ワードやカテゴリを変えてみてください。</span>
                </div>
            )}

            <div className="home-screen__section-title home-screen__section-title--secondary">
                <h2>AI / ガチャ倉庫</h2>
                <span>{warehouseItems.length}件</span>
            </div>

            {warehouseItems.length > 0 ? (
                <div className="home-screen__grid">
                    {warehouseItems.map((item) => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            onSelectItem={onSelectItem}
                            showFavoriteButton={false}
                        />
                    ))}
                </div>
            ) : (
                <div className="home-screen__empty">
                    <p>該当する倉庫商品がありません</p>
                    <span>検索ワードやカテゴリを変えてみてください。</span>
                </div>
            )}
        </section>
    );
}

export default HomeScreen;
