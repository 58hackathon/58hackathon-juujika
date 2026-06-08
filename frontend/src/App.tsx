import type { Screen } from "./routes/screenTypes";
import HomeScreen from "./screens/HomeScreen";

function App() {
  const currentScreen: Screen = "home";

  return (
    <main>
      <h1>わらしべ</h1>
      <HomeScreen />
      
      <h2>わらしべ長者とは</h2>
      
      <p>Current screen: {currentScreen}</p>
    </main>
  );
}

export default App;

