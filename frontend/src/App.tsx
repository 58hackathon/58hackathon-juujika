import { useEffect, useState } from "react";
import type { Screen } from "./routes/screenTypes";
import {
  createFavorite,
  deleteFavorite,
  getFavorites,
} from "./features/favorites/favoriteApi";
import { getItemById } from "./features/items/itemApi";
import type { Item } from "./features/items/itemTypes";
import {
  clearCurrentUser,
  getStoredCurrentUser,
  saveCurrentUser,
} from "./features/users/userApi";
import {
  isCurrentUserResource,
  legacyCurrentUserId,
} from "./features/users/currentUser";
import type { RegisteredUser } from "./features/users/userTypes";
import HomeScreen from "./screens/HomeScreen";
import ItemDetailScreen from "./screens/ItemDetailScreen";
import AppNav from "./components/AppNav";
import "./App.css";
import AccountRegistrationScreen from "./screens/AccountRegistrationScreen";
import CreateItemScreen from "./screens/CreateItemScreen";
import MyPageScreen from "./screens/MyPageScreen";
import AiProposalScreen from "./screens/AiProposalScreen";
import TradeRequestScreen from "./screens/TradeRequestScreen";
import RequestListScreen from "./screens/RequestListScreen";
import TradeRoomScreen from "./screens/TradeRoomScreen";
import type { TradeRequest } from "./features/tradeRequests/tradeRequestTypes";
import GachaScreen from "./screens/GachaScreen";

