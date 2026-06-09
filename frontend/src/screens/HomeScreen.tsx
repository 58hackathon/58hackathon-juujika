import { useState } from "react";
import ItemCard from "../components/ItemCard";
import { demoItems } from "../features/items/itemData";
import "./HomeScreen.css";

type HomeScreenProps = {
    onSelectItem: (itemId: string) => void;
};
const categories = ["すべて", "ファッション", "バッグ", "家電"];

function HomeScreen({ onSelectItem }: HomeScreenProps) {
    const [activeCategory, setActiveCategory] = useState("すべて");
    const [searchText, setSearchText] = useState("");
    const filteredItems = demoItems.filter((item) => {
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
