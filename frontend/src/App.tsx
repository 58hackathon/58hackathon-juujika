import type { Screen } from "./routes/screenTypes";
import HomeScreen from "./screens/HomeScreen";
import "./App.css";

function App() {
  const currentScreen: Screen = "home";

  return (
    <main className="app-shell" data-current-screen={currentScreen}>
      <HomeScreen />
    </main>
  );
}

export default App;
