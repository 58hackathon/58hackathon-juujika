import { useState } from "react";
import type { Screen } from "./routes/screenTypes";
import { getItemById } from "./features/items/itemApi";
import type { Item } from "./features/items/itemTypes";
import HomeScreen from "./screens/HomeScreen";
import ItemDetailScreen from "./screens/ItemDetailScreen";
import AppNav from "./components/AppNav";
import "./App.css";
import CreateItemScreen from "./screens/CreateItemScreen";
import MyPageScreen from "./screens/MyPageScreen";
import AiProposalScreen from "./screens/AiProposalScreen";

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>([]);

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
    setSelectedItem(null);
  };

  const handleToggleFavorite = (itemId: string) => {
    setFavoriteItemIds((currentIds) => {
      if (currentIds.includes(itemId)) {
        return currentIds.filter((currentId) => currentId !== itemId);
      }

      return [...currentIds, itemId];
    });
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
          onOpenMyPage={() => setCurrentScreen("myPage")}
          favoriteItemIds={favoriteItemIds}
          onToggleFavorite={handleToggleFavorite}
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

      {currentScreen === "myPage" && (
        <MyPageScreen
          favoriteItemIds={favoriteItemIds}
          onBack={() => setCurrentScreen("home")}
        />
      )}

      {currentScreen === "aiProposal" && (
        <AiProposalScreen />
      )}

    </main>
  );
}
export default App;
