import { useState } from "react";
import type { Screen } from "./routes/screenTypes";
import { demoItems } from "./features/items/itemData";
import HomeScreen from "./screens/HomeScreen";
import ItemDetailScreen from "./screens/ItemDetailScreen";
import AppNav from "./components/AppNav";
import "./App.css";

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const selectedItem = demoItems.find((item) => item.id === selectedItemId);

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
    setSelectedItemId(null);
  };

  return (
    <main className="app-shell" data-current-screen={currentScreen}>
      <AppNav
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
      />

      {currentScreen === "home" && (
        <HomeScreen
          onSelectItem={(itemId) => {
            setSelectedItemId(itemId);
            setCurrentScreen("itemDetail");
          }}
        />
      )}

      {currentScreen === "itemDetail" && selectedItem && (
        <ItemDetailScreen
          item={selectedItem}
          onBack={() => setCurrentScreen("home")}
        />
      )}

      {currentScreen === "createItem" && (
        <section className="placeholder-screen">
          <h1>出品画面</h1>
          <p>ここに出品フォームを作ります。</p>
        </section>
      )}

      {currentScreen === "requestList" && (
        <section className="placeholder-screen">
          <h1>リクエスト一覧</h1>
          <p>交換リクエストを確認する画面です。</p>
        </section>
      )}

      {currentScreen === "profile" && (
        <section className="placeholder-screen">
          <h1>プロフィール</h1>
          <p>ユーザー情報を表示する画面です。</p>
        </section>
      )}
    </main>
  );
}
export default App;