function App() {
  const [currentUser, setCurrentUser] = useState<RegisteredUser | null>(() =>
    getStoredCurrentUser()
  );
  const [currentScreen, setCurrentScreen] = useState<Screen>(
    currentUser ? "home" : "accountRegistration"
  );
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedTradeRequest, setSelectedTradeRequest] = useState<TradeRequest | null>(null);
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>([]);
  const [aiWarehouseFavoriteItemIds, setAiWarehouseFavoriteItemIds] = useState<string[]>([]);
  const favoriteUserId = currentUser?.id ?? legacyCurrentUserId;

  useEffect(() => {
    if (!currentUser) {
      setFavoriteItemIds([]);
      setAiWarehouseFavoriteItemIds([]);
      return;
    }

    let isActive = true;

    const loadFavorites = async () => {
      try {
        const [marketFavorites, aiWarehouseFavorites] = await Promise.all([
          getFavorites(favoriteUserId, "market"),
          getFavorites(favoriteUserId, "ai_warehouse"),
        ]);
        if (!isActive) return;

        setFavoriteItemIds(
          Array.from(new Set(marketFavorites.map((favorite) => favorite.itemId)))
        );
        setAiWarehouseFavoriteItemIds(
          Array.from(new Set(aiWarehouseFavorites.map((favorite) => favorite.itemId)))
        );
      } catch (error) {
        console.warn("お気に入り一覧の取得に失敗しました", error);
      }
    };

    loadFavorites();

    return () => {
      isActive = false;
    };
  }, [currentUser, favoriteUserId]);

  const handleNavigate = (screen: Screen) => {
    if (!currentUser && screen !== "accountRegistration") {
      setCurrentScreen("accountRegistration");
      return;
    }

    setCurrentScreen(screen);
    setSelectedItem(null);
    setSelectedTradeRequest(null);
  };

  const handleRegistered = (user: RegisteredUser) => {
    saveCurrentUser(user);
    setCurrentUser(user);
    setCurrentScreen("home");
  };

  const handleLogout = () => {
    clearCurrentUser();
    setCurrentUser(null);
    setSelectedItem(null);
    setSelectedTradeRequest(null);
    setFavoriteItemIds([]);
    setAiWarehouseFavoriteItemIds([]);
    setCurrentScreen("accountRegistration");
  };

  const handleToggleFavorite = async (itemId: string) => {
    const isFavorite = favoriteItemIds.includes(itemId);

    setFavoriteItemIds((currentIds) => {
      if (isFavorite) {
        return currentIds.filter((currentId) => currentId !== itemId);
      }

      return currentIds.includes(itemId) ? currentIds : [...currentIds, itemId];
    });

    try {
      if (isFavorite) {
        await deleteFavorite(itemId, favoriteUserId, "market");
      } else {
        await createFavorite({
          userId: favoriteUserId,
          itemId,
          scope: "market",
        });
      }
    } catch (error) {
      console.warn("お気に入りの更新に失敗しました", error);

      setFavoriteItemIds((currentIds) => {
        if (isFavorite) {
          return currentIds.includes(itemId) ? currentIds : [...currentIds, itemId];
        }

        return currentIds.filter((currentId) => currentId !== itemId);
      });
    }
  };

  const handleToggleAiWarehouseFavorite = async (itemId: string) => {
    const isFavorite = aiWarehouseFavoriteItemIds.includes(itemId);

    setAiWarehouseFavoriteItemIds((currentIds) => {
      if (isFavorite) {
        return currentIds.filter((currentId) => currentId !== itemId);
      }

      return currentIds.includes(itemId) ? currentIds : [...currentIds, itemId];
    });

    try {
      if (isFavorite) {
        await deleteFavorite(itemId, favoriteUserId, "ai_warehouse");
      } else {
        await createFavorite({
          userId: favoriteUserId,
          itemId,
          scope: "ai_warehouse",
        });
      }
    } catch (error) {
      console.warn("AI倉庫お気に入りの更新に失敗しました", error);

      setAiWarehouseFavoriteItemIds((currentIds) => {
        if (isFavorite) {
          return currentIds.includes(itemId) ? currentIds : [...currentIds, itemId];
        }

        return currentIds.filter((currentId) => currentId !== itemId);
      });
    }
  };

  return (
    <main className="app-shell" data-current-screen={currentScreen}>
      {currentUser && (
        <button
          aria-label="マイページ"
          className={
            currentScreen === "myPage"
              ? "app-profile-button app-profile-button--active"
              : "app-profile-button"
          }
          onClick={() => handleNavigate("myPage")}
          type="button"
        >
          <img
            className="app-profile-button__image"
            src="/images/demo/e10821c74b533d465ba888ea66daa30f.jpg"
            alt=""
          />
        </button>
      )}

      {currentUser && currentScreen !== "itemDetail" && (
        <AppNav
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        />
      )}

      {currentScreen === "accountRegistration" && (
        <AccountRegistrationScreen onRegistered={handleRegistered} />
      )}
      

      {currentUser && currentScreen === "home" && (
        <HomeScreen
          onSelectItem={async (itemId) => {
            const item = await getItemById(itemId);
            if (!item) return;

            setSelectedItem(item);
            setCurrentScreen("itemDetail");
          }}
          favoriteItemIds={favoriteItemIds}
          aiWarehouseFavoriteItemIds={aiWarehouseFavoriteItemIds}
          onToggleFavorite={handleToggleFavorite}
          onToggleAiWarehouseFavorite={handleToggleAiWarehouseFavorite}
        />
      )}

      {currentUser && currentScreen === "itemDetail" && selectedItem && (
        <ItemDetailScreen
          item={selectedItem}
          currentUser={currentUser}
          onBack={() => {
            setSelectedItem(null);
            setCurrentScreen("home");
          }}
          onRequestTrade={(item) => {
            if (isCurrentUserResource(item.ownerId, currentUser.id)) return;

            setSelectedItem(item);
            setCurrentScreen("tradeRequest");
          }}
        />
      )}

      {currentUser && currentScreen === "tradeRequest" && selectedItem && (
        <TradeRequestScreen
          currentUser={currentUser}
          targetItem={selectedItem}
          onBack={() => setCurrentScreen("itemDetail")}
          onSubmitted={() => {
            setSelectedItem(null);
            setCurrentScreen("requestList");
          }}
        />
      )}

      {currentUser && currentScreen === "createItem" && (
        <CreateItemScreen
          currentUser={currentUser}
          onItemCreated={() => setCurrentScreen("home")}
        />
      )}

      {currentUser && currentScreen === "requestList" && (
        <RequestListScreen
          currentUser={currentUser}
          onOpenTrade={(request) => {
            setSelectedTradeRequest(request);
            setCurrentScreen("requestDetail");
          }}
        />
      )}

      {currentUser && currentScreen === "gacha" && (
        <GachaScreen currentUser={currentUser} />
      )}

      {currentUser && currentScreen === "requestDetail" && selectedTradeRequest && (
        <TradeRoomScreen
          currentUser={currentUser}
          request={selectedTradeRequest}
          onBack={() => {
            setSelectedTradeRequest(null);
            setCurrentScreen("requestList");
          }}
        />
      )}

      {currentUser && currentScreen === "myPage" && (
        <MyPageScreen
          currentUser={currentUser}
          favoriteItemIds={favoriteItemIds}
          onBack={() => setCurrentScreen("home")}
          onLogout={handleLogout}
        />
      )}

      {currentUser && currentScreen === "aiProposal" && (
        <AiProposalScreen
          currentUser={currentUser}
          aiWarehouseFavoriteItemIds={aiWarehouseFavoriteItemIds}
        />
      )}

    </main>
  );
}
export default App;
