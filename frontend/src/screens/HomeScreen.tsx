import ItemCard from "../components/ItemCard";
import { demoItems } from "../features/items/itemData";
import "./HomeScreen.css";

const categories = ["すべて", "ファッション", "バッグ", "家電"];

function HomeScreen() {
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
                    <button className="home-screen__post-button" type="button">
                        出品
                    </button>
                </div>
            </header>

            <div className="home-screen__search" role="search">
                <span className="home-screen__search-icon" aria-hidden="true">⌕</span>
                <input
                    aria-label="アイテムを検索"
                    className="home-screen__search-input"
                    placeholder="スニーカー、バッグなど"
                    type="search"
                />
            </div>

            <nav className="home-screen__categories" aria-label="カテゴリ">
                {categories.map((category) => (
                    <button
                        className={
                            category === "すべて"
                                ? "home-screen__category home-screen__category--active"
                                : "home-screen__category"
                        }
                        key={category}
                        type="button"
                    >
                        {category}
                    </button>
                ))}
            </nav>

            <div className="home-screen__section-title">
                <h2>おすすめ</h2>
                <span>{demoItems.length}件</span>
            </div>

            <div className="home-screen__grid">
                {demoItems.map((item) => (
                    <ItemCard key={item.id} item={item} />
                ))}
            </div>
        </section>
    );
}

export default HomeScreen;
