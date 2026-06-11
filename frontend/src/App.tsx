import { useState } from "react";
import type { Screen } from "./routes/screenTypes";
import { getItemById } from "./features/items/itemApi";
import type { Item } from "./features/items/itemTypes";
import HomeScreen from "./screens/HomeScreen";
import ItemDetailScreen from "./screens/ItemDetailScreen";
import AppNav from "./components/AppNav";
import "./App.css";
import CreateItemScreen from "./screens/CreateItemScreen";

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
    setSelectedItem(null);
  };

  return (
    <main className="app-shell" data-current-screen={currentScreen}>
      {currentScreen !== "itemDetail" && (
        <AppNav
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        />
      )}
      

      {currentScreen === "home" && (
        <HomeScreen
          onSelectItem={async (itemId) => {
            const item = await getItemById(itemId);
            if (!item) return;

            setSelectedItem(item);
            setCurrentScreen("itemDetail");
          }}
          onOpenProfile={() => setCurrentScreen("profile")}
        />
      )}

      {currentScreen === "itemDetail" && selectedItem && (
        <ItemDetailScreen
          item={selectedItem}
          onBack={() => {
            setSelectedItem(null);
            setCurrentScreen("home");
          }}
        />
      )}

      {currentScreen === "createItem" && (
        <CreateItemScreen onItemCreated={() => setCurrentScreen("home")} />
      )}

      {currentScreen === "requestList" && (
        <section className="placeholder-screen">
          <h1>リクエスト一覧</h1>
          <p>交換リクエストを確認する画面です。</p>
        </section>
      )}

      {currentScreen === "profile" && (
        <section className="placeholder-screen placeholder-screen--profile">
          <button
            className="placeholder-screen__back-button"
            onClick={() => setCurrentScreen("home")}
            type="button"
          >
            ←
          </button>

          <h1>プロフィール</h1>
          <p>ユーザー情報を表示する画面です。</p>
        </section>
      )}

    </main>
  );
}
export default App;
