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
    { screen: "aiProposal", label: "AI提案"},
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
        </nav>
    );
}

export default AppNav;
