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
import TradeRequestScreen from "./screens/TradeRequestScreen";
import RequestListScreen from "./screens/RequestListScreen";
import TradeRoomScreen from "./screens/TradeRoomScreen";
import type { TradeRequest } from "./features/tradeRequests/tradeRequestTypes";

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedTradeRequest, setSelectedTradeRequest] = useState<TradeRequest | null>(null);
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>([]);

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
    setSelectedItem(null);
    setSelectedTradeRequest(null);
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
      {currentScreen !== "itemDetail" && currentScreen !== "tradeRequest" && (
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
          onRequestTrade={(item) => {
            if (item.ownerId === "current_user") return;

            setSelectedItem(item);
            setCurrentScreen("tradeRequest");
          }}
        />
      )}

      {currentScreen === "tradeRequest" && selectedItem && (
        <TradeRequestScreen
          targetItem={selectedItem}
          onBack={() => setCurrentScreen("itemDetail")}
          onSubmitted={() => {
            setSelectedItem(null);
            setCurrentScreen("requestList");
          }}
        />
      )}

      {currentScreen === "createItem" && (
        <CreateItemScreen onItemCreated={() => setCurrentScreen("home")} />
      )}

      {currentScreen === "requestList" && (
        <RequestListScreen
          onOpenTrade={(request) => {
            setSelectedTradeRequest(request);
            setCurrentScreen("requestDetail");
          }}
        />
      )}

      {currentScreen === "requestDetail" && selectedTradeRequest && (
        <TradeRoomScreen
          request={selectedTradeRequest}
          onBack={() => {
            setSelectedTradeRequest(null);
            setCurrentScreen("requestList");
          }}
        />
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
