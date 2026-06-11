import { useEffect, useState } from "react";
import ItemCard from "../components/ItemCard";
import { getItems } from "../features/items/itemApi";
import type { Item } from "../features/items/itemTypes";
import "./HomeScreen.css";

type HomeScreenProps = {
    onSelectItem: (itemId: string) => void;
    onOpenProfile: () => void;
};
const categories = ["すべて", "ファッション", "バッグ", "家電", "クーポン"];

function HomeScreen({ onSelectItem, onOpenProfile }: HomeScreenProps) {
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
    return (
        <section className="home-screen">
            <button
                aria-label="マイページ"
                className="home-screen__profile-button"
                onClick={onOpenProfile}
                type="button"
            >
                <img className="home-screen__profile-image" src="/images/demo/e10821c74b533d465ba888ea66daa30f.jpg" alt=""  />
            </button>
            <header className="home-screen__header">
                <p className="home-screen__eyebrow">物々交換マーケット</p>
                <div className="home-screen__title-row">
                    <div>
                        <h1 className="home-screen__title">わらしべ</h1>
                        <p className="home-screen__lead">
                            使わなくなったものを、ほしいものへ交換しよう。
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
                <h2>おすすめ</h2>
                <span>{filteredItems.length}件</span>
            </div>

            {filteredItems.length > 0 ? (
                <div className="home-screen__grid">
                    {filteredItems.map((item) => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            onSelectItem={onSelectItem}
                        />
                    ))}
                </div>
            ) : (
                <div className="home-screen__empty">
                    <p>該当するアイテムがありません</p>
                    <span>検索ワードやカテゴリを変えてみてください。</span>
                </div>
            )}
        </section>
    );
}

export default HomeScreen;
