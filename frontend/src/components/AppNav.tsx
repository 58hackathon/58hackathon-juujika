import type { Screen } from "../routes/screenTypes";
import "./AppNav.css";

type AppNavProps = {
    currentScreen: Screen;
    onNavigate: (screen: Screen) => void;
};

const navItems: { screen: Screen; label: string }[] = [
    { screen: "home", label: "商品一覧" },
    { screen: "createItem", label: "出品" },
    { screen: "requestList", label: "リクエスト" },
    { screen: "favorite", label: "お気に入り"},
];

function AppNav({ currentScreen, onNavigate }: AppNavProps) {
    return (
        <nav className="app-nav" aria-label="メインナビゲーション">
            {navItems.map((item) => (
                <button
                    className={
                        currentScreen === item.screen
                            ? "app-nav__item app-nav__item--active"
                            : "app-nav__item"
                    }
                    key={item.screen}
                    onClick={() => onNavigate(item.screen)}
                    type="button"
                >
                    {item.label}
                </button>
            ))}
            <button
                aria-label="プロフィール"
                className={
                    currentScreen === "profile"
                        ? "app-nav__profile app-nav__profile--active"
                        : "app-nav__profile"
                }
                onClick={() => onNavigate("profile")}
                type="button"
            >
                人
            </button>
        </nav>
    );
}

export default AppNav;