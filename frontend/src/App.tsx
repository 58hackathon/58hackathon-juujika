import { useState } from "react";
import type { Screen } from "./routes/screenTypes";
import { demoItems } from "./features/items/itemData";
import HomeScreen from "./screens/HomeScreen";
import ItemDetailScreen from "./screens/ItemDetailScreen";
import "./App.css";

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const selectedItem = demoItems.find((item) => item.id === selectedItemId);

  if (currentScreen === "itemDetail" && selectedItem) {
    return (
      <main className="app-shell" data-current-screen={currentScreen}>
        <ItemDetailScreen
          item={selectedItem}
          onBack={() => setCurrentScreen("home")}
        />
      </main>
    );
  }

  return (
    <main className="app-shell" data-current-screen={currentScreen}>
      <HomeScreen
        onSelectItem={(itemId) => {
          setSelectedItemId(itemId);
          setCurrentScreen("itemDetail");
        }}
      />
    </main>
  );
}

export default App;